import type { EditorDocument, Layer } from "../core/document/types";
import { FormatError } from "../formats/binary/bytes";
import { exportAs, type ExportRequest } from "../formats/export/document-export";
import { ExportError } from "../formats/export/raster-export";
import { decodeHeic, type DecodedHeic } from "../formats/heic/heic";
import { renderRgba } from "../formats/layer-render";
import { bitmapPixels, resolveDraft, type PsdDraft } from "../formats/psd/psd-draft";
import type { PsdFile } from "../formats/psd/psd-model";
import { readPsd, type PsdReadResult } from "../formats/psd/psd-read";
import { writePsd } from "../formats/psd/psd-write";
import { writePdf } from "../formats/pdf/pdf-write";
import { blendByCoverage } from "../filters/kernels";
import { runFilter } from "../filters/registry";
import { parseLiquifyField, renderLiquify, type LiquifyField } from "../filters/liquify";
import {
  parseVanishingPointEdit,
  renderVanishingPoint,
  type VanishingPointEdit,
} from "../filters/vanishing-point";
import { histogram } from "../adjustments/tone";
import type { ToneChannel } from "../core/document/types";
import { colorRange, floodRegion, type Rgba, type RgbaPixels } from "../selection/flood";
import type { SelectionMask } from "../selection/mask";
import { workerPixelEnv, type JobBitmaps } from "./render-env";

/**
 * CPU-heavy, pure jobs that can run in a Web Worker (ADR-0012). Inputs and outputs are plain
 * data (typed arrays are transferred, not copied). The same functions run on the main thread
 * when no worker is available, so results never depend on where a job ran.
 */
export interface JobTypes {
  /** Encode the flattened image (a bitmap rendered on the main thread) as a one-page PDF. */
  pdfEncode: { input: { bitmap: ImageBitmap; ppi: number; title: string }; output: Uint8Array };
  /** Encode a PSD from layer bitmaps rendered on the main thread. */
  psdEncode: { input: PsdDraft; output: Uint8Array };
  /** Flood fill on pixels read back from a bitmap. */
  floodBitmap: {
    input: { bitmap: ImageBitmap; x: number; y: number; tolerance: number; contiguous: boolean };
    output: SelectionMask;
  };
  psdWrite: { input: PsdFile; output: Uint8Array };
  psdRead: { input: Uint8Array; output: PsdReadResult };
  /** HEIC/HEIF photo → RGBA through the vendored libheif (ADR-0038). */
  heicDecode: { input: Uint8Array; output: DecodedHeic };
  flood: {
    input: { pixels: RgbaPixels; x: number; y: number; tolerance: number; contiguous: boolean };
    output: SelectionMask;
  };
  colorRange: {
    input: { pixels: RgbaPixels; color: Rgba; fuzziness: number };
    output: SelectionMask;
  };
  /**
   * Run a filter (ADR-0014). With `coverage` (one byte per pixel) the result is mixed into the
   * original by that amount, so only the selected area changes.
   */
  filter: {
    input: {
      pixels: RgbaPixels;
      filterId: string;
      values: unknown;
      seed: number;
      coverage: Uint8Array | null;
    };
    output: RgbaPixels;
  };
  /** Render a Liquify displacement field at full size (ADR-0036); `coverage` as for `filter`. */
  liquify: {
    input: { pixels: RgbaPixels; field: LiquifyField; coverage: Uint8Array | null };
    output: RgbaPixels;
  };
  /** Paint Vanishing Point clone dabs at full size (ADR-0036); `coverage` as for `filter`. */
  vanishingPoint: {
    input: { pixels: RgbaPixels; edit: VanishingPointEdit; coverage: Uint8Array | null };
    output: RgbaPixels;
  };
  /** 256-bin histogram of pixels (Levels/Curves panel). */
  histogram: {
    input: { pixels: RgbaPixels; channel: ToneChannel };
    output: Uint32Array;
  };
  /** Export the document in any format, drawing it here (ADR-0022). */
  exportDocument: {
    input: { doc: EditorDocument; request: ExportRequest; bitmaps: JobBitmaps };
    output: { bytes: Uint8Array; mime: string; warnings: readonly string[] };
  };
  /** Flood fill (magic wand, paint bucket) on `layers` drawn as the document, drawn here. */
  floodDocument: {
    input: {
      doc: EditorDocument;
      layers: readonly Layer[];
      bitmaps: JobBitmaps;
      x: number;
      y: number;
      tolerance: number;
      contiguous: boolean;
    };
    output: SelectionMask;
  };
  /**
   * Color Range on the drawn document. The drawing is kept under `key`, so later calls with the
   * same key (slider steps) send only the colour and fuzziness.
   */
  colorRangeDocument: {
    input: {
      key: string;
      source: { doc: EditorDocument; layers: readonly Layer[]; bitmaps: JobBitmaps } | null;
      color: Rgba;
      fuzziness: number;
    };
    output: SelectionMask;
  };
  /** Forget the drawing Color Range kept. */
  colorRangeRelease: { input: null; output: null };
}

/** Raised when Color Range's kept drawing is gone (another key, or a new worker). */
export class CacheMissError extends Error {
  override name = "CacheMissError";
}

let colorRangeSource: { key: string; pixels: RgbaPixels } | null = null;

/** The document (or `layers` in its place) flattened in this thread. */
function drawDocument(
  doc: EditorDocument,
  layers: readonly Layer[],
  bitmaps: JobBitmaps,
): RgbaPixels {
  const env = workerPixelEnv(doc, bitmaps);
  try {
    return { width: doc.width, height: doc.height, data: renderRgba(env, doc, layers) };
  } finally {
    env.dispose();
  }
}

/** Mix a job's result into the original by a selection's coverage (when there is one). */
function withCoverage(
  pixels: RgbaPixels,
  out: RgbaPixels,
  coverage: Uint8Array | null,
): RgbaPixels {
  if (!coverage) return out;
  if (coverage.length !== pixels.width * pixels.height) throw new Error("Invalid selection.");
  return { ...out, data: blendByCoverage(pixels.data, out.data, coverage) };
}

export type JobName = keyof JobTypes;
export type JobInput<K extends JobName> = JobTypes[K]["input"];
export type JobOutput<K extends JobName> = JobTypes[K]["output"];

export const JOBS: {
  [K in JobName]: (input: JobInput<K>) => JobOutput<K> | Promise<JobOutput<K>>;
} = {
  pdfEncode: ({ bitmap, ppi, title }) => encodePdf(bitmapPixels(bitmap), ppi, title),
  psdEncode: (draft) => writePsd(resolveDraft(draft)),
  floodBitmap: ({ bitmap, x, y, tolerance, contiguous }) =>
    floodRegion(bitmapPixels(bitmap), x, y, tolerance, contiguous),
  psdWrite: (file) => writePsd(file),
  psdRead: (bytes) => readPsd(bytes),
  heicDecode: (bytes) => decodeHeic(bytes),
  flood: ({ pixels, x, y, tolerance, contiguous }) =>
    floodRegion(pixels, x, y, tolerance, contiguous),
  colorRange: ({ pixels, color, fuzziness }) => colorRange(pixels, color, fuzziness),
  filter: ({ pixels, filterId, values, seed, coverage }) =>
    withCoverage(pixels, runFilter(filterId, pixels, values, { seed }), coverage),
  liquify: ({ pixels, field, coverage }) => {
    const parsed = parseLiquifyField(field);
    if (!parsed) throw new Error("Invalid Liquify settings.");
    return withCoverage(pixels, renderLiquify(pixels, parsed), coverage);
  },
  vanishingPoint: ({ pixels, edit, coverage }) => {
    const parsed = parseVanishingPointEdit(edit);
    if (!parsed) throw new Error("Invalid Vanishing Point settings.");
    return withCoverage(pixels, renderVanishingPoint(pixels, parsed), coverage);
  },
  histogram: ({ pixels, channel }) => histogram(pixels.data, channel),
  exportDocument: async ({ doc, request, bitmaps }) => {
    const env = workerPixelEnv(doc, bitmaps);
    try {
      const { blob, warnings } = await exportAs(env, doc, request);
      return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type, warnings };
    } finally {
      env.dispose();
    }
  },
  floodDocument: ({ doc, layers, bitmaps, x, y, tolerance, contiguous }) =>
    floodRegion(drawDocument(doc, layers, bitmaps), x, y, tolerance, contiguous),
  colorRangeDocument: ({ key, source, color, fuzziness }) => {
    if (source) {
      colorRangeSource = { key, pixels: drawDocument(source.doc, source.layers, source.bitmaps) };
    } else if (colorRangeSource?.key !== key) {
      throw new CacheMissError("Color Range needs the image again.");
    }
    return colorRange(colorRangeSource.pixels, color, fuzziness);
  },
  colorRangeRelease: () => {
    colorRangeSource = null;
    return null;
  },
};

/** Buffers in a job's output to transfer back instead of copying. */
export function outputTransfer(name: JobName, output: unknown): Transferable[] {
  switch (name) {
    case "psdWrite":
    case "psdEncode":
    case "pdfEncode":
      return [(output as Uint8Array).buffer];
    case "flood":
    case "floodBitmap":
    case "colorRange":
    case "floodDocument":
    case "colorRangeDocument":
      return [(output as SelectionMask).data.buffer];
    case "exportDocument":
      return [(output as JobOutput<"exportDocument">).bytes.buffer];
    case "colorRangeRelease":
      return [];
    case "filter":
    case "liquify":
    case "vanishingPoint":
      return [(output as RgbaPixels).data.buffer];
    case "histogram":
      return [(output as Uint32Array).buffer];
    case "heicDecode":
      return [(output as DecodedHeic).rgba.buffer];
    case "psdRead": {
      const result = output as PsdReadResult;
      // A Set: an ArrayBuffer may only be listed once.
      const buffers = new Set<ArrayBufferLike>();
      const visitFile = (file: PsdFile) => {
        const visit = (nodes: PsdFile["layers"]) => {
          for (const node of nodes) {
            if (node.mask) buffers.add(node.mask.data.buffer);
            if (node.kind === "group") visit(node.children);
            else if (node.rgba) buffers.add(node.rgba.buffer);
          }
        };
        visit(file.layers);
        if (file.composite) buffers.add(file.composite.buffer);
        for (const linked of file.linked ?? []) {
          if (linked.kind === "raster") buffers.add(linked.bytes.buffer);
          if (linked.kind === "psd") visitFile(linked.file);
        }
      };
      visitFile(result.file);
      return [...buffers] as Transferable[];
    }
  }
}

/** Errors cross the worker boundary as plain data; user-facing format errors keep their type. */
export interface JobError {
  readonly name: string;
  readonly message: string;
}

export const toJobError = (error: unknown): JobError => ({
  name: error instanceof Error ? error.name : "Error",
  message: error instanceof Error ? error.message : String(error),
});

export function fromJobError(error: JobError): Error {
  if (error.name === "FormatError") return new FormatError(error.message);
  if (error.name === "ExportError") return new ExportError(error.message);
  const e = new Error(error.message);
  e.name = error.name;
  return e;
}

/** Split RGBA into the PDF's RGB image and alpha soft mask (omitted when fully opaque). */
function encodePdf(pixels: RgbaPixels, ppi: number, title: string): Promise<Uint8Array> {
  const { width, height, data } = pixels;
  const count = width * height;
  const rgb = new Uint8Array(count * 3);
  const alpha = new Uint8Array(count);
  let opaque = true;
  for (let i = 0; i < count; i++) {
    rgb[i * 3] = data[i * 4];
    rgb[i * 3 + 1] = data[i * 4 + 1];
    rgb[i * 3 + 2] = data[i * 4 + 2];
    alpha[i] = data[i * 4 + 3];
    if (alpha[i] !== 255) opaque = false;
  }
  return writePdf({
    width,
    height,
    ppi,
    image: { kind: "lossless", rgb, alpha: opaque ? undefined : alpha },
    title,
  });
}
