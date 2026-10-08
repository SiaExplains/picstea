import { applyMatrix, invertMatrix, type Matrix } from "../core/geometry/matrix";
import { createSelection, type PixelBounds, type SelectionMask } from "./mask";

export const MAX_MODIFY_RADIUS = 250;

function finish(width: number, height: number, data: Uint8Array): SelectionMask | null {
  const result = createSelection(width, height, data);
  return result.bounds ? result : null;
}

/** `bounds` grown by `by` pixels on every side, clipped to the canvas. */
function grow(bounds: PixelBounds, by: number, width: number, height: number): PixelBounds {
  const x = Math.max(0, bounds.x - by);
  const y = Math.max(0, bounds.y - by);
  return {
    x,
    y,
    width: Math.min(width, bounds.x + bounds.width + by) - x,
    height: Math.min(height, bounds.y + bounds.height + by) - y,
  };
}

/** Box blur of one line (edge pixels extended), read and written with a stride. */
function boxLine(
  src: Float32Array,
  dst: Float32Array,
  offset: number,
  stride: number,
  n: number,
  r: number,
  prefix: Float64Array,
): void {
  prefix[0] = 0;
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + src[offset + i * stride];
  const first = src[offset];
  const last = src[offset + (n - 1) * stride];
  const size = 2 * r + 1;
  for (let i = 0; i < n; i++) {
    const lo = i - r;
    const hi = i + r;
    let sum = prefix[Math.min(n, hi + 1)] - prefix[Math.max(0, lo)];
    if (lo < 0) sum += -lo * first;
    if (hi > n - 1) sum += (hi - (n - 1)) * last;
    dst[offset + i * stride] = sum / size;
  }
}

/**
 * Soften the selection edge. Three box blurs approximate a Gaussian whose spread matches the
 * radius, as feathering does in professional editors.
 */
export function featherSelection(mask: SelectionMask, radius: number): SelectionMask | null {
  const { width, height, bounds } = mask;
  if (!bounds || radius <= 0) return bounds ? mask : null;
  const sigma = Math.min(MAX_MODIFY_RADIUS, radius) / 2;
  const r = Math.max(1, Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2));
  const area = grow(bounds, 3 * r + 1, width, height);

  // Everything outside `area` is, and stays, zero: three passes spread values by at most 3r.
  const a = new Float32Array(width * height);
  for (let i = 0; i < a.length; i++) a[i] = mask.data[i];
  const b = new Float32Array(width * height);
  const prefix = new Float64Array(Math.max(width, height) + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = area.y; y < area.y + area.height; y++) {
      boxLine(a, b, y * width, 1, width, r, prefix);
    }
    for (let x = area.x; x < area.x + area.width; x++) boxLine(b, a, x, width, height, r, prefix);
  }
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(a[i]);
  return finish(width, height, out);
}

/** Sliding maximum over [i−r, i+r] ∩ the line (monotonic deque, O(n)). */
function maxLine(
  src: Uint8Array,
  dst: Uint8Array,
  offset: number,
  stride: number,
  n: number,
  r: number,
  deque: Int32Array,
): void {
  let head = 0;
  let tail = 0;
  let next = 0;
  for (let i = 0; i < n; i++) {
    const hi = Math.min(n - 1, i + r);
    while (next <= hi) {
      const v = src[offset + next * stride];
      while (tail > head && src[offset + deque[tail - 1] * stride] <= v) tail--;
      deque[tail++] = next++;
    }
    while (deque[head] < i - r) head++;
    dst[offset + i * stride] = src[offset + deque[head] * stride];
  }
}

function dilate(width: number, height: number, data: Uint8Array, r: number): Uint8Array {
  const tmp = new Uint8Array(data.length);
  const out = new Uint8Array(data.length);
  const deque = new Int32Array(Math.max(width, height));
  for (let y = 0; y < height; y++) maxLine(data, tmp, y * width, 1, width, r, deque);
  for (let x = 0; x < width; x++) maxLine(tmp, out, x, width, height, r, deque);
  return out;
}

export function expandSelection(mask: SelectionMask, radius: number): SelectionMask | null {
  if (!mask.bounds) return null;
  const r = Math.round(Math.min(MAX_MODIFY_RADIUS, radius));
  if (r <= 0) return mask;
  return finish(mask.width, mask.height, dilate(mask.width, mask.height, mask.data, r));
}

/** Shrink the selection. The canvas edge does not count as an edge (as with "select all"). */
export function contractSelection(mask: SelectionMask, radius: number): SelectionMask | null {
  if (!mask.bounds) return null;
  const r = Math.round(Math.min(MAX_MODIFY_RADIUS, radius));
  if (r <= 0) return mask;
  const inverted = new Uint8Array(mask.data.length);
  for (let i = 0; i < inverted.length; i++) inverted[i] = 255 - mask.data[i];
  const grown = dilate(mask.width, mask.height, inverted, r);
  for (let i = 0; i < grown.length; i++) grown[i] = 255 - grown[i];
  return finish(mask.width, mask.height, grown);
}

/** Map the selection through an affine matrix (document → document), bilinear resampling. */
export function transformSelection(mask: SelectionMask, matrix: Matrix): SelectionMask | null {
  const { width, height, data, bounds } = mask;
  const inverse = invertMatrix(matrix);
  if (!bounds || !inverse) return null;
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ].map((p) => applyMatrix(matrix, p));
  const x0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.x))));
  const y0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.y))));
  const x1 = Math.min(width, Math.ceil(Math.max(...corners.map((p) => p.x))));
  const y1 = Math.min(height, Math.ceil(Math.max(...corners.map((p) => p.y))));
  const out = new Uint8Array(width * height);
  const sample = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : data[y * width + x];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const s = applyMatrix(inverse, { x: x + 0.5, y: y + 0.5 });
      const sx = s.x - 0.5;
      const sy = s.y - 0.5;
      const ix = Math.floor(sx);
      const iy = Math.floor(sy);
      const fx = sx - ix;
      const fy = sy - iy;
      const top = sample(ix, iy) * (1 - fx) + sample(ix + 1, iy) * fx;
      const bottom = sample(ix, iy + 1) * (1 - fx) + sample(ix + 1, iy + 1) * fx;
      out[y * width + x] = Math.round(top * (1 - fy) + bottom * fy);
    }
  }
  return finish(width, height, out);
}
