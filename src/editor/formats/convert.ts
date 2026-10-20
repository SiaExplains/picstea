import type { BitmapDecoder } from "../assets/asset-store";
import { checkDimensions, MAX_IMPORT_FILE_BYTES } from "../core/document/limits";
import type { SurfaceFactory } from "../rendering/canvas/canvas2d-renderer";
import { FormatError } from "./binary/bytes";
import {
  encodeSurface,
  EXPORT_FORMATS,
  exportFilename,
  type RasterExportFormat,
} from "./export/raster-export";
import { detectFileKind } from "./open-file";
import { baseName, importRasterFile } from "./raster/raster-import";
import { svgPixelSize } from "./svg/svg-import";

/**
 * Convert one image file to PNG, JPEG or WebP without opening it as a document: nothing is
 * added to the editor, saved in the browser or kept in the history. The site's converter pages
 * link to `/?convert=<id>`, which opens this in the editor, where no third-party code runs
 * (ADR-0013). Any supported input works; the id only chooses the output format and the wording.
 */

export interface Conversion {
  readonly id: string;
  /** What people search for, e.g. "WebP to PNG". */
  readonly label: string;
  readonly to: RasterExportFormat;
}

export const CONVERSIONS: readonly Conversion[] = [
  { id: "webp-to-png", label: "WebP to PNG", to: "png" },
  { id: "webp-to-jpg", label: "WebP to JPG", to: "jpeg" },
  { id: "png-to-jpg", label: "PNG to JPG", to: "jpeg" },
  { id: "jpg-to-png", label: "JPG to PNG", to: "png" },
  { id: "png-to-webp", label: "PNG to WebP", to: "webp" },
  { id: "svg-to-png", label: "SVG to PNG", to: "png" },
  { id: "psd-to-png", label: "PSD to PNG", to: "png" },
  { id: "heic-to-jpg", label: "HEIC to JPG", to: "jpeg" },
];

/** `?convert=images`: the converter without a preset pair (the site's converter hub). */
export const ANY_CONVERSION: Conversion = { id: "images", label: "images", to: "png" };

/** The conversion named by a `?convert=` value, or null for anything unknown. */
export function parseConvertParam(value: string | null | undefined): Conversion | null {
  if (!value) return null;
  if (value === ANY_CONVERSION.id) return ANY_CONVERSION;
  return CONVERSIONS.find((c) => c.id === value) ?? null;
}

export interface ConvertEnv {
  readonly decode: BitmapDecoder;
  readonly createSurface: SurfaceFactory;
  /** Renders SVG through the browser's image decoder (never the DOM); absent outside browsers. */
  readonly rasterizeSvg?: (svg: Blob, width: number, height: number) => Promise<CanvasImageSource>;
  /** HEIC/HEIF photos through libheif (ADR-0038); absent where it can't be loaded. */
  readonly decodeHeic?: (
    bytes: Uint8Array,
  ) => Promise<{ width: number; height: number; rgba: Uint8ClampedArray }>;
  /** The flattened image stored in a PSD (null when it was saved without one). */
  readonly readPsdComposite: (
    bytes: Uint8Array,
  ) => Promise<{ width: number; height: number; rgba: Uint8ClampedArray | null }>;
}

export interface ConvertOptions {
  readonly to: RasterExportFormat;
  /** 0–1, for JPEG and WebP. */
  readonly quality: number;
}

export type ConvertResult =
  { ok: true; blob: Blob; filename: string } | { ok: false; error: string };

type Surface = HTMLCanvasElement | OffscreenCanvas;

function context(surface: Surface) {
  const ctx = surface.getContext("2d") as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new FormatError("2D canvas is not available.");
  return ctx;
}

function release(surface: Surface | null): void {
  if (!surface) return;
  surface.width = 0;
  surface.height = 0;
}

function checked(width: number, height: number): void {
  const check = checkDimensions(width, height);
  if (!check.ok) throw new FormatError(check.reason);
}

interface Source {
  readonly image: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  readonly dispose: () => void;
}

function heic(env: ConvertEnv, bytes: Uint8Array) {
  if (!env.decodeHeic) throw new FormatError("HEIC files cannot be converted here.");
  return env.decodeHeic(bytes);
}

async function decodeSource(env: ConvertEnv, file: Blob, bytes: Uint8Array): Promise<Source> {
  const kind = detectFileKind(bytes);
  switch (kind.kind) {
    case "raster": {
      const result = await importRasterFile(file, env.decode);
      if (!result.ok) throw new FormatError(result.error);
      const { bitmap, width, height } = result.image;
      return { image: bitmap, width, height, dispose: () => bitmap.close?.() };
    }
    case "svg": {
      if (!env.rasterizeSvg) throw new FormatError("SVG files cannot be converted here.");
      const size = svgPixelSize(new TextDecoder().decode(bytes));
      if (!size) throw new FormatError("This SVG file is damaged and cannot be converted.");
      checked(size.width, size.height);
      const image = await env.rasterizeSvg(
        new Blob([bytes as BlobPart], { type: "image/svg+xml" }),
        size.width,
        size.height,
      );
      return { image, ...size, dispose: () => {} };
    }
    case "heic":
    case "psd": {
      const { width, height, rgba } =
        kind.kind === "heic" ? await heic(env, bytes) : await env.readPsdComposite(bytes);
      if (!rgba) {
        throw new FormatError(
          "This PSD has no flattened image. Open it in the editor and export it instead.",
        );
      }
      checked(width, height);
      const surface = env.createSurface(width, height);
      const ctx = context(surface);
      const data = ctx.createImageData(width, height);
      data.data.set(rgba);
      ctx.putImageData(data, 0, 0);
      return { image: surface, width, height, dispose: () => release(surface) };
    }
    case "project":
      throw new FormatError("Picstea project files can't be converted. Open them in the editor.");
    case "unsupported":
      throw new FormatError(kind.message);
  }
}

export async function convertFile(
  env: ConvertEnv,
  file: Blob,
  filename: string,
  options: ConvertOptions,
): Promise<ConvertResult> {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return {
      ok: false,
      error: `The file is larger than ${Math.round(MAX_IMPORT_FILE_BYTES / 2 ** 20)} MB.`,
    };
  }
  const format = EXPORT_FORMATS[options.to];
  let source: Source | null = null;
  let surface: Surface | null = null;
  try {
    source = await decodeSource(env, file, new Uint8Array(await file.arrayBuffer()));
    surface = env.createSurface(source.width, source.height);
    const ctx = context(surface);
    if (!format.alpha) {
      // Same matte as Export: transparent areas become white in JPEG.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, source.width, source.height);
    }
    ctx.drawImage(source.image, 0, 0, source.width, source.height);
    const quality = Math.min(1, Math.max(0, options.quality));
    const blob = await encodeSurface(surface, format.mime, quality);
    // Browsers silently fall back to PNG for types they cannot encode.
    if (blob.type !== format.mime) {
      return { ok: false, error: `This browser cannot create ${format.label} images.` };
    }
    return { ok: true, blob, filename: exportFilename(baseName(filename), options.to) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof FormatError ? error.message : "The file could not be converted.",
    };
  } finally {
    source?.dispose();
    release(surface);
  }
}
