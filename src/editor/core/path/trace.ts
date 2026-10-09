import { polygonsSelection } from "../../selection/shapes";
import type { SelectionMask } from "../../selection/mask";
import type { Point } from "../viewport/viewport";
import { corner, flattenPath, MAX_ANCHORS, type VectorPath } from "./path";

/**
 * Selection ↔ path (ADR-0015). A path becomes a selection by rasterising its flattened rings
 * (even-odd, anti-aliased). A selection becomes a path by tracing the pixel boundary at 50%
 * coverage into closed rings and simplifying them into corner anchors.
 */

export function pathToSelection(path: VectorPath, width: number, height: number): SelectionMask {
  const rings = flattenPath(path).map((r) => r.points);
  return polygonsSelection(width, height, rings);
}

/**
 * Closed boundary rings of the pixels with coverage ≥ 128, as pixel-corner polylines. Each
 * boundary edge is oriented with the selected pixel on its right, so following edges end to start
 * always closes a ring.
 */
export function traceSelection(mask: SelectionMask): Point[][] {
  const { width: w, height: h, data } = mask;
  const b = mask.bounds;
  if (!b) return [];
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && data[y * w + x] >= 128;
  const stride = w + 1;
  // Outgoing edges per vertex (at most two, where pixels touch diagonally).
  const next = new Map<number, number[]>();
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const from = y0 * stride + x0;
    const to = y1 * stride + x1;
    const list = next.get(from);
    if (list) list.push(to);
    else next.set(from, [to]);
  };
  for (let y = b.y; y < b.y + b.height; y++) {
    for (let x = b.x; x < b.x + b.width; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x, y - 1)) add(x, y, x + 1, y);
      if (!inside(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!inside(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!inside(x - 1, y)) add(x, y + 1, x, y);
    }
  }
  const rings: Point[][] = [];
  for (const [start, targets] of next) {
    while (targets.length > 0) {
      const ring: Point[] = [];
      let from = start;
      let to = targets.pop()!;
      ring.push({ x: from % stride, y: Math.floor(from / stride) });
      while (to !== start) {
        ring.push({ x: to % stride, y: Math.floor(to / stride) });
        const outs = next.get(to);
        if (!outs || outs.length === 0) break;
        from = to;
        to = outs.pop()!;
      }
      rings.push(ring);
    }
  }
  return rings;
}

/** Drop points that lie on the straight line between their neighbours. */
function removeCollinear(ring: Point[]): Point[] {
  const out: Point[] = [];
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[(i - 1 + n) % n];
    const p = ring[i];
    const c = ring[(i + 1) % n];
    if ((p.x - a.x) * (c.y - p.y) - (p.y - a.y) * (c.x - p.x) !== 0) out.push(p);
  }
  return out;
}

function perpendicular(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

/** Ramer–Douglas–Peucker on an open polyline (iterative, so long rings can't overflow the stack). */
function simplifyOpen(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let index = -1;
    let max = tolerance;
    for (let i = first + 1; i < last; i++) {
      const d = perpendicular(points[i], points[first], points[last]);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Simplify a closed ring: split at the point farthest from the first, simplify both halves. */
export function simplifyRing(ring: Point[], tolerance: number): Point[] {
  const pts = removeCollinear(ring);
  if (pts.length <= 4) return pts;
  let far = 0;
  let max = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y);
    if (d > max) {
      max = d;
      far = i;
    }
  }
  const a = simplifyOpen(pts.slice(0, far + 1), tolerance);
  const b = simplifyOpen([...pts.slice(far), pts[0]], tolerance);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

export type TraceResult =
  | { readonly ok: true; readonly path: VectorPath }
  | { readonly ok: false; readonly reason: "empty" | "too-complex" };

/** Make Work Path from Selection. `tolerance` in pixels (0.5…10). */
export function selectionToPath(mask: SelectionMask, tolerance = 1): TraceResult {
  const rings = traceSelection(mask)
    .map((r) => simplifyRing(r, tolerance))
    .filter((r) => r.length >= 3);
  if (rings.length === 0) return { ok: false, reason: "empty" };
  const total = rings.reduce((n, r) => n + r.length, 0);
  if (rings.length > 64 || total > MAX_ANCHORS) return { ok: false, reason: "too-complex" };
  return {
    ok: true,
    path: {
      subpaths: rings.map((r) => ({ closed: true, anchors: r.map((p) => corner(p.x, p.y)) })),
    },
  };
}
