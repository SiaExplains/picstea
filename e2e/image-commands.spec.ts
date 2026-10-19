import { expect, test, type Page } from "@playwright/test";
import {
  drag,
  isBlue,
  isWhite,
  layerNames,
  MOD,
  newDocument,
  pickMenu,
  trackErrors,
} from "./helpers";

/** Image menu commands (ADR-0033). The document is 600 × 400 at the start. */

const size = (page: Page) =>
  page.getByRole("contentinfo", { name: "Status" }).getByText(/^\d+ × \d+ px$/);

async function rectangle(page: Page, from: [number, number], to: [number, number]) {
  await page.keyboard.press("u");
  await drag(page, from, to);
}

/** RGBA of a document point on the on-screen canvas, for any document size (100% zoom). */
async function pixelOf(page: Page, docWidth: number, docHeight: number, x: number, y: number) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  return page.evaluate(
    ([w, h, px, py]) => {
      const viewport = document.querySelector('[data-testid="canvas-viewport"]')!;
      const box = viewport.getBoundingClientRect();
      const sx = box.x + Math.round((box.width - w) / 2) + px;
      const sy = box.y + Math.round((box.height - h) / 2) + py;
      const canvas = viewport.querySelector("canvas") as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      return [
        ...canvas
          .getContext("2d")!
          .getImageData(Math.round((sx - rect.left) * dpr), Math.round((sy - rect.top) * dpr), 1, 1)
          .data,
      ];
    },
    [docWidth, docHeight, x, y] as const,
  );
}

test("rotate and flip the canvas, with the layers turning along", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Rotate");
  await rectangle(page, [100, 100], [200, 150]);
  await pickMenu(page, "Image", "90° Clockwise");
  await expect(size(page)).toHaveText("400 × 600 px");
  await page.getByRole("button", { name: "100%" }).click();
  // (150, 125) turns to (400 − 125, 150).
  expect(isBlue(await pixelOf(page, 400, 600, 275, 150))).toBe(true);
  expect(isWhite(await pixelOf(page, 400, 600, 150, 125))).toBe(true);
  await pickMenu(page, "Image", "Flip Canvas Horizontal");
  expect(isBlue(await pixelOf(page, 400, 600, 400 - 275, 150))).toBe(true);
  await page.keyboard.press(`${MOD}+z`);
  await page.keyboard.press(`${MOD}+z`);
  await expect(size(page)).toHaveText("600 × 400 px");
  expect(errors).toEqual([]);
});

test("Image Size scales everything; Canvas Size adds room on one side", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Sizes");
  await rectangle(page, [100, 100], [200, 200]);

  await pickMenu(page, "Image", "Image Size…");
  const imageSize = page.getByRole("dialog", { name: "Image Size" });
  await imageSize.getByLabel("Width (px)").fill("300");
  await expect(imageSize.getByLabel("Height (px)")).toHaveValue("200");
  await imageSize.getByRole("button", { name: "OK" }).click();
  await expect(size(page)).toHaveText("300 × 200 px");
  await page.getByRole("button", { name: "100%" }).click();
  // The square now spans 50…100.
  expect(isBlue(await pixelOf(page, 300, 200, 75, 75))).toBe(true);
  expect(isWhite(await pixelOf(page, 300, 200, 120, 75))).toBe(true);

  await pickMenu(page, "Image", "Canvas Size…");
  const canvasSize = page.getByRole("dialog", { name: "Canvas Size" });
  await canvasSize.getByLabel("Relative (add to the current size)").check();
  await canvasSize.getByLabel("Width (px)").fill("100");
  await canvasSize.getByRole("radio", { name: "Left", exact: true }).click();
  await canvasSize.getByRole("button", { name: "OK" }).click();
  await expect(size(page)).toHaveText("400 × 200 px");
  await page.getByRole("button", { name: "100%" }).click();
  // Anchored left: the content stays where it was.
  expect(isBlue(await pixelOf(page, 400, 200, 75, 75))).toBe(true);
  expect(errors).toEqual([]);
});

test("Trim and Reveal All", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Trim");
  await rectangle(page, [100, 100], [200, 150]);
  await pickMenu(page, "Image", "Trim…");
  const trim = page.getByRole("dialog", { name: "Trim" });
  await trim.getByLabel("Top left pixel colour").check();
  await trim.getByRole("button", { name: "OK" }).click();
  await expect(size(page)).toHaveText(/^10[01] × 5[01] px$/);
  await page.keyboard.press(`${MOD}+z`);
  await expect(size(page)).toHaveText("600 × 400 px");

  // Move the rectangle half off the right edge, then reveal it.
  await page.keyboard.press("v");
  await drag(page, [150, 125], [600, 125]);
  await pickMenu(page, "Image", "Reveal All");
  await expect(size(page)).toHaveText(/^65\d × 400 px$/);
  expect(errors).toEqual([]);
});

test("Auto Tone adds a Levels layer; Duplicate opens a copy in a new tab", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Auto");
  await rectangle(page, [100, 100], [200, 200]);
  await page.keyboard.press(`${MOD}+Shift+l`);
  expect(await layerNames(page)).toEqual(["Auto Tone", "Rectangle 1", "Background"]);
  await pickMenu(page, "Image", "Auto Contrast");
  // White and blue already span the full range together: nothing to do, with a note.
  await expect(
    page.getByText(/Auto Contrast: the image already uses the full range/),
  ).toBeVisible();

  await pickMenu(page, "Image", "Duplicate");
  await expect(page.getByRole("tab", { name: "Auto copy" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await layerNames(page)).toEqual(["Auto Tone", "Rectangle 1", "Background"]);
  expect(errors).toEqual([]);
});
