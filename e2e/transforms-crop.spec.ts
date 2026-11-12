import { expect, test, type Page } from "@playwright/test";
import {
  drag,
  isBlue,
  isDark,
  isWhite,
  layerNames,
  MOD,
  newDocument,
  pickMenu,
  pixel,
  trackErrors,
} from "./helpers";

/** 0.49.0: Skew/Distort/Perspective/Warp, crop presets, Straighten, Perspective Crop, shapes. */

async function noSnap(page: Page) {
  await page.getByRole("menuitem", { name: "View", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Snap", exact: true }).click();
}

async function px(page: Page, x: number, y: number) {
  await page.mouse.move(1, 1);
  return pixel(page, x, y);
}

/** A new pixel layer with a filled rectangle, the selection still active. */
async function filledBox(page: Page, from: [number, number], to: [number, number]) {
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, from, to);
  await page.keyboard.press("Shift+F5");
}

const canvasSize = (page: Page) => page.getByText(/^\d+ × \d+ px$/).first();

test("Distort moves a corner of the selected pixels; undo puts them back", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Distort");
  await noSnap(page);
  await filledBox(page, [100, 100], [200, 200]);
  expect(isWhite(await px(page, 220, 180))).toBe(true);
  await pickMenu(page, "Edit", "Distort");
  await drag(page, [200, 200], [300, 260]);
  await page.keyboard.press("Enter");
  expect(isDark(await px(page, 220, 180))).toBe(true);
  expect(isDark(await px(page, 150, 150))).toBe(true);
  await page.keyboard.press(`${MOD}+z`);
  expect(isWhite(await px(page, 220, 180))).toBe(true);
  expect(errors).toEqual([]);
});

test("Warp with the Arc style bends a layer; Esc leaves it unchanged", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Warp");
  await noSnap(page);
  await filledBox(page, [100, 180], [500, 220]);
  await page.keyboard.press(`${MOD}+d`);
  await pickMenu(page, "Edit", "Warp");
  await page.keyboard.press("Escape");
  expect(isWhite(await px(page, 300, 150))).toBe(true);

  await pickMenu(page, "Edit", "Warp");
  await page
    .getByRole("toolbar", { name: "Tool options" })
    .getByRole("combobox")
    .selectOption("arc");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  // The middle of the band moved up; its ends stayed lower.
  const above = await Promise.all([170, 160, 150, 140, 130].map((y) => px(page, 300, y)));
  expect(above.some(isDark)).toBe(true);
  expect(errors).toEqual([]);
});

test("Perspective turns a shape into an editable smart object", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Perspective");
  await noSnap(page);
  await page.keyboard.press("u");
  await drag(page, [100, 100], [300, 300]);
  await pickMenu(page, "Edit", "Perspective");
  await expect(page.getByText(/became a smart object/)).toBeVisible();
  await drag(page, [300, 100], [340, 100]);
  await page.keyboard.press("Enter");
  // The top grew outwards on both sides, the bottom stayed.
  expect(isBlue(await px(page, 85, 105))).toBe(true);
  expect(isBlue(await px(page, 330, 105))).toBe(true);
  expect(isWhite(await px(page, 85, 295))).toBe(true);
  expect(await layerNames(page)).toEqual(["Rectangle 1", "Background"]);
  expect(errors).toEqual([]);
});

test("Crop presets, Straighten and Perspective Crop", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Crop");
  await noSnap(page);
  await expect(canvasSize(page)).toHaveText("600 × 400 px");

  await page.keyboard.press("c");
  await page
    .getByRole("toolbar", { name: "Tool options" })
    .getByRole("combobox")
    .first()
    .selectOption("1:1");
  await page.keyboard.press("Enter");
  await expect(canvasSize(page)).toHaveText("400 × 400 px");

  await page.keyboard.press(`${MOD}+z`);
  await expect(canvasSize(page)).toHaveText("600 × 400 px");
  await page
    .getByRole("toolbar", { name: "Tool options" })
    .getByRole("combobox")
    .first()
    .selectOption("free");
  await page.getByRole("button", { name: "Straighten" }).click();
  await drag(page, [100, 100], [500, 140]);
  await expect(canvasSize(page)).not.toHaveText("600 × 400 px");

  await page.keyboard.press(`${MOD}+z`);
  await expect(canvasSize(page)).toHaveText("600 × 400 px");
  await page.keyboard.press("Shift+c");
  await drag(page, [100, 100], [300, 300]);
  await page.keyboard.press("Enter");
  await expect(canvasSize(page)).toHaveText("200 × 200 px");
  expect(errors).toEqual([]);
});

test("Custom shapes and stars are editable shape layers", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Shapes");
  await noSnap(page);
  await page.keyboard.press("u");
  const options = page.getByRole("toolbar", { name: "Tool options" });
  await options.getByRole("button", { name: "Custom Shape" }).click();
  await drag(page, [100, 100], [300, 200]);
  expect(await layerNames(page)).toEqual(["Arrow right 1", "Background"]);
  expect(isBlue(await px(page, 150, 150))).toBe(true);

  await options.getByRole("button", { name: "Polygon" }).click();
  await options.getByRole("spinbutton", { name: "Star" }).fill("50");
  await options.getByRole("spinbutton", { name: "Star" }).press("Enter");
  await drag(page, [350, 100], [550, 300]);
  expect((await layerNames(page))[0]).toBe("Star 1");
  expect(errors).toEqual([]);
});
