import { shiftRect, type PixelEffect, type PixelPrepare } from "./stroke";

/** Rec. 601 lightness of straight RGB bytes, 0…1. */
const lightness = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

export type ToneRange = "shadows" | "midtones" | "highlights";

/** How much a pixel of lightness `l` belongs to the range (0…1). */
export function rangeWeight(range: ToneRange, l: number): number {
  if (range === "shadows") return (1 - l) * (1 - l);
  if (range === "highlights") return l * l;
  return 4 * l * (1 - l);
}

/** At full exposure a pixel fully in the range moves this far towards white (dodge) or black. */
const TONE_REACH = 0.5;

/** Dodge (lighten) or burn (darken) the chosen tonal range. Alpha is kept. */
export function toneEffect(
  base: Uint8ClampedArray,
  width: number,
  mode: "dodge" | "burn",
  range: ToneRange,
): PixelEffect {
  return {
    target(x, y, t) {
      const i = (y * width + x) * 4;
      const k = TONE_REACH * rangeWeight(range, lightness(base[i], base[i + 1], base[i + 2]));
      for (let c = 0; c < 3; c++) {
        const v = base[i + c];
        t[c] = mode === "dodge" ? v + (255 - v) * k : v - v * k;
      }
      t[3] = base[i + 3];
      return true;
    },
  };
}

/** Sponge: saturate (double the distance from grey) or desaturate (towards grey). */
export function spongeEffect(
  base: Uint8ClampedArray,
  width: number,
  mode: "saturate" | "desaturate",
): PixelEffect {
  return {
    target(x, y, t) {
      const i = (y * width + x) * 4;
      const grey = lightness(base[i], base[i + 1], base[i + 2]) * 255;
      for (let c = 0; c < 3; c++) {
        t[c] = mode === "desaturate" ? grey : grey + (base[i + c] - grey) * 2;
        t[c] = Math.min(255, Math.max(0, t[c]));
      }
      t[3] = base[i + 3];
      return true;
    },
  };
}

const TILE = 64;

/**
 * A blurred copy of `base`, computed lazily per 64 px tile (three box passes ≈ Gaussian, in
 * premultiplied space) so a stroke only pays for the area it touches.
 */
export class BlurTiles {
  private readonly tiles = new Map<number, Float32Array>();
  private readonly tilesX: number;

  constructor(
    private readonly base: Uint8ClampedArray,
    private readonly width: number,
    private readonly height: number,
    readonly boxRadius: number,
    /** For lazily read `base`. */
    private readonly prepare?: PixelPrepare,
  ) {
    this.tilesX = Math.ceil(width / TILE);
  }

  /** Premultiplied RGBA (0…255) of the blurred pixel, written into `t`. */
  sample(x: number, y: number, t: Float32Array): void {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const key = ty * this.tilesX + tx;
    let tile = this.tiles.get(key);
    if (!tile) {
      tile = this.computeTile(tx, ty);
      this.tiles.set(key, tile);
    }
    const i = ((y - ty * TILE) * TILE + (x - tx * TILE)) * 4;
    t[0] = tile[i];
    t[1] = tile[i + 1];
    t[2] = tile[i + 2];
    t[3] = tile[i + 3];
  }

  private computeTile(tx: number, ty: number): Float32Array {
    const { base, width, height, boxRadius: r } = this;
    const margin = r * 3;
    const x0 = Math.max(0, tx * TILE - margin);
    const y0 = Math.max(0, ty * TILE - margin);
    const x1 = Math.min(width, (tx + 1) * TILE + margin);
    const y1 = Math.min(height, (ty + 1) * TILE + margin);
    this.prepare?.({ x0, y0, x1, y1 });
    const w = x1 - x0;
    const h = y1 - y0;
    const a = new Float32Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = ((y + y0) * width + x + x0) * 4;
        const d = (y * w + x) * 4;
        const alpha = base[s + 3] / 255;
        a[d] = base[s] * alpha;
        a[d + 1] = base[s + 1] * alpha;
        a[d + 2] = base[s + 2] * alpha;
        a[d + 3] = base[s + 3];
      }
    }
    const b = new Float32Array(a.length);
    for (let pass = 0; pass < 3; pass++) {
      boxPass(a, b, w, h, r, true);
      boxPass(b, a, w, h, r, false);
    }
    const out = new Float32Array(TILE * TILE * 4);
    for (let y = 0; y < TILE; y++) {
      const sy = ty * TILE + y - y0;
      if (sy >= h || ty * TILE + y >= height) break;
      for (let x = 0; x < TILE; x++) {
        const sx = tx * TILE + x - x0;
        if (sx >= w || tx * TILE + x >= width) break;
        out.set(a.subarray((sy * w + sx) * 4, (sy * w + sx) * 4 + 4), (y * TILE + x) * 4);
      }
    }
    return out;
  }
}

/** One box-blur pass along rows or columns; edges clamp. */
function boxPass(
  src: Float32Array,
  dst: Float32Array,
  w: number,
  h: number,
  r: number,
  horizontal: boolean,
): void {
  const lines = horizontal ? h : w;
  const length = horizontal ? w : h;
  const at = (line: number, k: number) => (horizontal ? line * w + k : k * w + line) * 4;
  const n = 2 * r + 1;
  for (let line = 0; line < lines; line++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[at(line, Math.min(length - 1, Math.max(0, k))) + c];
      for (let k = 0; k < length; k++) {
        dst[at(line, k) + c] = sum / n;
        const add = Math.min(length - 1, k + r + 1);
        const remove = Math.max(0, k - r);
        sum += src[at(line, add) + c] - src[at(line, remove) + c];
      }
    }
  }
}

/** Blur radius for a tip: grows gently with the brush so large brushes still visibly soften. */
export const blurRadiusFor = (tipRadius: number) =>
  Math.min(8, Math.max(1, Math.round(tipRadius / 6)));

/** Blur or sharpen (unsharp mask against the blurred copy). */
export function focusEffect(
  base: Uint8ClampedArray,
  width: number,
  tiles: BlurTiles,
  mode: "blur" | "sharpen",
): PixelEffect {
  const blurred = new Float32Array(4);
  return {
    target(x, y, t) {
      tiles.sample(x, y, blurred);
      const i = (y * width + x) * 4;
      const ba = base[i + 3] / 255;
      if (mode === "blur") {
        const a = blurred[3] / 255;
        for (let c = 0; c < 3; c++) t[c] = a > 0 ? blurred[c] / a : 0;
        t[3] = blurred[3];
        return true;
      }
      // Sharpen colour, keep alpha (sharpening alpha creates halos on cut-outs).
      for (let c = 0; c < 3; c++) {
        const pm = base[i + c] * ba;
        const sharp = pm + (pm - blurred[c]);
        t[c] = ba > 0 ? Math.min(255, Math.max(0, sharp / ba)) : base[i + c];
      }
      t[3] = base[i + 3];
      return true;
    },
  };
}

/**
 * Clone: copy `source` (same size as the layer) from `(x + dx, y + dy)`. Where the source falls
 * outside the image — or outside `inside`, the part of the layer on the canvas — nothing is
 * painted.
 */
export function cloneEffect(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  dx: number,
  dy: number,
  inside: Uint8Array | null = null,
  /** For a lazily read `source` (and `inside`). */
  prepareSource?: PixelPrepare,
): PixelEffect {
  return {
    prepare: prepareSource ? (rect) => void prepareSource(shiftRect(rect, dx, dy)) : undefined,
    target(x, y, t) {
      const sx = x + dx;
      const sy = y + dy;
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) return false;
      if (inside && inside[sy * width + sx] < 128) return false;
      const i = (sy * width + sx) * 4;
      t[0] = source[i];
      t[1] = source[i + 1];
      t[2] = source[i + 2];
      t[3] = source[i + 3];
      return true;
    },
  };
}

/** Largest per-channel difference between pixel `i` of `base` and an RGB colour. */
const colorDistance = (base: Uint8ClampedArray, i: number, rgb: readonly number[]) =>
  Math.max(
    Math.abs(base[i] - rgb[0]),
    Math.abs(base[i + 1] - rgb[1]),
    Math.abs(base[i + 2] - rgb[2]),
  );

/**
 * Background Eraser (ADR-0027): pixels close to the colour sampled at the start of the stroke
 * become transparent; everything else under the brush stays. Partial matches near the tolerance
 * edge fade out smoothly instead of leaving a hard fringe.
 */
export function backgroundEraseEffect(
  base: Uint8ClampedArray,
  width: number,
  sample: readonly number[],
  tolerance: number,
): PixelEffect {
  const soft = Math.max(1, tolerance * 0.25);
  return {
    target(x, y, t) {
      const i = (y * width + x) * 4;
      const d = colorDistance(base, i, sample);
      if (d > tolerance + soft) return false;
      const keep = d <= tolerance ? 0 : (d - tolerance) / soft;
      t[0] = base[i];
      t[1] = base[i + 1];
      t[2] = base[i + 2];
      t[3] = base[i + 3] * keep;
      return true;
    },
  };
}

/** RGB (0…255) → hue (0…1), saturation (0…1), lightness (0…1). */
function toHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn
      ? (gn - bn) / d + (gn < bn ? 6 : 0)
      : max === gn
        ? (bn - rn) / d + 2
        : (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function fromHsl(h: number, s: number, l: number, out: Float32Array): void {
  if (s === 0) {
    out[0] = out[1] = out[2] = l * 255;
    return;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  out[0] = hueToRgb(p, q, h + 1 / 3) * 255;
  out[1] = hueToRgb(p, q, h) * 255;
  out[2] = hueToRgb(p, q, h - 1 / 3) * 255;
}

/**
 * Color Replacement: pixels close to the sampled colour take the hue and saturation of `color`
 * and keep their own lightness, so shading and texture survive.
 */
export function colorReplaceEffect(
  base: Uint8ClampedArray,
  width: number,
  sample: readonly number[],
  tolerance: number,
  color: readonly number[],
): PixelEffect {
  const [hue, sat] = toHsl(color[0], color[1], color[2]);
  return {
    target(x, y, t) {
      const i = (y * width + x) * 4;
      if (colorDistance(base, i, sample) > tolerance) return false;
      const [, , l] = toHsl(base[i], base[i + 1], base[i + 2]);
      fromHsl(hue, sat, l, t);
      t[3] = base[i + 3];
      return true;
    },
  };
}

/**
 * Red Eye: strongly red pixels lose their red cast and are darkened; other pixels under the
 * brush (skin, eyelids) are left alone.
 */
export function redEyeEffect(base: Uint8ClampedArray, width: number, darken: number): PixelEffect {
  return {
    target(x, y, t) {
      const i = (y * width + x) * 4;
      const r = base[i];
      const g = base[i + 1];
      const b = base[i + 2];
      const other = (g + b) / 2;
      if (r < 60 || r < other * 1.5) return false;
      const k = 1 - darken * 0.8;
      t[0] = other * k;
      t[1] = g * k;
      t[2] = b * k;
      t[3] = base[i + 3];
      return true;
    },
  };
}
