import type { RgbaPixels } from "./flood";
import { createSelection, type SelectionMask } from "./mask";
import { contractSelection, expandSelection } from "./modify";

/**
 * Selections and pixels derived from a selection (Edit → Stroke, Select → Grow / Similar,
 * Edit → Copy Merged). Pure TypeScript, like the rest of `src/editor/selection`.
 */

export type StrokeLocation = "inside" | "center" | "outside";

export const MAX_STROKE_WIDTH = 250;

/** The band Edit → Stroke paints: inside, across or outside the selection's edge. */
export function strokeArea(
  mask: SelectionMask,
  width: number,
  location: StrokeLocation,
): SelectionMask | null {
  if (!mask.bounds) return null;
  const w = Math.max(1, Math.min(MAX_STROKE_WIDTH, Math.round(width)));
  const outer =
    location === "inside"
      ? mask
      : expandSelection(mask, location === "center" ? Math.ceil(w / 2) : w);
  const inner =
    location === "outside"
      ? mask
      : contractSelection(mask, location === "center" ? Math.floor(w / 2) : w);
  if (!outer) return null;
  const data = new Uint8Array(outer.data.length);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.max(0, outer.data[i] - (inner ? inner.data[i] : 0));
  }
  const band = createSelection(mask.width, mask.height, data);
  return band.bounds ? band : null;
}

/** Colour cells per channel: 32 levels (8 values each) keep the lookup table small. */
const LEVELS = 32;
const SHIFT = 3;
const cell = (r: number, g: number, b: number) =>
  ((r >> SHIFT) * LEVELS + (g >> SHIFT)) * LEVELS + (b >> SHIFT);

/** Grow a 3D cell grid by `radius` cells in every direction (Chebyshev, like the wand). */
function dilateCube(grid: Uint8Array, radius: number): Uint8Array {
  let src = grid;
  const strides = [LEVELS * LEVELS, LEVELS, 1];
  for (const stride of strides) {
    const out = new Uint8Array(src.length);
    for (let i = 0; i < src.length; i++) {
      if (!src[i]) continue;
      const pos = Math.floor(i / stride) % LEVELS;
      const lo = Math.max(0, pos - radius);
      const hi = Math.min(LEVELS - 1, pos + radius);
      const base = i - pos * stride;
      for (let p = lo; p <= hi; p++) out[base + p * stride] = 1;
    }
    src = out;
  }
  return src;
}

/**
 * Select → Similar (every matching pixel) or Grow (only those connected to the selection): pixels
 * whose colour is within `tolerance` (0–255, per channel) of a colour inside the selection. Colours
 * are compared on a 32-level grid, so tolerance is rounded to steps of 8.
 */
export function similarSelection(
  pixels: RgbaPixels,
  mask: SelectionMask,
  tolerance: number,
  contiguous: boolean,
): SelectionMask | null {
  if (!mask.bounds || pixels.width !== mask.width || pixels.height !== mask.height) return null;
  const { width, height, data } = pixels;
  const n = width * height;
  let grid: Uint8Array = new Uint8Array(LEVELS * LEVELS * LEVELS);
  let transparent = false;
  for (let p = 0; p < n; p++) {
    if (mask.data[p] < 128) continue;
    const i = p * 4;
    if (data[i + 3] === 0) transparent = true;
    else grid[cell(data[i], data[i + 1], data[i + 2])] = 1;
  }
  grid = dilateCube(grid, Math.ceil(Math.max(0, Math.min(255, tolerance)) / 8));
  const matches = (p: number) => {
    const i = p * 4;
    return data[i + 3] === 0 ? transparent : grid[cell(data[i], data[i + 1], data[i + 2])] === 1;
  };

  const out = new Uint8Array(n);
  if (!contiguous) {
    for (let p = 0; p < n; p++) out[p] = mask.data[p] >= 128 || matches(p) ? 255 : mask.data[p];
  } else {
    // Spread from the selection through 4-connected matching neighbours.
    const stack: number[] = [];
    for (let p = 0; p < n; p++) {
      out[p] = mask.data[p];
      if (mask.data[p] >= 128) {
        out[p] = 255;
        stack.push(p);
      }
    }
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % width;
      for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
        if (q < 0 || q >= n || out[q] === 255 || !matches(q)) continue;
        out[q] = 255;
        stack.push(q);
      }
    }
  }
  return createSelection(width, height, out);
}

/** The selected pixels (alpha × coverage), cropped to the selection's bounds. */
export function maskedPixels(
  pixels: RgbaPixels,
  mask: SelectionMask,
): { x: number; y: number; width: number; height: number; data: Uint8ClampedArray } | null {
  const b = mask.bounds;
  if (!b || pixels.width !== mask.width || pixels.height !== mask.height) return null;
  const out = new Uint8ClampedArray(b.width * b.height * 4);
  for (let y = 0; y < b.height; y++) {
    for (let x = 0; x < b.width; x++) {
      const p = (b.y + y) * pixels.width + b.x + x;
      const o = (y * b.width + x) * 4;
      out[o] = pixels.data[p * 4];
      out[o + 1] = pixels.data[p * 4 + 1];
      out[o + 2] = pixels.data[p * 4 + 2];
      out[o + 3] = (pixels.data[p * 4 + 3] * mask.data[p]) / 255;
    }
  }
  return { x: b.x, y: b.y, width: b.width, height: b.height, data: out };
}
