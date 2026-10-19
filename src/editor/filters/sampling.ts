import type { RgbaPixels } from "../selection/flood";
import { premultiply, seededRandom, unpremultiply } from "./kernels";

/**
 * Shared building blocks for the geometric, convolution and procedural filters (ADR-0036).
 * Like `kernels.ts`, everything works on premultiplied colour where pixels are mixed, so
 * transparent pixels don't bleed dark fringes.
 */

export const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const copyPixels = (p: RgbaPixels): RgbaPixels => ({
  ...p,
  data: new Uint8ClampedArray(p.data),
});

/** What a sample outside the image returns. */
export type EdgeMode = "clamp" | "wrap" | "transparent";

/**
 * Bilinear sample of premultiplied `src` at (x, y) (pixel centres at integer + 0.5 are not
 * used: pixel (i, j) is at (i, j)), written to `out[o..o+3]`.
 */
export function sampleBilinear(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  out: Uint8ClampedArray | Float32Array,
  o: number,
  edge: EdgeMode,
): void {
  if (edge === "transparent" && (x < -0.5 || y < -0.5 || x > w - 0.5 || y > h - 0.5)) {
    out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
    return;
  }
  const x0f = Math.floor(x);
  const y0f = Math.floor(y);
  const fx = x - x0f;
  const fy = y - y0f;
  const ix = (v: number) => (edge === "wrap" ? ((v % w) + w) % w : v < 0 ? 0 : v >= w ? w - 1 : v);
  const iy = (v: number) => (edge === "wrap" ? ((v % h) + h) % h : v < 0 ? 0 : v >= h ? h - 1 : v);
  const xa = ix(x0f);
  const xb = ix(x0f + 1);
  const ya = iy(y0f) * w;
  const yb = iy(y0f + 1) * w;
  const i00 = (ya + xa) * 4;
  const i10 = (ya + xb) * 4;
  const i01 = (yb + xa) * 4;
  const i11 = (yb + xb) * 4;
  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;
  for (let c = 0; c < 4; c++) {
    out[o + c] = src[i00 + c] * w00 + src[i10 + c] * w10 + src[i01 + c] * w01 + src[i11 + c] * w11;
  }
}

/**
 * Inverse-mapped geometric warp: `map(x, y, xy)` writes the source position for output pixel
 * (x, y) into `xy`. Returns new straight-alpha pixels.
 */
export function warp(
  pixels: RgbaPixels,
  map: (x: number, y: number, xy: Float64Array) => void,
  edge: EdgeMode = "clamp",
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  const xy = new Float64Array(2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      map(x, y, xy);
      sampleBilinear(src, w, h, xy[0], xy[1], out, (y * w + x) * 4, edge);
    }
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

/** Convolve with a square kernel (odd size), normalised by its sum (or 1 when it sums to 0). */
export function convolve(pixels: RgbaPixels, kernel: readonly number[]): RgbaPixels {
  const size = Math.round(Math.sqrt(kernel.length));
  const half = (size - 1) / 2;
  const { width: w, height: h } = pixels;
  const sum = kernel.reduce((a, b) => a + b, 0) || 1;
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let ky = 0; ky < size; ky++) {
        const sy = Math.min(h - 1, Math.max(0, y + ky - half)) * w;
        for (let kx = 0; kx < size; kx++) {
          const k = kernel[ky * size + kx];
          if (k === 0) continue;
          const i = (sy + Math.min(w - 1, Math.max(0, x + kx - half))) * 4;
          r += src[i] * k;
          g += src[i + 1] * k;
          b += src[i + 2] * k;
          a += src[i + 3] * k;
        }
      }
      const o = (y * w + x) * 4;
      out[o] = r / sum;
      out[o + 1] = g / sum;
      out[o + 2] = b / sum;
      out[o + 3] = a / sum;
    }
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

/** A lattice of random values in [0, 1), smoothly interpolated: one octave of value noise. */
function noiseLattice(cols: number, rows: number, random: () => number): Float32Array {
  const lattice = new Float32Array((cols + 1) * (rows + 1));
  for (let i = 0; i < lattice.length; i++) lattice[i] = random();
  return lattice;
}

/**
 * Fractal (turbulence-free) value noise in [0, 1] for a w×h image: `scale` is the size of the
 * largest feature in px; octaves halve in size and amplitude.
 */
export function fractalNoise(
  w: number,
  h: number,
  scale: number,
  seed: number,
  octaves = 6,
): Float32Array {
  const random = seededRandom(seed);
  const out = new Float32Array(w * h);
  let amplitude = 1;
  let total = 0;
  let cell = Math.max(2, scale);
  for (let o = 0; o < octaves && cell >= 1; o++) {
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(h / cell) + 1;
    const lattice = noiseLattice(cols, rows, random);
    for (let y = 0; y < h; y++) {
      const gy = y / cell;
      const y0 = Math.floor(gy);
      const ty = gy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const gx = x / cell;
        const x0 = Math.floor(gx);
        const tx = gx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const i = y0 * (cols + 1) + x0;
        const top = lattice[i] + (lattice[i + 1] - lattice[i]) * sx;
        const bottom = lattice[i + cols + 1] + (lattice[i + cols + 2] - lattice[i + cols + 1]) * sx;
        out[y * w + x] += (top + (bottom - top) * sy) * amplitude;
      }
    }
    total += amplitude;
    amplitude /= 2;
    cell /= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** RGB (0–255) to HSV with h in [0, 360), s and v in [0, 1]. */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d > 0) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return [hue, max === 0 ? 0 : d / max, max / 255];
}

export function hsvToRgb(hue: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = (((hue % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = v - c;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** RGB (0–255) to HSL with h in [0, 360), s and l in [0, 1]. */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const [hue] = rgbToHsv(r, g, b);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [hue, s, l];
}

export function hslToRgb(hue: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const v = l + c / 2;
  return hsvToRgb(hue, v === 0 ? 0 : c / v, v);
}

/** Per-pixel parameters of a layer's geometry, relative to a centre given in percent. */
export function centerOf(w: number, h: number, cxPercent: number, cyPercent: number) {
  return { cx: (cxPercent / 100) * (w - 1), cy: (cyPercent / 100) * (h - 1) };
}
