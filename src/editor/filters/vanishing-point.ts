import type { RgbaPixels } from "../selection/flood";
import { premultiply, unpremultiply } from "./kernels";
import { clamp01, sampleBilinear } from "./sampling";

/**
 * Vanishing Point (ADR-0036): a perspective plane drawn over the layer, and a clone stamp that
 * paints inside it with perspective — a copied patch shrinks as it moves into the distance.
 *
 * The plane is the image of the unit square under a homography through its four corners.
 * Clone dabs live in plane coordinates (0–1 across the plane), and corners in normalised layer
 * coordinates, so the same edit renders on the reduced preview and at full size.
 */

/** Corners in normalised layer coordinates, clockwise from top-left: x0 y0 x1 y1 x2 y2 x3 y3. */
export type PlaneCorners = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

// The homography maths moved to core/geometry (ADR-0044); re-exported for existing callers.
export {
  invert3,
  isConvexQuad,
  project,
  squareToQuad,
  type Homography,
} from "../core/geometry/homography";
import {
  invert3,
  isConvexQuad,
  project,
  squareToQuad,
  type Homography,
} from "../core/geometry/homography";

export interface CloneDab {
  /** Which stroke the dab belongs to; dabs of one stroke don't build up over each other. */
  readonly stroke: number;
  /** Destination centre in plane coordinates. */
  readonly x: number;
  readonly y: number;
  /** Source minus destination, in plane coordinates. */
  readonly ox: number;
  readonly oy: number;
  /** Radius in plane units (fraction of the plane's width). */
  readonly radius: number;
  /** 0–1: 1 is a hard edge. */
  readonly hardness: number;
}

export interface VanishingPointEdit {
  readonly corners: PlaneCorners;
  readonly dabs: readonly CloneDab[];
}

/**
 * Paints clone dabs onto a copy of the layer, stroke by stroke. Within a stroke each pixel takes
 * the strongest coverage of any dab over it (so overlapping soft dabs keep a soft edge, as with
 * a real clone stamp), sampled from the layer as it was when the stroke began. Only pixels inside
 * the plane change.
 */
export class ClonePainter {
  readonly width: number;
  readonly height: number;
  private readonly data: Uint8ClampedArray;
  private base: Uint8ClampedArray;
  private readonly coverage: Uint8Array;
  private readonly toImage: Homography | null;
  private readonly toPlane: Homography | null;
  private stroke: number | null = null;

  constructor(pixels: RgbaPixels, corners: PlaneCorners) {
    const { width: w, height: h } = pixels;
    this.width = w;
    this.height = h;
    const sx = Math.max(1, w - 1);
    const sy = Math.max(1, h - 1);
    const quad = corners.map((v, k) => v * (k % 2 === 0 ? sx : sy));
    const toImage = isConvexQuad(quad) ? squareToQuad(quad) : null;
    this.toImage = toImage;
    this.toPlane = toImage && invert3(toImage);
    this.data = premultiply(pixels.data);
    this.base = this.data;
    this.coverage = new Uint8Array(w * h);
  }

  /** Start a new stroke: later dabs sample the layer as it is now. */
  beginStroke(id: number): void {
    this.stroke = id;
    this.base = new Uint8ClampedArray(this.data);
    this.coverage.fill(0);
  }

  dab(dab: CloneDab): void {
    const { toImage, toPlane, width: w, height: h, data, coverage } = this;
    if (!toImage || !toPlane) return;
    if (this.stroke !== dab.stroke) this.beginStroke(dab.stroke);
    const base = this.base;
    const p = new Float64Array(2);
    const tmp = new Float32Array(4);
    // Bounding box in the layer: the plane square around the dab, projected.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [cx, cy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const px = clamp01(dab.x + cx * dab.radius);
      const py = clamp01(dab.y + cy * dab.radius);
      if (!project(toImage, px, py, p)) continue;
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }
    const x0 = Math.max(0, Math.floor(minX));
    const y0 = Math.max(0, Math.floor(minY));
    const x1 = Math.min(w - 1, Math.ceil(maxX));
    const y1 = Math.min(h - 1, Math.ceil(maxY));
    const inner = Math.min(0.99, dab.hardness);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!project(toPlane, x, y, p)) continue;
        const u = p[0];
        const v = p[1];
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        const d = Math.hypot(u - dab.x, v - dab.y) / dab.radius;
        if (d >= 1) continue;
        const t = d <= inner ? 1 : 1 - (d - inner) / (1 - inner);
        const a = Math.round(t * t * (3 - 2 * t) * 255);
        const k = y * w + x;
        if (a <= coverage[k]) continue;
        coverage[k] = a;
        if (!project(toImage, u + dab.ox, v + dab.oy, p)) continue;
        sampleBilinear(base, w, h, p[0], p[1], tmp, 0, "clamp");
        const i = k * 4;
        const f = a / 255;
        for (let c = 0; c < 4; c++) data[i + c] = base[i + c] + (tmp[c] - base[i + c]) * f;
      }
    }
  }

  /** The painted layer as straight-alpha pixels (a copy). */
  result(): RgbaPixels {
    return {
      width: this.width,
      height: this.height,
      data: unpremultiply(new Uint8ClampedArray(this.data)),
    };
  }
}

/** Paint the clone dabs onto the layer, in order. Returns new pixels. */
export function renderVanishingPoint(pixels: RgbaPixels, edit: VanishingPointEdit): RgbaPixels {
  const painter = new ClonePainter(pixels, edit.corners);
  for (const dab of edit.dabs) painter.dab(dab);
  return painter.result();
}

/** Validate an edit from untrusted input (a worker message); null if invalid. */
export function parseVanishingPointEdit(value: unknown): VanishingPointEdit | null {
  if (typeof value !== "object" || value === null) return null;
  const { corners, dabs } = value as Record<string, unknown>;
  const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  if (!Array.isArray(corners) || corners.length !== 8 || !corners.every(finite)) return null;
  if (!Array.isArray(dabs) || dabs.length > 200_000) return null;
  for (const dab of dabs) {
    if (typeof dab !== "object" || dab === null) return null;
    const d = dab as Record<string, unknown>;
    if (![d.stroke, d.x, d.y, d.ox, d.oy, d.radius, d.hardness].every(finite)) return null;
    if ((d.radius as number) <= 0) return null;
  }
  return { corners: corners as unknown as PlaneCorners, dabs: dabs as CloneDab[] };
}
