import { FormatError } from "../formats/binary/bytes";
import { bitmapPixels, resolveDraft, type PsdDraft } from "../formats/psd/psd-draft";
import type { PsdFile } from "../formats/psd/psd-model";
import { readPsd, type PsdReadResult } from "../formats/psd/psd-read";
import { writePsd } from "../formats/psd/psd-write";
import { writePdf } from "../formats/pdf/pdf-write";
import { blendByCoverage } from "../filters/kernels";
import { runFilter } from "../filters/registry";
import { histogram } from "../adjustments/tone";
import type { ToneChannel } from "../core/document/types";
import { colorRange, floodRegion, type Rgba, type RgbaPixels } from "../selection/flood";
import type { SelectionMask } from "../selection/mask";

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
  /** 256-bin histogram of pixels (Levels/Curves panel). */
  histogram: {
    input: { pixels: RgbaPixels; channel: ToneChannel };
    output: Uint32Array;
  };
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
  flood: ({ pixels, x, y, tolerance, contiguous }) =>
    floodRegion(pixels, x, y, tolerance, contiguous),
  colorRange: ({ pixels, color, fuzziness }) => colorRange(pixels, color, fuzziness),
  filter: ({ pixels, filterId, values, seed, coverage }) => {
    const out = runFilter(filterId, pixels, values, { seed });
    if (!coverage) return out;
    if (coverage.length !== pixels.width * pixels.height) throw new Error("Invalid selection.");
    return { ...out, data: blendByCoverage(pixels.data, out.data, coverage) };
  },
  histogram: ({ pixels, channel }) => histogram(pixels.data, channel),
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
      return [(output as SelectionMask).data.buffer];
    case "filter":
      return [(output as RgbaPixels).data.buffer];
    case "histogram":
      return [(output as Uint32Array).buffer];
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
