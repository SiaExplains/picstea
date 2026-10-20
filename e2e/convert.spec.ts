import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { writePsd } from "../src/editor/formats/psd/psd-write";
import { openEditor, trackErrors, watchNetwork } from "./helpers";

const DOT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const DOT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAP8AAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64",
);

/** The native save dialog can't be driven headlessly; use the download-link fallback. */
async function withoutSavePicker(page: Page) {
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
}

async function downloadBytes(page: Page, click: () => Promise<void>) {
  const download = page.waitForEvent("download");
  await click();
  const file = await download;
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

test("a converter link opens the converter, not the welcome, and converts on the device", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const offending = watchNetwork(page);
  await withoutSavePicker(page);
  await page.goto("/?convert=png-to-jpg");

  const dialog = page.getByRole("dialog", { name: "Convert PNG to JPG" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("dialog", { name: /free image editor/i })).toBeHidden();
  await expect(dialog.getByRole("radio", { name: "JPEG" })).toBeChecked();
  // The link is consumed: a reload opens the plain editor.
  await expect(page).toHaveURL(/\/$/);

  await dialog.getByLabel("Files").setInputFiles({
    name: "dot.png",
    mimeType: "image/png",
    buffer: DOT_PNG,
  });
  const jpg = await downloadBytes(page, () =>
    dialog.getByRole("button", { name: "Convert" }).click(),
  );
  expect(jpg.name).toBe("dot.jpg");
  expect([...jpg.bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  await expect(dialog).toBeHidden();
  // Nothing was opened as a document: the start screen is still showing.
  await expect(page.getByRole("button", { name: "New document" })).toBeVisible();
  await expect(page.getByText("No document open.")).toBeVisible();

  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});

test("several files become one ZIP; File → Convert… opens the same converter", async ({ page }) => {
  await withoutSavePicker(page);
  await openEditor(page);
  await page
    .getByRole("menubar", { name: "Editor menu" })
    .getByRole("menuitem", { name: "File" })
    .click();
  await page.getByRole("menuitem", { name: "Convert…" }).click();

  const dialog = page.getByRole("dialog", { name: "Convert images" });
  await expect(dialog.getByRole("radio", { name: "PNG" })).toBeChecked();
  await dialog.getByLabel("Files").setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: DOT_PNG },
    { name: "b.gif", mimeType: "image/gif", buffer: DOT_GIF },
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") },
  ]);
  const zip = await downloadBytes(page, () =>
    dialog.getByRole("button", { name: "Convert" }).click(),
  );
  expect(zip.name).toBe("converted-png.zip");
  expect(zip.bytes.subarray(0, 2).toString("latin1")).toBe("PK");
  expect(zip.bytes.includes(Buffer.from("a.png"))).toBe(true);
  expect(zip.bytes.includes(Buffer.from("b.png"))).toBe(true);
  await expect(page.getByText(/1 file\(s\) could not be converted: notes\.txt/)).toBeVisible();
});

test("a PSD converts to PNG from its flattened image", async ({ page }) => {
  const errors = trackErrors(page);
  await withoutSavePicker(page);
  await page.goto("/?convert=psd-to-png");
  const dialog = page.getByRole("dialog", { name: "Convert PSD to PNG" });
  const composite = new Uint8ClampedArray(3 * 2 * 4).fill(255);
  const psd = writePsd({ width: 3, height: 2, layers: [], composite });
  await dialog.getByLabel("Files").setInputFiles({
    name: "poster.psd",
    mimeType: "image/vnd.adobe.photoshop",
    buffer: Buffer.from(psd),
  });
  const png = await downloadBytes(page, () =>
    dialog.getByRole("button", { name: "Convert" }).click(),
  );
  expect(png.name).toBe("poster.png");
  expect(png.bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  // IHDR width and height.
  expect(png.bytes.readUInt32BE(16)).toBe(3);
  expect(png.bytes.readUInt32BE(20)).toBe(2);
  expect(errors).toEqual([]);
});

test("unknown converter links are ignored", async ({ page }) => {
  await page.goto("/?convert=png-to-exe");
  await expect(page.getByRole("dialog", { name: /free image editor/i })).toBeVisible();
  await expect(page.getByRole("dialog", { name: /^Convert/ })).toHaveCount(0);
});

test("converter pages link into the editor, and unknown pairs are 404", async ({
  page,
  request,
}) => {
  await page.goto("/convert/webp-to-png");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Convert WebP to PNG online");
  await expect(page.getByRole("link", { name: /Convert WebP to PNG now/ })).toHaveAttribute(
    "href",
    "/?convert=webp-to-png",
  );
  await page.goto("/convert");
  await expect(page.getByRole("link", { name: "Open the converter — free" })).toHaveAttribute(
    "href",
    "/?convert=images",
  );
  expect((await request.get("/convert/png-to-exe")).status()).toBe(404);
});
