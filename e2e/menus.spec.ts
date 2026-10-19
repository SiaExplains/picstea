import { expect, test, type Page } from "@playwright/test";
import {
  drag,
  isDark,
  isWhite,
  layerNames,
  MOD,
  newDocument,
  pickMenu,
  pixel,
  trackErrors,
} from "./helpers";

/** The menu bar with submenus (ADR-0032) and the items it now offers. */

const row = (page: Page, name: string) =>
  page.getByTestId("layer-row").and(page.locator(`[data-layer-name="${name}"]`));

/** A black square (100,100)–(200,200) on a new pixel layer, selected. */
async function blackSquare(page: Page) {
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [200, 200]);
  await page.keyboard.press("Shift+F5");
}

test("submenus open with the keyboard and the pointer, and close again", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Menus");
  const layer = page.getByRole("menubar", { name: "Editor menu" }).getByRole("menuitem", {
    name: "Layer",
    exact: true,
  });
  await layer.click();
  // Focus starts on "New"; Arrow Right opens its submenu and focuses its first item.
  await page.keyboard.press("ArrowRight");
  const sub = page.getByRole("menu", { name: "New", exact: true });
  await expect(sub).toBeVisible();
  await expect(sub.getByRole("menuitem", { name: "New Layer" })).toBeFocused();
  // Arrow Left closes it and returns to the trigger.
  await page.keyboard.press("ArrowLeft");
  await expect(sub).toBeHidden();
  await expect(page.getByRole("menuitem", { name: "New", exact: true })).toBeFocused();
  // Hover opens a submenu; choosing an item closes every menu.
  await page.getByRole("menuitem", { name: "Colour Label", exact: true }).hover();
  await page.getByRole("menuitemcheckbox", { name: "Green", exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(row(page, "Background")).toHaveAttribute("data-label", "green");
  expect(errors).toEqual([]);
});

test("Edit → Stroke, Copy Merged, and Select → Grow and Similar", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Edit and select");
  await blackSquare(page);
  await page.keyboard.press(`${MOD}+d`);

  // A selection around the square, stroked outside in the foreground colour (black).
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [300, 100], [400, 200]);
  await pickMenu(page, "Edit", "Stroke…");
  const dialog = page.getByRole("dialog", { name: "Stroke" });
  await dialog.getByLabel("Width (px)").fill("6");
  await dialog.getByLabel("Outside").check();
  await dialog.getByRole("button", { name: "OK" }).click();
  expect(isDark(await pixel(page, 297, 150))).toBe(true);
  expect(isWhite(await pixel(page, 305, 150))).toBe(true);

  // Copy Merged copies what is visible, from every layer.
  await page.keyboard.press(`${MOD}+d`);
  await drag(page, [90, 90], [210, 210]);
  await pickMenu(page, "Edit", "Copy Merged");
  await pickMenu(page, "Edit", "Paste");
  expect(await layerNames(page)).toContain("Layer 3");

  // Select → Similar from a corner of the white background: everything white, not the squares.
  await page.getByRole("button", { name: "Background", exact: true }).click();
  await drag(page, [5, 5], [20, 20]);
  await pickMenu(page, "Select", "Similar");
  await expect(page.getByTestId("selection-size")).toHaveText(/600 × 400/);
  await page.keyboard.press(`${MOD}+d`);
  // Grow samples the active layer: from inside the black square it stays inside it.
  await page.getByRole("button", { name: "Layer 1", exact: true }).click();
  await drag(page, [140, 140], [160, 160]);
  await pickMenu(page, "Select", "Grow");
  await expect(page.getByTestId("selection-size")).toHaveText(/10[01] × 10[01]/);
  expect(errors).toEqual([]);
});

test("Window brings panels forward; Help → About opens the About page", async ({
  page,
  context,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Window");
  await pickMenu(page, "Window", "Swatches");
  await expect(page.getByRole("tab", { name: "Swatches" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tab", { name: "Swatches" })).toBeFocused();
  await pickMenu(page, "Window", "History");
  await expect(page.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true");

  const popup = context.waitForEvent("page");
  await pickMenu(page, "Help", "About Picstea");
  const about = await popup;
  await about.waitForLoadState();
  expect(new URL(about.url()).pathname).toBe("/about");
  await expect(about.getByRole("heading", { name: "About Picstea", level: 1 })).toBeVisible();
  await about.close();
  expect(errors).toEqual([]);
});
