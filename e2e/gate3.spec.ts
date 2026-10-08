import { expect, test } from "@playwright/test";
import {
  at,
  darkest,
  DOC,
  drag,
  isBlue,
  isDark,
  isWhite,
  layerNames,
  MOD,
  newDocument,
  pixel,
  trackErrors,
} from "./helpers";

test("brush paints on a new pixel layer and undo restores it", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page);
  await page.keyboard.press(`${MOD}+Shift+n`);
  expect(await layerNames(page)).toEqual(["Layer 1", "Background"]);
  await page.keyboard.press("b");
  await drag(page, [100, 200], [500, 200]);
  expect(isDark(await pixel(page, 300, 200))).toBe(true);
  expect(isWhite(await pixel(page, 300, 100))).toBe(true);

  await page.keyboard.press(`${MOD}+z`);
  expect(isWhite(await pixel(page, 300, 200))).toBe(true);
  await page.keyboard.press(`${MOD}+Shift+z`);
  expect(isDark(await pixel(page, 300, 200))).toBe(true);

  // Eraser removes the paint again.
  await page.keyboard.press("e");
  await drag(page, [280, 200], [320, 200]);
  expect(isWhite(await pixel(page, 300, 200))).toBe(true);
  expect(errors).toEqual([]);
});

test("shapes are drawn, moved and kept editable", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page);
  await page.keyboard.press("u");
  await drag(page, [50, 50], [150, 150]);
  expect(await layerNames(page)).toEqual(["Rectangle 1", "Background"]);
  expect(isBlue(await pixel(page, 100, 100))).toBe(true);

  await page.getByRole("button", { name: "Ellipse" }).click();
  await drag(page, [300, 50], [500, 250]);
  expect(await layerNames(page)).toEqual(["Ellipse 1", "Rectangle 1", "Background"]);
  expect(isBlue(await pixel(page, 400, 150))).toBe(true);
  // Corner of the bounding box is outside the ellipse.
  expect(isWhite(await pixel(page, 305, 55))).toBe(true);

  await page.keyboard.press("v");
  await drag(page, [100, 100], [250, 300]);
  expect(isBlue(await pixel(page, 250, 300))).toBe(true);
  expect(isWhite(await pixel(page, 100, 100))).toBe(true);
  await expect(page.getByRole("spinbutton", { name: "X" })).toHaveValue("200");

  // One drag is one undo step.
  await page.keyboard.press(`${MOD}+z`);
  expect(isBlue(await pixel(page, 100, 100))).toBe(true);
  expect(errors).toEqual([]);
});

test("text is typed on canvas and can be re-edited", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page);
  await page.keyboard.press("t");
  const p = await at(page, 100, 200);
  await page.mouse.click(p.x, p.y);
  const editor = page.getByRole("textbox", { name: "Edit text on canvas" });
  await expect(editor).toBeFocused();
  await page.keyboard.type("Hello");
  await page.keyboard.press(`${MOD}+Enter`);
  expect(await layerNames(page)).toEqual(["Hello", "Background"]);
  expect(await darkest(page, 100, 200, 120, 60)).toBeLessThan(80);

  // Click the text again to edit it.
  await page.mouse.click(p.x + 10, p.y + 10);
  await expect(editor).toHaveValue("Hello");
  await page.keyboard.press("End");
  await page.keyboard.type(" world");
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(page.locator("#prop-text")).toHaveValue("Hello");
  expect(errors).toEqual([]);
});

test("crop changes the canvas size and is undoable", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page);
  await page.keyboard.press("c");
  await drag(page, [DOC.width, DOC.height], [300, 200]);
  await page.keyboard.press("Enter");
  // ±1 px: pointer positions are rounded to whole document pixels.
  await expect(page.getByText(/^(299|300|301) × (199|200|201) px$/)).toBeVisible();
  await page.keyboard.press(`${MOD}+z`);
  await expect(page.getByText("600 × 400 px", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("exports PNG and JPEG files locally and restores everything after reload", async ({
  page,
}) => {
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

  await newDocument(page, "Export me");
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("b");
  await drag(page, [50, 50], [200, 50]);
  await page.keyboard.press("u");
  await drag(page, [300, 250], [400, 350]);

  // PNG
  await page.keyboard.press(`${MOD}+Shift+e`);
  const dialog = page.getByRole("dialog", { name: "Export" });
  let download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export" }).click();
  let file = await download;
  expect(file.suggestedFilename()).toBe("Export me.png");
  let bytes = await (await import("node:fs/promises")).readFile((await file.path())!);
  expect([...bytes.subarray(1, 4)].map((b) => String.fromCharCode(b)).join("")).toBe("PNG");
  expect(bytes.readUInt32BE(16)).toBe(DOC.width);
  expect(bytes.readUInt32BE(20)).toBe(DOC.height);
  await expect(dialog).toBeHidden();

  // JPEG
  await page.keyboard.press(`${MOD}+Shift+e`);

  await dialog.getByLabel("JPEG").check();
  download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export" }).click();
  file = await download;
  expect(file.suggestedFilename()).toBe("Export me.jpg");
  bytes = await (await import("node:fs/promises")).readFile((await file.path())!);
  expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);

  // Everything — including painted pixels — survives a reload.
  await page.keyboard.press(`${MOD}+s`);
  await expect(page.getByTestId("save-state")).toHaveText("Saved in this browser");
  await page.reload();
  await page
    .getByRole("list", { name: "Recent projects" })
    .getByRole("button", { name: /^Export me/ })
    .click();
  await expect(page.getByRole("tab", { name: /Export me/ })).toBeVisible();
  expect(await layerNames(page)).toEqual(["Rectangle 1", "Layer 1", "Background"]);
  await page.getByRole("button", { name: "100%" }).click();
  expect(isDark(await pixel(page, 125, 50))).toBe(true);
  expect(isBlue(await pixel(page, 350, 300))).toBe(true);

  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});
