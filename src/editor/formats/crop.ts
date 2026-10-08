/** Pure pixel helpers shared by the main thread and the worker (no canvas). */

export interface CroppedPixels {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** RGBA for the cropped box. */
  readonly rgba: Uint8ClampedArray;
}

/** Crop RGBA to its non-transparent pixels; null when nothing is visible. */
export function cropToContent(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): CroppedPixels | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (rgba[row + x * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      maxY = y;
    }
  }
  if (maxX < 0) return null;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  if (w === width && h === height) return { x: 0, y: 0, width, height, rgba };
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((minY + y) * width + minX) * 4;
    out.set(rgba.subarray(from, from + w * 4), y * w * 4);
  }
  return { x: minX, y: minY, width: w, height: h, rgba: out };
}
