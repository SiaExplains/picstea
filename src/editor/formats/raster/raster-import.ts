import type { BitmapDecoder, RasterMime } from "../../assets/asset-store";
import { checkDimensions, MAX_IMPORT_FILE_BYTES } from "../../core/document/limits";
import { readImageHeader } from "./image-header";

export const SUPPORTED_IMPORT_MIMES: readonly RasterMime[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
];
/** For `<input accept>`. Validation never relies on it. */
export const IMPORT_ACCEPT = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

export interface ImportedRaster {
  readonly blob: Blob;
  readonly mime: RasterMime;
  readonly width: number;
  readonly height: number;
  readonly bitmap: CanvasImageSource & { close?: () => void };
}

export type ImportResult = { ok: true; image: ImportedRaster } | { ok: false; error: string };

function hasDimensions(value: object): value is { width: number; height: number } {
  return (
    "width" in value &&
    "height" in value &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
}

/**
 * Validate and decode a local image file. Everything happens in the browser; the file is never
 * sent anywhere.
 */
export async function importRasterFile(file: Blob, decode: BitmapDecoder): Promise<ImportResult> {
  if (file.size === 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    const mb = Math.round(MAX_IMPORT_FILE_BYTES / (1024 * 1024));
    return { ok: false, error: `The file is larger than ${mb} MB.` };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = readImageHeader(bytes);
  if (!header) {
    return { ok: false, error: "This file is not a PNG, JPEG or WebP image, or it is damaged." };
  }
  const check = checkDimensions(header.width, header.height);
  if (!check.ok) return { ok: false, error: check.reason };

  // Re-wrap with the sniffed type so later consumers never see an attacker-chosen MIME.
  const blob = new Blob([bytes], { type: header.mime });
  let bitmap: Awaited<ReturnType<BitmapDecoder>>;
  try {
    bitmap = await decode(blob);
  } catch {
    return { ok: false, error: "The image could not be decoded. It may be damaged." };
  }

  // EXIF orientation can swap width and height; trust the decoded size, re-check limits.
  const width = hasDimensions(bitmap) ? bitmap.width : header.width;
  const height = hasDimensions(bitmap) ? bitmap.height : header.height;
  const decodedCheck = checkDimensions(width, height);
  if (!decodedCheck.ok) {
    bitmap.close?.();
    return { ok: false, error: decodedCheck.reason };
  }

  return { ok: true, image: { blob, mime: header.mime, width, height, bitmap } };
}

/** Strip the extension from a filename for use as a document or layer name. */
export function baseName(filename: string): string {
  const name = filename.replace(/\.[^./\\]+$/, "").trim();
  return name || "Untitled";
}
