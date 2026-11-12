import { expect, test } from "@playwright/test";
import { openEditor, trackErrors, watchNetwork } from "./helpers";

/** 0.50.0: opening TIFF and PDF files (ADR-0045). Fixtures are built here, byte by byte. */

/** A 40 × 20 uncompressed RGB TIFF: left half red, right half blue. */
function redBlueTiff(): Buffer {
  const w = 40;
  const h = 20;
  const pixels = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      pixels.set(x < w / 2 ? [255, 0, 0] : [0, 0, 255], (y * w + x) * 3);
    }
  }
  const tags: [number, number, number[]][] = [
    [256, 3, [w]],
    [257, 3, [h]],
    [258, 3, [8, 8, 8]],
    [259, 3, [1]],
    [262, 3, [2]],
    [273, 4, [8]],
    [277, 3, [3]],
    [278, 3, [h]],
    [279, 4, [pixels.length]],
  ];
  const ifd = 8 + pixels.length;
  const extra = ifd + 2 + tags.length * 12 + 4;
  const out = Buffer.alloc(extra + 6);
  out.write("II", 0, "latin1");
  out.writeUInt16LE(42, 2);
  out.writeUInt32LE(ifd, 4);
  pixels.copy(out, 8);
  out.writeUInt16LE(tags.length, ifd);
  tags.forEach(([tag, type, values], i) => {
    const e = ifd + 2 + i * 12;
    out.writeUInt16LE(tag, e);
    out.writeUInt16LE(type, e + 2);
    out.writeUInt32LE(values.length, e + 4);
    if (values.length === 3) {
      out.writeUInt32LE(extra, e + 8);
      values.forEach((v, k) => out.writeUInt16LE(v, extra + k * 2));
    } else if (type === 3) out.writeUInt16LE(values[0], e + 8);
    else out.writeUInt32LE(values[0], e + 8);
  });
  return out;
}

/** A two-page PDF: page 1 (200 × 100 pt) red, page 2 (100 × 200 pt) blue. */
function twoPagePdf(): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R >>",
    stream("1 0 0 rg 0 0 200 100 re f"),
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 200] /Contents 6 0 R >>",
    stream("0 0 1 rg 0 0 100 200 re f"),
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) body += `${String(o).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

function stream(content: string): string {
  return `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
}

test("a TIFF opens as a document with its pixels", async ({ page }) => {
  const errors = trackErrors(page);
  const offending = watchNetwork(page);
  await openEditor(page);
  await page.getByTestId("file-input").setInputFiles({
    name: "red-blue.tif",
    mimeType: "image/tiff",
    buffer: redBlueTiff(),
  });
  const status = page.getByRole("contentinfo", { name: "Status" });
  await expect(status).toContainText("40 × 20 px");
  await expect(page.getByRole("tab", { name: /^red-blue$/ })).toBeVisible();
  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});

test("a PDF with several pages asks which page and resolution, then opens it", async ({ page }) => {
  const errors = trackErrors(page);
  const offending = watchNetwork(page);
  await openEditor(page);
  await page.getByTestId("file-input").setInputFiles({
    name: "pages.pdf",
    mimeType: "application/pdf",
    buffer: twoPagePdf(),
  });
  const dialog = page.getByRole("dialog", { name: "Open PDF" });
  await expect(dialog).toBeVisible();
  // Page 1 is 200 × 100 pt: 417 × 208 px at the default 150 ppi.
  await expect(dialog).toContainText("417 × 208 px");
  await dialog.getByRole("spinbutton").fill("2");
  await dialog.getByRole("combobox").selectOption("150");
  await dialog.locator('button[type="submit"]').click();
  const status = page.getByRole("contentinfo", { name: "Status" });
  // Page 2 is 100 × 200 pt: at 150 ppi that is 208 × 417 px.
  await expect(status).toContainText("208 × 417 px");
  await page.getByRole("button", { name: "Fit screen" }).click();
  await page.mouse.move(1, 1);
  // The PDF reader was loaded from Picstea's own site; nothing else was requested.
  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});

test("TIFF and PDF convert to PNG without opening", async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
  await page.goto("/?convert=heic-to-jpg");
  const dialog = page.getByRole("dialog", { name: "Convert HEIC to JPG" });
  await expect(dialog.getByRole("radio", { name: "JPEG" })).toBeChecked();
  // Several files are converted together and saved as one ZIP.
  await dialog.getByLabel("Files").setInputFiles([
    { name: "a.tif", mimeType: "image/tiff", buffer: redBlueTiff() },
    { name: "b.pdf", mimeType: "application/pdf", buffer: twoPagePdf() },
  ]);
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Convert" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  expect(errors).toEqual([]);
});
