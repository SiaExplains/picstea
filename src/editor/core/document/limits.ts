/**
 * Safety limits for document and image sizes (docs/12_SECURITY.md, "Memory limits").
 *
 * The compositor keeps one full-size RGBA buffer per open document, and browsers cap canvas
 * area (Safari is the tightest). Until tiled rendering lands (Gate 7) we stay well inside those
 * caps rather than letting the tab crash.
 */
export const MAX_DIMENSION = 12_000;
export const MAX_PIXELS = 36_000_000;
export const BYTES_PER_PIXEL = 4;
/** Largest image file we will read into memory for import. */
export const MAX_IMPORT_FILE_BYTES = 200 * 1024 * 1024;

export type DimensionCheck = { ok: true } | { ok: false; reason: string };

export function estimateBytes(width: number, height: number): number {
  return width * height * BYTES_PER_PIXEL;
}

export function checkDimensions(width: number, height: number): DimensionCheck {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return { ok: false, reason: "Width and height must be whole numbers of pixels." };
  }
  if (width < 1 || height < 1) {
    return { ok: false, reason: "Width and height must be at least 1 pixel." };
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return {
      ok: false,
      reason: `Width and height can be at most ${MAX_DIMENSION.toLocaleString("en-US")} pixels.`,
    };
  }
  if (width * height > MAX_PIXELS) {
    const megapixels = Math.round(MAX_PIXELS / 1_000_000);
    return { ok: false, reason: `Images can be at most ${megapixels} megapixels.` };
  }
  return { ok: true };
}
