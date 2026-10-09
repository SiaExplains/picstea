import { expect, test, type Page } from "@playwright/test";
import { at, drag, MOD, newDocument, pixel, setForegroundColor, trackErrors } from "./helpers";

/** A new pixel layer filled with `color` (whole canvas, or the given rectangle). */
async function filledLayer(page: Page, color: string, rect?: [number, number, number, number]) {
  await page.keyboard.press(`${MOD}+Shift+n`);
  await setForegroundColor(page, color);
  if (rect) {
    await page.keyboard.press("m");
    await drag(page, [rect[0], rect[1]], [rect[2], rect[3]]);
  } else {
    await page.keyboard.press(`${MOD}+a`);
  }
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
}

/** Fill a rectangle on the active layer. */
async function fillRect(page: Page, color: string, rect: [number, number, number, number]) {
  await setForegroundColor(page, color);
  await page.keyboard.press("m");
  await drag(page, [rect[0], rect[1]], [rect[2], rect[3]]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
}

async function click(page: Page, x: number, y: number, modifiers: ("Alt" | "Shift")[] = []) {
  const p = await at(page, x, y);
  for (const m of modifiers) await page.keyboard.down(m);
  await page.mouse.click(p.x, p.y);
  for (const m of modifiers) await page.keyboard.up(m);
}

async function settled(page: Page, x: number, y: number) {
  await page.mouse.move(1, 1);
  return pixel(page, x, y);
}

async function options(page: Page) {
  return page.getByRole("toolbar", { name: "Tool options" });
}

async function setNumber(page: Page, label: string, value: number) {
  await (await options(page)).getByLabel(label).fill(String(value));
}

test("Clone Stamp copies from the Alt-clicked source as one undo step", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Clone");
  await filledLayer(page, "#ffffff");
  await fillRect(page, "#e01010", [50, 50, 150, 150]);

  await page.keyboard.press("s");
  await click(page, 400, 300);
  await expect(
    page.getByText("Alt-click (Option-click) where you want to copy from first."),
  ).toBeVisible();

  await click(page, 100, 100, ["Alt"]);
  await click(page, 400, 300);
  const cloned = await settled(page, 400, 300);
  expect(cloned[0]).toBeGreaterThan(200);
  expect(cloned[1]).toBeLessThan(40);
  await page.keyboard.press(`${MOD}+z`);
  expect((await settled(page, 400, 300))[1]).toBeGreaterThan(240);
  expect(errors).toEqual([]);
});

test("cloning from all layers onto an empty layer leaves the original untouched", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Clone all");
  await filledLayer(page, "#ffffff");
  await fillRect(page, "#e01010", [50, 50, 150, 150]);
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("s");
  await (await options(page)).getByLabel("Sample").selectOption("all");
  await click(page, 100, 100, ["Alt"]);
  await click(page, 400, 300);
  expect((await settled(page, 400, 300))[1]).toBeLessThan(40);
  // The clone is on the new layer: hiding it brings back the white below.
  await page.getByRole("button", { name: "Hide Layer 2" }).click();
  expect((await settled(page, 400, 300))[1]).toBeGreaterThan(240);
  expect(errors).toEqual([]);
});

test("Healing Brush blends a blemish into its surroundings", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Heal");
  // A black-to-white gradient across the canvas with a black spot in the middle.
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("g");
  await drag(page, [0, 200], [599, 200]);
  await setForegroundColor(page, "#000000");
  await page.keyboard.press("b");
  await click(page, 300, 200);
  expect((await settled(page, 300, 200))[0]).toBeLessThan(30);
  const neighbour = (await settled(page, 300, 240))[0];

  await page.keyboard.press("j");
  await setNumber(page, "Size", 40);
  // The source is darker (further left); healing must still match the local tone.
  await click(page, 200, 120, ["Alt"]);
  await click(page, 300, 200);
  await expect
    .poll(async () => Math.abs((await settled(page, 300, 200))[0] - neighbour))
    .toBeLessThan(25);
  const source = (await settled(page, 200, 120))[0];
  expect(Math.abs(neighbour - source)).toBeGreaterThan(25);
  expect(errors).toEqual([]);
});

test("Dodge, Burn and Sponge change tone and saturation", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Tone");
  await filledLayer(page, "#808080");
  await fillRect(page, "#c04040", [400, 50, 550, 150]);
  await page.keyboard.press("o");
  await setNumber(page, "Exposure", 100);
  await click(page, 150, 250);
  expect((await settled(page, 150, 250))[0]).toBeGreaterThan(150);

  await (await options(page)).getByRole("button", { name: "Burn" }).click();
  await click(page, 300, 250);
  expect((await settled(page, 300, 250))[0]).toBeLessThan(100);

  await (await options(page)).getByRole("button", { name: "Sponge" }).click();
  await setNumber(page, "Flow", 100);
  await click(page, 475, 100);
  const [r, g] = await settled(page, 475, 100);
  expect(r - g).toBeLessThan(20);
  expect(errors).toEqual([]);
});

test("Blur softens an edge and Smudge drags colour", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Focus");
  await filledLayer(page, "#ffffff");
  await fillRect(page, "#000000", [100, 100, 200, 200]);
  await page.keyboard.press("r");
  await setNumber(page, "Strength", 100);
  await drag(page, [200, 120], [200, 180]);
  const edge = (await settled(page, 201, 150))[0];
  expect(edge).toBeGreaterThan(20);
  expect(edge).toBeLessThan(235);

  await (await options(page)).getByRole("button", { name: "Smudge" }).click();
  await setNumber(page, "Size", 20);
  await setNumber(page, "Strength", 90);
  await drag(page, [180, 150], [260, 150]);
  expect((await settled(page, 230, 150))[0]).toBeLessThan(200);
  expect(errors).toEqual([]);
});
