import type { RgbaPixels } from "../selection/flood";

/**
 * Building blocks for the filters (ADR-0014). Blurs work on premultiplied colour so transparent
 * pixels don't bleed dark fringes into their neighbours; everything clamps at the image edges.
 * Buffers are bytes, not floats, to keep peak memory near 3× the layer on 36 MP images.
 */

export function premultiply(src: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3];
    out[i] = (src[i] * a) / 255;
    out[i + 1] = (src[i + 1] * a) / 255;
    out[i + 2] = (src[i + 2] * a) / 255;
    out[i + 3] = a;
  }
  return out;
}

/** Back to straight alpha, in place. */
export function unpremultiply(data: Uint8ClampedArray): Uint8ClampedArray {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0 || a === 255) continue;
    data[i] = (data[i] * 255) / a;
    data[i + 1] = (data[i + 1] * 255) / a;
    data[i + 2] = (data[i + 2] * 255) / a;
  }
  return data;
}

/** One horizontal box-blur pass of radius `r` (window 2r+1), src → dst. */
export function boxBlurH(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  w: number,
  h: number,
  r: number,
): void {
  const size = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let c = 0; c < 4; c++) {
      const first = src[row + c];
      const last = src[row + (w - 1) * 4 + c];
      let sum = first * (r + 1);
      for (let x = 1; x <= r; x++) sum += src[row + Math.min(x, w - 1) * 4 + c];
      for (let x = 0; x < w; x++) {
        dst[row + x * 4 + c] = sum / size;
        const add = x + r + 1;
        const remove = x - r;
        sum +=
          (add < w ? src[row + add * 4 + c] : last) -
          (remove > 0 ? src[row + remove * 4 + c] : first);
      }
    }
  }
}

/** One vertical box-blur pass of radius `r`, src → dst. */
export function boxBlurV(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  w: number,
  h: number,
  r: number,
): void {
  const size = 2 * r + 1;
  const stride = w * 4;
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      const col = x * 4 + c;
      const first = src[col];
      const last = src[(h - 1) * stride + col];
      let sum = first * (r + 1);
      for (let y = 1; y <= r; y++) sum += src[Math.min(y, h - 1) * stride + col];
      for (let y = 0; y < h; y++) {
        dst[y * stride + col] = sum / size;
        const add = y + r + 1;
        const remove = y - r;
        sum +=
          (add < h ? src[add * stride + col] : last) -
          (remove > 0 ? src[remove * stride + col] : first);
      }
    }
  }
}

/** Box radii whose three successive passes approximate a Gaussian of standard deviation `sigma`. */
export function gaussBoxRadii(sigma: number, passes = 3): number[] {
  const ideal = Math.sqrt((12 * sigma * sigma) / passes + 1);
  let wl = Math.floor(ideal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const m = Math.round(
    (12 * sigma * sigma - passes * wl * wl - 4 * passes * wl - 3 * passes) / (-4 * wl - 4),
  );
  return Array.from({ length: passes }, (_, i) => ((i < m ? wl : wu) - 1) / 2);
}

/** Box-blur premultiplied pixels in place with the given radii (H then V per radius). */
export function boxBlurPasses(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  radii: readonly number[],
): Uint8ClampedArray {
  const tmp = new Uint8ClampedArray(data.length);
  for (const r of radii) {
    if (r < 1) continue;
    boxBlurH(data, tmp, w, h, r);
    boxBlurV(tmp, data, w, h, r);
  }
  return data;
}

/** Gaussian blur of straight RGBA pixels; returns new pixels. */
export function gaussianBlur(pixels: RgbaPixels, sigma: number): RgbaPixels {
  const { width, height } = pixels;
  const data = premultiply(pixels.data);
  if (sigma > 0) boxBlurPasses(data, width, height, gaussBoxRadii(sigma));
  return { width, height, data: unpremultiply(data) };
}

export const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Deterministic PRNG (mulberry32), so a filter with the same seed gives the same pixels. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mix filtered pixels into the originals by a per-pixel coverage (0 keeps the original, 255
 * takes the filtered pixel): how a filter respects a feathered selection. Returns new pixels.
 */
export function blendByCoverage(
  original: Uint8ClampedArray,
  filtered: Uint8ClampedArray,
  coverage: Uint8Array,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(original.length);
  for (let p = 0; p < coverage.length; p++) {
    const c = coverage[p];
    const i = p * 4;
    if (c === 0) {
      out[i] = original[i];
      out[i + 1] = original[i + 1];
      out[i + 2] = original[i + 2];
      out[i + 3] = original[i + 3];
    } else if (c === 255) {
      out[i] = filtered[i];
      out[i + 1] = filtered[i + 1];
      out[i + 2] = filtered[i + 2];
      out[i + 3] = filtered[i + 3];
    } else {
      const t = c / 255;
      out[i] = original[i] + (filtered[i] - original[i]) * t;
      out[i + 1] = original[i + 1] + (filtered[i + 1] - original[i + 1]) * t;
      out[i + 2] = original[i + 2] + (filtered[i + 2] - original[i + 2]) * t;
      out[i + 3] = original[i + 3] + (filtered[i + 3] - original[i + 3]) * t;
    }
  }
  return out;
}
