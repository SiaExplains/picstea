import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { corner } from "../src/editor/core/path/path";
import { encodeVectorMask } from "../src/editor/formats/psd/psd-paths";
import { writePsd } from "../src/editor/formats/psd/psd-write";
import type { PsdPixelLayer } from "../src/editor/formats/psd/psd-model";
import {
  dropShadowBlock,
  linkedFilesBlock,
  placedBlock,
  solidColorBlock,
  textBlock,
} from "../src/editor/test-utils/psd-fixtures";
import {
  at,
  drag,
  layerNames,
  MOD,
  newDocument,
  openEditor,
  pixel,
  trackErrors,
  pickMenu,
} from "./helpers";

const menu = (page: Page, name: string, item: string) => pickMenu(page, name, item);

async function exportPsd(page: Page): Promise<Buffer> {
  await page.keyboard.press(`${MOD}+Shift+e`);
  const dialog = page.getByRole("dialog", { name: "Export" });
  await dialog.getByLabel("PSD", { exact: true }).check();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export" }).click();
  return readFile((await (await download).path())!);
}

/** Pixels at a few document points, for comparing composites. */
async function sample(page: Page): Promise<number[][]> {
  const out: number[][] = [];
  for (const [x, y] of [
    [50, 50],
    [150, 150],
    [200, 120],
    [280, 280],
    [500, 300],
  ]) {
    out.push(await pixel(page, x, y));
  }
  return out;
}

const close = (a: number[][], b: number[][]) =>
  a.every((p, i) => p.every((v, c) => Math.abs(v - b[i][c]) <= 3));

test("adjustment layers and vector masks survive PSD export and import", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Round trip");
  // A black square with a triangular vector mask…
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [300, 300]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
  await page.keyboard.press("p");
  await page.getByRole("group", { name: "Pen mode" }).getByRole("button", { name: "Path" }).click();
  for (const [x, y] of [
    [100, 100],
    [300, 100],
    [200, 300],
    [100, 100],
  ]) {
    const p = await at(page, x, y);
    await page.mouse.click(p.x, p.y);
  }
  await menu(page, "Layer", "Add Vector Mask from Path");
  // …under Curves and Invert adjustment layers.
  await menu(page, "Adjustments", "Curves…");
  await page.getByRole("slider", { name: "Curve point 2" }).focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowDown");
  await page.getByRole("slider", { name: "Curve point 2" }).blur();
  await menu(page, "Adjustments", "Invert…");
  await page.keyboard.press("v");
  await page.mouse.move(1, 1);
  const names = await layerNames(page);
  const before = await sample(page);

  const psd = await exportPsd(page);
  await page.getByTestId("file-input").setInputFiles({
    name: "Round trip.psd",
    mimeType: "image/vnd.adobe.photoshop",
    buffer: psd,
  });
  await expect(page.getByRole("tab", { name: /^Round trip$/ })).toHaveCount(2);
  await page.getByRole("button", { name: "100%" }).click();
  expect(await layerNames(page)).toEqual(
    names.filter((n) => n !== "Background").concat("Background"),
  );
  await expect(page.getByTestId("vector-mask-thumb")).toHaveCount(1);
  await page.getByRole("button", { name: "Curves", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Curve point 2" })).toHaveAttribute(
    "aria-valuenow",
    "205",
  );
  await page.mouse.move(1, 1);
  expect(close(await sample(page), before)).toBe(true);
  expect(errors).toEqual([]);
});

test("a Photoshop file with text, a shape, a smart object and a drop shadow opens editable", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await openEditor(page);
  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 30;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#00aa00";
    ctx.fillRect(0, 0, 40, 30);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const png = Uint8Array.from(Buffer.from(pngBase64, "base64"));
  const width = 400;
  const height = 300;
  const solid = (w: number, h: number, rgba: number[]) => {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) out.set(rgba, i * 4);
    return out;
  };
  const leaf = (
    name: string,
    rect: { top: number; left: number; bottom: number; right: number },
    rgba: number[],
    blocks: { key: string; data: Uint8Array }[],
  ): PsdPixelLayer => ({
    kind: "pixels",
    name,
    opacity: 255,
    visible: true,
    blendKey: "norm",
    rect,
    rgba: solid(rect.right - rect.left, rect.bottom - rect.top, rgba),
    blocks,
  });
  const triangle = encodeVectorMask(
    {
      path: {
        subpaths: [{ closed: true, anchors: [corner(250, 50), corner(350, 50), corner(300, 150)] }],
      },
      enabled: true,
      linked: true,
    },
    width,
    height,
  );
  const bytes = writePsd({
    width,
    height,
    layers: [
      leaf(
        "Background",
        { top: 0, left: 0, bottom: height, right: width },
        [255, 255, 255, 255],
        [],
      ),
      leaf(
        "Box",
        { top: 180, left: 40, bottom: 260, right: 140 },
        [0, 0, 0, 255],
        [
          {
            key: "lfx2",
            data: dropShadowBlock({ color: "#ff0000", distance: 10, blur: 2, angle: 135 }),
          },
        ],
      ),
      leaf(
        "Triangle",
        { top: 50, left: 250, bottom: 150, right: 350 },
        [0, 0, 255, 255],
        [
          { key: "SoCo", data: solidColorBlock("#0000ff") },
          { key: "vmsk", data: triangle },
        ],
      ),
      leaf(
        "Greeting",
        { top: 20, left: 30, bottom: 50, right: 150 },
        [0, 0, 0, 255],
        [
          {
            key: "TySh",
            data: textBlock({
              text: "Hello PSD",
              fontSize: 24,
              color: [200, 0, 0],
              font: "ArialMT",
              x: 30,
              y: 44,
            }),
          },
        ],
      ),
      leaf(
        "Logo",
        { top: 200, left: 250, bottom: 260, right: 330 },
        [0, 170, 0, 255],
        [{ key: "SoLd", data: placedBlock("logo-1", [250, 200, 330, 200, 330, 260, 250, 260]) }],
      ),
    ],
    composite: solid(width, height, [255, 255, 255, 255]),
    globalBlocks: [{ key: "lnk2", data: linkedFilesBlock("logo-1", "logo.png", "png ", png) }],
  });

  await page.getByTestId("file-input").setInputFiles({
    name: "crafted.psd",
    mimeType: "image/vnd.adobe.photoshop",
    buffer: Buffer.from(bytes),
  });
  await expect(page.getByRole("tab", { name: /crafted/ })).toBeVisible();
  expect(await layerNames(page)).toEqual(["Logo", "Greeting", "Triangle", "Box", "Background"]);

  await page.getByRole("button", { name: "Greeting", exact: true }).click();
  await expect(page.getByLabel("Text", { exact: true })).toHaveValue("Hello PSD");
  await page.getByRole("button", { name: "Logo", exact: true }).click();
  await expect(page.getByText("Smart object · 40 × 30 px")).toBeVisible();
  await page.getByRole("button", { name: "Triangle", exact: true }).click();
  await expect(page.getByLabel("Fill colour")).toHaveValue("#0000ff");
  await page.getByRole("button", { name: "Box", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Drop shadow" })).toBeChecked();
  await expect(page.getByText(/editable text/)).toBeVisible();
  expect(errors).toEqual([]);
});
