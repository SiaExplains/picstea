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
  pickMenu,
} from "./helpers";

async function click(page: Page, x: number, y: number) {
  const p = await at(page, x, y);
  await page.mouse.click(p.x, p.y);
}

const menu = (page: Page, name: string, item: string) => pickMenu(page, name, item);

/** Pen: click the three corners of a triangle and click the first again to close it. */
async function penTriangle(page: Page) {
  await page.keyboard.press("p");
  await click(page, 100, 100);
  await click(page, 300, 100);
  await click(page, 200, 300);
  await click(page, 100, 100);
  await page.mouse.move(1, 1);
}

async function penMode(page: Page, mode: "Shape" | "Path") {
  await page.getByRole("group", { name: "Pen mode" }).getByRole("button", { name: mode }).click();
}

/** Fill the active pixel layer with black (foreground) everywhere. */
async function fillLayerBlack(page: Page) {
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press(`${MOD}+a`);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
  await expect(page.getByTestId("selection-size")).toHaveCount(0);
}

test("Pen in Shape mode makes a filled path shape; Direct Selection reshapes it; undo", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Pen shape");
  await penTriangle(page);
  expect(await layerNames(page)).toEqual(["Shape 1", "Background"]);
  await page.keyboard.press("v");
  expect(isBlue(await pixel(page, 200, 180))).toBe(true);
  expect(isWhite(await pixel(page, 110, 290))).toBe(true);
  expect(isWhite(await pixel(page, 200, 340))).toBe(true);

  // Drag the bottom point 80 px down.
  await page.keyboard.press("a");
  await drag(page, [200, 300], [200, 380]);
  await page.keyboard.press("v");
  expect(isBlue(await pixel(page, 200, 340))).toBe(true);

  await page.keyboard.press(`${MOD}+z`);
  expect(isWhite(await pixel(page, 200, 340))).toBe(true);
  await page.keyboard.press(`${MOD}+z`);
  expect(isWhite(await pixel(page, 200, 180))).toBe(true);
  expect(errors).toEqual([]);
});

test("Pen in Path mode → Make Selection → Fill stays inside the path", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Pen path");
  await page.keyboard.press("p");
  await penMode(page, "Path");
  await penTriangle(page);
  // A work path is not a layer.
  expect(await layerNames(page)).toEqual(["Background"]);
  await page.keyboard.press(`${MOD}+Enter`);
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 200 × 200");
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
  await page.keyboard.press("v");
  expect(isDark(await pixel(page, 200, 180))).toBe(true);
  expect(isWhite(await pixel(page, 110, 290))).toBe(true);
  expect(errors).toEqual([]);
});

test("a vector mask from the work path hides the layer outside the path", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Vector mask");
  await fillLayerBlack(page);
  await page.keyboard.press("p");
  await penMode(page, "Path");
  await penTriangle(page);
  await menu(page, "Layer", "Add Vector Mask from Path");
  await expect(page.getByTestId("vector-mask-thumb")).toBeVisible();
  await page.keyboard.press("v");
  expect(isDark(await pixel(page, 200, 180))).toBe(true);
  expect(isWhite(await pixel(page, 50, 50))).toBe(true);
  // Moving the layer moves its (linked) mask too.
  await drag(page, [200, 180], [250, 180]);
  expect(isDark(await pixel(page, 250, 180))).toBe(true);
  expect(isWhite(await pixel(page, 150, 120))).toBe(true);
  expect(errors).toEqual([]);
});

test("a clipping mask limits a layer to the one below; survives reload; release restores", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Clipping");
  await page.keyboard.press("u");
  await page.getByRole("group", { name: "Shape" }).getByRole("button", { name: "Ellipse" }).click();
  await drag(page, [100, 100], [300, 300]);
  await fillLayerBlack(page);
  expect(isDark(await pixel(page, 50, 50))).toBe(true);

  await page.keyboard.press(`${MOD}+Alt+g`);
  await expect(page.locator('[data-testid="layer-row"][data-clipped="true"]')).toHaveCount(1);
  expect(isDark(await pixel(page, 200, 200))).toBe(true);
  expect(isWhite(await pixel(page, 50, 50))).toBe(true);
  expect(isWhite(await pixel(page, 110, 110))).toBe(true);

  await expect(page.getByTestId("save-state")).toHaveText(/Saved/);
  await page.reload();
  await page
    .getByRole("list", { name: "Recent projects" })
    .getByRole("button", { name: /^Clipping/ })
    .click();
  await page.getByRole("button", { name: "100%" }).click();
  // Images of a reopened project decode asynchronously.
  await expect.poll(async () => isDark(await pixel(page, 200, 200))).toBe(true);
  expect(isWhite(await pixel(page, 50, 50))).toBe(true);

  await page.getByRole("button", { name: "Layer 1", exact: true }).click();
  await menu(page, "Layer", "Release Clipping Mask");
  await expect.poll(async () => isDark(await pixel(page, 50, 50))).toBe(true);
  expect(errors).toEqual([]);
});

test("selection → work path → selection keeps the area", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Trace");
  await page.keyboard.press("m");
  // Away from the canvas centre line (y = 200), which the edge would snap to.
  await drag(page, [100, 100], [300, 190]);
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 200 × 90");
  await menu(page, "Select", "Make Work Path from Selection…");
  await page
    .getByRole("dialog", { name: "Make Work Path" })
    .getByRole("button", { name: "OK" })
    .click();
  await page.keyboard.press(`${MOD}+d`);
  await expect(page.getByTestId("selection-size")).toHaveCount(0);
  await menu(page, "Select", "Make Selection from Path");
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 200 × 90");
  expect(errors).toEqual([]);
});
