import type { RgbaPixels } from "../../selection/flood";
import { addNoise, findEdges } from "../filters";
import { gaussianBlur, luma, premultiply, unpremultiply } from "../kernels";
import { clamp01, clamp255, copyPixels, fractalNoise, sampleBilinear } from "../sampling";
import { median } from "./noise";
import { oilPaint } from "./stylize";
import { choice, num, range, type FilterDefinition } from "../types";

/**
 * The filters above the submenus (ADR-0036): Filter Gallery, Lens Correction and Camera Raw.
 * Liquify and Vanishing Point sit beside them in the menu but are interactive editors with
 * their own dialogs (`../liquify.ts`, `../vanishing-point.ts`), not catalogue entries.
 */

function posterize(data: Uint8ClampedArray, levels: number): void {
  const n = Math.max(2, Math.round(levels)) - 1;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) data[i + c] = Math.round((data[i + c] / 255) * n) * (255 / n);
  }
}

/** Edge darkness 0–1 per pixel (from Find Edges). */
function edgeStrength(pixels: RgbaPixels): Float32Array {
  const edges = findEdges(pixels).data;
  const out = new Float32Array(pixels.width * pixels.height);
  for (let p = 0; p < out.length; p++) {
    const i = p * 4;
    out[p] = 1 - luma(edges[i], edges[i + 1], edges[i + 2]) / 255;
  }
  return out;
}

export const GALLERY_EFFECTS = [
  "Cutout",
  "Dry Brush",
  "Poster Edges",
  "Watercolor",
  "Ink Outlines",
  "Glowing Edges",
  "Film Grain",
  "Sponge",
] as const;

/**
 * Filter Gallery: artistic effects. Each uses three shared settings — brush size (px),
 * detail (0–10) and intensity (0–100) — the way Photoshop's gallery gives every effect a few
 * sliders. Seeded where random.
 */
export function filterGallery(
  pixels: RgbaPixels,
  effect: number,
  size: number,
  detail: number,
  intensity: number,
  seed: number,
): RgbaPixels {
  const k = intensity / 100;
  switch (effect) {
    case 0: {
      const out = median(gaussianBlur(pixels, Math.max(0.1, size / 2)), 1);
      posterize(out.data, 2 + Math.round(detail * 0.6));
      return out;
    }
    case 1: {
      const out = oilPaint(pixels, Math.max(1, size), 6 + detail * 2, false, 0, 0);
      posterize(out.data, 6 + Math.round(detail));
      return out;
    }
    case 2: {
      const out = copyPixels(pixels);
      posterize(out.data, 2 + Math.round(detail * 0.6));
      const edges = edgeStrength(gaussianBlur(pixels, Math.max(0.1, size / 4)));
      for (let p = 0; p < edges.length; p++) {
        const dark = clamp01(edges[p] * 3 * k);
        for (let c = 0; c < 3; c++) out.data[p * 4 + c] *= 1 - dark;
      }
      return out;
    }
    case 3: {
      const smooth = gaussianBlur(median(pixels, Math.max(1, Math.round(size / 2))), 1);
      const edges = edgeStrength(smooth);
      const d = smooth.data;
      for (let p = 0; p < edges.length; p++) {
        const dark = clamp01(edges[p] * 2.5 * k);
        for (let c = 0; c < 3; c++)
          d[p * 4 + c] = clamp255(d[p * 4 + c] * (1 - dark) + (detail - 5) * 3);
      }
      return smooth;
    }
    case 4: {
      const out = copyPixels(pixels);
      const edges = edgeStrength(gaussianBlur(pixels, Math.max(0.1, (10 - detail) / 5)));
      for (let p = 0; p < edges.length; p++) {
        const dark = clamp01(edges[p] * (2 + size / 2) * k);
        for (let c = 0; c < 3; c++) out.data[p * 4 + c] *= 1 - dark;
      }
      return out;
    }
    case 5: {
      const out = copyPixels(pixels);
      const edges = findEdges(gaussianBlur(pixels, Math.max(0.1, (10 - detail) / 5))).data;
      const d = out.data;
      for (let i = 0; i < d.length; i += 4) {
        for (let c = 0; c < 3; c++) d[i + c] = clamp255((255 - edges[i + c]) * (1 + k * 3));
      }
      if (size <= 1) return out;
      const glow = gaussianBlur(out, size / 2).data;
      for (let i = 0; i < d.length; i += 4) {
        for (let c = 0; c < 3; c++) d[i + c] = clamp255(Math.max(d[i + c], glow[i + c] * 1.5));
      }
      return out;
    }
    case 6: {
      const grainy = addNoise(pixels, k * 25, true, true, seed);
      const d = grainy.data;
      for (let i = 0; i < d.length; i += 4) {
        const l = luma(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]) / 255;
        const lift = Math.max(0, l - 0.6) * detail * 10;
        for (let c = 0; c < 3; c++) d[i + c] = clamp255(d[i + c] + lift);
      }
      return grainy;
    }
    default: {
      const { width: w, height: h } = pixels;
      const noise = fractalNoise(w, h, Math.max(2, size * 3), seed, 3);
      const out = gaussianBlur(pixels, Math.max(0.1, size / 4));
      const d = out.data;
      for (let p = 0; p < noise.length; p++) {
        const sponge = 1 - Math.pow(noise[p], 3 - detail / 5) * k;
        for (let c = 0; c < 3; c++) d[p * 4 + c] *= sponge;
      }
      return out;
    }
  }
}

/**
 * Lens Correction: undo or add barrel/pincushion distortion, fix red/cyan and blue/yellow
 * fringes by scaling those channels slightly, add or remove a vignette, rotate and scale.
 * Areas uncovered by the correction become transparent.
 */
export function lensCorrection(
  pixels: RgbaPixels,
  distortion: number,
  redCyan: number,
  blueYellow: number,
  vignette: number,
  midpoint: number,
  angle: number,
  scale: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const norm = Math.max(1, Math.hypot(cx, cy));
  const kd = -(distortion / 100) * 0.5;
  const channelScale = [1 + redCyan / 2000, 1, 1 + blueYellow / 2000];
  const rad = (-angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const s = 100 / Math.max(1, scale);
  const mid = midpoint / 100;
  const tmp = new Float32Array(4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = ((x - cx) * cos - (y - cy) * sin) * s;
      const dy = ((x - cx) * sin + (y - cy) * cos) * s;
      const r2 = (dx * dx + dy * dy) / (norm * norm);
      const f = 1 + kd * r2;
      const o = (y * w + x) * 4;
      let alpha = 0;
      for (let c = 0; c < 3; c++) {
        const g = f * channelScale[c];
        sampleBilinear(src, w, h, cx + dx * g, cy + dy * g, tmp, 0, "transparent");
        out[o + c] = tmp[c];
        if (c === 1) alpha = tmp[3];
      }
      out[o + 3] = alpha;
      if (vignette !== 0) {
        const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / norm;
        const t = clamp01((r - mid * 0.8) / (1.2 - mid * 0.8));
        const gain = 1 + (vignette / 100) * t * t;
        for (let c = 0; c < 3; c++) out[o + c] = Math.min(out[o + 3], out[o + c] * gain);
      }
    }
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

export interface CameraRawSettings {
  readonly temperature: number;
  readonly tint: number;
  readonly exposure: number;
  readonly contrast: number;
  readonly highlights: number;
  readonly shadows: number;
  readonly whites: number;
  readonly blacks: number;
  readonly clarity: number;
  readonly dehaze: number;
  readonly vibrance: number;
  readonly saturation: number;
}

/**
 * Camera Raw (Basic panel): white balance, exposure, contrast, highlights, shadows, whites,
 * blacks, clarity, dehaze, vibrance and saturation, applied in that order on 0–1 colour.
 * Clarity's radius is relative to the layer, so a reduced preview matches the result.
 */
export function cameraRaw(pixels: RgbaPixels, s: CameraRawSettings): RgbaPixels {
  const { width: w, height: h } = pixels;
  const src = pixels.data;
  const blurred =
    s.clarity !== 0 ? gaussianBlur(pixels, Math.max(1, Math.min(w, h) / 50)).data : null;
  const out = new Uint8ClampedArray(src);
  const gain = Math.pow(2, s.exposure);
  const wb = [1 + s.temperature / 250, 1 - s.tint / 250, 1 - s.temperature / 250];
  const haze = s.dehaze / 100;
  const contrast = 1 + s.contrast / 100;
  for (let i = 0; i < src.length; i += 4) {
    if (src[i + 3] === 0) continue;
    let r = (src[i] / 255) * wb[0] * gain;
    let g = (src[i + 1] / 255) * wb[1] * gain;
    let b = (src[i + 2] / 255) * wb[2] * gain;
    if (haze > 0) {
      const d = haze * 0.35;
      r = (r - d) / (1 - d);
      g = (g - d) / (1 - d);
      b = (b - d) / (1 - d);
    } else if (haze < 0) {
      const d = -haze * 0.35;
      r = r * (1 - d) + d;
      g = g * (1 - d) + d;
      b = b * (1 - d) + d;
    }
    r = (r - 0.5) * contrast + 0.5;
    g = (g - 0.5) * contrast + 0.5;
    b = (b - 0.5) * contrast + 0.5;
    const l = clamp01(luma(r, g, b));
    let delta =
      (s.shadows / 100) * 0.5 * (1 - l) * (1 - l) * l * 2 +
      (s.highlights / 100) * 0.5 * l * l * (1 - l) * 2 +
      (s.whites / 100) * 0.25 * l ** 4 +
      (s.blacks / 100) * 0.25 * (1 - l) ** 4;
    if (blurred) {
      const lb = luma(blurred[i], blurred[i + 1], blurred[i + 2]) / 255;
      delta += (s.clarity / 100) * (l - lb) * 4 * l * (1 - l) * 2;
    }
    r += delta;
    g += delta;
    b += delta;
    if (s.vibrance !== 0 || s.saturation !== 0) {
      const y = luma(r, g, b);
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const k = 1 + s.saturation / 100 + (s.vibrance / 100) * (1 - clamp01(sat * 1.5));
      r = y + (r - y) * k;
      g = y + (g - y) * k;
      b = y + (b - y) * k;
    }
    out[i] = r * 255;
    out[i + 1] = g * 255;
    out[i + 2] = b * 255;
  }
  return { ...pixels, data: out };
}

export const TOP_FILTERS = [
  {
    id: "filter-gallery",
    name: "Filter Gallery",
    group: "Top",
    parameters: [
      choice("effect", "Effect", GALLERY_EFFECTS),
      range("size", "Brush size", 1, 20, 4, "px"),
      range("detail", "Detail", 0, 10, 5),
      range("intensity", "Intensity", 0, 100, 50, "%"),
    ],
    apply: (p, v, ctx) =>
      filterGallery(
        p,
        num(v, "effect"),
        num(v, "size"),
        num(v, "detail"),
        num(v, "intensity"),
        ctx.seed,
      ),
  },
  {
    id: "lens-correction",
    name: "Lens Correction",
    group: "Top",
    parameters: [
      range("distortion", "Remove distortion", -100, 100, 0),
      range("redCyan", "Fix red/cyan fringe", -100, 100, 0),
      range("blueYellow", "Fix blue/yellow fringe", -100, 100, 0),
      range("vignette", "Vignette amount", -100, 100, 0),
      range("midpoint", "Vignette midpoint", 0, 100, 50),
      range("angle", "Angle", -180, 180, 0, "°", 0.1),
      range("scale", "Scale", 50, 200, 100, "%"),
    ],
    apply: (p, v) =>
      lensCorrection(
        p,
        num(v, "distortion"),
        num(v, "redCyan"),
        num(v, "blueYellow"),
        num(v, "vignette"),
        num(v, "midpoint"),
        num(v, "angle"),
        num(v, "scale"),
      ),
  },
  {
    id: "camera-raw",
    name: "Camera Raw",
    group: "Top",
    parameters: [
      range("temperature", "Temperature", -100, 100, 0),
      range("tint", "Tint", -100, 100, 0),
      range("exposure", "Exposure", -5, 5, 0, "EV", 0.05),
      range("contrast", "Contrast", -100, 100, 0),
      range("highlights", "Highlights", -100, 100, 0),
      range("shadows", "Shadows", -100, 100, 0),
      range("whites", "Whites", -100, 100, 0),
      range("blacks", "Blacks", -100, 100, 0),
      range("clarity", "Clarity", -100, 100, 0),
      range("dehaze", "Dehaze", -100, 100, 0),
      range("vibrance", "Vibrance", -100, 100, 0),
      range("saturation", "Saturation", -100, 100, 0),
    ],
    apply: (p, v) =>
      cameraRaw(p, {
        temperature: num(v, "temperature"),
        tint: num(v, "tint"),
        exposure: num(v, "exposure"),
        contrast: num(v, "contrast"),
        highlights: num(v, "highlights"),
        shadows: num(v, "shadows"),
        whites: num(v, "whites"),
        blacks: num(v, "blacks"),
        clarity: num(v, "clarity"),
        dehaze: num(v, "dehaze"),
        vibrance: num(v, "vibrance"),
        saturation: num(v, "saturation"),
      }),
  },
] as const satisfies readonly FilterDefinition[];
