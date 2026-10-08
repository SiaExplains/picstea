import type { RasterMime } from "../../assets/asset-store";

/**
 * Identify PNG/JPEG/WebP/GIF files and read their pixel dimensions from the header alone.
 *
 * Imported files are untrusted (docs/12_SECURITY.md). Reading dimensions before decoding lets us
 * reject decompression bombs — a tiny file that would decode to gigabytes — without allocating.
 * The declared MIME type and file extension are never trusted.
 */

export interface ImageHeader {
  readonly mime: RasterMime;
  readonly width: number;
  readonly height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, i) => bytes[offset + i] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return "";
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

export function sniffMime(bytes: Uint8Array): RasterMime | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "image/gif";
  return null;
}

function readPng(view: DataView, bytes: Uint8Array): ImageHeader | null {
  // Signature (8) + IHDR length (4) + "IHDR" (4) + width (4) + height (4)
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== "IHDR") return null;
  return { mime: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
}

// Start-of-frame markers carry the dimensions; DHT (C4), JPG (C8) and DAC (CC) share the range.
const JPEG_SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readJpeg(view: DataView, bytes: Uint8Array): ImageHeader | null {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    // Standalone markers without a length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // EOI / SOS before any SOF
    const length = view.getUint16(offset + 2);
    if (length < 2) return null;
    if (JPEG_SOF.has(marker)) {
      if (offset + 9 > bytes.length) return null;
      return {
        mime: "image/jpeg",
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebp(view: DataView, bytes: Uint8Array): ImageHeader | null {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X" && bytes.length >= 30) {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { mime: "image/webp", width, height };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    // Lossy key frame: start code 9D 01 2A, then 14-bit width/height.
    if (!startsWith(bytes, [0x9d, 0x01, 0x2a], 23)) return null;
    return {
      mime: "image/webp",
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    if (bytes[20] !== 0x2f) return null;
    const bits = view.getUint32(21, true);
    return { mime: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  switch (sniffMime(bytes)) {
    case "image/png":
      return readPng(view, bytes);
    case "image/jpeg":
      return readJpeg(view, bytes);
    case "image/webp":
      return readWebp(view, bytes);
    case "image/gif":
      // Logical screen size; browsers decode the first frame.
      return bytes.length >= 10
        ? { mime: "image/gif", width: view.getUint16(6, true), height: view.getUint16(8, true) }
        : null;
    default:
      return null;
  }
}
