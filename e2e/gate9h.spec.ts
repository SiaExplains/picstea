import { expect, test, type Page } from "@playwright/test";
import { encodeAdjustment } from "../src/editor/formats/psd/psd-adjustments";
import type { PsdPixelLayer } from "../src/editor/formats/psd/psd-model";
import { writePsd } from "../src/editor/formats/psd/psd-write";
import { innerStylesBlock } from "../src/editor/test-utils/psd-fixtures";
import {
  drag,
  layerNames,
  MOD,
  newDocument,
  openEditor,
  pixel,
  setForegroundColor,
  trackErrors,
  pickMenu,
} from "./helpers";

const menu = (page: Page, name: string, item: string) => pickMenu(page, name, item);

/** A square filled with `color` on a new pixel layer. */
async function square(page: Page, color: string, from: [number, number], to: [number, number]) {
  await page.keyboard.press(`${MOD}+Shift+n`);
  await setForegroundColor(page, color);
  await page.keyboard.press("m");
  await drag(page, from, to);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
}

async function settled(page: Page, x: number, y: number) {
  await page.mouse.move(1, 1);
  return pixel(page, x, y);
}

test("Gradient Map maps shadows and highlights to its colours and survives a reload", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Gradient map");
  // A black → white ramp across the canvas.
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("d");
  await page.keyboard.press("g");
  await drag(page, [0, 200], [599, 200]);
  // Foreground red, background blue: the new map runs red → blue.
  await setForegroundColor(page, "#0000ff");
  await page.keyboard.press("x");
  await setForegroundColor(page, "#ff0000");
  await menu(page, "Adjustments", "Gradient Map…");
  const dark = await settled(page, 5, 200);
  const light = await settled(page, 594, 200);
  expect(dark[0]).toBeGreaterThan(230);
  expect(dark[2]).toBeLessThan(25);
  expect(light[2]).toBeGreaterThan(230);
  expect(light[0]).toBeLessThan(25);
  await expect(page.getByRole("group", { name: "Gradient", exact: true })).toBeVisible();

  await page.keyboard.press(`${MOD}+s`);
  await expect(page.getByTestId("save-state")).toHaveText("Saved in this browser");
  await page.reload();
  await page
    .getByRole("list", { name: "Recent projects" })
    .getByRole("button", { name: /^Gradient map/ })
    .click();
  await page.getByRole("button", { name: "100%" }).click();
  expect((await settled(page, 5, 200))[0]).toBeGreaterThan(230);
  expect(errors).toEqual([]);
});

test("Channel Mixer monochrome and Color Balance shadows", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Mixer");
  await square(page, "#e04010", [50, 50], [150, 150]);
  await square(page, "#202020", [300, 50], [400, 150]);
  await menu(page, "Adjustments", "Channel Mixer…");
  await page.getByRole("checkbox", { name: "Monochrome" }).check();
  const [r, g, b] = await settled(page, 100, 100);
  expect(r).toBe(g);
  expect(g).toBe(b);
  await page.keyboard.press(`${MOD}+z`);
  await page.keyboard.press(`${MOD}+z`);

  await menu(page, "Adjustments", "Color Balance…");
  await page
    .getByRole("group", { name: "Tonal range" })
    .getByRole("button", { name: "Shadows" })
    .click();
  await page.getByRole("checkbox", { name: "Preserve luminosity" }).uncheck();
  await page.getByRole("slider", { name: "Cyan – Red" }).fill("100");
  const shadow = await settled(page, 350, 100);
  expect(shadow[0] - shadow[2]).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});

test("inner shadow darkens inside an edge; gradient overlay runs across the shape", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Styles");
  await square(page, "#ffffff", [100, 100], [300, 300]);
  const centre = await settled(page, 200, 200);
  await page.getByRole("checkbox", { name: "Inner shadow" }).check();
  const edge = await settled(page, 103, 103);
  expect(edge[0]).toBeLessThan(centre[0] - 40);
  await page.getByRole("checkbox", { name: "Inner shadow" }).uncheck();

  // The overlay spans the layer's box: use a shape, whose box is the shape itself.
  await page.keyboard.press("u");
  await drag(page, [350, 100], [550, 300]);
  await page.getByRole("checkbox", { name: "Gradient overlay" }).check();
  // 90°: dark at the bottom, light at the top.
  const top = await settled(page, 450, 105);
  const bottom = await settled(page, 450, 295);
  expect(top[0]).toBeGreaterThan(220);
  expect(bottom[0]).toBeLessThan(35);
  expect(errors).toEqual([]);
});

test("a Photoshop file with Vibrance and inner styles opens editable", async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  const solid = (w: number, h: number, rgba: number[]) => {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) out.set(rgba, i * 4);
    return out;
  };
  const leaf = (
    name: string,
    rect: { top: number; left: number; bottom: number; right: number },
    blocks: { key: string; data: Uint8Array }[],
  ): PsdPixelLayer => ({
    kind: "pixels",
    name,
    opacity: 255,
    visible: true,
    blendKey: "norm",
    rect,
    rgba: solid(rect.right - rect.left, rect.bottom - rect.top, [200, 120, 80, 255]),
    blocks,
  });
  const vibrance = encodeAdjustment({ type: "vibrance", vibrance: 40, saturation: -10 })!;
  const bytes = writePsd({
    width: 300,
    height: 200,
    layers: [
      leaf("Box", { top: 50, left: 50, bottom: 150, right: 250 }, [
        {
          key: "lfx2",
          data: innerStylesBlock({
            shadow: "#000000",
            bevelHighlight: "#ffffff",
            gradient: [
              { position: 0, color: "#ff0000" },
              { position: 1, color: "#0000ff" },
            ],
          }),
        },
      ]),
      {
        ...leaf("Vibrance 1", { top: 0, left: 0, bottom: 0, right: 0 }, [vibrance]),
        rgba: new Uint8ClampedArray(0),
      },
    ],
    composite: solid(300, 200, [255, 255, 255, 255]),
  });
  await page.getByTestId("file-input").setInputFiles({
    name: "styles.psd",
    mimeType: "image/vnd.adobe.photoshop",
    buffer: Buffer.from(bytes),
  });
  await expect(page.getByRole("tab", { name: /styles/ })).toBeVisible();
  expect(await layerNames(page)).toEqual(["Vibrance 1", "Box"]);
  await page.getByRole("button", { name: "Vibrance 1", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Vibrance" })).toHaveValue("40");
  await page.getByRole("button", { name: "Box", exact: true }).click();
  for (const name of ["Inner shadow", "Bevel", "Gradient overlay"]) {
    await expect(page.getByRole("checkbox", { name })).toBeChecked();
  }
  expect(errors).toEqual([]);
});
