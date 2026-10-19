import type { RgbaPixels } from "../../selection/flood";
import { motionBlur, unsharpMask } from "../filters";
import { gaussianBlur } from "../kernels";
import { convolve } from "../sampling";
import { lensBlur } from "./blur";
import { choice, num, range, type FilterDefinition } from "../types";

/** Sharpen submenu (ADR-0036). */

const SHARPEN_KERNEL = [0, -1, 0, -1, 8, -1, 0, -1, 0];
const SHARPEN_MORE_KERNEL = [-1, -1, -1, -1, 12, -1, -1, -1, -1];

/** Add `amount`% of (original − blurred) where the difference is at least `threshold` levels. */
export function sharpenFrom(
  pixels: RgbaPixels,
  blurred: Uint8ClampedArray,
  amount: number,
  threshold: number,
): RgbaPixels {
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
 * Smart Sharpen: undo a Gaussian, lens (disc) or motion blur of `radius` px by `amount`%,
 * ignoring differences below a noise floor set by `reduceNoise`%.
 */
export function smartSharpen(
  pixels: RgbaPixels,
  amount: number,
  radius: number,
  reduceNoise: number,
  remove: number,
  angle: number,
): RgbaPixels {
  const blurred =
    remove === 1
      ? lensBlur(pixels, radius, 0, 255).data
      : remove === 2
        ? motionBlur(pixels, angle, Math.max(1, radius * 2)).data
        : gaussianBlur(pixels, radius).data;
  return sharpenFrom(pixels, blurred, amount, (reduceNoise / 100) * 24);
}

export const SHARPEN_FILTERS = [
  {
    id: "sharpen",
    name: "Sharpen",
    group: "Sharpen",
    parameters: [],
    apply: (p) => convolve(p, SHARPEN_KERNEL),
  },
  {
    id: "sharpen-edges",
    name: "Sharpen Edges",
    group: "Sharpen",
    parameters: [],
    apply: (p) => unsharpMask(p, 100, 1, 12),
  },
  {
    id: "sharpen-more",
    name: "Sharpen More",
    group: "Sharpen",
    parameters: [],
    apply: (p) => convolve(p, SHARPEN_MORE_KERNEL),
  },
  {
    id: "smart-sharpen",
    name: "Smart Sharpen",
    group: "Sharpen",
    parameters: [
      range("amount", "Amount", 1, 500, 200, "%"),
      range("radius", "Radius", 0.1, 64, 1, "px", 0.1),
      range("reduceNoise", "Reduce noise", 0, 100, 10, "%"),
      choice("remove", "Remove", ["Gaussian Blur", "Lens Blur", "Motion Blur"], 1),
      range("angle", "Motion angle", -180, 180, 0, "°"),
    ],
    apply: (p, v) =>
      smartSharpen(
        p,
        num(v, "amount"),
        num(v, "radius"),
        num(v, "reduceNoise"),
        num(v, "remove"),
        num(v, "angle"),
      ),
  },
  {
    id: "unsharp-mask",
    name: "Unsharp Mask",
    group: "Sharpen",
    parameters: [
      range("amount", "Amount", 1, 500, 100, "%"),
      range("radius", "Radius", 0.1, 100, 1.5, "px", 0.1),
      range("threshold", "Threshold", 0, 255, 0, "levels"),
    ],
    apply: (p, v) => unsharpMask(p, num(v, "amount"), num(v, "radius"), num(v, "threshold")),
  },
] as const satisfies readonly FilterDefinition[];
