import { expect, test, type Page } from "@playwright/test";

const MOD = process.platform === "darwin" ? "Meta" : "Control";
const DOC = { width: 600, height: 400 };

/** Collect console errors so every test can assert a clean console. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function newDocument(page: Page, name = "Gate three") {
  // Force the download-link fallback; the native save dialog cannot be driven headlessly.
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
  await page.goto("/editor");
  await page.getByRole("button", { name: "New document" }).click();
  const dialog = page.getByRole("dialog", { name: "New document" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Width (px)").fill(String(DOC.width));
  await dialog.getByLabel("Height (px)").fill(String(DOC.height));
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "100%" }).click();
  await expect(page.getByTestId("zoom-level")).toHaveText("100%");
}

/** Screen position of a document point at 100% zoom (the document is centred). */
async function at(page: Page, x: number, y: number) {
  const box = (await page.getByTestId("canvas-viewport").boundingBox())!;
  return {
    x: box.x + Math.round((box.width - DOC.width) / 2) + x,
    y: box.y + Math.round((box.height - DOC.height) / 2) + y,
  };
}

async function drag(page: Page, from: [number, number], to: [number, number]) {
  const a = await at(page, ...from);
  const b = await at(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  // Leave the canvas so hover feedback (brush outline, handles) doesn't affect pixel checks.
  await page.mouse.move(1, 1);
}

/** Darkest luminance in a document-space rectangle of the on-screen canvas. */
async function darkest(page: Page, x: number, y: number, w: number, h: number): Promise<number> {
  const p = await at(page, x, y);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  return page.evaluate(
    ([sx, sy, sw, sh]) => {
      const canvas = document.querySelector(
        '[data-testid="canvas-viewport"] canvas',
      ) as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      const data = canvas
        .getContext("2d")!
        .getImageData(
          Math.round((sx - rect.left) * dpr),
          Math.round((sy - rect.top) * dpr),
          Math.round(sw * dpr),
          Math.round(sh * dpr),
        ).data;
      let min = 255;
      for (let i = 0; i < data.length; i += 4)
        min = Math.min(min, (data[i] + data[i + 1] + data[i + 2]) / 3);
      return min;
    },
    [p.x, p.y, w, h] as const,
  );
}

/** RGBA of the on-screen canvas at a document point. */
async function pixel(page: Page, x: number, y: number): Promise<number[]> {
  const p = await at(page, x, y);
  // Rendering is batched to the next animation frame.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  return page.evaluate(
    ([sx, sy]) => {
      const canvas = document.querySelector(
        '[data-testid="canvas-viewport"] canvas',
      ) as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      const ctx = canvas.getContext("2d")!;
      return [
        ...ctx.getImageData(
          Math.round((sx - rect.left) * dpr),
          Math.round((sy - rect.top) * dpr),
          1,
          1,
        ).data,
      ];
    },
    [p.x, p.y] as const,
  );
}

const isWhite = (rgba: number[]) => rgba[0] > 240 && rgba[1] > 240 && rgba[2] > 240;
const isDark = (rgba: number[]) => rgba[0] < 60 && rgba[1] < 60 && rgba[2] < 60;
const isBlue = (rgba: number[]) => rgba[2] > 200 && rgba[0] < 120;

const layerNames = (page: Page) =>
  page
    .getByTestId("layer-row")
    .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-layer-name")));

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
  const dialog = page.getByRole("dialog", { name: "Export image" });
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
