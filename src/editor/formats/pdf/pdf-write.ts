import { deflate } from "../binary/compression";

/**
 * Minimal, valid PDF 1.4 writer for exporting the flattened image as one page (ADR-0011): an image
 * XObject (Flate RGB with an alpha soft mask, or the JPEG bytes as DCTDecode) drawn to fill a page
 * whose size follows the document resolution. Hand-written, so no dependency.
 */

export type PdfImage =
  | {
      readonly kind: "lossless";
      /** RGB bytes, width × height × 3. */
      readonly rgb: Uint8Array;
      /** Alpha bytes, width × height; omitted when fully opaque. */
      readonly alpha?: Uint8Array;
    }
  | { readonly kind: "jpeg"; readonly jpeg: Uint8Array };

export interface PdfPage {
  readonly width: number;
  readonly height: number;
  /** Pixels per inch: the page is width / ppi inches wide. */
  readonly ppi: number;
  readonly image: PdfImage;
  readonly title?: string;
}

const encoder = new TextEncoder();

/** A PDF literal string with (, ) and \\ escaped and non-ASCII replaced. */
export function pdfString(text: string): string {
  const ascii = [...text].map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126 ? "?" : c));
  return `(${ascii.join("").replace(/[\\()]/g, (m) => `\\${m}`)})`;
}

const points = (pixels: number, ppi: number) => Math.round(((pixels * 72) / ppi) * 100) / 100;

export async function writePdf(page: PdfPage): Promise<Uint8Array> {
  const w = points(page.width, page.ppi);
  const h = points(page.height, page.ppi);
  const objects: Uint8Array[][] = [];
  const add = (...parts: (string | Uint8Array)[]) => {
    objects.push(parts.map((p) => (typeof p === "string" ? encoder.encode(p) : p)));
    return objects.length;
  };
  const stream = (dict: string, data: Uint8Array) =>
    [`<< ${dict} /Length ${data.length} >>\nstream\n`, data, "\nendstream"] as const;

  const catalog = add("<< /Type /Catalog /Pages 2 0 R >>");
  add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  add(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 4 0 R ` +
      `/Resources << /XObject << /Im0 5 0 R >> >> >>`,
  );
  add(...stream("", encoder.encode(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`)));

  const size = `/Width ${page.width} /Height ${page.height} /BitsPerComponent 8`;
  if (page.image.kind === "jpeg") {
    add(
      ...stream(
        `/Type /XObject /Subtype /Image ${size} /ColorSpace /DeviceRGB /Filter /DCTDecode`,
        page.image.jpeg,
      ),
    );
  } else {
    const rgb = await deflate(page.image.rgb, "zlib");
    const smask = page.image.alpha ? " /SMask 6 0 R" : "";
    add(
      ...stream(
        `/Type /XObject /Subtype /Image ${size} /ColorSpace /DeviceRGB /Filter /FlateDecode${smask}`,
        rgb,
      ),
    );
    if (page.image.alpha) {
      const alpha = await deflate(page.image.alpha, "zlib");
      add(
        ...stream(
          `/Type /XObject /Subtype /Image ${size} /ColorSpace /DeviceGray /Filter /FlateDecode`,
          alpha,
        ),
      );
    }
  }
  const info = add(`<< /Producer (MYLPER) /Title ${pdfString(page.title ?? "Untitled")} >>`);

  // Assemble with byte offsets for the cross-reference table.
  // The binary comment after the version marks the file as binary for transfer tools.
  const chunks: Uint8Array[] = [
    Uint8Array.from([...encoder.encode("%PDF-1.4\n%"), 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]),
  ];
  let offset = chunks[0].length;
  const offsets: number[] = [];
  objects.forEach((parts, i) => {
    offsets.push(offset);
    const body = [encoder.encode(`${i + 1} 0 obj\n`), ...parts, encoder.encode("\nendobj\n")];
    for (const b of body) {
      chunks.push(b);
      offset += b.length;
    }
  });
  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\n` +
    `startxref\n${offset}\n%%EOF\n`;
  chunks.push(encoder.encode(xref));

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
