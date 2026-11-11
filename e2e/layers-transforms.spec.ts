import { expect, test, type Page } from "@playwright/test";
import {
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

/** 0.48.0: growing pixel layers, masks and strokes through transforms, several layers at once. */

const rows = (page: Page) => page.getByTestId("layer-row");
const row = (page: Page, name: string) =>
  rows(page).and(page.locator(`[data-layer-name="${name}"]`));

async function noSnap(page: Page) {
  await page.getByRole("menuitem", { name: "View", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Snap", exact: true }).click();
}

async function at(page: Page, x: number, y: number) {
  await page.mouse.move(1, 1);
  return pixel(page, x, y);
}

const field = (page: Page, name: string) => page.getByRole("spinbutton", { name, exact: true });

async function setField(page: Page, name: string, value: string) {
  await field(page, name).fill(value);
  await field(page, name).press("Enter");
}

test("a brush stroke past a small pixel layer grows it; undo restores its box", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Grow");
  await noSnap(page);
  // A 50 × 50 pixel layer: fill a selection, then Layer via Copy.
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [150, 150]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+j`);
  await page.keyboard.press(`${MOD}+d`);
  await row(page, "Layer 1")
    .getByRole("button", { name: /^Hide / })
    .click();
  await expect(page.getByText("Pixel layer · 50 × 50 px")).toBeVisible();

  await page.keyboard.press("b");
  await drag(page, [300, 300], [500, 300]);
  expect(isDark(await at(page, 400, 300))).toBe(true);
  expect(isDark(await at(page, 125, 125))).toBe(true);
  await expect(page.getByText(/Pixel layer · \d+ × \d+ px/)).not.toHaveText(
    "Pixel layer · 50 × 50 px",
  );

  await page.keyboard.press(`${MOD}+z`);
  expect(isWhite(await at(page, 400, 300))).toBe(true);
  await expect(page.getByText("Pixel layer · 50 × 50 px")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Fill on a selection outside a small layer grows it", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Grow fill");
  await noSnap(page);
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [150, 150]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+j`);
  await row(page, "Layer 1")
    .getByRole("button", { name: /^Hide / })
    .click();
  await drag(page, [400, 250], [450, 300]);
  await page.keyboard.press("Shift+F5");
  expect(isDark(await at(page, 425, 275))).toBe(true);
  expect(errors).toEqual([]);
});

test("scaling a masked layer scales its mask too", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Mask scale");
  await noSnap(page);
  await page.keyboard.press("u");
  await drag(page, [100, 100], [200, 200]);
  await page.getByRole("button", { name: "Add Layer Mask" }).click();
  // Hide a band across the shape's middle by painting black on the mask.
  await page.keyboard.press("b");
  await drag(page, [95, 150], [205, 150]);
  expect(isWhite(await at(page, 150, 150))).toBe(true);
  expect(isBlue(await at(page, 150, 110))).toBe(true);

  await setField(page, "W", "200");
  await setField(page, "H", "200");
  // Scaled 2× about the centre: the shape spans 50–250, the hidden band grew with it.
  expect(isBlue(await at(page, 60, 60))).toBe(true);
  expect(isWhite(await at(page, 60, 150))).toBe(true);
  expect(isWhite(await at(page, 240, 150))).toBe(true);
  expect(isBlue(await at(page, 150, 70))).toBe(true);

  await page.keyboard.press(`${MOD}+z`);
  await page.keyboard.press(`${MOD}+z`);
  expect(isWhite(await at(page, 60, 60))).toBe(true);
  expect(errors).toEqual([]);
});

test("scaling a shape keeps its stroke width unless Scale strokes & effects is on", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Stroke scale");
  await noSnap(page);
  await page.keyboard.press("u");
  await drag(page, [100, 100], [150, 150]);
  const properties = page.locator('[data-panel="properties"]');
  await properties.getByRole("checkbox", { name: "Stroke", exact: true }).first().check();
  await setField(page, "Width", "2");

  await setField(page, "W", "150");
  await expect(field(page, "W")).toHaveValue("150");
  await expect(field(page, "Width")).toHaveValue("2");

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("v");
  await page.getByRole("checkbox", { name: "Scale strokes & effects" }).check();
  await setField(page, "H", "150");
  await expect(field(page, "Width")).toHaveValue(/^3\.5|^3\.4|^3\.46/);
  expect(errors).toEqual([]);
});

test("opacity and blend apply to every selected layer, as one undo step", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Multi opacity");
  await noSnap(page);
  for (const x of [50, 200, 350]) {
    await page.keyboard.press("u");
    await drag(page, [x, 50], [x + 100, 150]);
  }
  expect(await layerNames(page)).toEqual([
    "Rectangle 3",
    "Rectangle 2",
    "Rectangle 1",
    "Background",
  ]);
  await row(page, "Rectangle 1").click();
  await row(page, "Rectangle 3").click({ modifiers: ["Shift"] });
  await expect(page.getByTestId("multi-selection")).toContainText("3 layers selected");

  await field(page, "Opacity percent").fill("50");
  await field(page, "Opacity percent").press("Tab");
  for (const x of [100, 250, 400]) expect(isBlue(await at(page, x, 100))).toBe(false);
  await expect(field(page, "Opacity percent")).toHaveValue("50");

  // Different values show as mixed.
  await row(page, "Rectangle 1").click();
  await field(page, "Opacity percent").fill("80");
  await field(page, "Opacity percent").press("Tab");
  await row(page, "Rectangle 3").click({ modifiers: ["Shift"] });
  await expect(field(page, "Opacity percent")).toHaveValue("");
  await expect(field(page, "Opacity percent")).toHaveAttribute("placeholder", "—");

  await page.keyboard.press(`${MOD}+z`);
  await page.keyboard.press(`${MOD}+z`);
  for (const x of [100, 250, 400]) expect(isBlue(await at(page, x, 100))).toBe(true);
  expect(errors).toEqual([]);
});
