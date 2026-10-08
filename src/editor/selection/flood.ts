import { createSelection, type SelectionMask } from "./mask";

/** Straight (non-premultiplied) RGBA pixels, as `ImageData.data`. */
export interface RgbaPixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export type Rgba = readonly [number, number, number, number];

export function pixelAt(pixels: RgbaPixels, x: number, y: number): Rgba | null {
  if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) return null;
  const i = (Math.floor(y) * pixels.width + Math.floor(x)) * 4;
  const d = pixels.data;
  return [d[i], d[i + 1], d[i + 2], d[i + 3]];
}

/**
 * Largest per-channel difference. Fully transparent pixels all count as the same colour, so
 * the wand selects an empty area regardless of the hidden RGB values.
 */
function distance(d: Uint8ClampedArray, i: number, c: Rgba): number {
  const a = d[i + 3];
  if (a === 0 && c[3] === 0) return 0;
  return Math.max(
    Math.abs(d[i] - c[0]),
    Math.abs(d[i + 1] - c[1]),
    Math.abs(d[i + 2] - c[2]),
    Math.abs(a - c[3]),
  );
}

/**
 * Pixels whose colour is within `tolerance` (0–255) of the colour at the seed point. Contiguous
 * mode spreads from the seed through 4-connected neighbours (magic wand, paint bucket); otherwise
 * every matching pixel is selected (select by colour).
 */
export function floodRegion(
  pixels: RgbaPixels,
  seedX: number,
  seedY: number,
  tolerance: number,
  contiguous: boolean,
): SelectionMask {
  const { width, height, data } = pixels;
  const out = new Uint8Array(width * height);
  const seed = pixelAt(pixels, seedX, seedY);
  if (!seed) return createSelection(width, height, out);
  const tol = Math.max(0, Math.min(255, tolerance));

  if (!contiguous) {
    for (let p = 0; p < width * height; p++) {
      if (distance(data, p * 4, seed) <= tol) out[p] = 255;
    }
    return createSelection(width, height, out);
  }

  // Scanline fill: fill a horizontal run, then queue the runs above and below it.
  const matches = (p: number) => out[p] === 0 && distance(data, p * 4, seed) <= tol;
  const stack: number[] = [Math.floor(seedY) * width + Math.floor(seedX)];
  while (stack.length > 0) {
    const p = stack.pop()!;
    if (!matches(p)) continue;
    const y = Math.floor(p / width);
    const row = y * width;
    let left = p - row;
    let right = left;
    while (left > 0 && matches(row + left - 1)) left--;
    while (right < width - 1 && matches(row + right + 1)) right++;
    for (let x = left; x <= right; x++) out[row + x] = 255;
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= height) continue;
      const nrow = ny * width;
      let inRun = false;
      for (let x = left; x <= right; x++) {
        const m = matches(nrow + x);
        if (m && !inRun) stack.push(nrow + x);
        inRun = m;
      }
    }
  }
  return createSelection(width, height, out);
}

/**
 * Select by colour with a soft edge: pixels within `fuzziness / 2` of `color` are fully selected,
 * then coverage falls off linearly to zero at `fuzziness` (Select → Color Range).
 */
export function colorRange(pixels: RgbaPixels, color: Rgba, fuzziness: number): SelectionMask {
  const { width, height, data } = pixels;
  const out = new Uint8Array(width * height);
  const fuzz = Math.max(0, Math.min(255, fuzziness));
  const full = fuzz / 2;
  for (let p = 0; p < width * height; p++) {
    const d = distance(data, p * 4, color);
    if (d <= full) out[p] = 255;
    else if (d < fuzz) out[p] = Math.round((255 * (fuzz - d)) / (fuzz - full));
  }
  return createSelection(width, height, out);
}
