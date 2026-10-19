import { expect, test, type Page } from "@playwright/test";
import {
  drag,
  isBlue,
  isWhite,
  layerNames,
  MOD,
  newDocument,
  openEditor,
  pixel,
  trackErrors,
} from "./helpers";

const row = (page: Page, name: string) =>
  page.getByTestId("layer-row").and(page.locator(`[data-layer-name="${name}"]`));

/**
 * Drag a layer row onto a Layers-panel button with real DragEvents (headless Chromium doesn't
 * turn mouse input into native HTML5 drag and drop; the same handlers run).
 */
async function dragLayerOnto(page: Page, layer: string, button: string) {
  await page.evaluate(
    ([from, label]) => {
      const src = document.querySelector(
        `[data-layer-name="${from}"] [role="button"][draggable="true"]`,
      )!;
      const dst = [...document.querySelectorAll("button")].find((b) =>
        b.getAttribute("aria-label")?.startsWith(label),
      )!;
      const dataTransfer = new DataTransfer();
      src.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
      );
      const at = { bubbles: true, cancelable: true, dataTransfer };
      dst.dispatchEvent(new DragEvent("dragenter", at));
      dst.dispatchEvent(new DragEvent("dragover", at));
      dst.dispatchEvent(new DragEvent("drop", at));
      src.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer }));
    },
    [layer, button] as const,
  );
}

async function rectangle(page: Page, from: [number, number], to: [number, number]) {
  await page.keyboard.press("u");
  await drag(page, from, to);
}

async function layerMenu(page: Page, name: string) {
  await row(page, name).click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Layer" });
  await expect(menu).toBeVisible();
  return menu;
}

test("right-click menu: colour label, merge down, select pixels and flatten", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Context menu");
  await rectangle(page, [40, 40], [120, 120]);
  await rectangle(page, [200, 200], [280, 280]);
  expect(await layerNames(page)).toEqual(["Rectangle 2", "Rectangle 1", "Background"]);

  // Colour label through the submenu, with the keyboard.
  let menu = await layerMenu(page, "Rectangle 1");
  await menu.getByRole("menuitem", { name: "Color" }).focus();
  await page.keyboard.press("ArrowRight");
  await page
    .getByRole("menu", { name: "Color" })
    .getByRole("menuitemradio", { name: "Green" })
    .click();
  await expect(row(page, "Rectangle 1")).toHaveAttribute("data-label", "green");

  // Merge Down keeps the lower layer (name, label) with both shapes in its pixels.
  menu = await layerMenu(page, "Rectangle 2");
  await menu.getByRole("menuitem", { name: "Merge Down" }).click();
  expect(await layerNames(page)).toEqual(["Rectangle 1", "Background"]);
  await expect(row(page, "Rectangle 1")).toHaveAttribute("data-label", "green");
  expect(isBlue(await pixel(page, 80, 80))).toBe(true);
  expect(isBlue(await pixel(page, 240, 240))).toBe(true);

  // Select Pixels, then Delete clears exactly the layer's pixels.
  menu = await layerMenu(page, "Rectangle 1");
  await menu.getByRole("menuitem", { name: "Select Pixels" }).click();
  await page.keyboard.press("Delete");
  expect(isWhite(await pixel(page, 80, 80))).toBe(true);
  expect(await layerNames(page)).toEqual(["Rectangle 1", "Background"]);
  await page.keyboard.press(`${MOD}+z`);
  expect(isBlue(await pixel(page, 80, 80))).toBe(true);

  // Flatten Image leaves one layer that looks the same.
  menu = await layerMenu(page, "Rectangle 1");
  await menu.getByRole("menuitem", { name: "Flatten Image" }).click();
  expect(await layerNames(page)).toEqual(["Background"]);
  expect(isBlue(await pixel(page, 240, 240))).toBe(true);
  expect(isWhite(await pixel(page, 160, 30))).toBe(true);

  // Esc closes the menu and changes nothing.
  menu = await layerMenu(page, "Background");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  expect(errors).toEqual([]);
});

test("dragging layers onto the trash deletes them; onto New Layer duplicates them", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Drag to trash");
  await rectangle(page, [40, 40], [120, 120]);
  await rectangle(page, [200, 200], [280, 280]);

  await dragLayerOnto(page, "Rectangle 1", "New Layer");
  expect(await layerNames(page)).toContain("Rectangle 1 copy");

  await dragLayerOnto(page, "Rectangle 2", "Delete Layer");
  expect(await layerNames(page)).not.toContain("Rectangle 2");
  expect(isWhite(await pixel(page, 240, 240))).toBe(true);
  expect(errors).toEqual([]);
});

test("double-clicking a layer opens Layer Style; Cancel reverts and OK is one undo step", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Layer style");
  await rectangle(page, [40, 40], [120, 120]);
  const rect = row(page, "Rectangle 1");
  const box = (await rect.boundingBox())!;
  // Away from the name text (which renames) and the buttons.
  await rect.dblclick({ position: { x: box.width - 60, y: box.height / 2 } });
  const dialog = page.getByRole("dialog", { name: /Layer Style/ });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("checkbox", { name: "Use Drop Shadow" }).check();
  await expect(
    dialog.getByRole("slider", { name: "Distance" }).or(dialog.getByText("Distance")).first(),
  ).toBeVisible();
  await expect(rect.getByLabel("Has layer effects")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(rect.getByLabel("Has layer effects")).toHaveCount(0);

  // Layer → Blending Options… opens it too.
  await page.getByRole("menuitem", { name: "Layer" }).click();
  await page.getByRole("menuitem", { name: "Blending Options…" }).click();
  await dialog.getByRole("checkbox", { name: "Use Stroke" }).check();
  await dialog.getByRole("button", { name: "Blending Options" }).click();
  await dialog.getByLabel("Blend mode").selectOption("multiply");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(rect.getByLabel("Has layer effects")).toBeVisible();
  await expect(page.getByLabel("Blend")).toHaveValue("multiply");

  await page.keyboard.press(`${MOD}+z`);
  await expect(rect.getByLabel("Has layer effects")).toHaveCount(0);
  await expect(page.getByLabel("Blend")).toHaveValue("normal");
  expect(errors).toEqual([]);
});

test("panels resize with the keyboard and remember their size", async ({ page }) => {
  await openEditor(page);
  const properties = page.locator('[data-panel="properties"]');
  const before = (await properties.boundingBox())!.height;
  const handle = page.getByRole("separator", { name: "Resize Properties" });
  await handle.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");
  await expect
    .poll(async () => (await properties.boundingBox())!.height)
    .toBeGreaterThan(before + 40);

  const panels = page.getByRole("complementary", { name: "Panels" });
  const width = (await panels.boundingBox())!.width;
  await page.getByRole("separator", { name: "Resize panels" }).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await panels.boundingBox())!.width).toBe(width + 32);

  await page.reload();
  await expect.poll(async () => (await panels.boundingBox())!.width).toBe(width + 32);
});
