import type { RgbaPixels } from "../../selection/flood";
import { boxBlur, gaussianBlur, motionBlur } from "../filters";
import { luma, premultiply, unpremultiply } from "../kernels";
import { centerOf, clamp255, convolve, sampleBilinear } from "../sampling";
import { centerParams, choice, num, range, type FilterDefinition } from "../types";

/** Blur submenu (ADR-0036). */

/** Fill every pixel with the layer's average colour (weighted by alpha); alpha is kept. */
export function average(pixels: RgbaPixels): RgbaPixels {
  const d = pixels.data;
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i] * d[i + 3];
    g += d[i + 1] * d[i + 3];
    b += d[i + 2] * d[i + 3];
    a += d[i + 3];
  }
  const out = new Uint8ClampedArray(d);
  if (a === 0) return { ...pixels, data: out };
  for (let i = 0; i < out.length; i += 4) {
    out[i] = r / a;
    out[i + 1] = g / a;
    out[i + 2] = b / a;
  }
  return { ...pixels, data: out };
}

const BLUR_KERNEL = [1, 2, 1, 2, 4, 2, 1, 2, 1];
const BLUR_MORE_KERNEL = [
  1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1, 4, 6, 4, 1,
];

/**
 * Lens Blur: a disc ("bokeh") kernel of `radius` px. Pixels brighter than `threshold` are
 * boosted by `brightness`% first, so highlights bloom into bright discs as through a lens.
 * Each disc row is a span of a prefix sum, so the cost grows with the radius, not its square.
 */
export function lensBlur(
  pixels: RgbaPixels,
  radius: number,
  brightness: number,
  threshold: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const r = Math.max(1, Math.round(radius));
  const src = premultiply(pixels.data);
  const boost = brightness / 25;
  const spans = Array.from({ length: 2 * r + 1 }, (_, i) => {
    const dy = i - r;
    return Math.floor(Math.sqrt(r * r - dy * dy));
  });
  const out = new Uint8ClampedArray(src.length);
  const prefix = new Float32Array((w + 1) * h);
  const acc = new Float32Array(w * h);
  let weights: Float32Array | null = null;
  for (let c = 0; c < 4; c++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const row = y * (w + 1);
      prefix[row] = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let v = src[i + c];
        if (c < 3 && boost > 0) {
          const l = luma(src[i], src[i + 1], src[i + 2]);
          if (l > threshold) v *= 1 + boost * ((l - threshold) / (256 - threshold));
        }
        sum += v;
        prefix[row + x + 1] = sum;
      }
    }
    const computeWeights = weights === null;
    if (computeWeights) weights = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let total = 0;
        let count = 0;
        for (let k = 0; k < spans.length; k++) {
          const sy = y + k - r;
          if (sy < 0 || sy >= h) continue;
          const x0 = Math.max(0, x - spans[k]);
          const x1 = Math.min(w, x + spans[k] + 1);
          const row = sy * (w + 1);
          total += prefix[row + x1] - prefix[row + x0];
          count += x1 - x0;
        }
        acc[y * w + x] = total;
        if (computeWeights) weights![y * w + x] = count;
      }
    }
    for (let p = 0; p < acc.length; p++) out[p * 4 + c] = clamp255(acc[p] / weights![p]);
  }
  // Boosted colour can exceed alpha; keep premultiplied colour valid before unpremultiplying.
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    if (out[i] > a) out[i] = a;
    if (out[i + 1] > a) out[i + 1] = a;
    if (out[i + 2] > a) out[i + 2] = a;
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

/**
 * Radial Blur: Spin (samples along an arc of `amount`°) or Zoom (samples along the line to
 * the centre, up to `amount`% of the distance).
 */
export function radialBlur(
  pixels: RgbaPixels,
  amount: number,
  zoom: boolean,
  cxPercent: number,
  cyPercent: number,
  quality: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const { cx, cy } = centerOf(w, h, cxPercent, cyPercent);
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  const maxSamples = [8, 24, 64][quality] ?? 24;
  const tmp = new Float32Array(4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const reach = zoom ? dist * (amount / 100) : (dist * amount * Math.PI) / 180;
      const samples = Math.max(1, Math.min(maxSamples, Math.ceil(reach)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let s = 0; s < samples; s++) {
        const t = samples === 1 ? 0 : s / (samples - 1) - 0.5;
        let sx: number;
        let sy: number;
        if (zoom) {
          const k = 1 - (t + 0.5) * (amount / 100);
          sx = cx + dx * k;
          sy = cy + dy * k;
        } else {
          const angle = (t * amount * Math.PI) / 180;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          sx = cx + dx * cos - dy * sin;
          sy = cy + dx * sin + dy * cos;
        }
        sampleBilinear(src, w, h, sx, sy, tmp, 0, "clamp");
        r += tmp[0];
        g += tmp[1];
        b += tmp[2];
        a += tmp[3];
      }
      const o = (y * w + x) * 4;
      out[o] = r / samples;
      out[o + 1] = g / samples;
      out[o + 2] = b / samples;
      out[o + 3] = a / samples;
    }
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

/**
 * Surface Blur: an edge-preserving blur. Neighbours within `radius` px count only when their
 * colour is within `threshold` levels, weighted down as the difference grows. Large radii are
 * sampled sparsely to keep the cost bounded.
 */
export function surfaceBlur(pixels: RgbaPixels, radius: number, threshold: number): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const r = Math.max(1, Math.round(radius));
  const stride = Math.max(1, Math.ceil(r / 8));
  const t = Math.max(1, threshold);
  const out = new Uint8ClampedArray(src);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] === 0) continue;
      for (let c = 0; c < 3; c++) {
        const center = src[i + c];
        let sum = 0;
        let weight = 0;
        for (let dy = -r; dy <= r; dy += stride) {
          const sy = y + dy;
          if (sy < 0 || sy >= h) continue;
          for (let dx = -r; dx <= r; dx += stride) {
            const sx = x + dx;
            if (sx < 0 || sx >= w) continue;
            const j = (sy * w + sx) * 4;
            if (src[j + 3] === 0) continue;
            const diff = Math.abs(src[j + c] - center);
            const wgt = 1 - diff / (2.5 * t);
            if (wgt <= 0) continue;
            sum += src[j + c] * wgt;
            weight += wgt;
          }
        }
        out[i + c] = weight > 0 ? sum / weight : center;
      }
    }
  }
  return { ...pixels, data: out };
}

export const BLUR_FILTERS = [
  { id: "average", name: "Average", group: "Blur", parameters: [], apply: (p) => average(p) },
  {
    id: "blur",
    name: "Blur",
    group: "Blur",
    parameters: [],
    apply: (p) => convolve(p, BLUR_KERNEL),
  },
  {
    id: "blur-more",
    name: "Blur More",
    group: "Blur",
    parameters: [],
    apply: (p) => convolve(p, BLUR_MORE_KERNEL),
  },
  {
    id: "box-blur",
    name: "Box Blur",
    group: "Blur",
    parameters: [range("radius", "Radius", 1, 250, 5, "px")],
    apply: (p, v) => boxBlur(p, num(v, "radius")),
  },
  {
    id: "gaussian-blur",
    name: "Gaussian Blur",
    group: "Blur",
    parameters: [range("radius", "Radius", 0.1, 250, 4, "px", 0.1)],
    apply: (p, v) => gaussianBlur(p, num(v, "radius")),
  },
  {
    id: "lens-blur",
    name: "Lens Blur",
    group: "Blur",
    parameters: [
      range("radius", "Radius", 1, 100, 10, "px"),
      range("brightness", "Specular brightness", 0, 100, 0, "%"),
      range("threshold", "Specular threshold", 0, 255, 230, "levels"),
    ],
    apply: (p, v) => lensBlur(p, num(v, "radius"), num(v, "brightness"), num(v, "threshold")),
  },
  {
    id: "motion-blur",
    name: "Motion Blur",
    group: "Blur",
    parameters: [
      range("angle", "Angle", -180, 180, 0, "°"),
      range("distance", "Distance", 1, 200, 20, "px"),
    ],
    apply: (p, v) => motionBlur(p, num(v, "angle"), num(v, "distance")),
  },
  {
    id: "radial-blur",
    name: "Radial Blur",
    group: "Blur",
    parameters: [
      range("amount", "Amount", 1, 100, 10),
      choice("method", "Blur method", ["Spin", "Zoom"]),
      choice("quality", "Quality", ["Draft", "Good", "Best"], 1),
      ...centerParams(),
    ],
    apply: (p, v) =>
      radialBlur(
        p,
        num(v, "amount"),
        num(v, "method") === 1,
        num(v, "cx"),
        num(v, "cy"),
        num(v, "quality"),
      ),
  },
  {
    id: "surface-blur",
    name: "Surface Blur",
    group: "Blur",
    parameters: [
      range("radius", "Radius", 1, 100, 5, "px"),
      range("threshold", "Threshold", 2, 255, 15, "levels"),
    ],
    apply: (p, v) => surfaceBlur(p, num(v, "radius"), num(v, "threshold")),
  },
] as const satisfies readonly FilterDefinition[];
