import { invert3, project, squareToQuad } from "./homography";

/**
 * Non-affine transforms (ADR-0044): a picture of size w × h is drawn through a map from its
 * normalised coordinates (u, v ∈ 0…1) to the destination. Two maps exist:
 *
 * - **perspective**: the homography taking the box to a quad (Skew, Distort, Perspective);
 * - **warp**: a bicubic Bézier patch with 4 × 4 control points (Photoshop's warp model).
 *
 * Rendering splits the box into cells and draws each as two triangles, each an affine
 * `drawImage` clipped to the triangle. That runs on the GPU through Canvas 2D, needs no WebGL,
 * and is exact at the cell corners; triangles overlap by half a pixel so no seams show.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** 8 numbers, clockwise from top-left: x0 y0 x1 y1 x2 y2 x3 y3. */
export type Quad = readonly number[];
/** 32 numbers: 16 control points (x, y), row by row from the top-left. */
export type WarpMesh = readonly number[];

export type MeshMap = (u: number, v: number) => Point;

export const boxQuad = (w: number, h: number): Quad => [0, 0, w, 0, w, h, 0, h];

/** The identity warp mesh of a w × h box. */
export function boxMesh(w: number, h: number): WarpMesh {
  const out: number[] = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out.push((w * j) / 3, (h * i) / 3);
  return out;
}

/** Perspective map through `quad`; null when the quad is degenerate. */
export function perspectiveMap(quad: Quad): MeshMap | null {
  const h = squareToQuad(quad);
  if (!h || !invert3(h)) return null;
  const out = new Float64Array(2);
  return (u, v) => (project(h, u, v, out) ? { x: out[0], y: out[1] } : { x: NaN, y: NaN });
}

const bernstein = (t: number): [number, number, number, number] => {
  const s = 1 - t;
  return [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
};

/** Warp map through a bicubic Bézier patch. */
export function warpMap(mesh: WarpMesh): MeshMap {
  return (u, v) => {
    const bu = bernstein(u);
    const bv = bernstein(v);
    let x = 0;
    let y = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const k = (i * 4 + j) * 2;
        const w = bv[i] * bu[j];
        x += w * mesh[k];
        y += w * mesh[k + 1];
      }
    }
    return { x, y };
  };
}

/** Bounding box of a map, sampled on an n × n grid. */
export function mapBounds(
  map: MeshMap,
  n = 16,
): { x: number; y: number; width: number; height: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const p = map(j / n, i / n);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
  }
  if (x0 === Infinity) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** The affine matrix taking triangle (s0, s1, s2) onto (d0, d1, d2); null if degenerate. */
export function triangleAffine(
  s0: Point,
  s1: Point,
  s2: Point,
  d0: Point,
  d1: Point,
  d2: Point,
): [number, number, number, number, number, number] | null {
  const ux = s1.x - s0.x;
  const uy = s1.y - s0.y;
  const vx = s2.x - s0.x;
  const vy = s2.y - s0.y;
  const det = ux * vy - uy * vx;
  if (Math.abs(det) < 1e-12) return null;
  const px = d1.x - d0.x;
  const py = d1.y - d0.y;
  const qx = d2.x - d0.x;
  const qy = d2.y - d0.y;
  // M · [u v] = [p q]  →  M = [p q] · [u v]⁻¹
  const a = (px * vy - qx * uy) / det;
  const c = (qx * ux - px * vx) / det;
  const b = (py * vy - qy * uy) / det;
  const d = (qy * ux - py * vx) / det;
  return [a, b, c, d, d0.x - a * s0.x - c * s0.y, d0.y - b * s0.x - d * s0.y];
}

/** The subset of a 2D context mesh drawing needs. */
export interface MeshContext {
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  clip?(): void;
  transform?(a: number, b: number, c: number, d: number, e: number, f: number): void;
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

/** Grow a triangle by `by` pixels away from its centroid (hides seams between neighbours). */
function grow(p: Point, cx: number, cy: number, by: number): Point {
  const dx = p.x - cx;
  const dy = p.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / len) * by, y: p.y + (dy / len) * by };
}

/**
 * Draw `image` (w × h, drawn at source size `w × h`) through `map` into `ctx`, in `n × n` cells.
 * The context's current transform applies on top (e.g. a layer's position).
 */
export function drawMapped(
  ctx: MeshContext,
  image: CanvasImageSource,
  w: number,
  h: number,
  map: MeshMap,
  n = 24,
  imageScale = 1,
): void {
  if (!ctx.clip || !ctx.transform || w <= 0 || h <= 0) return;
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) pts.push(map(j / n, i / n));
  const at = (i: number, j: number) => pts[i * (n + 1) + j];
  const src = (i: number, j: number): Point => ({ x: (w * j) / n, y: (h * i) / n });
  const triangle = (s: Point[], d: Point[]) => {
    if (d.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return;
    const m = triangleAffine(s[0], s[1], s[2], d[0], d[1], d[2]);
    if (!m) return;
    const cx = (d[0].x + d[1].x + d[2].x) / 3;
    const cy = (d[0].y + d[1].y + d[2].y) / 3;
    const g = d.map((p) => grow(p, cx, cy, 0.5));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(g[0].x, g[0].y);
    ctx.lineTo(g[1].x, g[1].y);
    ctx.lineTo(g[2].x, g[2].y);
    ctx.closePath();
    ctx.clip!();
    ctx.transform!(...m);
    // Only the cell's own source area (plus a pixel of margin) is drawn.
    const xs = s.map((p) => p.x);
    const ys = s.map((p) => p.y);
    const sx = Math.max(0, Math.floor(Math.min(...xs)) - 1);
    const sy = Math.max(0, Math.floor(Math.min(...ys)) - 1);
    const ex = Math.min(w, Math.ceil(Math.max(...xs)) + 1);
    const ey = Math.min(h, Math.ceil(Math.max(...ys)) + 1);
    if (ex > sx && ey > sy) {
      ctx.drawImage(
        image,
        sx * imageScale,
        sy * imageScale,
        (ex - sx) * imageScale,
        (ey - sy) * imageScale,
        sx,
        sy,
        ex - sx,
        ey - sy,
      );
    }
    ctx.restore();
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      triangle(
        [src(i, j), src(i, j + 1), src(i + 1, j + 1)],
        [at(i, j), at(i, j + 1), at(i + 1, j + 1)],
      );
      triangle(
        [src(i, j), src(i + 1, j + 1), src(i + 1, j)],
        [at(i, j), at(i + 1, j + 1), at(i + 1, j)],
      );
    }
  }
}

/** Is this mesh the identity grid of a w × h box (within a hundredth of a pixel)? */
export function isBoxMesh(mesh: WarpMesh, w: number, h: number): boolean {
  const box = boxMesh(w, h);
  return mesh.every((v, i) => Math.abs(v - box[i]) < 0.01);
}
