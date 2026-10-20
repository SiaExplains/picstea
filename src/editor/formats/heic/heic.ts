import { checkDimensions } from "../../core/document/limits";
import { FormatError } from "../binary/bytes";

/**
 * HEIC/HEIF photos (iPhones save them by default). Chrome and Firefox can't decode them, so
 * Picstea uses libheif compiled to WebAssembly (libheif-js, LGPL-3.0), shipped unmodified from
 * Picstea's own origin and loaded only when a HEIC file is opened (ADR-0038). Decoding runs in the
 * editor worker; nothing leaves the device.
 */

/** Served from public/; copied there by scripts/copy-libheif.mjs. */
export const HEIC_MODULE_URL = "/vendor/libheif/1.23.5/libheif-bundle.mjs";

/** HEVC-coded HEIF brands. AVIF also uses `mif1`, so that brand alone isn't enough. */
const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "hevm", "hevs"]);
const GENERIC_BRANDS = new Set(["mif1", "msf1"]);

const ascii = (bytes: Uint8Array, start: number) =>
  String.fromCharCode(bytes[start], bytes[start + 1], bytes[start + 2], bytes[start + 3]);

/** True for an ISO-BMFF `ftyp` box that names a HEVC-coded HEIF brand. */
export function looksLikeHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 4) !== "ftyp") return false;
  const size = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0);
  if (size < 16 || size > bytes.length) return false;
  const major = ascii(bytes, 8);
  if (HEIC_BRANDS.has(major)) return true;
  if (!GENERIC_BRANDS.has(major)) return false;
  // Compatible brands follow the major brand and minor version.
  for (let at = 16; at + 4 <= size; at += 4) {
    if (HEIC_BRANDS.has(ascii(bytes, at))) return true;
  }
  return false;
}

export interface DecodedHeic {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8ClampedArray;
}

interface HeifImage {
  get_width(): number;
  get_height(): number;
  display(
    target: { data: Uint8ClampedArray; width: number; height: number },
    done: (result: { data: Uint8ClampedArray } | null) => void,
  ): void;
  free?(): void;
}

interface Libheif {
  HeifDecoder: new () => { decode(bytes: Uint8Array): HeifImage[] };
}

export type LibheifLoader = () => Promise<Libheif>;

let cached: Promise<Libheif> | null = null;

/** Loads the vendored module once per worker; kept out of the bundle (turbopackIgnore). */
const loadVendored: LibheifLoader = () => {
  cached ??= import(/* turbopackIgnore: true */ /* webpackIgnore: true */ HEIC_MODULE_URL).then(
    (mod: { default: () => Libheif }) => mod.default(),
  );
  cached.catch(() => {
    cached = null;
  });
  return cached;
};

/** The primary image of a HEIC file as RGBA. Orientation stored in the file is applied. */
export async function decodeHeic(
  bytes: Uint8Array,
  load: LibheifLoader = loadVendored,
): Promise<DecodedHeic> {
  let libheif: Libheif;
  try {
    libheif = await load();
  } catch {
    throw new FormatError(
      "The HEIC decoder could not be loaded. Check your connection and try again.",
    );
  }
  let images: HeifImage[];
  try {
    images = new libheif.HeifDecoder().decode(bytes);
  } catch {
    images = [];
  }
  const image = images[0];
  if (!image)
    throw new FormatError("This HEIC file is damaged or uses a feature Picstea can't read.");
  try {
    const width = image.get_width();
    const height = image.get_height();
    const check = checkDimensions(width, height);
    if (!check.ok) throw new FormatError(check.reason);
    const target = { data: new Uint8ClampedArray(width * height * 4), width, height };
    const result = await new Promise<{ data: Uint8ClampedArray } | null>((resolve) =>
      image.display(target, resolve),
    );
    if (!result) throw new FormatError("This HEIC file could not be decoded. It may be damaged.");
    return { width, height, rgba: target.data };
  } finally {
    for (const img of images) img.free?.();
  }
}
