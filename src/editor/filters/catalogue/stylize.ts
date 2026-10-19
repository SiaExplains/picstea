import type { RgbaPixels } from "../../selection/flood";
import { emboss, findEdges } from "../filters";
import { luma, premultiply, seededRandom, unpremultiply } from "../kernels";
import { clamp255, copyPixels, sampleBilinear } from "../sampling";
import { choice, num, range, toggle, bool, type FilterDefinition } from "../types";

/** Stylize submenu (ADR-0036). */

/**
 * Diffuse: each pixel takes a random neighbour's colour (within 2 px). Darken/Lighten only
 * keep the change when it is darker/lighter; Anisotropic prefers neighbours of similar colour.
 */
export function diffuse(pixels: RgbaPixels, mode: number, seed: number): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const random = seededRandom(seed);
  const out = copyPixels(pixels);
  const d = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let best = -1;
      const tries = mode === 3 ? 4 : 1;
      let bestDiff = Infinity;
      for (let t = 0; t < tries; t++) {
        const sx = Math.min(w - 1, Math.max(0, x + Math.round((random() - 0.5) * 4)));
        const sy = Math.min(h - 1, Math.max(0, y + Math.round((random() - 0.5) * 4)));
        const j = (sy * w + sx) * 4;
        const diff = Math.abs(
          luma(src[j], src[j + 1], src[j + 2]) - luma(src[i], src[i + 1], src[i + 2]),
        );
        if (diff < bestDiff) {
          bestDiff = diff;
          best = j;
        }
      }
      const lumaNew = luma(src[best], src[best + 1], src[best + 2]);
      const lumaOld = luma(src[i], src[i + 1], src[i + 2]);
      if (mode === 1 && lumaNew >= lumaOld) continue;
      if (mode === 2 && lumaNew <= lumaOld) continue;
      for (let c = 0; c < 4; c++) d[i + c] = src[best + c];
    }
  }
  return out;
}

/**
 * Oil Paint: within `radius` px, pick the most common brightness level (out of `levels`) and
 * paint the average colour of the pixels at that level, which flattens areas into strokes.
 * With lighting, the strokes get relief lit from `angle`°, `shine` strong.
 */
export function oilPaint(
  pixels: RgbaPixels,
  radius: number,
  levels: number,
  lighting: boolean,
  angle: number,
  shine: number,
): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const r = Math.max(1, Math.round(radius));
  const n = Math.max(2, Math.round(levels));
  const level = new Uint8Array(w * h);
  for (let p = 0; p < level.length; p++) {
    const i = p * 4;
    level[p] = Math.min(n - 1, Math.floor((luma(src[i], src[i + 1], src[i + 2]) / 256) * n));
  }
  const count = new Uint32Array(n);
  const sum = new Float64Array(n * 3);
  const out = new Uint8ClampedArray(src);
  const step = Math.max(1, Math.floor(r / 6));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (src[o + 3] === 0) continue;
      count.fill(0);
      sum.fill(0);
      for (let dy = -r; dy <= r; dy += step) {
        const sy = y + dy;
        if (sy < 0 || sy >= h) continue;
        for (let dx = -r; dx <= r; dx += step) {
          const sx = x + dx;
          if (sx < 0 || sx >= w || dx * dx + dy * dy > r * r) continue;
          const p = sy * w + sx;
          const l = level[p];
          count[l]++;
          sum[l * 3] += src[p * 4];
          sum[l * 3 + 1] += src[p * 4 + 1];
          sum[l * 3 + 2] += src[p * 4 + 2];
        }
      }
      let best = 0;
      for (let l = 1; l < n; l++) if (count[l] > count[best]) best = l;
      const c = count[best] || 1;
      out[o] = sum[best * 3] / c;
      out[o + 1] = sum[best * 3 + 1] / c;
      out[o + 2] = sum[best * 3 + 2] / c;
    }
  }
  if (!lighting || shine === 0) return { width: w, height: h, data: out };
  const relief = emboss(
    { width: w, height: h, data: out },
    angle,
    Math.max(1, Math.round(r / 3)),
    100,
  ).data;
  const k = shine / 10;
  for (let i = 0; i < out.length; i += 4) {
    const light = (relief[i] - 128) * k;
    out[i] = clamp255(out[i] + light);
    out[i + 1] = clamp255(out[i + 1] + light);
    out[i + 2] = clamp255(out[i + 2] + light);
  }
  return { width: w, height: h, data: out };
}

/** Solarize: invert every channel above mid-grey, like overexposed film. */
export function solarize(pixels: RgbaPixels): RgbaPixels {
  const out = copyPixels(pixels);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) if (d[i + c] > 127) d[i + c] = 255 - d[i + c];
  }
  return out;
}

/**
 * Trace Contour: per channel, a thin dark line where it crosses `level`, white elsewhere;
 * Upper outlines the side above the level, Lower the side below.
 */
export function traceContour(pixels: RgbaPixels, level: number, upper: boolean): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const out = copyPixels(pixels);
  const d = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const right = (y * w + Math.min(w - 1, x + 1)) * 4;
      const down = (Math.min(h - 1, y + 1) * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v = src[i + c];
        const inside = upper ? v > level : v < level;
        const crosses =
          inside &&
          (upper
            ? src[right + c] <= level || src[down + c] <= level
            : src[right + c] >= level || src[down + c] >= level);
        d[i + c] = crosses ? 0 : 255;
      }
    }
  }
  return out;
}

/**
 * Wind: bright pixels leave streaks in the wind's direction. Wind, Blast (longer, stronger)
 * or Stagger (sparse, uneven); from the left or the right. Seeded.
 */
export function wind(
  pixels: RgbaPixels,
  method: number,
  fromLeft: boolean,
  seed: number,
): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const random = seededRandom(seed);
  const out = copyPixels(pixels);
  const d = out.data;
  const maxLength = [12, 40, 20][method] ?? 12;
  const startChance = method === 2 ? 0.08 : 1;
  for (let y = 0; y < h; y++) {
    let trail = [0, 0, 0];
    let strength = 0;
    let decay = 0;
    for (let k = 0; k < w; k++) {
      const x = fromLeft ? k : w - 1 - k;
      const i = (y * w + x) * 4;
      const l = luma(src[i], src[i + 1], src[i + 2]);
      const trailLuma = luma(trail[0], trail[1], trail[2]) * strength;
      if (l > trailLuma + 8 && random() < startChance) {
        trail = [src[i], src[i + 1], src[i + 2]];
        strength = 1;
        decay = 1 / Math.max(2, maxLength * (0.4 + random() * 0.6));
        continue;
      }
      if (strength <= 0) continue;
      const s = method === 1 ? Math.min(1, strength * 1.3) : strength;
      for (let c = 0; c < 3; c++)
        d[i + c] = Math.max(src[i + c], src[i + c] + (trail[c] - src[i + c]) * s);
      strength -= decay;
    }
  }
  return out;
}

/**
 * Chromatic Aberration: shift the red and blue channels apart by `amount` px, radially from
 * the middle (as a lens does) or linearly at `angle`°.
 */
export function chromaticAberration(
  pixels: RgbaPixels,
  amount: number,
  radial: boolean,
  angle: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const norm = Math.max(1, Math.hypot(cx, cy));
  const rad = (angle * Math.PI) / 180;
  const tmp = new Float32Array(4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ox: number;
      let oy: number;
      if (radial) {
        ox = ((x - cx) / norm) * amount;
        oy = ((y - cy) / norm) * amount;
      } else {
        ox = Math.cos(rad) * amount;
        oy = -Math.sin(rad) * amount;
      }
      const o = (y * w + x) * 4;
      sampleBilinear(src, w, h, x - ox, y - oy, tmp, 0, "clamp");
      const red = tmp[0];
      const ra = tmp[3];
      sampleBilinear(src, w, h, x + ox, y + oy, tmp, 0, "clamp");
      const blue = tmp[2];
      const ba = tmp[3];
      out[o] = red;
      out[o + 1] = src[o + 1];
      out[o + 2] = blue;
      out[o + 3] = Math.max(src[o + 3], ra, ba);
    }
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

export const STYLIZE_FILTERS = [
  {
    id: "diffuse",
    name: "Diffuse",
    group: "Stylize",
    parameters: [choice("mode", "Mode", ["Normal", "Darken only", "Lighten only", "Anisotropic"])],
    apply: (p, v, ctx) => diffuse(p, num(v, "mode"), ctx.seed),
  },
  {
    id: "emboss",
    name: "Emboss",
    group: "Stylize",
    parameters: [
      range("angle", "Angle", -180, 180, 135, "°"),
      range("height", "Height", 1, 10, 3, "px"),
      range("amount", "Amount", 1, 500, 100, "%"),
    ],
    apply: (p, v) => emboss(p, num(v, "angle"), num(v, "height"), num(v, "amount")),
  },
  {
    id: "find-edges",
    name: "Find Edges",
    group: "Stylize",
    parameters: [],
    apply: (p) => findEdges(p),
  },
  {
    id: "oil-paint",
    name: "Oil Paint",
    group: "Stylize",
    parameters: [
      range("radius", "Stylization", 1, 20, 4, "px"),
      range("levels", "Cleanliness", 4, 64, 20),
      toggle("lighting", "Lighting", true),
      range("angle", "Light angle", -180, 180, -60, "°"),
      range("shine", "Shine", 0, 10, 1.3, undefined, 0.1),
    ],
    apply: (p, v) =>
      oilPaint(
        p,
        num(v, "radius"),
        num(v, "levels"),
        bool(v, "lighting"),
        num(v, "angle"),
        num(v, "shine"),
      ),
  },
  { id: "solarize", name: "Solarize", group: "Stylize", parameters: [], apply: (p) => solarize(p) },
  {
    id: "trace-contour",
    name: "Trace Contour",
    group: "Stylize",
    parameters: [
      range("level", "Level", 0, 255, 128),
      choice("edge", "Edge", ["Lower", "Upper"], 1),
    ],
    apply: (p, v) => traceContour(p, num(v, "level"), num(v, "edge") === 1),
  },
  {
    id: "wind",
    name: "Wind",
    group: "Stylize",
    parameters: [
      choice("method", "Method", ["Wind", "Blast", "Stagger"]),
      choice("direction", "Direction", ["From the right", "From the left"]),
    ],
    apply: (p, v, ctx) => wind(p, num(v, "method"), num(v, "direction") === 1, ctx.seed),
  },
  {
    id: "chromatic-aberration",
    name: "Chromatic Aberration",
    group: "Stylize",
    parameters: [
      range("amount", "Amount", 0, 100, 4, "px", 0.5),
      choice("mode", "Mode", ["Radial", "Linear"]),
      range("angle", "Angle", -180, 180, 0, "°"),
    ],
    apply: (p, v) =>
      chromaticAberration(p, num(v, "amount"), num(v, "mode") === 0, num(v, "angle")),
  },
] as const satisfies readonly FilterDefinition[];
