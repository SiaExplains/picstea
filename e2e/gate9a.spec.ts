import { expect, test, type Page } from "@playwright/test";
import { at, drag, isWhite, MOD, newDocument, pixel, trackErrors } from "./helpers";

/** Guide colour in the canvas renderer (theme.guide). */
const isGuide = (rgba: number[]) => rgba[0] < 40 && rgba[1] > 170 && rgba[2] > 230;
const luminance = (rgba: number[]) => (rgba[0] + rgba[1] + rgba[2]) / 3;

async function menu(
  page: Page,
  name: string,
  item: string,
  role: "menuitem" | "menuitemcheckbox" = "menuitem",
) {
  await page.getByRole("menuitem", { name, exact: true }).click();
  await page.getByRole(role, { name: item, exact: true }).click();
}

async function undoLabel(page: Page): Promise<string> {
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const label = await page
    .getByRole("menu", { name: "Edit" })
    .getByRole("menuitem")
    .first()
    .getAttribute("aria-label");
  await page.keyboard.press("Escape");
  return label ?? "";
}

/** Is there a guide line on the canvas within ±1 px of document row `y` at column `x`? */
async function guideAtRow(page: Page, x: number, y: number): Promise<boolean> {
  for (const dy of [-1, 0, 1]) if (isGuide(await pixel(page, x, y + dy))) return true;
  return false;
}

/** Turn rulers on and re-centre at 100% so `at()` maps document points again. */
async function showRulers(page: Page) {
  await menu(page, "View", "Rulers", "menuitemcheckbox");
  await expect(page.getByTestId("ruler-top")).toBeVisible();
  await page.getByRole("button", { name: "100%" }).click();
}

/** Drag a horizontal guide from the top ruler down to document row `y`. */
async function guideFromRuler(page: Page, y: number) {
  const ruler = (await page.getByTestId("ruler-top").boundingBox())!;
  const target = await at(page, 300, y);
  await page.mouse.move(target.x, ruler.y + ruler.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y - 20, { steps: 4 });
  await page.mouse.move(target.x, target.y, { steps: 4 });
  await page.mouse.up();
  await page.mouse.move(1, 1);
}

const yField = (page: Page) => page.getByLabel("Y", { exact: true });
const xField = (page: Page) => page.getByLabel("X", { exact: true });

test("guides from the ruler; layers snap to them; Mod disables snapping; dragging off deletes", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Guides");
  await showRulers(page);
  // From the ruler (the exact row depends on where the pointer lands)…
  await guideFromRuler(page, 80);
  expect(await undoLabel(page)).toBe("Undo New Guide");
  expect(await guideAtRow(page, 400, 80)).toBe(true);
  // …or at an exact position.
  await menu(page, "View", "New Guide…");
  const dialog = page.getByRole("dialog", { name: "New Guide" });
  await dialog.getByLabel("Horizontal").check();
  await dialog.getByLabel(/Position/).fill("150");
  await dialog.getByRole("button", { name: "OK" }).click();
  expect(await guideAtRow(page, 400, 150)).toBe(true);

  // A rectangle 100 × 40 at (100, 100); dragging it 47 px down puts its top 3 px from the guide.
  await page.keyboard.press("u");
  await drag(page, [100, 100], [200, 140]);
  await page.keyboard.press("v");
  await drag(page, [150, 120], [150, 167]);
  await expect(yField(page)).toHaveValue("150");

  await page.keyboard.press(`${MOD}+z`);
  await expect(yField(page)).not.toHaveValue("150");
  const y0 = Number(await yField(page).inputValue());
  // Holding Cmd/Ctrl while dragging turns snapping off.
  const a = await at(page, 150, 120);
  const b = await at(page, 150, 167);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.keyboard.down(MOD);
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up(MOD);
  await page.mouse.move(1, 1);
  await expect(yField(page)).toHaveValue(String(y0 + 47));

  // Move tool: drag the guide off the canvas onto the ruler to delete it.
  const g = await at(page, 450, 150);
  const ruler = (await page.getByTestId("ruler-top").boundingBox())!;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.mouse.move(g.x, ruler.y + 5, { steps: 6 });
  await page.mouse.up();
  await page.mouse.move(1, 1);
  expect(await undoLabel(page)).toBe("Undo Delete Guide");
  expect(await guideAtRow(page, 450, 150)).toBe(false);
  expect(errors).toEqual([]);
});

test("guides and view settings survive a reload", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Keep guides");
  await showRulers(page);
  await guideFromRuler(page, 200);
  await expect(page.getByTestId("save-state")).toHaveText(/Saved/);
  await page.reload();
  await page
    .getByRole("list", { name: "Recent projects" })
    .getByRole("button", { name: /^Keep guides/ })
    .click();
  await expect(page.getByTestId("ruler-top")).toBeVisible();
  await page.getByRole("button", { name: "100%" }).click();
  expect(await guideAtRow(page, 300, 200)).toBe(true);
  expect(errors).toEqual([]);
});

test("Layer → Align centres the active layer on the canvas", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Align");
  await page.keyboard.press("u");
  await drag(page, [100, 100], [200, 140]);
  await menu(page, "Layer", "Align Horizontal Centers");
  await expect(xField(page)).toHaveValue("250");
  await menu(page, "Layer", "Align Bottom Edges");
  await expect(yField(page)).toHaveValue("360");
  expect(errors).toEqual([]);
});

test("Gaussian Blur previews live, Cancel restores, OK applies as one undo step", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Blur");
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [300, 200]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
  await expect(page.getByTestId("selection-size")).toHaveCount(0);
  expect(isWhite(await pixel(page, 94, 150))).toBe(true);

  await menu(page, "Filter", "Gaussian Blur…");
  const dialog = page.getByRole("dialog", { name: "Gaussian Blur" });
  await dialog.getByLabel("Radius (px)").fill("12");
  // The preview softens the edge while the dialog is open.
  await expect.poll(async () => luminance(await pixel(page, 94, 150))).toBeLessThan(230);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect.poll(async () => isWhite(await pixel(page, 94, 150))).toBe(true);
  expect(await undoLabel(page)).not.toBe("Undo Gaussian Blur");

  await menu(page, "Filter", "Gaussian Blur…");
  await page.getByRole("dialog", { name: "Gaussian Blur" }).getByLabel("Radius (px)").fill("12");
  await page
    .getByRole("dialog", { name: "Gaussian Blur" })
    .getByRole("button", { name: "OK" })
    .click();
  await expect.poll(async () => luminance(await pixel(page, 94, 150))).toBeLessThan(230);
  expect(await undoLabel(page)).toBe("Undo Gaussian Blur");
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => isWhite(await pixel(page, 94, 150))).toBe(true);
  expect(errors).toEqual([]);
});

test("a filter with a selection only changes the selected area", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Filter selection");
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [0, 0], [600, 400]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
  await drag(page, [0, 0], [300, 400]);
  await menu(page, "Filter", "Add Noise…");
  const dialog = page.getByRole("dialog", { name: "Add Noise" });
  await dialog.getByLabel("Amount (%)").fill("60");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect.poll(() => undoLabel(page)).toBe("Undo Add Noise");
  await page.keyboard.press(`${MOD}+d`);
  await expect(page.getByTestId("selection-size")).toHaveCount(0);
  // Left half: noisy (some pixels lifted from black); right half: still pure black.
  let lifted = 0;
  for (let x = 20; x < 280; x += 13) if (luminance(await pixel(page, x, 200)) > 30) lifted++;
  expect(lifted).toBeGreaterThan(3);
  for (let x = 320; x < 580; x += 37) expect(luminance(await pixel(page, x, 200))).toBeLessThan(5);
  expect(errors).toEqual([]);
});

test("a Curves layer edited with the keyboard changes the composite", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Curves");
  expect(isWhite(await pixel(page, 50, 50))).toBe(true);
  await menu(page, "Adjustments", "Curves…");
  const white = page.getByRole("slider", { name: "Curve point 2" });
  await white.focus();
  for (let i = 0; i < 10; i++) await white.press("Shift+ArrowDown");
  await expect(white).toHaveAttribute("aria-valuenow", "155");
  await expect.poll(async () => Math.round(luminance(await pixel(page, 50, 50)))).toBe(155);
  // Each key press is its own undo step.
  await white.blur();
  await page.keyboard.press(`${MOD}+z`);
  await expect(white).toHaveAttribute("aria-valuenow", "165");
  expect(errors).toEqual([]);
});
