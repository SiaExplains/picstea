import type { RgbaPixels } from "../../selection/flood";
import { addNoise, unsharpMask } from "../filters";
import { gaussianBlur, luma } from "../kernels";
import { surfaceBlur } from "./blur";
import { num, range, toggle, bool, type FilterDefinition } from "../types";

/** Noise submenu (ADR-0036). */

/**
 * Median of each colour channel over a (2r+1)² window, with sliding two-level histograms (16
 * coarse bins of 16 levels), so the cost per pixel grows with r, not r². Alpha is kept.
 */
export function median(pixels: RgbaPixels, radius: number): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const r = Math.max(1, Math.round(radius));
  const out = new Uint8ClampedArray(src);
  const fine = new Uint32Array(3 * 256);
  const coarse = new Uint32Array(3 * 16);
  const half = Math.floor(((2 * r + 1) * (2 * r + 1)) / 2) + 1;
  const cx = (x: number) => (x < 0 ? 0 : x >= w ? w - 1 : x);
  const cy = (y: number) => (y < 0 ? 0 : y >= h ? h - 1 : y);
  const column = (x: number, y: number, delta: number) => {
    const sx = cx(x);
    for (let dy = -r; dy <= r; dy++) {
      const i = (cy(y + dy) * w + sx) * 4;
      for (let c = 0; c < 3; c++) {
        const v = src[i + c];
        fine[c * 256 + v] += delta;
        coarse[c * 16 + (v >> 4)] += delta;
      }
    }
  };
  for (let y = 0; y < h; y++) {
    fine.fill(0);
    coarse.fill(0);
    for (let x = -r; x <= r; x++) column(x, y, 1);
    for (let x = 0; x < w; x++) {
      if (x > 0) {
        column(x - r - 1, y, -1);
        column(x + r, y, 1);
      }
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let count = 0;
        let bin = 0;
        while (count + coarse[c * 16 + bin] < half) count += coarse[c * 16 + bin++];
        let v = bin << 4;
        while (count + fine[c * 256 + v] < half) count += fine[c * 256 + v++];
        out[o + c] = v;
      }
    }
  }
  return { ...pixels, data: out };
}

/**
 * Dust & Scratches: replace pixels that differ from the local median by more than
 * `threshold` levels (specks and scratches), keep the rest.
 */
export function dustAndScratches(
  pixels: RgbaPixels,
  radius: number,
  threshold: number,
): RgbaPixels {
  const med = median(pixels, radius).data;
  const src = pixels.data;
  const out = new Uint8ClampedArray(src);
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      if (Math.abs(src[i + c] - med[i + c]) > threshold) out[i + c] = med[i + c];
    }
  }
  return { ...pixels, data: out };
}

/** Despeckle: a 3×3 median everywhere except along strong edges, which stay sharp. */
export function despeckle(pixels: RgbaPixels): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const med = median(pixels, 1).data;
  const out = new Uint8ClampedArray(src);
  const l = (x: number, y: number) => {
    const i = (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4;
    return luma(src[i], src[i + 1], src[i + 2]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = Math.hypot(l(x + 1, y) - l(x - 1, y), l(x, y + 1) - l(x, y - 1));
      if (edge > 40) continue;
      const i = (y * w + x) * 4;
      out[i] = med[i];
      out[i + 1] = med[i + 1];
      out[i + 2] = med[i + 2];
    }
  }
  return { ...pixels, data: out };
}

/**
 * Reduce Noise: an edge-preserving blur of `strength` (0–10), giving back `preserve`% of the
 * detail; colour noise is smoothed separately (`color`%), then edges are sharpened (`sharpen`%).
 */
export function reduceNoise(
  pixels: RgbaPixels,
  strength: number,
  preserve: number,
  color: number,
  sharpen: number,
): RgbaPixels {
  const smooth = strength > 0 ? surfaceBlur(pixels, 2, 4 + strength * 6).data : pixels.data;
  const src = pixels.data;
  const keep = preserve / 100;
  const mixed = new Uint8ClampedArray(src);
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c++) mixed[i + c] = smooth[i + c] + (src[i + c] - smooth[i + c]) * keep;
  }
  let out: RgbaPixels = { ...pixels, data: mixed };
  if (color > 0) {
    // Blur only the chroma: keep each pixel's luma, take colour from a blurred copy.
    const blurred = gaussianBlur(out, 1 + (color / 100) * 3).data;
    const k = color / 100;
    const d = new Uint8ClampedArray(mixed);
    for (let i = 0; i < d.length; i += 4) {
      const ly = luma(mixed[i], mixed[i + 1], mixed[i + 2]);
      const lb = luma(blurred[i], blurred[i + 1], blurred[i + 2]);
      for (let c = 0; c < 3; c++) {
        const target = blurred[i + c] + (ly - lb);
        d[i + c] = mixed[i + c] + (target - mixed[i + c]) * k;
      }
    }
    out = { ...pixels, data: d };
  }
  return sharpen > 0 ? unsharpMask(out, sharpen, 1, 2) : out;
}

export const NOISE_FILTERS = [
  {
    id: "add-noise",
    name: "Add Noise",
    group: "Noise",
    parameters: [
      range("amount", "Amount", 0, 100, 10, "%", 0.5),
      toggle("gaussian", "Gaussian distribution", false),
      toggle("monochromatic", "Monochromatic", false),
    ],
    apply: (p, v, ctx) =>
      addNoise(p, num(v, "amount"), bool(v, "gaussian"), bool(v, "monochromatic"), ctx.seed),
  },
  {
    id: "despeckle",
    name: "Despeckle",
    group: "Noise",
    parameters: [],
    apply: (p) => despeckle(p),
  },
  {
    id: "dust-and-scratches",
    name: "Dust & Scratches",
    group: "Noise",
    parameters: [
      range("radius", "Radius", 1, 100, 1, "px"),
      range("threshold", "Threshold", 0, 255, 0, "levels"),
    ],
    apply: (p, v) => dustAndScratches(p, num(v, "radius"), num(v, "threshold")),
  },
  {
    id: "median",
    name: "Median",
    group: "Noise",
    parameters: [range("radius", "Radius", 1, 100, 1, "px")],
    apply: (p, v) => median(p, num(v, "radius")),
  },
  {
    id: "reduce-noise",
    name: "Reduce Noise",
    group: "Noise",
    parameters: [
      range("strength", "Strength", 0, 10, 6),
      range("preserve", "Preserve details", 0, 100, 60, "%"),
      range("color", "Reduce color noise", 0, 100, 45, "%"),
      range("sharpen", "Sharpen details", 0, 100, 25, "%"),
    ],
    apply: (p, v) =>
      reduceNoise(p, num(v, "strength"), num(v, "preserve"), num(v, "color"), num(v, "sharpen")),
  },
] as const satisfies readonly FilterDefinition[];
