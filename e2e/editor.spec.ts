import { expect, test, type Page, type Request } from "@playwright/test";
import { openEditor } from "./helpers";

const layerNames = (page: Page) =>
  page
    .getByTestId("layer-row")
    .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-layer-name")));

async function createDocument(page: Page, name: string) {
  await openEditor(page);
  await page.getByRole("button", { name: "New document" }).click();
  const dialog = page.getByRole("dialog", { name: "New document" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Width (px)").fill("800");
  await dialog.getByLabel("Height (px)").fill("600");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("tab", { name: new RegExp(name) })).toBeVisible();
}

/** A real PNG produced by the browser itself, so the decode path is exercised end to end. */
async function makePng(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#d33";
      ctx.fillRect(0, 0, w, h);
      return canvas.toDataURL("image/png").split(",")[1];
    },
    [width, height] as const,
  );
  return Buffer.from(base64, "base64");
}

test("Gate 2: create, edit, undo/redo, save locally and restore after reload", async ({ page }) => {
  await createDocument(page, "Gate two");
  expect(await layerNames(page)).toEqual(["Background"]);

  await page.getByRole("button", { name: "New Layer", exact: true }).click();
  expect(await layerNames(page)).toEqual(["Layer 1", "Background"]);

  // Rename via double-click.
  await page.getByRole("button", { name: "Layer 1", exact: true }).dblclick();
  const nameInput = page.getByRole("textbox", { name: "Layer name" });
  await nameInput.fill("Sky");
  await nameInput.press("Enter");
  expect(await layerNames(page)).toEqual(["Sky", "Background"]);

  await page.getByRole("button", { name: "Hide Sky" }).click();
  await expect(page.getByRole("button", { name: "Show Sky" })).toBeVisible();

  // Undo the hide and the rename via shortcuts, then redo the rename.
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.getByTestId("canvas-viewport").click();
  await page.keyboard.press(`${mod}+z`);
  await expect(page.getByRole("button", { name: "Hide Sky" })).toBeVisible();
  await page.keyboard.press(`${mod}+z`);
  expect(await layerNames(page)).toEqual(["Layer 1", "Background"]);
  await page.keyboard.press(`${mod}+Shift+z`);
  expect(await layerNames(page)).toEqual(["Sky", "Background"]);

  await page.keyboard.press(`${mod}+s`);
  await expect(page.getByTestId("save-state")).toHaveText("Saved in this browser");

  await page.reload();
  const recent = page.getByRole("list", { name: "Recent projects" });
  await expect(recent.getByText("Gate two")).toBeVisible();
  await recent.getByRole("button", { name: /^Gate two/ }).click();
  await expect(page.getByRole("tab", { name: /Gate two/ })).toBeVisible();
  expect(await layerNames(page)).toEqual(["Sky", "Background"]);
});

test("viewport zoom controls update the zoom level", async ({ page }) => {
  await createDocument(page, "Zoom");
  await page.getByRole("button", { name: "100%" }).click();
  await expect(page.getByTestId("zoom-level")).toHaveText("100%");
  await page.getByRole("menuitem", { name: "View" }).click();
  await page.getByRole("menuitem", { name: "Zoom In" }).click();
  await expect(page.getByTestId("zoom-level")).toHaveText("150%");
});

test("rejects non-image files with a clear message", async ({ page }) => {
  await openEditor(page);
  let dialogs = 0;
  page.on("dialog", (d) => {
    dialogs++;
    void d.dismiss();
  });
  // The name and type are ignored: content says broken SVG, which is refused without running.
  await page.getByTestId("file-input").setInputFiles({
    name: "evil.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg onload=alert(1)>"),
  });
  await expect(page.getByText(/This SVG file is damaged/)).toBeVisible();
  await page.getByTestId("file-input").setInputFiles({
    name: "notes.png",
    mimeType: "image/png",
    buffer: Buffer.from("just some text"),
  });
  await expect(page.getByText(/This file type is not supported/)).toBeVisible();
  expect(dialogs).toBe(0);
});

test("local-first: opening and editing an image sends no data anywhere", async ({
  page,
  baseURL,
}) => {
  const offending: string[] = [];
  const watch = (request: Request) => {
    const url = new URL(request.url());
    const sameOrigin = url.origin === new URL(baseURL!).origin;
    const isLocal = url.protocol === "data:" || url.protocol === "blob:";
    if (!isLocal && (!sameOrigin || request.method() !== "GET")) {
      offending.push(`${request.method()} ${request.url()}`);
    }
  };

  await openEditor(page);
  const png = await makePng(page, 320, 200);
  page.on("request", watch);

  await page
    .getByTestId("file-input")
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("tab", { name: /photo/ })).toBeVisible();
  expect(await layerNames(page)).toEqual(["photo"]);
  await page.getByRole("button", { name: "New Layer", exact: true }).click();
  await page.getByLabel("Opacity percent").fill("40");
  await page.getByTestId("canvas-viewport").click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+s" : "Control+s");
  await expect(page.getByTestId("save-state")).toHaveText("Saved in this browser");

  page.off("request", watch);
  expect(offending).toEqual([]);
});
