import { expect, test, type Page } from "@playwright/test";
import { at, drag, isDark, isWhite, MOD, newDocument, pixel, trackErrors } from "./helpers";

/** A new document with a dark 100 × 100 square on a pixel layer, selected, and the Move tool. */
async function selectedSquare(page: Page) {
  await newDocument(page, "Move pixels");
  // Exact positions: snapping would pull the edges onto the canvas centre.
  await page.getByRole("menuitem", { name: "View", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Snap", exact: true }).click();
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [200, 200]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press("v");
}

const dark = async (page: Page, x: number, y: number) => isDark(await pixel(page, x, y));
const white = async (page: Page, x: number, y: number) => isWhite(await pixel(page, x, y));

test("with a selection, the Move tool moves the selected pixels and the outline", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await selectedSquare(page);

  await drag(page, [150, 150], [350, 150]);
  expect(await white(page, 150, 150)).toBe(true); // a hole is left behind
  expect(await dark(page, 350, 150)).toBe(true);
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 100 × 100");

  // One undo step puts the pixels back.
  await page.keyboard.press(`${MOD}+z`);
  expect(await dark(page, 150, 150)).toBe(true);
  expect(await white(page, 350, 150)).toBe(true);

  // Esc during a drag changes nothing.
  const a = await at(page, 150, 150);
  const b = await at(page, 150, 300);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.mouse.move(1, 1);
  expect(await dark(page, 150, 150)).toBe(true);
  expect(await white(page, 150, 300)).toBe(true);
  expect(errors).toEqual([]);
});

test("Alt-drag moves a copy, and arrow keys nudge it", async ({ page }) => {
  const errors = trackErrors(page);
  await selectedSquare(page);

  await page.keyboard.down("Alt");
  await drag(page, [150, 150], [150, 300]);
  await page.keyboard.up("Alt");
  expect(await dark(page, 150, 150)).toBe(true); // the original stays
  expect(await dark(page, 150, 300)).toBe(true); // the copy

  for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowRight");
  expect(await white(page, 115, 300)).toBe(true);
  expect(await dark(page, 215, 300)).toBe(true);
  expect(await dark(page, 150, 150)).toBe(true);

  // The nudges are one undo step.
  await page.keyboard.press(`${MOD}+z`);
  expect(await dark(page, 115, 300)).toBe(true);
  expect(await white(page, 215, 300)).toBe(true);
  expect(errors).toEqual([]);
});

test("without a selection, the Move tool still moves the whole layer", async ({ page }) => {
  const errors = trackErrors(page);
  await selectedSquare(page);
  await page.keyboard.press(`${MOD}+d`);
  await expect(page.getByTestId("selection-size")).toHaveCount(0);

  await drag(page, [150, 150], [150, 170]);
  expect(await white(page, 150, 110)).toBe(true);
  expect(await dark(page, 150, 210)).toBe(true);
  expect(errors).toEqual([]);
});
