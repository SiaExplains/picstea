import type { Point } from "../core/viewport/viewport";

/**
 * Retouching strokes (ADR-0019): pure pixel code, no canvas, so it runs and is tested anywhere.
 * Pixels are straight (non-premultiplied) RGBA bytes in the layer's own space, as returned by
 * `getImageData`. A stroke reads the layer once at the start (`base`), writes into `out`, and
 * reports which area changed so the caller only uploads that.
 */

/** Pixel bounds, half-open: x0 ≤ x < x1. */
export interface PixelRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface StrokeOptions {
  readonly width: number;
  readonly height: number;
  readonly base: Uint8ClampedArray;
  /** Tip radius in layer pixels. */
  readonly radius: number;
  /** 0 (soft) … 1 (hard) */
  readonly hardness: number;
  /** 0 … 1: opacity, exposure, flow or strength, depending on the tool. */
  readonly strength: number;
  /** Selection coverage per layer pixel (0…255), or null for no selection. */
  readonly selection: Uint8Array | null;
}

/** A stroke that changes `out` as dabs arrive. */
export interface PixelStroke {
  readonly out: Uint8ClampedArray<ArrayBuffer>;
  dab(point: Point): void;
  /** Bring `out` up to date; the area that changed since the last call, or null. */
  flush(): PixelRect | null;
  /** Final pass on release (healing); the area that changed, or null. */
  finish(): PixelRect | null;
}

/** Tip opacity at `distance` from the centre: solid to `hardness · radius`, then a smooth falloff. */
export function tipAlpha(distance: number, radius: number, hardness: number): number {
  if (hardness >= 0.99 || radius < 1) return Math.min(1, Math.max(0, radius - distance + 0.5));
  if (distance >= radius) return 0;
  const inner = radius * Math.max(0, hardness);
  if (distance <= inner) return 1;
  const t = (distance - inner) / (radius - inner);
  return 1 - t * t * (3 - 2 * t);
}

/** Pixels a dab at `p` touches, clipped to the image. */
export function dabBounds(p: Point, radius: number, width: number, height: number): PixelRect {
  return {
    x0: Math.max(0, Math.floor(p.x - radius - 1)),
    y0: Math.max(0, Math.floor(p.y - radius - 1)),
    x1: Math.min(width, Math.ceil(p.x + radius + 1)),
    y1: Math.min(height, Math.ceil(p.y + radius + 1)),
  };
}

export function unionRect(a: PixelRect | null, b: PixelRect): PixelRect {
  if (!a) return b;
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
}

export const isEmptyRect = (r: PixelRect) => r.x1 <= r.x0 || r.y1 <= r.y0;

/**
 * Mix `base` towards the straight RGBA `t` by `w` (0…1), in premultiplied space so transparent
 * pixels don't bleed their (meaningless) colour.
 */
export function mixPixel(
  out: Uint8ClampedArray,
  base: Uint8ClampedArray,
  i: number,
  t: Float32Array,
  w: number,
): void {
  const ba = base[i + 3] / 255;
  const a = ba + (t[3] / 255 - ba) * w;
  if (a <= 1e-6) {
    out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
    return;
  }
  const ta = t[3] / 255;
  for (let c = 0; c < 3; c++) {
    const pm = base[i + c] * ba + (t[c] * ta - base[i + c] * ba) * w;
    out[i + c] = pm / a;
  }
  out[i + 3] = a * 255;
}

/** What a coverage-based tool turns a pixel into at full strength. */
export interface PixelEffect {
  /** Write the straight RGBA target for pixel (x, y) into `t`; false leaves the pixel as it was. */
  target(x: number, y: number, t: Float32Array): boolean;
}

const COVERAGE_MAX = 65535;

/**
 * Tools that move pixels towards an effect (dodge, burn, sponge, blur, sharpen, clone, heal).
 * Dabs accumulate a coverage mask like brush paint ("source over"), and each pixel shows
 * `mix(base, effect, coverage · strength · selection)` — so going over the same spot within one
 * stroke never builds past the tool strength.
 */
export class CoverageStroke implements PixelStroke {
  readonly out: Uint8ClampedArray<ArrayBuffer>;
  readonly coverage: Uint16Array;
  private dirty: PixelRect | null = null;
  /** Everything this stroke touched, for the final pass. */
  protected touched: PixelRect | null = null;
  private readonly t = new Float32Array(4);

  constructor(
    protected readonly options: StrokeOptions,
    protected effect: PixelEffect,
  ) {
    const { width, height, base } = options;
    if (base.length !== width * height * 4) throw new RangeError("Pixel data does not match.");
    this.out = new Uint8ClampedArray(base);
    this.coverage = new Uint16Array(width * height);
  }

  dab(p: Point): void {
    const { radius, hardness, width, height } = this.options;
    const r = dabBounds(p, radius, width, height);
    if (isEmptyRect(r)) return;
    for (let y = r.y0; y < r.y1; y++) {
      for (let x = r.x0; x < r.x1; x++) {
        const a = tipAlpha(Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y), radius, hardness);
        if (a <= 0) continue;
        const i = y * width + x;
        const c = this.coverage[i] / COVERAGE_MAX;
        this.coverage[i] = Math.round((c + a * (1 - c)) * COVERAGE_MAX);
      }
    }
    this.dirty = unionRect(this.dirty, r);
    this.touched = unionRect(this.touched, r);
  }

  /** How strongly the effect applies at pixel index `i` (0…1). */
  weight(i: number): number {
    const { strength, selection } = this.options;
    const w = (this.coverage[i] / COVERAGE_MAX) * strength;
    return selection ? (w * selection[i]) / 255 : w;
  }

  flush(): PixelRect | null {
    const rect = this.dirty;
    this.dirty = null;
    if (!rect) return null;
    this.render(rect);
    return rect;
  }

  finish(): PixelRect | null {
    return this.flush();
  }

  protected render(rect: PixelRect): void {
    const { width, base } = this.options;
    const t = this.t;
    for (let y = rect.y0; y < rect.y1; y++) {
      for (let x = rect.x0; x < rect.x1; x++) {
        const p = y * width + x;
        const i = p * 4;
        const w = this.weight(p);
        if (w > 0 && this.effect.target(x, y, t)) {
          mixPixel(this.out, base, i, t, w);
        } else {
          this.out[i] = base[i];
          this.out[i + 1] = base[i + 1];
          this.out[i + 2] = base[i + 2];
          this.out[i + 3] = base[i + 3];
        }
      }
    }
  }
}
