import type { Rect } from "../geometry/layer-geometry";
import { applyMatrix, type Matrix } from "../geometry/matrix";
import type { Point } from "../viewport/viewport";

/**
 * Vector paths (ADR-0015): cubic Bézier subpaths made of anchors with absolute in/out control
 * points. A control point equal to its anchor is a sharp corner. Pure data and maths; the
 * renderer draws them through an SVG path string, so canvas, SVG export and tests agree.
 */

export interface Anchor {
  readonly x: number;
  readonly y: number;
  /** Control point of the segment arriving at this anchor. */
  readonly in: Point;
  /** Control point of the segment leaving this anchor. */
  readonly out: Point;
}

export interface Subpath {
  readonly closed: boolean;
  readonly anchors: readonly Anchor[];
}

export interface VectorPath {
  readonly subpaths: readonly Subpath[];
}

export const EMPTY_PATH: VectorPath = { subpaths: [] };
export const MAX_SUBPATHS = 64;
export const MAX_ANCHORS = 4096;
const MAX_COORDINATE = 1e6;

/** An anchor without handles (a corner). */
export const corner = (x: number, y: number): Anchor => ({ x, y, in: { x, y }, out: { x, y } });

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export const isCorner = (a: Anchor) => samePoint(a.in, a) && samePoint(a.out, a);

export function anchorCount(path: VectorPath): number {
  return path.subpaths.reduce((n, s) => n + s.anchors.length, 0);
}

const fmt = (v: number) => String(Math.round(v * 1000) / 1000);

/** SVG path data (`M … C … Z`); straight segments are written as lines. */
export function pathToSvgD(path: VectorPath): string {
  const parts: string[] = [];
  for (const sub of path.subpaths) {
    const a = sub.anchors;
    if (a.length === 0) continue;
    parts.push(`M${fmt(a[0].x)} ${fmt(a[0].y)}`);
    const segment = (from: Anchor, to: Anchor) => {
      if (samePoint(from.out, from) && samePoint(to.in, to)) {
        parts.push(`L${fmt(to.x)} ${fmt(to.y)}`);
      } else {
        parts.push(
          `C${fmt(from.out.x)} ${fmt(from.out.y)} ${fmt(to.in.x)} ${fmt(to.in.y)} ${fmt(to.x)} ${fmt(to.y)}`,
        );
      }
    };
    for (let i = 1; i < a.length; i++) segment(a[i - 1], a[i]);
    if (sub.closed && a.length > 1) {
      segment(a[a.length - 1], a[0]);
      parts.push("Z");
    }
  }
  return parts.join(" ");
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/** Segments of a subpath as [from, to] anchor pairs (including the closing one). */
function segments(sub: Subpath): [Anchor, Anchor][] {
  const a = sub.anchors;
  const out: [Anchor, Anchor][] = [];
  for (let i = 1; i < a.length; i++) out.push([a[i - 1], a[i]]);
  if (sub.closed && a.length > 1) out.push([a[a.length - 1], a[0]]);
  return out;
}

/**
 * Polylines approximating each subpath within `tolerance` (document px). Curves are split into
 * enough steps that the chord error stays under the tolerance (estimated from the control
 * polygon length), capped so hostile handles can't explode the point count.
 */
export function flattenPath(
  path: VectorPath,
  tolerance = 0.25,
): { points: Point[]; closed: boolean }[] {
  const result: { points: Point[]; closed: boolean }[] = [];
  for (const sub of path.subpaths) {
    if (sub.anchors.length === 0) continue;
    const points: Point[] = [{ x: sub.anchors[0].x, y: sub.anchors[0].y }];
    for (const [from, to] of segments(sub)) {
      if (samePoint(from.out, from) && samePoint(to.in, to)) {
        points.push({ x: to.x, y: to.y });
        continue;
      }
      const length =
        Math.hypot(from.out.x - from.x, from.out.y - from.y) +
        Math.hypot(to.in.x - from.out.x, to.in.y - from.out.y) +
        Math.hypot(to.x - to.in.x, to.y - to.in.y);
      const steps = Math.max(2, Math.min(256, Math.ceil(Math.sqrt(length / tolerance))));
      for (let s = 1; s <= steps; s++) points.push(cubic(from, from.out, to.in, to, s / steps));
    }
    // A closed subpath ends where it started; drop the duplicate point.
    if (sub.closed && points.length > 1 && samePoint(points[0], points[points.length - 1])) {
      points.pop();
    }
    result.push({ points, closed: sub.closed });
  }
  return result;
}

/** Bounds of the path's shape (curves sampled), or null when empty. */
export function pathBounds(path: VectorPath): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { points } of flattenPath(path, 0.5)) {
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function mapPath(path: VectorPath, fn: (p: Point) => Point): VectorPath {
  return {
    subpaths: path.subpaths.map((s) => ({
      closed: s.closed,
      anchors: s.anchors.map((a) => {
        const p = fn(a);
        return { x: p.x, y: p.y, in: fn(a.in), out: fn(a.out) };
      }),
    })),
  };
}

export const translatePath = (path: VectorPath, dx: number, dy: number): VectorPath =>
  dx === 0 && dy === 0 ? path : mapPath(path, (p) => ({ x: p.x + dx, y: p.y + dy }));

export const transformPath = (path: VectorPath, m: Matrix): VectorPath =>
  mapPath(path, (p) => applyMatrix(m, p));

/** Where on a path a point is: an anchor, one of its handles, or a segment. */
export type PathHit =
  | { readonly kind: "anchor"; readonly subpath: number; readonly anchor: number }
  | {
      readonly kind: "handle";
      readonly subpath: number;
      readonly anchor: number;
      readonly side: "in" | "out";
    }
  | { readonly kind: "segment"; readonly subpath: number; readonly anchor: number };

/**
 * What of the path lies within `radius` of `p`. Anchors win over handles, handles over segments.
 * `withHandles` limits handle hits to anchors whose handles are shown.
 */
export function hitTestPath(
  path: VectorPath,
  p: Point,
  radius: number,
  withHandles: (subpath: number, anchor: number) => boolean = () => true,
): PathHit | null {
  const near = (q: Point) => Math.hypot(q.x - p.x, q.y - p.y) <= radius;
  for (let s = 0; s < path.subpaths.length; s++) {
    const anchors = path.subpaths[s].anchors;
    for (let i = 0; i < anchors.length; i++) {
      if (near(anchors[i])) return { kind: "anchor", subpath: s, anchor: i };
    }
  }
  for (let s = 0; s < path.subpaths.length; s++) {
    const anchors = path.subpaths[s].anchors;
    for (let i = 0; i < anchors.length; i++) {
      if (!withHandles(s, i)) continue;
      const a = anchors[i];
      if (!samePoint(a.out, a) && near(a.out))
        return { kind: "handle", subpath: s, anchor: i, side: "out" };
      if (!samePoint(a.in, a) && near(a.in))
        return { kind: "handle", subpath: s, anchor: i, side: "in" };
    }
  }
  const flat = flattenPath(path, 0.5);
  for (let s = 0; s < flat.length; s++) {
    const pts = flat[s].points;
    const n = flat[s].closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      if (distanceToSegment(p, pts[i], pts[(i + 1) % pts.length]) <= radius) {
        return { kind: "segment", subpath: s, anchor: 0 };
      }
    }
  }
  return null;
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Replace one anchor. */
export function updateAnchor(
  path: VectorPath,
  subpath: number,
  index: number,
  fn: (a: Anchor) => Anchor,
): VectorPath {
  return {
    subpaths: path.subpaths.map((s, si) =>
      si !== subpath ? s : { ...s, anchors: s.anchors.map((a, ai) => (ai === index ? fn(a) : a)) },
    ),
  };
}

/** Move an anchor and its handles together. */
export const moveAnchor = (a: Anchor, dx: number, dy: number): Anchor => ({
  x: a.x + dx,
  y: a.y + dy,
  in: { x: a.in.x + dx, y: a.in.y + dy },
  out: { x: a.out.x + dx, y: a.out.y + dy },
});

/**
 * Move one handle to `to`. Unless `independent`, the opposite handle mirrors it (smooth anchor),
 * keeping its own length.
 */
export function moveHandle(a: Anchor, side: "in" | "out", to: Point, independent: boolean): Anchor {
  const other = side === "in" ? "out" : "in";
  const next = { ...a, [side]: to } as Anchor;
  if (independent || samePoint(a[other], a)) return next;
  const len = Math.hypot(a[other].x - a.x, a[other].y - a.y);
  const vx = to.x - a.x;
  const vy = to.y - a.y;
  const d = Math.hypot(vx, vy);
  if (d === 0) return next;
  return { ...next, [other]: { x: a.x - (vx / d) * len, y: a.y - (vy / d) * len } } as Anchor;
}

/** Alt-click on an anchor: a corner becomes smooth (handles along its neighbours), and back. */
export function toggleSmooth(path: VectorPath, subpath: number, index: number): VectorPath {
  const sub = path.subpaths[subpath];
  const a = sub.anchors[index];
  if (!isCorner(a)) return updateAnchor(path, subpath, index, () => corner(a.x, a.y));
  const n = sub.anchors.length;
  const prev = sub.anchors[(index - 1 + n) % n];
  const next = sub.anchors[(index + 1) % n];
  const hasPrev = sub.closed || index > 0;
  const hasNext = sub.closed || index < n - 1;
  const from = hasPrev ? prev : a;
  const to = hasNext ? next : a;
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return path;
  dx /= d;
  dy /= d;
  const len = d / 4;
  return updateAnchor(path, subpath, index, () => ({
    x: a.x,
    y: a.y,
    in: { x: a.x - dx * len, y: a.y - dy * len },
    out: { x: a.x + dx * len, y: a.y + dy * len },
  }));
}

/** Delete an anchor; a subpath left with fewer than two anchors is removed. */
export function removeAnchor(path: VectorPath, subpath: number, index: number): VectorPath {
  const subpaths: Subpath[] = [];
  path.subpaths.forEach((s, si) => {
    if (si !== subpath) {
      subpaths.push(s);
      return;
    }
    const anchors = s.anchors.filter((_, ai) => ai !== index);
    if (anchors.length >= 2)
      subpaths.push({ ...s, anchors, closed: s.closed && anchors.length > 2 });
  });
  return { subpaths };
}

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= MAX_COORDINATE;

function parsePoint(value: unknown): Point | null {
  if (typeof value !== "object" || value === null) return null;
  const { x, y } = value as Record<string, unknown>;
  return finite(x) && finite(y) ? { x, y } : null;
}

/** Validate a path from untrusted input (projects, commands); null if invalid. */
export function parsePath(value: unknown): VectorPath | null {
  if (typeof value !== "object" || value === null) return null;
  const subs = (value as Record<string, unknown>).subpaths;
  if (!Array.isArray(subs) || subs.length > MAX_SUBPATHS) return null;
  let total = 0;
  const subpaths: Subpath[] = [];
  for (const sub of subs) {
    if (typeof sub !== "object" || sub === null) return null;
    const { closed, anchors } = sub as Record<string, unknown>;
    if (typeof closed !== "boolean" || !Array.isArray(anchors) || anchors.length === 0) return null;
    total += anchors.length;
    if (total > MAX_ANCHORS) return null;
    const parsed: Anchor[] = [];
    for (const a of anchors) {
      const p = parsePoint(a);
      const pin = parsePoint((a as Record<string, unknown> | null)?.in);
      const pout = parsePoint((a as Record<string, unknown> | null)?.out);
      if (!p || !pin || !pout) return null;
      parsed.push({ x: p.x, y: p.y, in: pin, out: pout });
    }
    subpaths.push({ closed, anchors: parsed });
  }
  return { subpaths };
}
