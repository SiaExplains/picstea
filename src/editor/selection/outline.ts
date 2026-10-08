import type { SelectionMask } from "./mask";

/** Coverage at or above this counts as "inside" for the visible outline (50%). */
const THRESHOLD = 128;

const outlines = new WeakMap<SelectionMask, Float32Array>();

/**
 * The selection's edge as line segments [x0, y0, x1, y1, …] in document pixels, for drawing
 * marching ants. Edges lie between inside and outside pixels; collinear unit edges are merged
 * into runs. Cached per (immutable) mask.
 */
export function selectionOutline(mask: SelectionMask): Float32Array {
  const cached = outlines.get(mask);
  if (cached) return cached;
  const { width, height, data, bounds } = mask;
  const segments: number[] = [];
  if (bounds) {
    const inside = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < width && y < height && data[y * width + x] >= THRESHOLD;
    const x0 = bounds.x;
    const x1 = bounds.x + bounds.width;
    const y0 = bounds.y;
    const y1 = bounds.y + bounds.height;

    // Horizontal edges on the line y, between rows y−1 and y.
    for (let y = y0; y <= y1; y++) {
      let start = -1;
      for (let x = x0; x <= x1; x++) {
        const edge = x < x1 && inside(x, y - 1) !== inside(x, y);
        if (edge && start < 0) start = x;
        if (!edge && start >= 0) {
          segments.push(start, y, x, y);
          start = -1;
        }
      }
    }
    // Vertical edges on the line x, between columns x−1 and x.
    for (let x = x0; x <= x1; x++) {
      let start = -1;
      for (let y = y0; y <= y1; y++) {
        const edge = y < y1 && inside(x - 1, y) !== inside(x, y);
        if (edge && start < 0) start = y;
        if (!edge && start >= 0) {
          segments.push(x, start, x, y);
          start = -1;
        }
      }
    }
  }
  const result = Float32Array.from(segments);
  outlines.set(mask, result);
  return result;
}
