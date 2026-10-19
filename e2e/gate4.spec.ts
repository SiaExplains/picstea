import { expect, test, type Page } from "@playwright/test";
import {
  drag,
  isBlue,
  isWhite,
  layerNames,
  MOD,
  newDocument,
  pixel,
  trackErrors,
  pickMenu,
} from "./helpers";

const rows = (page: Page) => page.getByTestId("layer-row");
const row = (page: Page, name: string) =>
  rows(page).and(page.locator(`[data-layer-name="${name}"]`));
const depthOf = async (page: Page, name: string) =>
  Number(await row(page, name).getAttribute("data-depth"));
const luminance = (rgba: number[]) => (rgba[0] + rgba[1] + rgba[2]) / 3;

/**
 * Drag one layer row onto the middle of another with real DragEvents. Headless Chromium does not
 * synthesise native HTML5 drag-and-drop from mouse input here, so the events are dispatched in
 * the page — the same handlers run as for a mouse drag.
 */
async function dragLayer(page: Page, source: string, target: string) {
  await page.evaluate(
    ([from, to]) => {
      const src = document.querySelector(
        `[data-layer-name="${from}"] [role="button"][draggable="true"]`,
      )!;
      const dst = document.querySelector(`[data-layer-name="${to}"]`)!;
      const dataTransfer = new DataTransfer();
      src.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
      );
      const r = dst.getBoundingClientRect();
      const at = {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: r.x + r.width / 2,
        clientY: r.y + r.height / 2,
      };
      dst.dispatchEvent(new DragEvent("dragenter", at));
      dst.dispatchEvent(new DragEvent("dragover", at));
      dst.dispatchEvent(new DragEvent("drop", at));
      src.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer }));
    },
    [source, target] as const,
  );
}

async function rectangle(page: Page, from: [number, number], to: [number, number]) {
  await page.keyboard.press("u");
  await drag(page, from, to);
}

test("groups: opacity on an isolated group blends its contents, ungroup restores", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Groups");
  await rectangle(page, [50, 50], [150, 150]);
  await page.keyboard.press(`${MOD}+g`);
  expect(await layerNames(page)).toEqual(["Group 1", "Rectangle 1", "Background"]);
  expect(await depthOf(page, "Rectangle 1")).toBe(1);

  await page.getByLabel("Opacity percent").fill("50");
  await page.getByLabel("Opacity percent").blur();
  const blended = await pixel(page, 100, 100);
  expect(blended[2]).toBeGreaterThan(240);
  expect(blended[0]).toBeGreaterThan(130);
  expect(blended[0]).toBeLessThan(200);

  await page.keyboard.press(`${MOD}+Shift+g`);
  expect(await layerNames(page)).toEqual(["Rectangle 1", "Background"]);
  expect(isBlue(await pixel(page, 100, 100))).toBe(true);
  expect(errors).toEqual([]);
});

test("layers can be dragged into a group and moved back out with the arrows", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Drag");
  await rectangle(page, [50, 50], [150, 150]);
  await page.getByRole("button", { name: "New Group" }).click();
  expect(await layerNames(page)).toEqual(["Group 1", "Rectangle 1", "Background"]);

  await dragLayer(page, "Rectangle 1", "Group 1");
  expect(await layerNames(page)).toEqual(["Group 1", "Rectangle 1", "Background"]);
  expect(await depthOf(page, "Rectangle 1")).toBe(1);

  await row(page, "Rectangle 1").click();
  await page.getByRole("button", { name: "Send Backward" }).click();
  expect(await depthOf(page, "Rectangle 1")).toBe(0);
  await page.getByRole("button", { name: "Bring Forward" }).click();
  expect(await depthOf(page, "Rectangle 1")).toBe(1);
  expect(errors).toEqual([]);
});

test("painting black on a layer mask hides pixels; undo reveals them", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Mask");
  await rectangle(page, [50, 50], [350, 150]);
  await page.getByRole("button", { name: "Add Layer Mask" }).click();
  await expect(page.getByTestId("mask-thumb")).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("b");
  await drag(page, [100, 100], [300, 100]);
  expect(isWhite(await pixel(page, 200, 100))).toBe(true);
  expect(isBlue(await pixel(page, 200, 60))).toBe(true);

  await page.keyboard.press(`${MOD}+z`);
  expect(isBlue(await pixel(page, 200, 100))).toBe(true);

  // Disabling the mask (Shift-click) also reveals everything.
  await page.keyboard.press(`${MOD}+Shift+z`);
  expect(isWhite(await pixel(page, 200, 100))).toBe(true);
  await page.getByTestId("mask-thumb").click({ modifiers: ["Shift"] });
  expect(isBlue(await pixel(page, 200, 100))).toBe(true);
  expect(errors).toEqual([]);
});

test("an Invert adjustment changes only the layers below it", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Adjust");
  await rectangle(page, [50, 50], [150, 150]);
  await pickMenu(page, "Layer", "Invert…");
  expect(await layerNames(page)).toEqual(["Invert", "Rectangle 1", "Background"]);

  const inverted = await pixel(page, 100, 100);
  expect(inverted[0]).toBeGreaterThan(150);
  expect(inverted[2]).toBeLessThan(60);
  expect(luminance(await pixel(page, 400, 300))).toBeLessThan(20);

  // A shape drawn now goes above the adjustment and is not inverted.
  await rectangle(page, [300, 250], [400, 350]);
  expect(isBlue(await pixel(page, 350, 300))).toBe(true);

  // Hue/Saturation with saturation −100 turns everything below it grey.
  await pickMenu(page, "Layer", "Hue/Saturation…");
  const saturation = page.getByRole("slider", { name: "Saturation" });
  await saturation.fill("-100");
  const grey = await pixel(page, 350, 300);
  expect(Math.abs(grey[0] - grey[2])).toBeLessThan(4);
  expect(errors).toEqual([]);
});

test("drop shadow and outer stroke render around the layer", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Effects");
  await rectangle(page, [100, 100], [200, 200]);

  await page.getByRole("checkbox", { name: "Drop shadow" }).check();
  // Photoshop's default: light from 120°, 5 px away → shadow below-right of the shape.
  expect(luminance(await pixel(page, 202, 204))).toBeLessThan(220);
  expect(isWhite(await pixel(page, 96, 96))).toBe(true);

  await page
    .getByRole("group", { name: "Layer effects" })
    .getByRole("checkbox", { name: "Stroke" })
    .check();
  expect(luminance(await pixel(page, 98, 150))).toBeLessThan(60);
  await expect(row(page, "Rectangle 1").getByText("fx")).toBeVisible();
  // Shortcuts keep working while a checkbox in the panel has focus.
  await page.keyboard.press(`${MOD}+g`);
  expect(await layerNames(page)).toEqual(["Group 1", "Rectangle 1", "Background"]);
  expect(errors).toEqual([]);
});

test("a full composition survives reload and sends nothing over the network", async ({ page }) => {
  const errors = trackErrors(page);
  const offending: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (
      url.protocol !== "blob:" &&
      url.protocol !== "data:" &&
      (r.method() !== "GET" || url.port !== "3100")
    ) {
      offending.push(`${r.method()} ${r.url()}`);
    }
  });

  await newDocument(page, "Composition");
  await rectangle(page, [50, 50], [350, 150]);
  await page.getByRole("button", { name: "Add Layer Mask" }).click();
  await page.keyboard.press("b");
  await drag(page, [100, 100], [300, 100]);
  await page.keyboard.press(`${MOD}+g`);
  await page.getByRole("checkbox", { name: "Drop shadow" }).check();
  await pickMenu(page, "Layer", "Black & White…");

  const before = await layerNames(page);
  const maskedPixel = await pixel(page, 200, 100);
  const shapePixel = await pixel(page, 200, 60);

  await page.keyboard.press(`${MOD}+s`);
  await expect(page.getByTestId("save-state")).toHaveText("Saved in this browser");
  await page.reload();
  await page
    .getByRole("list", { name: "Recent projects" })
    .getByRole("button", { name: /^Composition/ })
    .click();
  await page.getByRole("button", { name: "100%" }).click();
  expect(await layerNames(page)).toEqual(before);
  expect(await pixel(page, 200, 100)).toEqual(maskedPixel);
  expect(await pixel(page, 200, 60)).toEqual(shapePixel);
  // Black & White above the blue shape makes it grey.
  expect(Math.abs(shapePixel[0] - shapePixel[2])).toBeLessThan(4);

  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});
