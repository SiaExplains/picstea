import { expect, test, type Page } from "@playwright/test";
import { drag, isDark, isWhite, layerNames, MOD, newDocument, pixel, trackErrors } from "./helpers";

const luminance = (rgba: number[]) => (rgba[0] + rgba[1] + rgba[2]) / 3;
/** Distance from pure shape blue (#4c8dff). */
const fromBlue = (rgba: number[]) =>
  Math.abs(rgba[0] - 0x4c) + Math.abs(rgba[1] - 0x8d) + Math.abs(rgba[2] - 0xff);
const fromWhite = (rgba: number[]) => 765 - rgba[0] - rgba[1] - rgba[2];

async function menu(page: Page, name: string, item: string) {
  await page.getByRole("menuitem", { name, exact: true }).click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

/** A black square (100,100)–(200,200) on a new pixel layer. */
async function blackSquare(page: Page) {
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [200, 190]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
  await expect(page.getByTestId("selection-size")).toHaveCount(0);
}

async function setTransformField(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: true });
  await field.fill(value);
  await field.press("Enter");
}

test("a smart object scaled up re-renders from its source (sharper than pixels)", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Sharp");
  // Two 20 × 20 circles: one stays a shape inside a smart object, one becomes pixels.
  await page.keyboard.press("u");
  await page.getByRole("group", { name: "Shape" }).getByRole("button", { name: "Ellipse" }).click();
  await drag(page, [20, 20], [40, 40]);
  await menu(page, "Layer", "Convert to Smart Object");
  await expect(page.getByText(/Smart object · 20 × 20 px/)).toBeVisible();
  await setTransformField(page, "W", "120");
  await setTransformField(page, "H", "120");

  await drag(page, [300, 20], [320, 40]);
  await menu(page, "Layer", "Rasterize Layer");
  await expect(page.getByText(/^Pixel layer/)).toBeVisible();
  await setTransformField(page, "W", "120");
  await setTransformField(page, "H", "120");
  await page.mouse.move(1, 1);

  // Scaled ×6 about their centres: (−30…90) and (250…370). Across the right edge, a crisp
  // render has only blue or white pixels; an upscaled bitmap of the anti-aliased circle has a
  // soft ramp in between.
  const softness = async (edge: number) => {
    let total = 0;
    for (let x = edge - 4; x <= edge + 4; x++) {
      const p = await pixel(page, x, 30);
      total += Math.min(fromBlue(p), fromWhite(p));
    }
    return total;
  };
  const smart = await softness(90);
  const raster = await softness(370);
  expect(smart).toBeLessThan(raster);
  expect(errors).toEqual([]);
});

test("Edit Contents applies to the smart object on save as one undo step", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Contents");
  await blackSquare(page);
  await menu(page, "Layer", "Convert to Smart Object");
  expect(isDark(await pixel(page, 150, 150))).toBe(true);

  await menu(page, "Layer", "Edit Contents");
  await expect(page.getByRole("tab", { name: /Layer 1 \(Smart Object\)/ })).toBeVisible();
  // Clear everything inside, then save the contents back.
  await page.keyboard.press(`${MOD}+a`);
  await page.keyboard.press("Delete");
  await page.keyboard.press(`${MOD}+s`);
  await page.getByRole("tab", { name: /^Contents/ }).click();
  await page.getByRole("button", { name: "100%" }).click();
  await expect.poll(async () => isWhite(await pixel(page, 150, 150))).toBe(true);
  expect(await layerNames(page)).toEqual(["Layer 1", "Background"]);

  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => isDark(await pixel(page, 150, 150))).toBe(true);
  expect(errors).toEqual([]);
});

test("smart filters preview, apply, hide, delete and undo; reload keeps them", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Smart filter");
  await blackSquare(page);
  await menu(page, "Layer", "Convert to Smart Object");
  expect(isWhite(await pixel(page, 94, 150))).toBe(true);

  await menu(page, "Filter", "Gaussian Blur…");
  const dialog = page.getByRole("dialog", { name: "Gaussian Blur" });
  await dialog.getByLabel("Radius (px)").fill("10");
  await expect.poll(async () => luminance(await pixel(page, 94, 150))).toBeLessThan(230);
  await dialog.getByRole("button", { name: "OK" }).click();
  const list = page.getByRole("list", { name: "Smart filters" });
  await expect(list.getByRole("button", { name: "Gaussian Blur", exact: true })).toBeVisible();

  await list.getByLabel("Show Gaussian Blur").uncheck();
  await expect.poll(async () => isWhite(await pixel(page, 94, 150))).toBe(true);
  await list.getByLabel("Show Gaussian Blur").check();
  await expect.poll(async () => luminance(await pixel(page, 94, 150))).toBeLessThan(230);

  await expect(page.getByTestId("save-state")).toHaveText(/Saved/);
  await page.reload();
  await page
    .getByRole("list", { name: "Recent projects" })
    .getByRole("button", { name: /^Smart filter/ })
    .click();
  await page.getByRole("button", { name: "100%" }).click();
  await expect.poll(async () => isDark(await pixel(page, 150, 150))).toBe(true);
  await expect.poll(async () => luminance(await pixel(page, 94, 150))).toBeLessThan(230);

  await page.getByRole("button", { name: "Layer 1", exact: true }).click();
  await page
    .getByRole("list", { name: "Smart filters" })
    .getByRole("button", { name: "Delete Gaussian Blur" })
    .click();
  await expect.poll(async () => isWhite(await pixel(page, 94, 150))).toBe(true);
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => luminance(await pixel(page, 94, 150))).toBeLessThan(230);
  expect(errors).toEqual([]);
});

test("Place Embedded makes a smart object; Rasterize turns it into pixels", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Embedded");
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 50;
    canvas.height = 40;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 50, 40);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByRole("menuitem", { name: "File", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "Place Embedded…", exact: true }).click();
  await (
    await chooser
  ).setFiles({ name: "badge.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64") });
  await expect(page.getByText(/Smart object · 50 × 40 px/)).toBeVisible();
  expect(await layerNames(page)).toEqual(["badge", "Background"]);
  expect(isDark(await pixel(page, 300, 200))).toBe(true);

  await menu(page, "Layer", "Rasterize Layer");
  await expect(page.getByText(/^Pixel layer · 50 × 40 px/)).toBeVisible();
  expect(isDark(await pixel(page, 300, 200))).toBe(true);
  expect(errors).toEqual([]);
});
