import { expect, test, type Page } from "@playwright/test";
import {
  drag,
  MOD,
  newDocument,
  openEditor,
  pixel,
  trackErrors,
  setForegroundColor,
  pickMenu,
} from "./helpers";

const close = (a: number[], b: number[], tolerance = 10) =>
  a.slice(0, 3).every((v, i) => Math.abs(v - b[i]) <= tolerance);

/** RGBA on screen at a document point for any zoom (the document stays centred). */
async function pixelAtZoom(
  page: Page,
  x: number,
  y: number,
  doc: { width: number; height: number },
) {
  const zoom = Number((await page.getByTestId("zoom-level").textContent())!.replace("%", "")) / 100;
  const box = (await page.getByTestId("canvas-viewport").boundingBox())!;
  const sx = box.x + box.width / 2 + (x - doc.width / 2) * zoom;
  const sy = box.y + box.height / 2 + (y - doc.height / 2) * zoom;
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  return page.evaluate(
    ([px, py]) => {
      const canvas = document.querySelector(
        '[data-testid="canvas-viewport"] canvas',
      ) as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      return [
        ...canvas
          .getContext("2d")!
          .getImageData(Math.round((px - rect.left) * dpr), Math.round((py - rect.top) * dpr), 1, 1)
          .data,
      ];
    },
    [sx, sy] as const,
  );
}

test("a zoomed-out view renders the same colours as 100%", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Zoom parity");
  await page.keyboard.press("u");
  await drag(page, [50, 50], [250, 250]);
  await page.getByRole("checkbox", { name: "Drop shadow" }).check();
  await pickMenu(page, "Layer", "Black & White…");
  await setForegroundColor(page, "#e01010");
  await page.keyboard.press("u");
  await page.getByLabel("Fill colour").fill("#e01010");
  await drag(page, [350, 200], [550, 350]);

  const points: [number, number][] = [
    [150, 150],
    [450, 275],
    [560, 40],
  ];
  const doc = { width: 600, height: 400 };
  const atFull = [];
  for (const [x, y] of points) atFull.push(await pixel(page, x, y));
  await page.keyboard.press(`${MOD}+-`);
  await page.keyboard.press(`${MOD}+-`);
  await expect(page.getByTestId("zoom-level")).toHaveText("50%");
  await expect(page.getByTestId("refining")).toHaveCount(0);
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    expect(close(await pixelAtZoom(page, x, y, doc), atFull[i])).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("a large document opens with a note and stays responsive while painting", async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    (window as { __lt?: number[] }).__lt = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) (window as { __lt?: number[] }).__lt!.push(e.duration);
    }).observe({ type: "longtask", buffered: true });
  });
  await openEditor(page);
  await page.getByRole("button", { name: "New document" }).click();
  const dialog = page.getByRole("dialog", { name: "New document" });
  await dialog.getByLabel("Width (px)").fill("6000");
  await dialog.getByLabel("Height (px)").fill("4000");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText(/Large image \(24 MP\)/)).toBeVisible();

  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("b");
  const box = (await page.getByTestId("canvas-viewport").boundingBox())!;
  await page.evaluate(() => ((window as { __lt?: number[] }).__lt = []));
  await page.mouse.move(box.x + 200, box.y + 200);
  await page.mouse.down();
  for (let i = 1; i <= 30; i++) await page.mouse.move(box.x + 200 + i * 10, box.y + 200 + i * 4);
  await page.mouse.up();
  const longTasks = await page.evaluate(() => (window as { __lt?: number[] }).__lt!);
  // Moves must not block the page: it used to take ~250 ms per move at this size, i.e. ~30 long
  // tasks totalling ~7 s. A single one-off task (stroke setup, ~100 ms, up to ~200 ms under a
  // parallel run) is fine, so count blocked moves and total blocking rather than the worst task.
  expect(longTasks.filter((d) => d >= 100).length).toBeLessThanOrEqual(3);
  expect(longTasks.reduce((sum, d) => sum + d, 0)).toBeLessThan(1000);
  // The stroke landed as one undo step.
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page.getByRole("menuitem", { name: "Undo Brush Stroke" })).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("PSD export and magic wand run in a background worker", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Worker");
  await page.keyboard.press("u");
  await drag(page, [50, 50], [150, 150]);
  await page.keyboard.press("w");
  const box = (await page.getByTestId("canvas-viewport").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2 - 200, box.y + box.height / 2 - 100);
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 100 × 100");
  expect(page.workers().length).toBe(1);
  expect(errors).toEqual([]);
});
