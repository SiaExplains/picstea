import { expect, test, type Page } from "@playwright/test";
import {
  at,
  drag,
  isBlue,
  isWhite,
  newDocument,
  pixel,
  setForegroundColor,
  trackErrors,
} from "./helpers";

/** Right-click a toolbar group and choose one of its tools from the flyout. */
async function chooseTool(page: Page, group: string, tool: string) {
  await page.locator(`[data-tool-group="${group}"]`).click({ button: "right" });
  const flyout = page.getByRole("menu", { name: / tools$/ });
  await expect(flyout).toBeVisible();
  // Items are named "<tool> <shortcut>", e.g. "Brush B".
  await flyout.getByRole("menuitemradio", { name: new RegExp(`^${tool}( |$)`) }).click();
  await expect(page.getByRole("button", { name: `${tool} tool`, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

const lastHistory = (page: Page) =>
  page.getByRole("listbox", { name: "History" }).getByRole("option").last();

test("tool groups: flyouts, Shift + key cycles, the key returns to the last tool", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Groups");
  await chooseTool(page, "heal", "Spot Healing Brush");
  await expect(page.getByRole("toolbar", { name: "Tool options" })).toContainText(
    "Spot Healing Brush",
  );

  await page.keyboard.press("Shift+J");
  await expect(page.getByRole("button", { name: "Healing Brush tool" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Shift+J");
  await expect(page.getByRole("button", { name: "Red Eye tool" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("v");
  await page.keyboard.press("j");
  await expect(page.getByRole("button", { name: "Red Eye tool" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Presets: Burn is the tone tool in burn mode; the options bar follows.
  await chooseTool(page, "tone", "Burn");
  await expect(
    page.getByRole("group", { name: "Tone mode" }).getByRole("button", { name: "Burn" }),
  ).toHaveAttribute("aria-pressed", "true");

  // The flyout works from the keyboard too, and Esc closes it.
  await page.locator('[data-tool-group="eraser"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menu", { name: /Eraser tools$/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: /Eraser tools$/ })).toBeHidden();
  expect(errors).toEqual([]);
});

test("default colours button and D reset to black and white", async ({ page }) => {
  await newDocument(page, "Colours");
  await setForegroundColor(page, "#ff0000");
  await page.getByRole("button", { name: /^Default Colors/ }).click();
  await expect(page.getByRole("button", { name: "Foreground colour" })).toHaveAttribute(
    "data-color",
    "#000000",
  );
  await setForegroundColor(page, "#00ff00");
  await page.keyboard.press("d");
  await expect(page.getByRole("button", { name: "Foreground colour" })).toHaveAttribute(
    "data-color",
    "#000000",
  );
});

test("Magic Eraser and Red Eye change real pixels", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Pixels");
  await page.getByRole("button", { name: "New Layer" }).click();
  await setForegroundColor(page, "#d02020");
  await page.keyboard.press("b");
  await page.getByLabel("Size").first().fill("40");
  await drag(page, [100, 100], [200, 100]);
  const red = await pixel(page, 150, 100);
  expect(red[0]).toBeGreaterThan(180);
  expect(red[1]).toBeLessThan(60);

  // Red Eye over part of the stroke: no longer red there, the rest untouched.
  await chooseTool(page, "heal", "Red Eye");
  const p = await at(page, 120, 100);
  await page.mouse.click(p.x, p.y);
  const fixed = await pixel(page, 120, 100);
  expect(fixed[0]).toBeLessThan(80);
  expect((await pixel(page, 190, 100))[0]).toBeGreaterThan(180);
  await expect(lastHistory(page)).toHaveText("Red Eye");

  // Magic Eraser on the remaining red: the white background shows through.
  await chooseTool(page, "eraser", "Magic Eraser");
  const q = await at(page, 190, 100);
  await page.mouse.click(q.x, q.y);
  await expect(lastHistory(page)).toHaveText("Magic Eraser");
  expect(isWhite(await pixel(page, 190, 100))).toBe(true);
  expect(errors).toEqual([]);
});

test("Polygon shapes, Add Anchor Point, Ruler and Color Sampler", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Paths");
  await chooseTool(page, "shape", "Polygon");
  await page.getByLabel("Sides").fill("5");
  await drag(page, [100, 50], [300, 250]);
  await expect(page.getByTestId("layer-row").first()).toHaveAttribute(
    "data-layer-name",
    "Polygon 1",
  );
  expect(isBlue(await pixel(page, 200, 160))).toBe(true);
  expect(isWhite(await pixel(page, 105, 55))).toBe(true);

  // Add a point on the bottom edge (y = 50 + 100 + 100·sin(54°) ≈ 231).
  await chooseTool(page, "pen", "Add Anchor Point");
  const edge = await at(page, 200, 231);
  await page.mouse.click(edge.x, edge.y);
  await expect(lastHistory(page)).not.toHaveText("New Polygon");

  // Ruler: a 3-4-5 triangle measures 50 px.
  await chooseTool(page, "eyedropper", "Ruler");
  await drag(page, [10, 10], [40, 50]);
  await expect(page.locator('output[aria-label="Measurement"]')).toContainText("L 50 px");

  // Color Sampler: a point on the polygon reads its blue fill.
  await chooseTool(page, "eyedropper", "Color Sampler");
  const s = await at(page, 200, 160);
  await page.mouse.click(s.x, s.y);
  const samples = page.getByRole("list", { name: "Colour samples" });
  await expect(samples).toContainText("#1");
  await expect(samples).toContainText("#4c8dff");
  expect(errors).toEqual([]);
});

test("Background Eraser, Color Replacement and Spot Healing paint real pixels", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Retouch");
  await page.getByRole("button", { name: "New Layer" }).click();
  await setForegroundColor(page, "#d02020");
  await page.keyboard.press("b");
  await page.getByLabel("Size").first().fill("60");
  await drag(page, [80, 120], [320, 120]);

  // Color Replacement: the red stroke takes the foreground hue, keeping its shading.
  await setForegroundColor(page, "#2050e0");
  await chooseTool(page, "brush", "Color Replacement");
  await drag(page, [90, 120], [140, 120]);
  const replaced = await pixel(page, 115, 120);
  expect(replaced[2]).toBeGreaterThan(replaced[0]);
  await expect(lastHistory(page)).toHaveText("Color Replacement");

  // Background Eraser: erases the red it starts on, so the white background shows.
  await chooseTool(page, "eraser", "Background Eraser");
  await drag(page, [260, 120], [300, 120]);
  expect(isWhite(await pixel(page, 280, 120))).toBe(true);
  await expect(lastHistory(page)).toHaveText("Background Eraser");

  // Spot Healing: a spot inside the red stroke is healed from its surroundings.
  await setForegroundColor(page, "#000000");
  // B returns to the last tool used in the brush group (Color Replacement), so pick the Brush.
  await chooseTool(page, "brush", "Brush");
  await page.getByLabel("Size").first().fill("10");
  const dot = await at(page, 200, 120);
  await page.mouse.click(dot.x, dot.y);
  expect((await pixel(page, 200, 120))[0]).toBeLessThan(60);
  await chooseTool(page, "heal", "Spot Healing Brush");
  await page.getByLabel("Size").first().fill("24");
  await page.mouse.click(dot.x, dot.y);
  await expect(lastHistory(page)).toHaveText("Spot Healing Brush");
  expect((await pixel(page, 200, 120))[0]).toBeGreaterThan(120);
  expect(errors).toEqual([]);
});
