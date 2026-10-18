import { expect, type Page } from "@playwright/test";

export const MOD = process.platform === "darwin" ? "Meta" : "Control";
export const DOC = { width: 600, height: 400 };

/** Collect console errors so every test can assert a clean console. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

/** Open the editor (the home page) with the first-visit welcome dialog already dismissed. */
export async function openEditor(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("picstea.welcomeSeen", "1"));
  await page.goto("/");
}

export async function newDocument(page: Page, name = "Gate three") {
  // Force the download-link fallback; the native save dialog cannot be driven headlessly.
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
  await openEditor(page);
  await page.getByRole("button", { name: "New document" }).click();
  const dialog = page.getByRole("dialog", { name: "New document" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Width (px)").fill(String(DOC.width));
  await dialog.getByLabel("Height (px)").fill(String(DOC.height));
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "100%" }).click();
  await expect(page.getByTestId("zoom-level")).toHaveText("100%");
}

/** Screen position of a document point at 100% zoom (the document is centred). */
export async function at(page: Page, x: number, y: number) {
  const box = (await page.getByTestId("canvas-viewport").boundingBox())!;
  return {
    x: box.x + Math.round((box.width - DOC.width) / 2) + x,
    y: box.y + Math.round((box.height - DOC.height) / 2) + y,
  };
}

export async function drag(page: Page, from: [number, number], to: [number, number]) {
  const a = await at(page, ...from);
  const b = await at(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  // Leave the canvas so hover feedback (brush outline, handles) doesn't affect pixel checks.
  await page.mouse.move(1, 1);
}

/** Darkest luminance in a document-space rectangle of the on-screen canvas. */
export async function darkest(
  page: Page,
  x: number,
  y: number,
  w: number,
  h: number,
): Promise<number> {
  const p = await at(page, x, y);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  return page.evaluate(
    ([sx, sy, sw, sh]) => {
      const canvas = document.querySelector(
        '[data-testid="canvas-viewport"] canvas',
      ) as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      const data = canvas
        .getContext("2d")!
        .getImageData(
          Math.round((sx - rect.left) * dpr),
          Math.round((sy - rect.top) * dpr),
          Math.round(sw * dpr),
          Math.round(sh * dpr),
        ).data;
      let min = 255;
      for (let i = 0; i < data.length; i += 4)
        min = Math.min(min, (data[i] + data[i + 1] + data[i + 2]) / 3);
      return min;
    },
    [p.x, p.y, w, h] as const,
  );
}

/** RGBA of the on-screen canvas at a document point. */
export async function pixel(page: Page, x: number, y: number): Promise<number[]> {
  const p = await at(page, x, y);
  // Rendering is batched to the next animation frame.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  return page.evaluate(
    ([sx, sy]) => {
      const canvas = document.querySelector(
        '[data-testid="canvas-viewport"] canvas',
      ) as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      const ctx = canvas.getContext("2d")!;
      return [
        ...ctx.getImageData(
          Math.round((sx - rect.left) * dpr),
          Math.round((sy - rect.top) * dpr),
          1,
          1,
        ).data,
      ];
    },
    [p.x, p.y] as const,
  );
}

export const isWhite = (rgba: number[]) => rgba[0] > 240 && rgba[1] > 240 && rgba[2] > 240;
export const isDark = (rgba: number[]) => rgba[0] < 60 && rgba[1] < 60 && rgba[2] < 60;
export const isBlue = (rgba: number[]) => rgba[2] > 200 && rgba[0] < 120;

export const layerNames = (page: Page) =>
  page
    .getByTestId("layer-row")
    .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-layer-name")));

/** Set the foreground colour through the toolbar colour picker. */
export async function setForegroundColor(page: Page, hex: string) {
  await page.getByRole("button", { name: "Foreground colour" }).click();
  const dialog = page.getByRole("dialog", { name: "Foreground Colour" });
  await dialog.getByLabel("Hex").fill(hex);
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(page.getByRole("button", { name: "Foreground colour" })).toHaveAttribute(
    "data-color",
    hex,
  );
}
