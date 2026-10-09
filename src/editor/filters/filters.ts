import type { RgbaPixels } from "../selection/flood";
import {
  boxBlurPasses,
  gaussianBlur,
  luma,
  premultiply,
  seededRandom,
  unpremultiply,
} from "./kernels";

/**
 * Pure filter functions on straight RGBA pixels (ADR-0014). Each returns new pixels and leaves
 * its input untouched, so the editor can keep the original for Cancel and selection blending.
 */

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const copy = (p: RgbaPixels): RgbaPixels => ({ ...p, data: new Uint8ClampedArray(p.data) });

/** One box-blur pass (H + V) of the given radius. */
export function boxBlur(pixels: RgbaPixels, radius: number): RgbaPixels {
  const { width, height } = pixels;
  const data = premultiply(pixels.data);
  boxBlurPasses(data, width, height, [Math.round(radius)]);
  return { width, height, data: unpremultiply(data) };
}

export { gaussianBlur };

/** Average of samples along a line through each pixel: `angle` in degrees, `distance` in px. */
export function motionBlur(pixels: RgbaPixels, angle: number, distance: number): RgbaPixels {
  const { width: w, height: h } = pixels;
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  const samples = Math.max(1, Math.min(64, Math.round(distance) + 1));
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = -Math.sin(rad);
  const offsets: number[] = [];
  for (let s = 0; s < samples; s++) {
    const t = samples === 1 ? 0 : (s / (samples - 1) - 0.5) * distance;
    offsets.push(Math.round(t * dx), Math.round(t * dy));
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let s = 0; s < offsets.length; s += 2) {
        const sx = Math.min(w - 1, Math.max(0, x + offsets[s]));
        const sy = Math.min(h - 1, Math.max(0, y + offsets[s + 1]));
        const i = (sy * w + sx) * 4;
        r += src[i];
        g += src[i + 1];
        b += src[i + 2];
        a += src[i + 3];
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
 * Unsharp mask: add `amount`% of the difference from a Gaussian blur of `radius`, where that
 * difference is at least `threshold` levels (protects smooth areas from noise).
 */
export function unsharpMask(
  pixels: RgbaPixels,
  amount: number,
  radius: number,
  threshold: number,
): RgbaPixels {
  const blurred = gaussianBlur(pixels, radius).data;
  const src = pixels.data;
  const out = new Uint8ClampedArray(src);
  const k = amount / 100;
  for (let i = 0; i < src.length; i += 4) {
    if (src[i + 3] === 0) continue;
    for (let c = 0; c < 3; c++) {
      const diff = src[i + c] - blurred[i + c];
      if (Math.abs(diff) >= threshold) out[i + c] = src[i + c] + diff * k;
    }
  }
  return { ...pixels, data: out };
}

/**
 * Add noise of up to `amount`% (of full range): uniform or Gaussian, per channel or the same for
 * all three (monochromatic). Deterministic for a given seed.
 */
export function addNoise(
  pixels: RgbaPixels,
  amount: number,
  gaussian: boolean,
  monochromatic: boolean,
  seed: number,
): RgbaPixels {
  const out = copy(pixels);
  const d = out.data;
  const random = seededRandom(seed);
  const scale = (amount / 100) * 255;
  const sample = gaussian
    ? () => {
        // Box–Muller; σ = scale / 2 so most values fall within ±amount.
        const u = 1 - random();
        const v = random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * (scale / 2);
      }
    : () => (random() * 2 - 1) * scale;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    if (monochromatic) {
      const n = sample();
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    } else {
      d[i] += sample();
      d[i + 1] += sample();
      d[i + 2] += sample();
    }
  }
  return out;
}

/** Mosaic: every `size`×`size` cell becomes its average colour. */
export function pixelate(pixels: RgbaPixels, size: number): RgbaPixels {
  const { width: w, height: h } = pixels;
  const cell = Math.max(1, Math.round(size));
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  for (let cy = 0; cy < h; cy += cell) {
    for (let cx = 0; cx < w; cx += cell) {
      const x1 = Math.min(w, cx + cell);
      const y1 = Math.min(h, cy + cell);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let y = cy; y < y1; y++) {
        for (let x = cx; x < x1; x++) {
          const i = (y * w + x) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          a += src[i + 3];
        }
      }
      const n = (x1 - cx) * (y1 - cy);
      for (let y = cy; y < y1; y++) {
        for (let x = cx; x < x1; x++) {
          const i = (y * w + x) * 4;
          out[i] = r / n;
          out[i + 1] = g / n;
          out[i + 2] = b / n;
          out[i + 3] = a / n;
        }
      }
    }
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

function lumaPlane(pixels: RgbaPixels): Float32Array {
  const { data } = pixels;
  const plane = new Float32Array(pixels.width * pixels.height);
  for (let p = 0; p < plane.length; p++) {
    const i = p * 4;
    plane[p] = luma(data[i], data[i + 1], data[i + 2]);
  }
  return plane;
}

/**
 * Emboss: grey relief lit from `angle` degrees, comparing pixels `height` px apart, scaled by
 * `amount`%. Alpha is kept.
 */
export function emboss(
  pixels: RgbaPixels,
  angle: number,
  height: number,
  amount: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const plane = lumaPlane(pixels);
  const rad = (angle * Math.PI) / 180;
  const dx = Math.round(Math.cos(rad) * height);
  const dy = Math.round(-Math.sin(rad) * height);
  const k = amount / 100;
  const out = new Uint8ClampedArray(pixels.data);
  const at = (x: number, y: number) =>
    plane[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = clamp255(128 + (at(x + dx, y + dy) - at(x - dx, y - dy)) * k);
      const i = (y * w + x) * 4;
      out[i] = out[i + 1] = out[i + 2] = v;
    }
  }
  return { width: w, height: h, data: out };
}

/**
 * Find Edges: Sobel gradient per colour channel, inverted so edges are dark lines on white (as
 * in other editors). Alpha is kept.
 */
export function findEdges(pixels: RgbaPixels): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const out = new Uint8ClampedArray(src);
  const at = (x: number, y: number, c: number) =>
    src[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4 + c];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const gx =
          at(x + 1, y - 1, c) +
          2 * at(x + 1, y, c) +
          at(x + 1, y + 1, c) -
          at(x - 1, y - 1, c) -
          2 * at(x - 1, y, c) -
          at(x - 1, y + 1, c);
        const gy =
          at(x - 1, y + 1, c) +
          2 * at(x, y + 1, c) +
          at(x + 1, y + 1, c) -
          at(x - 1, y - 1, c) -
          2 * at(x, y - 1, c) -
          at(x + 1, y - 1, c);
        out[i + c] = 255 - clamp255(Math.hypot(gx, gy) / 4);
      }
    }
  }
  return { width: w, height: h, data: out };
}
