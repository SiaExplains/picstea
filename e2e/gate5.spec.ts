import { expect, test, type Page } from "@playwright/test";
import {
  at,
  drag,
  isBlue,
  isDark,
  isWhite,
  layerNames,
  MOD,
  newDocument,
  pixel,
  trackErrors,
} from "./helpers";

const luminance = (rgba: number[]) => (rgba[0] + rgba[1] + rgba[2]) / 3;

async function newPixelLayer(page: Page) {
  await page.keyboard.press(`${MOD}+Shift+n`);
}

async function click(page: Page, x: number, y: number) {
  const p = await at(page, x, y);
  await page.mouse.click(p.x, p.y);
  await page.mouse.move(1, 1);
}

/** Marching ants are drawn on the canvas; deselect before reading pixels near edges. */
async function deselect(page: Page) {
  await page.keyboard.press(`${MOD}+d`);
  await expect(page.getByTestId("selection-size")).toHaveCount(0);
}

test("marquee + Fill, then Delete clears only the selection and undo restores it", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Marquee");
  // This test measures exact drag sizes; snapping would pull the edge onto the canvas centre.
  await page.getByRole("menuitem", { name: "View", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Snap", exact: true }).click();
  await newPixelLayer(page);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [300, 200]);
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 200 × 100");
  await page.keyboard.press("Shift+F5");

  // A press inside a selection would move it; start a fresh one.
  await deselect(page);
  await drag(page, [150, 120], [250, 180]);
  await page.keyboard.press("Delete");
  const layers = await layerNames(page);
  await deselect(page);
  expect(isWhite(await pixel(page, 200, 150))).toBe(true);
  expect(isDark(await pixel(page, 120, 110))).toBe(true);
  expect(isWhite(await pixel(page, 50, 50))).toBe(true);
  // Delete with a selection cleared pixels; it did not delete the layer.
  expect(await layerNames(page)).toEqual(layers);
  expect(layers).toHaveLength(2);

  await page.keyboard.press(`${MOD}+z`); // deselect
  await page.keyboard.press(`${MOD}+z`); // clear
  await deselect(page);
  expect(isDark(await pixel(page, 200, 150))).toBe(true);
  expect(errors).toEqual([]);
});

test("an elliptical selection clips the brush; Select Inverse flips it", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Ellipse");
  await newPixelLayer(page);
  await page.keyboard.press("m");
  await page
    .getByRole("group", { name: "Marquee shape" })
    .getByRole("button", { name: "Ellipse" })
    .click();
  await drag(page, [200, 100], [400, 300]);

  await page.keyboard.press("b");
  await drag(page, [60, 200], [540, 200]);
  await page.keyboard.press(`${MOD}+Shift+i`);
  await drag(page, [300, 20], [300, 380]);
  await deselect(page);

  expect(isDark(await pixel(page, 250, 200))).toBe(true); // first stroke, inside the ellipse
  expect(isWhite(await pixel(page, 100, 200))).toBe(true); // first stroke, outside: clipped
  expect(isDark(await pixel(page, 300, 50))).toBe(true); // second stroke, outside the ellipse
  expect(isWhite(await pixel(page, 300, 150))).toBe(true); // second stroke, inside: clipped
  expect(errors).toEqual([]);
});

test("magic wand selects a shape and Layer via Copy puts it on its own layer", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Wand");
  await page.keyboard.press("u");
  await drag(page, [50, 50], [150, 150]);
  await page.keyboard.press("w");
  await click(page, 100, 100);
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 100 × 100");

  await page.keyboard.press(`${MOD}+j`);
  expect(await layerNames(page)).toEqual(["Rectangle 1 copy", "Rectangle 1", "Background"]);
  // The copy is a pixel layer with only the shape: hide the original, the shape stays.
  await page
    .locator('[data-layer-name="Rectangle 1"]')
    .getByRole("button", { name: /Hide/ })
    .click();
  await deselect(page);
  expect(isBlue(await pixel(page, 100, 100))).toBe(true);
  expect(isWhite(await pixel(page, 200, 100))).toBe(true);
  expect(errors).toEqual([]);
});

test("paint bucket fills the contiguous area and leaves other colours alone", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Bucket");
  await page.keyboard.press("u");
  await drag(page, [50, 50], [150, 150]);
  await newPixelLayer(page);
  await page.keyboard.press("Shift+g");
  await page.getByRole("checkbox", { name: "Sample all layers" }).check();
  await click(page, 300, 300);
  // The flood fill runs in a worker, so the result arrives a moment later.
  await expect.poll(async () => isDark(await pixel(page, 300, 300))).toBe(true);
  expect(isDark(await pixel(page, 5, 5))).toBe(true);
  expect(isBlue(await pixel(page, 100, 100))).toBe(true);
  expect(errors).toEqual([]);
});

test("gradient runs from the foreground to the background colour", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Gradient");
  await newPixelLayer(page);
  await page.keyboard.press("g");
  await drag(page, [100, 200], [500, 200]);
  expect(isDark(await pixel(page, 50, 200))).toBe(true);
  expect(isWhite(await pixel(page, 550, 200))).toBe(true);
  const middle = luminance(await pixel(page, 300, 100));
  expect(middle).toBeGreaterThan(100);
  expect(middle).toBeLessThan(156);
  await page.keyboard.press(`${MOD}+z`);
  expect(isWhite(await pixel(page, 50, 200))).toBe(true);
  expect(errors).toEqual([]);
});

test("eyedropper picks the colour under the pointer", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Eyedropper");
  await page.keyboard.press("u");
  await drag(page, [50, 50], [150, 150]);
  await page.keyboard.press("i");
  await click(page, 100, 100);
  await expect(page.getByLabel("Foreground colour")).toHaveValue("#4c8dff");
  // Alt-click with the brush picks too.
  await page.keyboard.press("b");
  const p = await at(page, 300, 300);
  await page.keyboard.down("Alt");
  await page.mouse.click(p.x, p.y);
  await page.keyboard.up("Alt");
  await expect(page.getByLabel("Foreground colour")).toHaveValue("#ffffff");
  expect(errors).toEqual([]);
});

test("feathering softens the edge of a filled selection", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Feather");
  await newPixelLayer(page);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [300, 300]);
  await page.keyboard.press("Shift+F6");
  const dialog = page.getByRole("dialog", { name: "Feather Selection" });
  await dialog.getByLabel("Feather radius (px)").fill("16");
  await dialog.getByRole("button", { name: "OK" }).click();
  await page.keyboard.press("Shift+F5");
  await deselect(page);
  expect(isDark(await pixel(page, 200, 200))).toBe(true);
  const edge = luminance(await pixel(page, 100, 200));
  expect(edge).toBeGreaterThan(60);
  expect(edge).toBeLessThan(200);
  expect(errors).toEqual([]);
});

test("copy and paste puts the selected pixels on a new layer in place", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Clipboard");
  await newPixelLayer(page);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [200, 200]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+c`);
  await page.keyboard.press(`${MOD}+v`);
  expect(await layerNames(page)).toEqual(["Layer 2", "Layer 1", "Background"]);
  // Edit → Paste does the same.
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("menuitem", { name: "Paste", exact: true }).click();
  expect(await layerNames(page)).toEqual(["Layer 3", "Layer 2", "Layer 1", "Background"]);
  await page.keyboard.press(`${MOD}+z`);
  // Clear the original: the pasted copy still covers the same place.
  await page.locator('[data-layer-name="Layer 1"]').getByRole("button", { name: /Hide/ }).click();
  await deselect(page);
  expect(isDark(await pixel(page, 150, 150))).toBe(true);
  expect(isWhite(await pixel(page, 250, 150))).toBe(true);
  expect(errors).toEqual([]);
});

test("a selection is not saved with the project", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Unsaved selection");
  await page.keyboard.press(`${MOD}+a`);
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 600 × 400");
  await page.keyboard.press(`${MOD}+s`);
  await expect(page.getByTestId("save-state")).toHaveText("Saved in this browser");
  await page.reload();
  await page
    .getByRole("list", { name: "Recent projects" })
    .getByRole("button", { name: /^Unsaved selection/ })
    .click();
  await expect(page.getByTestId("zoom-level")).toBeVisible();
  await expect(page.getByTestId("selection-size")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("polygonal lasso, Color Range and Transform Selection, all without network", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const offending: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (
      url.protocol !== "blob:" &&
      url.protocol !== "data:" &&
      (r.method() !== "GET" || url.port !== "3100")
    ) {
      offending.push(`${r.method()} ${r.url()}`);
    }
  });
  await newDocument(page, "Lasso");

  // Polygonal lasso: a right triangle with legs of 100 px.
  await page.keyboard.press("l");
  await page.getByRole("button", { name: "Polygonal" }).click();
  await click(page, 100, 100);
  await click(page, 200, 100);
  await click(page, 100, 200);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 100 × 100");

  // Transform Selection: drag the bottom-right handle out by 100 px (scale 2×).
  await page.getByRole("menuitem", { name: "Select" }).click();
  await page.getByRole("menuitem", { name: "Transform Selection" }).click();
  const from = await at(page, 200, 200);
  const to = await at(page, 300, 300);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 200 × 200");
  await page.keyboard.press(`${MOD}+z`);
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 100 × 100");

  // Color Range on a blue shape selects exactly the shape.
  await deselect(page);
  await page.keyboard.press("u");
  await drag(page, [300, 50], [400, 150]);
  await page.getByLabel("Foreground colour").fill("#4c8dff");
  await page.getByRole("menuitem", { name: "Select" }).click();
  await page.getByRole("menuitem", { name: "Color Range…" }).click();
  const dialog = page.getByRole("dialog", { name: "Color Range" });
  await expect(dialog.getByText("100 × 100 px area")).toBeVisible();
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 100 × 100");

  // Expand by 5 px on every side.
  await page.getByRole("menuitem", { name: "Select" }).click();
  await page.getByRole("menuitem", { name: "Expand…" }).click();
  const expand = page.getByRole("dialog", { name: "Expand Selection" });
  await expand.getByLabel("By (px)").fill("5");
  await expand.getByRole("button", { name: "OK" }).click();
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 110 × 110");

  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});
