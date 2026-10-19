import { expect, test, type Locator, type Page } from "@playwright/test";
import { drag, isBlue, isWhite, MOD, newDocument, pixel, trackErrors } from "./helpers";

/** The Layer Style dialog (ADR-0030): every effect, copies, Fill and saved styles. */

const row = (page: Page, name: string) =>
  page.getByTestId("layer-row").and(page.locator(`[data-layer-name="${name}"]`));
const luminance = (rgba: number[]) => (rgba[0] + rgba[1] + rgba[2]) / 3;

async function rectangle(page: Page, from: [number, number], to: [number, number]) {
  await page.keyboard.press("u");
  await drag(page, from, to);
}

async function openStyle(page: Page, layer: string): Promise<Locator> {
  const r = row(page, layer);
  const box = (await r.boundingBox())!;
  // Away from the name text (which renames) and the buttons.
  await r.dblclick({ position: { x: box.width - 60, y: box.height / 2 } });
  const dialog = page.getByRole("dialog", { name: /Layer Style/ });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Type a value into a slider's number field. */
async function setNumber(dialog: Locator, label: string, value: number) {
  const field = dialog.getByLabel(`${label} value`, { exact: true });
  await field.fill(String(value));
  await field.press("Enter");
}

test("inside stroke, Fill and colour overlay render like Photoshop; OK is one undo step", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Fill");
  await rectangle(page, [100, 100], [300, 300]);
  const dialog = await openStyle(page, "Rectangle 1");

  await dialog.getByRole("checkbox", { name: "Use Stroke" }).check();
  await dialog.getByLabel("Position").selectOption("inside");
  await setNumber(dialog, "Size", 10);
  await dialog.getByLabel("Stroke colour").fill("#ff0000");
  const edge = await pixel(page, 104, 200);
  expect(edge[0]).toBeGreaterThan(200);
  expect(edge[1]).toBeLessThan(60);
  expect(isWhite(await pixel(page, 95, 200))).toBe(true);

  // Fill 0%: the layer's own pixels disappear, its effects stay.
  await dialog.getByRole("button", { name: "Blending Options" }).click();
  await setNumber(dialog, "Fill Opacity", 0);
  expect(isWhite(await pixel(page, 200, 200))).toBe(true);
  expect((await pixel(page, 104, 200))[0]).toBeGreaterThan(200);

  await dialog.getByRole("checkbox", { name: "Use Color Overlay" }).check();
  await dialog.getByLabel("Blend Mode colour").fill("#00ff00");
  const middle = await pixel(page, 200, 200);
  expect(middle[1]).toBeGreaterThan(200);
  expect(middle[0]).toBeLessThan(60);

  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.keyboard.press(`${MOD}+z`);
  expect(isBlue(await pixel(page, 200, 200))).toBe(true);
  expect(isBlue(await pixel(page, 104, 200))).toBe(true);
  expect(errors).toEqual([]);
});

test("+ adds copies of an effect that can be reordered and deleted", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Copies");
  await rectangle(page, [100, 100], [300, 300]);
  const dialog = await openStyle(page, "Rectangle 1");

  await dialog.getByRole("checkbox", { name: "Use Drop Shadow" }).check();
  await dialog.getByRole("button", { name: "Add another Drop Shadow" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Use Drop Shadow 2" })).toBeChecked();
  // The new copy is selected: make it a long red shadow.
  await dialog.getByLabel("Blend Mode colour").fill("#ff0000");
  await dialog.getByLabel("Blend Mode", { exact: true }).selectOption("normal");
  await setNumber(dialog, "Distance", 40);
  await setNumber(dialog, "Size", 0);
  // 40 px from 120°: down 35 px, right 20 px.
  const below = await pixel(page, 250, 320);
  expect(below[0]).toBeGreaterThan(150);
  expect(below[1]).toBeLessThan(140);

  await dialog.getByRole("button", { name: "Move effect up" }).click();
  await dialog.getByRole("button", { name: "Drop Shadow 1", exact: true }).click();
  await expect(dialog.getByLabel("Distance value", { exact: true })).toHaveValue("40");

  await dialog.getByRole("button", { name: "Delete effect" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Use Drop Shadow 2" })).toHaveCount(0);
  expect(isWhite(await pixel(page, 250, 320))).toBe(true);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(row(page, "Rectangle 1").getByLabel("Has layer effects")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("inner glow, bevel, satin, pattern and radial gradient change the pixels", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Effects");
  await rectangle(page, [100, 100], [300, 300]);
  const base = await pixel(page, 200, 200);
  const dialog = await openStyle(page, "Rectangle 1");
  const toggle = (name: string, on: boolean) =>
    dialog.getByRole("checkbox", { name: `Use ${name}`, exact: true }).setChecked(on);

  await toggle("Inner Glow", true);
  expect(luminance(await pixel(page, 101, 200))).toBeGreaterThan(luminance(base) + 20);
  expect(await pixel(page, 200, 200)).toEqual(base);
  await toggle("Inner Glow", false);

  await toggle("Bevel and Emboss", true);
  // Lit from the top left: the top edge is light, the bottom edge dark.
  const top = luminance(await pixel(page, 200, 102));
  const bottom = luminance(await pixel(page, 200, 297));
  expect(top).toBeGreaterThan(luminance(base) + 15);
  expect(bottom).toBeLessThan(luminance(base) - 15);
  await toggle("Bevel and Emboss", false);

  await toggle("Satin", true);
  expect(luminance(await pixel(page, 200, 200))).toBeLessThan(luminance(base) - 10);
  await toggle("Satin", false);

  await toggle("Pattern Overlay", true);
  await dialog.getByRole("radio", { name: "Checkerboard" }).click();
  const a = await pixel(page, 104, 104);
  const b = await pixel(page, 112, 104);
  expect(Math.abs(luminance(a) - luminance(b))).toBeGreaterThan(40);

  await toggle("Gradient Overlay", true);
  await dialog.getByLabel("Style", { exact: true }).selectOption("radial");
  const centre = luminance(await pixel(page, 200, 200));
  const corner = luminance(await pixel(page, 102, 102));
  expect(centre).toBeLessThan(60);
  expect(corner).toBeGreaterThan(centre + 100);

  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  expect(errors).toEqual([]);
});

test("New Style saves a style in this browser and applies it to another layer", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Presets");
  await rectangle(page, [50, 50], [150, 150]);
  let dialog = await openStyle(page, "Rectangle 1");
  await dialog.getByRole("checkbox", { name: "Use Stroke" }).check();
  await dialog.getByLabel("Stroke colour").fill("#ff0000");
  await setNumber(dialog, "Size", 6);
  await dialog.getByRole("button", { name: "New Style…" }).click();
  await dialog.getByLabel("Style name").fill("Red outline");
  await dialog.getByRole("button", { name: "Save style" }).click();
  await expect(dialog.getByRole("button", { name: "Apply Red outline" })).toBeVisible();
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  const stored = await page.evaluate(() => window.localStorage.getItem("picstea.layerStyles"));
  expect(stored).toContain("Red outline");

  await rectangle(page, [300, 100], [400, 200]);
  dialog = await openStyle(page, "Rectangle 2");
  await dialog.getByRole("button", { name: "Styles", exact: true }).click();
  await dialog.getByRole("button", { name: "Apply Red outline" }).click();
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  const outline = await pixel(page, 297, 150);
  expect(outline[0]).toBeGreaterThan(200);
  expect(outline[1]).toBeLessThan(60);

  // Built-in styles are offered too, and a saved one can be deleted.
  dialog = await openStyle(page, "Rectangle 2");
  await dialog.getByRole("button", { name: "Styles", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Apply Soft shadow" })).toBeVisible();
  await dialog.getByRole("button", { name: "Delete Red outline" }).click();
  await expect(dialog.getByRole("button", { name: "Apply Red outline" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(errors).toEqual([]);
});

test("Blend If hides the layer over light pixels; Channels keep the backdrop's red", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Blend If");
  await rectangle(page, [100, 100], [300, 300]);
  const dialog = await openStyle(page, "Rectangle 1");
  await dialog.getByRole("button", { name: "Blending Options" }).click();

  const highlights = dialog.getByRole("slider", {
    name: "Underlying Layer highlights",
    exact: true,
  });
  await highlights.focus();
  // Shift+arrow moves 10 levels: 255 → 155, below the white background.
  for (let i = 0; i < 10; i++) await page.keyboard.press("Shift+ArrowLeft");
  await expect(highlights).toHaveAttribute("aria-valuenow", "155");
  expect(isWhite(await pixel(page, 200, 200))).toBe(true);

  // Alt splits the slider into two halves.
  // Focus stays on the moving half, so repeated presses keep going.
  for (let i = 0; i < 5; i++) await page.keyboard.press("Alt+ArrowLeft");
  await expect(
    dialog.getByRole("slider", { name: "Underlying Layer highlights start" }),
  ).toHaveAttribute("aria-valuenow", "150");
  // Inside the visible half-triangle (its bottom right).
  await dialog
    .getByRole("slider", { name: "Underlying Layer highlights start" })
    .dblclick({ position: { x: 5, y: 10 } });
  await expect(highlights).toHaveAttribute("aria-valuenow", "150");

  // Back to full range, then switch the red channel off: red comes from the white backdrop.
  await highlights.focus();
  for (let i = 0; i < 11; i++) await page.keyboard.press("Shift+ArrowRight");
  expect(isBlue(await pixel(page, 200, 200))).toBe(true);
  await dialog.getByRole("checkbox", { name: "R", exact: true }).uncheck();
  const tinted = await pixel(page, 200, 200);
  expect(tinted[0]).toBeGreaterThan(240);
  expect(tinted[2]).toBeGreaterThan(200);

  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await page.keyboard.press(`${MOD}+z`);
  expect(isBlue(await pixel(page, 200, 200))).toBe(true);
  expect(errors).toEqual([]);
});
