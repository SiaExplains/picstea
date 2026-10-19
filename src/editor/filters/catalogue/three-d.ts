import type { RgbaPixels } from "../../selection/flood";
import { gaussianBlur, luma } from "../kernels";
import { copyPixels } from "../sampling";
import { num, range, toggle, bool, type FilterDefinition } from "../types";

/** 3D submenu (ADR-0036): texture helpers for 3D work. */

/**
 * Normal Map: treat brightness as height (smoothed by `blur` px) and encode each pixel's
 * surface normal as RGB (tangent-space, +Z up). `invert` flips the height.
 */
export function normalMap(
  pixels: RgbaPixels,
  strength: number,
  blur: number,
  invert: boolean,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const source = blur > 0 ? gaussianBlur(pixels, blur) : pixels;
  const height = new Float32Array(w * h);
  for (let p = 0; p < height.length; p++) {
    const i = p * 4;
    const l = luma(source.data[i], source.data[i + 1], source.data[i + 2]) / 255;
    height[p] = invert ? 1 - l : l;
  }
  const at = (x: number, y: number) =>
    height[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const out = copyPixels(pixels);
  const d = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      d[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      d[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      d[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
    }
  }
  return out;
}

/**
 * Texture Dilation: grow the colours of opaque areas outward into transparent ones by up to
 * `distance` px, so texture seams don't show the background when mip-mapped. Grown pixels are
 * opaque.
 */
export function textureDilation(pixels: RgbaPixels, distance: number): RgbaPixels {
  const { width: w, height: h } = pixels;
  const out = copyPixels(pixels);
  const d = out.data;
  const filled = new Uint8Array(w * h);
  for (let p = 0; p < filled.length; p++) filled[p] = d[p * 4 + 3] > 0 ? 1 : 0;
  let frontier: number[] = [];
  for (let p = 0; p < filled.length; p++) if (!filled[p]) frontier.push(p);
  for (let pass = 0; pass < Math.round(distance) && frontier.length; pass++) {
    const grown: number[] = [];
    const next: number[] = [];
    const colors: number[] = [];
    for (const p of frontier) {
      const x = p % w;
      const y = (p - x) / w;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const sx = x + dx;
          const sy = y + dy;
          if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
          const q = sy * w + sx;
          if (!filled[q]) continue;
          r += d[q * 4];
          g += d[q * 4 + 1];
          b += d[q * 4 + 2];
          n++;
        }
      }
      if (n === 0) next.push(p);
      else {
        grown.push(p);
        colors.push(r / n, g / n, b / n);
      }
    }
    if (grown.length === 0) break;
    grown.forEach((p, k) => {
      d[p * 4] = colors[k * 3];
      d[p * 4 + 1] = colors[k * 3 + 1];
      d[p * 4 + 2] = colors[k * 3 + 2];
      d[p * 4 + 3] = 255;
      filled[p] = 1;
    });
    frontier = next;
  }
  return out;
}

export const THREE_D_FILTERS = [
  {
    id: "normal-map",
    name: "Normal Map",
    group: "3D",
    parameters: [
      range("strength", "Strength", 0.1, 50, 4, undefined, 0.1),
      range("blur", "Blur", 0, 50, 1, "px", 0.1),
      toggle("invert", "Invert height", false),
    ],
    apply: (p, v) => normalMap(p, num(v, "strength"), num(v, "blur"), bool(v, "invert")),
  },
  {
    id: "texture-dilation",
    name: "Texture Dilation",
    group: "3D",
    parameters: [range("distance", "Distance", 1, 256, 16, "px")],
    apply: (p, v) => textureDilation(p, num(v, "distance")),
  },
] as const satisfies readonly FilterDefinition[];
