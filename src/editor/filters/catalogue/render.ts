import type { RgbaPixels } from "../../selection/flood";
import { seededRandom } from "../kernels";
import { centerOf, clamp01, clamp255, copyPixels, fractalNoise } from "../sampling";
import { choice, num, range, type FilterDefinition } from "../types";

/**
 * Render submenu (ADR-0036). Photoshop renders clouds and fibers between the foreground and
 * background colours; Picstea uses its default black and white so a filter stays a pure
 * function of its settings (smart filters, Last Filter and actions replay it exactly).
 */

/** Clouds: soft fractal noise, `scale` px for the largest feature. The layer becomes opaque. */
export function clouds(pixels: RgbaPixels, scale: number, seed: number): RgbaPixels {
  const { width: w, height: h } = pixels;
  const noise = fractalNoise(w, h, scale, seed);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < noise.length; p++) {
    const v = clamp255((noise[p] - 0.5) * 1.6 * 255 + 128);
    out[p * 4] = out[p * 4 + 1] = out[p * 4 + 2] = v;
    out[p * 4 + 3] = 255;
  }
  return { width: w, height: h, data: out };
}

/** Difference Clouds: the difference between the layer and clouds. Alpha is kept. */
export function differenceClouds(pixels: RgbaPixels, scale: number, seed: number): RgbaPixels {
  const cloud = clouds(pixels, scale, seed).data;
  const out = copyPixels(pixels);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.abs(d[i] - cloud[i]);
    d[i + 1] = Math.abs(d[i + 1] - cloud[i + 1]);
    d[i + 2] = Math.abs(d[i + 2] - cloud[i + 2]);
  }
  return out;
}

/**
 * Fibers: vertical strands. `variance` sets how quickly a strand's shade changes across
 * columns, `strength` how long the strands are. The layer becomes opaque. Seeded.
 */
export function fibers(
  pixels: RgbaPixels,
  variance: number,
  strength: number,
  seed: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const random = seededRandom(seed);
  const raw = new Float32Array(w * h);
  for (let i = 0; i < raw.length; i++) raw[i] = random();
  // Smooth across columns by variance, along rows (down) by strength.
  const across = Math.max(0, Math.round(16 / Math.max(1, variance)));
  const along = Math.max(1, Math.round(strength * 4));
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let k = -across; k <= across; k++) {
        const sx = x + k;
        if (sx < 0 || sx >= w) continue;
        s += raw[y * w + sx];
        n++;
      }
      tmp[y * w + x] = s / n;
    }
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let x = 0; x < w; x++) {
    let s = 0;
    let n = 0;
    for (let y = 0; y < Math.min(h, along); y++) {
      s += tmp[y * w + x];
      n++;
    }
    for (let y = 0; y < h; y++) {
      const add = y + along;
      const remove = y - along - 1;
      if (add < h) {
        s += tmp[add * w + x];
        n++;
      }
      if (remove >= 0) {
        s -= tmp[remove * w + x];
        n--;
      }
      const v = clamp255((s / n - 0.5) * (2 + Math.sqrt(along)) * 255 + 128);
      const o = (y * w + x) * 4;
      out[o] = out[o + 1] = out[o + 2] = v;
      out[o + 3] = 255;
    }
  }
  return { width: w, height: h, data: out };
}

/**
 * Lens Flare: a bright glow, a halo ring and a row of coloured ghosts along the line through
 * the layer's middle, added on top. `brightness` 10–300%; lens type changes ring and ghosts.
 */
export function lensFlare(
  pixels: RgbaPixels,
  brightness: number,
  cxPercent: number,
  cyPercent: number,
  lens: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const { cx, cy } = centerOf(w, h, cxPercent, cyPercent);
  const size = Math.hypot(w, h);
  const k = brightness / 100;
  const mx = (w - 1) / 2;
  const my = (h - 1) / 2;
  const ghosts = [
    { t: 0.5, r: 0.02, color: [120, 255, 160] },
    { t: 0.8, r: 0.05, color: [255, 160, 90] },
    { t: 1.1, r: 0.015, color: [140, 180, 255] },
    { t: 1.4, r: 0.08, color: [120, 150, 255] },
    { t: 1.7, r: 0.03, color: [255, 120, 200] },
  ].slice(0, lens === 2 ? 3 : 5);
  const ringR = [0.12, 0.09, 0.15, 0.07][lens] ?? 0.12;
  const out = copyPixels(pixels);
  const d = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot(x - cx, y - cy) / size;
      const glow = Math.exp(-dist * 40) * 1.2 + Math.exp(-dist * 8) * 0.25;
      const ring = Math.exp(-(((dist - ringR) / 0.006) ** 2)) * 0.25;
      let gr = (glow + ring * 0.9) * 255;
      let gg = (glow + ring * 0.6) * 245;
      let gb = (glow + ring) * 225;
      for (const g of ghosts) {
        const gx = cx + (mx - cx) * 2 * g.t;
        const gy = cy + (my - cy) * 2 * g.t;
        const gd = Math.hypot(x - gx, y - gy) / size;
        const disc = clamp01((g.r - gd) / (g.r * 0.3)) * 0.18;
        gr += disc * g.color[0];
        gg += disc * g.color[1];
        gb += disc * g.color[2];
      }
      const i = (y * w + x) * 4;
      const add = Math.max(gr, gg, gb) * k;
      const a = d[i + 3] / 255;
      // Light adds to the colour; it also makes transparent pixels as opaque as the light.
      const outA = Math.max(a, clamp01(add / 255));
      if (outA === 0) continue;
      d[i] = clamp255((d[i] * a + gr * k) / outA);
      d[i + 1] = clamp255((d[i + 1] * a + gg * k) / outA);
      d[i + 2] = clamp255((d[i + 2] * a + gb * k) / outA);
      d[i + 3] = outA * 255;
    }
  }
  return out;
}

export const RENDER_FILTERS = [
  {
    id: "clouds",
    name: "Clouds",
    group: "Render",
    parameters: [range("scale", "Scale", 4, 2000, 200, "px")],
    apply: (p, v, ctx) => clouds(p, num(v, "scale"), ctx.seed),
  },
  {
    id: "difference-clouds",
    name: "Difference Clouds",
    group: "Render",
    parameters: [range("scale", "Scale", 4, 2000, 200, "px")],
    apply: (p, v, ctx) => differenceClouds(p, num(v, "scale"), ctx.seed),
  },
  {
    id: "fibers",
    name: "Fibers",
    group: "Render",
    parameters: [range("variance", "Variance", 1, 64, 16), range("strength", "Strength", 1, 64, 4)],
    apply: (p, v, ctx) => fibers(p, num(v, "variance"), num(v, "strength"), ctx.seed),
  },
  {
    id: "lens-flare",
    name: "Lens Flare",
    group: "Render",
    parameters: [
      range("brightness", "Brightness", 10, 300, 100, "%"),
      range("cx", "Center X", 0, 100, 30, "%"),
      range("cy", "Center Y", 0, 100, 30, "%"),
      choice("lens", "Lens type", ["50–300mm Zoom", "35mm Prime", "105mm Prime", "Movie Prime"]),
    ],
    apply: (p, v) => lensFlare(p, num(v, "brightness"), num(v, "cx"), num(v, "cy"), num(v, "lens")),
  },
] as const satisfies readonly FilterDefinition[];
