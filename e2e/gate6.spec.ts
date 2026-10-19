import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  drag,
  isBlue,
  isDark,
  layerNames,
  MOD,
  newDocument,
  openEditor,
  pixel,
  trackErrors,
} from "./helpers";

function watchNetwork(page: Page): string[] {
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
  return offending;
}

async function exportAs(
  page: Page,
  label: string,
): Promise<{ name: string; bytes: Buffer; path: string }> {
  await page.keyboard.press(`${MOD}+Shift+e`);
  const dialog = page.getByRole("dialog", { name: "Export" });
  await dialog.getByLabel(label, { exact: true }).check();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export" }).click();
  const file = await download;
  const path = (await file.path())!;
  return { name: file.suggestedFilename(), bytes: await readFile(path), path };
}

async function openFile(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer },
) {
  await page.getByTestId("file-input").setInputFiles(file);
}

const ascii = (bytes: Buffer, start: number, end: number) =>
  bytes.subarray(start, end).toString("latin1");

/** A composition with a painted layer, and a shape inside a group. */
async function composition(page: Page, name: string) {
  await newDocument(page, name);
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("b");
  await drag(page, [50, 50], [200, 50]);
  await page.keyboard.press("u");
  await drag(page, [300, 250], [400, 350]);
  await page.keyboard.press(`${MOD}+g`);
}

test("PSD export keeps layers and groups and opens again in Picstea", async ({ page }) => {
  const errors = trackErrors(page);
  const offending = watchNetwork(page);
  await composition(page, "Layered");
  const psd = await exportAs(page, "PSD");
  expect(psd.name).toBe("Layered.psd");
  expect(ascii(psd.bytes, 0, 4)).toBe("8BPS");
  await expect(page.getByText(/Shapes and text were converted to pixels/)).toBeVisible();

  await openFile(page, {
    name: psd.name,
    mimeType: "image/vnd.adobe.photoshop",
    buffer: psd.bytes,
  });
  await expect(page.getByRole("tab", { name: /^Layered$/ })).toHaveCount(2);
  expect(await layerNames(page)).toEqual(["Group 1", "Rectangle 1", "Layer 1", "Background"]);
  await page.getByRole("button", { name: "100%" }).click();
  expect(isBlue(await pixel(page, 350, 300))).toBe(true);
  expect(isDark(await pixel(page, 120, 50))).toBe(true);
  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});

test("a .picstea project file moves a project to another browser", async ({ page, browser }) => {
  const errors = trackErrors(page);
  await composition(page, "Portable");
  // Listen before pressing: under load the download can start before a later listener.
  const downloading = page.waitForEvent("download");
  await page.keyboard.press(`${MOD}+Shift+s`);
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("Portable.picstea");
  const path = (await download.path())!;

  // A fresh browser profile: nothing in IndexedDB.
  const other = await browser.newContext();
  const fresh = await other.newPage();
  const freshErrors = trackErrors(fresh);
  await openEditor(fresh);
  await fresh.getByTestId("file-input").setInputFiles(path);
  await expect(fresh.getByRole("tab", { name: /Portable/ })).toBeVisible();
  expect(await layerNames(fresh)).toEqual(["Group 1", "Rectangle 1", "Layer 1", "Background"]);
  await fresh.getByRole("button", { name: "100%" }).click();
  expect(isBlue(await pixel(fresh, 350, 300))).toBe(true);
  expect(isDark(await pixel(fresh, 120, 50))).toBe(true);
  await other.close();
  expect(freshErrors).toEqual([]);
  expect(errors).toEqual([]);
});

test("SVG export keeps shapes as vectors; PDF export is a real PDF", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Vectors");
  await page.keyboard.press("u");
  await drag(page, [300, 250], [400, 350]);

  const svg = await exportAs(page, "SVG");
  expect(svg.name).toBe("Vectors.svg");
  const text = svg.bytes.toString("utf8");
  expect(text).toContain('<rect width="100" height="100" fill="#4c8dff"');
  expect(text).toContain('<rect width="600" height="400" fill="#ffffff"');
  const wellFormed = await page.evaluate(
    (source) =>
      new DOMParser().parseFromString(source, "image/svg+xml").getElementsByTagName("parsererror")
        .length === 0,
    text,
  );
  expect(wellFormed).toBe(true);

  const pdf = await exportAs(page, "PDF");
  expect(pdf.name).toBe("Vectors.pdf");
  expect(ascii(pdf.bytes, 0, 8)).toBe("%PDF-1.4");
  expect(ascii(pdf.bytes, pdf.bytes.length - 6, pdf.bytes.length)).toBe("%%EOF\n");
  expect(errors).toEqual([]);
});

test("SVG files open as pixels and their scripts never run", async ({ page }) => {
  const errors = trackErrors(page);
  const offending = watchNetwork(page);
  await openEditor(page);
  const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" onload="window.__pwned = 1">
  <script>window.__pwned = 2</script>
  <image href="https://example.com/tracker.png" width="1" height="1"/>
  <rect width="120" height="80" fill="#ff0000"/>
</svg>`;
  await openFile(page, { name: "evil.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg) });
  await expect(page.getByRole("tab", { name: /evil/ })).toBeVisible();
  await expect(page.getByRole("contentinfo", { name: "Status" })).toContainText("120 × 80 px");
  expect(await page.evaluate(() => (window as { __pwned?: number }).__pwned)).toBeUndefined();
  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});

test("GIF opens; TIFF, PDF and junk get clear messages", async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  const gif = Buffer.from("R0lGODlhAQABAIAAAP8AAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
  await openFile(page, { name: "dot.gif", mimeType: "image/gif", buffer: gif });
  await expect(page.getByRole("tab", { name: /dot/ })).toBeVisible();
  await expect(page.getByRole("contentinfo", { name: "Status" })).toContainText("1 × 1 px");

  await openFile(page, {
    name: "scan.tif",
    mimeType: "image/tiff",
    buffer: Buffer.from("II*\0rest"),
  });
  await expect(page.getByText(/TIFF files cannot be opened/)).toBeVisible();
  await openFile(page, {
    name: "doc.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 x"),
  });
  await expect(page.getByText(/PDF files can be exported but not opened/)).toBeVisible();
  await openFile(page, {
    name: "x.psd",
    mimeType: "image/vnd.adobe.photoshop",
    buffer: Buffer.from("8BPS\0\x02"),
  });
  await expect(page.getByText(/PSB|ends unexpectedly|damaged/)).toBeVisible();
  expect(errors).toEqual([]);
});
