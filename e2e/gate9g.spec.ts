import { expect, test, type Page } from "@playwright/test";
import {
  at,
  drag,
  isBlue,
  layerNames,
  MOD,
  newDocument,
  pixel,
  trackErrors,
  pickMenu,
} from "./helpers";

const menu = (page: Page, name: string, item: string) => pickMenu(page, name, item);

/** Rectangles drawn with the Shape tool (default blue fill); snapping off for exact positions. */
async function rectangles(page: Page, boxes: [number, number, number, number][]) {
  await page.getByRole("menuitem", { name: "View", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Snap", exact: true }).click();
  await page.keyboard.press("u");
  for (const [x0, y0, x1, y1] of boxes) await drag(page, [x0, y0], [x1, y1]);
}

const row = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function blueAt(page: Page, x: number, y: number) {
  await page.mouse.move(1, 1);
  return isBlue(await pixel(page, x, y));
}

test("Cmd/Ctrl-click selects several layers; they move together as one undo step", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Multi move");
  await rectangles(page, [
    [50, 50, 100, 100],
    [150, 50, 200, 100],
    [250, 50, 300, 100],
  ]);
  await row(page, "Rectangle 1").click();
  await row(page, "Rectangle 2").click({ modifiers: [MOD] });
  await expect(page.getByTestId("multi-selection")).toContainText("2 layers selected");

  await page.keyboard.press("v");
  await drag(page, [75, 75], [75, 275]);
  expect(await blueAt(page, 75, 275)).toBe(true);
  expect(await blueAt(page, 175, 275)).toBe(true);
  // Not selected: stays.
  expect(await blueAt(page, 275, 75)).toBe(true);
  expect(await blueAt(page, 75, 75)).toBe(false);

  await page.keyboard.press(`${MOD}+z`);
  expect(await blueAt(page, 75, 75)).toBe(true);
  expect(await blueAt(page, 175, 75)).toBe(true);
  expect(await blueAt(page, 175, 275)).toBe(false);
  expect(errors).toEqual([]);
});

test("Shift-click selects a range; Delete and Group work on all of it", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Multi range");
  await rectangles(page, [
    [50, 50, 100, 100],
    [150, 50, 200, 100],
    [250, 50, 300, 100],
  ]);
  await row(page, "Rectangle 3").click();
  await row(page, "Rectangle 1").click({ modifiers: ["Shift"] });
  await expect(page.locator('[data-testid="layer-row"][data-selected="true"]')).toHaveCount(3);

  await page.keyboard.press("Delete");
  expect(await layerNames(page)).toEqual(["Background"]);
  await page.keyboard.press(`${MOD}+z`);
  expect(await layerNames(page)).toEqual([
    "Rectangle 3",
    "Rectangle 2",
    "Rectangle 1",
    "Background",
  ]);

  await row(page, "Rectangle 3").click();
  await row(page, "Rectangle 1").click({ modifiers: ["Shift"] });
  await page.keyboard.press(`${MOD}+g`);
  expect(await layerNames(page)).toEqual([
    "Group 1",
    "Rectangle 3",
    "Rectangle 2",
    "Rectangle 1",
    "Background",
  ]);
  expect(errors).toEqual([]);
});

test("a group scales from its frame handle", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Group scale");
  await rectangles(page, [
    [100, 100, 150, 150],
    [150, 150, 200, 200],
  ]);
  await row(page, "Rectangle 2").click();
  await row(page, "Rectangle 1").click({ modifiers: [MOD] });
  await page.keyboard.press(`${MOD}+g`);
  await page.keyboard.press("v");
  // The group's frame is 100…200; drag its bottom-right handle to 300, 300 (twice the size).
  const from = await at(page, 200, 200);
  const to = await at(page, 300, 300);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  expect(await blueAt(page, 290, 290)).toBe(true);
  expect(await blueAt(page, 190, 190)).toBe(true);
  // The gap between the two rectangles scaled too.
  expect(await blueAt(page, 210, 190)).toBe(false);
  expect(errors).toEqual([]);
});

test("align and distribute several layers", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Arrange");
  await rectangles(page, [
    [50, 50, 100, 100],
    [130, 150, 180, 200],
    [450, 250, 500, 300],
  ]);
  await row(page, "Rectangle 1").click();
  await page.keyboard.press(`${MOD}+Alt+a`);
  await expect(page.getByTestId("multi-selection")).toContainText("4 layers selected");
  await row(page, "Rectangle 1").click();
  await row(page, "Rectangle 2").click({ modifiers: [MOD] });
  await row(page, "Rectangle 3").click({ modifiers: [MOD] });

  await menu(page, "Layer", "Distribute Horizontal Centers");
  // Centres 75 and 475 stay; the middle one moves from 155 to 275.
  expect(await blueAt(page, 275, 175)).toBe(true);
  expect(await blueAt(page, 140, 175)).toBe(false);

  await page
    .getByRole("group", { name: "Align layers" })
    .first()
    .getByRole("button", { name: "Align Left Edges" })
    .click();
  expect(await blueAt(page, 60, 175)).toBe(true);
  expect(await blueAt(page, 60, 275)).toBe(true);
  expect(errors).toEqual([]);
});
