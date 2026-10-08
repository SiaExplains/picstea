import { looksLikeZip } from "./project/project-file";
import { readImageHeader } from "./raster/image-header";
import { looksLikeSvg } from "./svg/svg-import";

/**
 * What a file is, decided from its bytes (never its name or declared type; docs/12).
 */
export type FileKind =
  | { kind: "raster" }
  | { kind: "svg" }
  | { kind: "psd" }
  | { kind: "project" }
  | { kind: "unsupported"; message: string };

const ascii = (bytes: Uint8Array, length: number) =>
  String.fromCharCode(...bytes.subarray(0, Math.min(length, bytes.length)));

export function detectFileKind(bytes: Uint8Array): FileKind {
  if (bytes.length === 0) return { kind: "unsupported", message: "The file is empty." };
  if (readImageHeader(bytes)) return { kind: "raster" };
  if (ascii(bytes, 4) === "8BPS") return { kind: "psd" };
  if (looksLikeZip(bytes)) return { kind: "project" };
  if (ascii(bytes, 5) === "%PDF-") {
    return {
      kind: "unsupported",
      message: "PDF files can be exported but not opened yet. Open an image or PSD instead.",
    };
  }
  if (ascii(bytes, 4) === "II*\0" || ascii(bytes, 4) === "MM\0*") {
    return {
      kind: "unsupported",
      message: "TIFF files cannot be opened in the browser yet. Save the image as PNG first.",
    };
  }
  if (looksLikeSvg(bytes)) return { kind: "svg" };
  return {
    kind: "unsupported",
    message:
      "This file type is not supported. MYLPER opens PNG, JPEG, WebP, GIF, SVG, PSD and .mylper files.",
  };
}

export const OPEN_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.svg,.psd,.mylper,image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/vnd.adobe.photoshop";
