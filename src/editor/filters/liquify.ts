import type { RgbaPixels } from "../selection/flood";
import { warp } from "./sampling";

/**
 * Liquify (ADR-0036): push, twirl, pucker and bloat pixels with a brush. The edit is a
 * displacement field over the layer, in normalised coordinates, so it is independent of
 * resolution: the dialog paints it on a reduced preview and the worker renders it at full size.
 *
 * The field is a backward map: output pixel (u, v) shows the layer at (u + dx, v + dy), where
 * u and v run 0–1 across the layer's width and height.
 */

export interface LiquifyField {
  readonly cols: number;
  readonly rows: number;
  /** Layer width ÷ height, so brush distances are round on non-square layers. */
  readonly aspect: number;
  readonly dx: Float32Array;
  readonly dy: Float32Array;
}

export const LIQUIFY_TOOLS = [
  "forwardWarp",
  "reconstruct",
  "smooth",
  "twirlClockwise",
  "twirlCounterclockwise",
  "pucker",
  "bloat",
] as const;
export type LiquifyTool = (typeof LIQUIFY_TOOLS)[number];

/** Field samples along the longer side: fine enough for brushes down to ~1% of the layer. */
const FIELD_RESOLUTION = 256;

export function createLiquifyField(width: number, height: number): LiquifyField {
  const aspect = width / Math.max(1, height);
  const cols = aspect >= 1 ? FIELD_RESOLUTION : Math.max(2, Math.round(FIELD_RESOLUTION * aspect));
  const rows = aspect >= 1 ? Math.max(2, Math.round(FIELD_RESOLUTION / aspect)) : FIELD_RESOLUTION;
  return {
    cols,
    rows,
    aspect,
    dx: new Float32Array(cols * rows),
    dy: new Float32Array(cols * rows),
  };
}

/** True when the field moves nothing (OK would be a no-op). */
export function isLiquifyFieldEmpty(field: LiquifyField): boolean {
  for (let i = 0; i < field.dx.length; i++)
    if (field.dx[i] !== 0 || field.dy[i] !== 0) return false;
  return true;
}

/** Bilinear sample of the field at normalised (u, v), written to `out`. */
function sampleField(
  dx: Float32Array,
  dy: Float32Array,
  cols: number,
  rows: number,
  u: number,
  v: number,
  out: Float64Array,
): void {
  const gx = Math.min(cols - 1, Math.max(0, u * (cols - 1)));
  const gy = Math.min(rows - 1, Math.max(0, v * (rows - 1)));
  const x0 = Math.min(cols - 2, Math.floor(gx));
  const y0 = Math.min(rows - 2, Math.floor(gy));
  const fx = gx - x0;
  const fy = gy - y0;
  const i = y0 * cols + x0;
  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;
  out[0] = dx[i] * w00 + dx[i + 1] * w10 + dx[i + cols] * w01 + dx[i + cols + 1] * w11;
  out[1] = dy[i] * w00 + dy[i + 1] * w10 + dy[i + cols] * w01 + dy[i + cols + 1] * w11;
}

export interface LiquifyDab {
  readonly tool: LiquifyTool;
  /** Brush centre, normalised. */
  readonly u: number;
  readonly v: number;
  /** Brush radius as a fraction of the layer's width. */
  readonly radius: number;
  /** 0–1. */
  readonly pressure: number;
  /** Forward Warp: how far the brush moved since the last dab, normalised. */
  readonly du?: number;
  readonly dv?: number;
}

/**
 * Apply one brush dab to the field in place. Twirl, pucker, bloat, reconstruct and smooth act a
 * little per dab, so holding the brush still keeps working, as in Photoshop.
 */
export function applyLiquifyDab(field: LiquifyField, dab: LiquifyDab): void {
  const { cols, rows, aspect } = field;
  const r = Math.max(1e-4, dab.radius);
  const snapshotX = new Float32Array(field.dx);
  const snapshotY = new Float32Array(field.dy);
  const sample = new Float64Array(2);
  const rv = r * aspect;
  const i0 = Math.max(0, Math.floor((dab.u - r) * (cols - 1)));
  const i1 = Math.min(cols - 1, Math.ceil((dab.u + r) * (cols - 1)));
  const j0 = Math.max(0, Math.floor((dab.v - rv) * (rows - 1)));
  const j1 = Math.min(rows - 1, Math.ceil((dab.v + rv) * (rows - 1)));
  const rate = dab.pressure;
  for (let j = j0; j <= j1; j++) {
    const v = j / (rows - 1);
    for (let i = i0; i <= i1; i++) {
      const u = i / (cols - 1);
      // Offsets in units of the layer's width, so the brush is round.
      const ox = u - dab.u;
      const oy = (v - dab.v) / aspect;
      const d = Math.hypot(ox, oy) / r;
      if (d >= 1) continue;
      const falloff = (1 - d * d) * (1 - d * d);
      const k = falloff * rate;
      const idx = j * cols + i;
      let su = u;
      let sv = v;
      switch (dab.tool) {
        case "forwardWarp":
          su = u - (dab.du ?? 0) * k;
          sv = v - (dab.dv ?? 0) * k;
          break;
        case "twirlClockwise":
        case "twirlCounterclockwise": {
          const angle = (dab.tool === "twirlClockwise" ? -1 : 1) * 0.12 * k;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          su = dab.u + ox * cos - oy * sin;
          sv = dab.v + (ox * sin + oy * cos) * aspect;
          break;
        }
        case "pucker":
        case "bloat": {
          const s = (dab.tool === "pucker" ? 1 : -1) * 0.06 * k;
          su = dab.u + ox * (1 + s);
          sv = dab.v + oy * (1 + s) * aspect;
          break;
        }
        case "reconstruct":
          field.dx[idx] = snapshotX[idx] * (1 - 0.2 * k);
          field.dy[idx] = snapshotY[idx] * (1 - 0.2 * k);
          continue;
        case "smooth": {
          let ax = 0;
          let ay = 0;
          let n = 0;
          for (let b = -1; b <= 1; b++) {
            for (let a = -1; a <= 1; a++) {
              const ii = Math.min(cols - 1, Math.max(0, i + a));
              const jj = Math.min(rows - 1, Math.max(0, j + b));
              ax += snapshotX[jj * cols + ii];
              ay += snapshotY[jj * cols + ii];
              n++;
            }
          }
          field.dx[idx] = snapshotX[idx] + (ax / n - snapshotX[idx]) * 0.5 * k;
          field.dy[idx] = snapshotY[idx] + (ay / n - snapshotY[idx]) * 0.5 * k;
          continue;
        }
      }
      // Compose: the new map reads the old map at the moved position.
      sampleField(snapshotX, snapshotY, cols, rows, su, sv, sample);
      field.dx[idx] = su + sample[0] - u;
      field.dy[idx] = sv + sample[1] - v;
    }
  }
}

/** Render the layer through the field (any resolution). */
export function renderLiquify(pixels: RgbaPixels, field: LiquifyField): RgbaPixels {
  const { width: w, height: h } = pixels;
  const sx = Math.max(1, w - 1);
  const sy = Math.max(1, h - 1);
  const d = new Float64Array(2);
  return warp(pixels, (x, y, xy) => {
    const u = x / sx;
    const v = y / sy;
    sampleField(field.dx, field.dy, field.cols, field.rows, u, v, d);
    xy[0] = (u + d[0]) * sx;
    xy[1] = (v + d[1]) * sy;
  });
}

/** Validate a field from untrusted input (a worker message); null if invalid. */
export function parseLiquifyField(value: unknown): LiquifyField | null {
  if (typeof value !== "object" || value === null) return null;
  const f = value as Record<string, unknown>;
  const { cols, rows, aspect, dx, dy } = f;
  if (
    typeof cols !== "number" ||
    typeof rows !== "number" ||
    typeof aspect !== "number" ||
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < 2 ||
    rows < 2 ||
    cols * rows > 4 * FIELD_RESOLUTION * FIELD_RESOLUTION ||
    !(aspect > 0) ||
    !(dx instanceof Float32Array) ||
    !(dy instanceof Float32Array) ||
    dx.length !== cols * rows ||
    dy.length !== cols * rows
  ) {
    return null;
  }
  return { cols, rows, aspect, dx, dy };
}
