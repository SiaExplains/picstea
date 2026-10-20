import { looksLikeHeic } from "./heic/heic";
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
  | { kind: "heic" }
  | { kind: "project" }
  | { kind: "unsupported"; message: string };

const ascii = (bytes: Uint8Array, length: number) =>
  String.fromCharCode(...bytes.subarray(0, Math.min(length, bytes.length)));

export function detectFileKind(bytes: Uint8Array): FileKind {
  if (bytes.length === 0) return { kind: "unsupported", message: "The file is empty." };
  if (readImageHeader(bytes)) return { kind: "raster" };
  if (ascii(bytes, 4) === "8BPS") return { kind: "psd" };
  if (looksLikeHeic(bytes)) return { kind: "heic" };
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
      "This file type is not supported. Picstea opens PNG, JPEG, WebP, GIF, SVG, HEIC, PSD and .picstea files.",
  };
}

export const OPEN_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.svg,.heic,.heif,.psd,.picstea,image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/heic,image/heif,image/vnd.adobe.photoshop";
