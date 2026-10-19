import type { RgbaPixels } from "../../selection/flood";
import { gaussianBlur, seededRandom } from "../kernels";
import {
  clamp01,
  clamp255,
  copyPixels,
  hslToRgb,
  hsvToRgb,
  rgbToHsl,
  rgbToHsv,
  warp,
  type EdgeMode,
} from "../sampling";
import { choice, num, range, toggle, bool, type FilterDefinition } from "../types";

/** Other submenu (ADR-0036). */

/** High Pass: keep only detail finer than `radius` px, on mid-grey. Alpha is kept. */
export function highPass(pixels: RgbaPixels, radius: number): RgbaPixels {
  const blurred = gaussianBlur(pixels, radius).data;
  const out = copyPixels(pixels);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) d[i + c] = clamp255(d[i + c] - blurred[i + c] + 128);
  }
  return out;
}

/**
 * HSB/HSL: store hue, saturation and brightness (or lightness) in the red, green and blue
 * channels, or convert such an image back to RGB.
 */
export function hsbHsl(pixels: RgbaPixels, mode: number): RgbaPixels {
  const out = copyPixels(pixels);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    let rgb: [number, number, number];
    if (mode === 0) {
      const [hh, s, v] = rgbToHsv(d[i], d[i + 1], d[i + 2]);
      rgb = [(hh / 360) * 255, s * 255, v * 255];
    } else if (mode === 1) {
      const [hh, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      rgb = [(hh / 360) * 255, s * 255, l * 255];
    } else if (mode === 2) {
      rgb = hsvToRgb((d[i] / 255) * 360, d[i + 1] / 255, d[i + 2] / 255);
    } else {
      rgb = hslToRgb((d[i] / 255) * 360, d[i + 1] / 255, d[i + 2] / 255);
    }
    d[i] = rgb[0];
    d[i + 1] = rgb[1];
    d[i + 2] = rgb[2];
  }
  return out;
}

/**
 * Sliding 1-D maximum (or minimum) over a window of radius `r` along a line of `n` values,
 * reading `get(k)` and writing `set(k, v)` (monotonic deque, O(n)).
 */
function slidingExtreme(
  n: number,
  r: number,
  max: boolean,
  get: (k: number) => number,
  set: (k: number, v: number) => void,
  deque: Int32Array,
): void {
  let head = 0;
  let tail = 0;
  const better = (a: number, b: number) => (max ? a >= b : a <= b);
  let next = 0;
  for (let k = 0; k < n; k++) {
    const hi = Math.min(n - 1, k + r);
    while (next <= hi) {
      const v = get(next);
      while (tail > head && better(v, get(deque[tail - 1]))) tail--;
      deque[tail++] = next++;
    }
    while (deque[head] < k - r) head++;
    set(k, get(deque[head]));
  }
}

/**
 * Maximum / Minimum: each channel becomes the largest (smallest) value within `radius` px —
 * spreading light (dark) areas. Squareness uses a square window (fast); roundness a disc.
 */
export function extreme(
  pixels: RgbaPixels,
  radius: number,
  max: boolean,
  round: boolean,
): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const r = Math.max(1, Math.round(radius));
  const out = new Uint8ClampedArray(src);
  const deque = new Int32Array(Math.max(w, h));
  if (!round) {
    const tmp = new Uint8ClampedArray(src);
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < h; y++) {
        const row = y * w;
        slidingExtreme(
          w,
          r,
          max,
          (k) => src[(row + k) * 4 + c],
          (k, v) => (tmp[(row + k) * 4 + c] = v),
          deque,
        );
      }
      for (let x = 0; x < w; x++) {
        slidingExtreme(
          h,
          r,
          max,
          (k) => tmp[(k * w + x) * 4 + c],
          (k, v) => (out[(k * w + x) * 4 + c] = v),
          deque,
        );
      }
    }
    return { ...pixels, data: out };
  }
  // Disc: for each row offset dy, a horizontal pass with that row's half-width.
  const halfWidths = new Map<number, Uint8ClampedArray>();
  for (let dy = 0; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy));
    if (halfWidths.has(hw)) continue;
    const pass = new Uint8ClampedArray(src.length);
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < h; y++) {
        const row = y * w;
        slidingExtreme(
          w,
          hw,
          max,
          (k) => src[(row + k) * 4 + c],
          (k, v) => (pass[(row + k) * 4 + c] = v),
          deque,
        );
      }
    }
    halfWidths.set(hw, pass);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let best = max ? 0 : 255;
        for (let dy = -r; dy <= r; dy++) {
          const sy = y + dy;
          if (sy < 0 || sy >= h) continue;
          const pass = halfWidths.get(Math.floor(Math.sqrt(r * r - dy * dy)))!;
          const v = pass[(sy * w + x) * 4 + c];
          best = max ? Math.max(best, v) : Math.min(best, v);
        }
        out[o + c] = best;
      }
    }
  }
  return { ...pixels, data: out };
}

const EDGE_MODES: readonly EdgeMode[] = ["transparent", "clamp", "wrap"];

/** Offset: move the layer by (dx, dy) px; uncovered areas are transparent, edge pixels or wrapped. */
export function offset(pixels: RgbaPixels, dx: number, dy: number, edge: EdgeMode): RgbaPixels {
  const ix = Math.round(dx);
  const iy = Math.round(dy);
  return warp(
    pixels,
    (x, y, xy) => {
      xy[0] = x - ix;
      xy[1] = y - iy;
    },
    edge,
  );
}

/** Repeat: the layer, shrunk, tiled `columns` × `rows` times; mirrored tiles join seamlessly. */
export function repeat(
  pixels: RgbaPixels,
  columns: number,
  rows: number,
  mirror: boolean,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const cols = Math.max(1, Math.round(columns));
  const rws = Math.max(1, Math.round(rows));
  const tw = w / cols;
  const th = h / rws;
  return warp(pixels, (x, y, xy) => {
    const tx = Math.floor(x / tw);
    const ty = Math.floor(y / th);
    let u = (x - tx * tw) / tw;
    let v = (y - ty * th) / th;
    if (mirror && tx % 2 === 1) u = 1 - u;
    if (mirror && ty % 2 === 1) v = 1 - v;
    xy[0] = u * (w - 1);
    xy[1] = v * (h - 1);
  });
}

/**
 * Color to Alpha: remove a colour, making it transparent and un-mixing it from the colours
 * near it (like GIMP's), so a white background goes while anti-aliased edges stay smooth.
 */
export function colorToAlpha(
  pixels: RgbaPixels,
  r: number,
  g: number,
  b: number,
  threshold: number,
): RgbaPixels {
  const out = copyPixels(pixels);
  const d = out.data;
  const key = [r / 255, g / 255, b / 255];
  const floor = threshold / 255;
  for (let i = 0; i < d.length; i += 4) {
    const px = [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
    let alpha = 0;
    for (let c = 0; c < 3; c++) {
      const diff = px[c] - key[c];
      const a = diff > 0 ? diff / (1 - key[c] || 1) : diff < 0 ? -diff / (key[c] || 1) : 0;
      alpha = Math.max(alpha, a);
    }
    alpha = alpha <= floor ? 0 : floor > 0 ? clamp01((alpha - floor) / (1 - floor)) : alpha;
    const original = d[i + 3] / 255;
    if (alpha === 0) {
      d[i + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++) d[i + c] = clamp255(((px[c] - key[c]) / alpha + key[c]) * 255);
    d[i + 3] = alpha * original * 255;
  }
  return out;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * Dither: reduce each channel to `levels` values with Floyd–Steinberg error diffusion, an
 * ordered (Bayer) pattern or random noise. Seeded.
 */
export function dither(
  pixels: RgbaPixels,
  levels: number,
  pattern: number,
  seed: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const out = copyPixels(pixels);
  const d = out.data;
  const n = Math.max(2, Math.round(levels)) - 1;
  const quant = (v: number) => Math.round((clamp255(v) / 255) * n) * (255 / n);
  if (pattern === 0) {
    const err = new Float32Array(w * h * 3);
    for (let p = 0; p < w * h; p++) for (let c = 0; c < 3; c++) err[p * 3 + c] = d[p * 4 + c];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        for (let c = 0; c < 3; c++) {
          const old = err[p * 3 + c];
          const q = quant(old);
          d[p * 4 + c] = q;
          const e = old - q;
          if (x + 1 < w) err[(p + 1) * 3 + c] += (e * 7) / 16;
          if (y + 1 < h) {
            if (x > 0) err[(p + w - 1) * 3 + c] += (e * 3) / 16;
            err[(p + w) * 3 + c] += (e * 5) / 16;
            if (x + 1 < w) err[(p + w + 1) * 3 + c] += e / 16;
          }
        }
      }
    }
    return out;
  }
  const random = seededRandom(seed);
  const step = 255 / n;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const t = pattern === 1 ? (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16 - 0.5 : random() - 0.5;
        d[i + c] = quant(d[i + c] + t * step);
      }
    }
  }
  return out;
}

/**
 * Particles: soft round particles scattered over the layer — snow (white), sparks (warm, with
 * a hot core) or bokeh (large, faint, coloured). Seeded.
 */
export function particles(
  pixels: RgbaPixels,
  count: number,
  size: number,
  kind: number,
  seed: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const random = seededRandom(seed);
  const out = copyPixels(pixels);
  const d = out.data;
  // Count is per megapixel so the preview and the full-size result look alike.
  const total = Math.round((count * w * h) / 1e6);
  for (let n = 0; n < total; n++) {
    const px = random() * w;
    const py = random() * h;
    const scale = kind === 2 ? 1 + random() * 2 : 0.3 + random() * 0.7;
    const radius = Math.max(0.5, size * scale);
    const color =
      kind === 0
        ? [255, 255, 255]
        : kind === 1
          ? [255, 150 + random() * 100, 40 + random() * 60]
          : hsvToRgb(random() * 360, 0.5, 1);
    const opacity = kind === 2 ? 0.25 + random() * 0.25 : 0.6 + random() * 0.4;
    const x0 = Math.max(0, Math.floor(px - radius - 1));
    const x1 = Math.min(w - 1, Math.ceil(px + radius + 1));
    const y0 = Math.max(0, Math.floor(py - radius - 1));
    const y1 = Math.min(h - 1, Math.ceil(py + radius + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dist = Math.hypot(x - px, y - py) / radius;
        if (dist >= 1) continue;
        const falloff = kind === 2 ? clamp01((1 - dist) * 6) : (1 - dist) * (1 - dist);
        const a = falloff * opacity;
        const i = (y * w + x) * 4;
        const da = d[i + 3] / 255;
        const outA = a + da * (1 - a);
        const core = kind === 1 ? clamp01(1 - dist * 2) : 0;
        for (let c = 0; c < 3; c++) {
          const src = color[c] + (255 - color[c]) * core;
          d[i + c] = clamp255((src * a + d[i + c] * da * (1 - a)) / outA);
        }
        d[i + 3] = outA * 255;
      }
    }
  }
  return out;
}

export const OTHER_FILTERS = [
  {
    id: "high-pass",
    name: "High Pass",
    group: "Other",
    parameters: [range("radius", "Radius", 0.1, 250, 10, "px", 0.1)],
    apply: (p, v) => highPass(p, num(v, "radius")),
  },
  {
    id: "hsb-hsl",
    name: "HSB/HSL",
    group: "Other",
    parameters: [
      choice("mode", "Conversion", ["RGB to HSB", "RGB to HSL", "HSB to RGB", "HSL to RGB"]),
    ],
    apply: (p, v) => hsbHsl(p, num(v, "mode")),
  },
  {
    id: "maximum",
    name: "Maximum",
    group: "Other",
    parameters: [
      range("radius", "Radius", 1, 100, 1, "px"),
      choice("preserve", "Preserve", ["Squareness", "Roundness"]),
    ],
    apply: (p, v) => extreme(p, num(v, "radius"), true, num(v, "preserve") === 1),
  },
  {
    id: "minimum",
    name: "Minimum",
    group: "Other",
    parameters: [
      range("radius", "Radius", 1, 100, 1, "px"),
      choice("preserve", "Preserve", ["Squareness", "Roundness"]),
    ],
    apply: (p, v) => extreme(p, num(v, "radius"), false, num(v, "preserve") === 1),
  },
  {
    id: "offset",
    name: "Offset",
    group: "Other",
    parameters: [
      range("dx", "Horizontal", -30000, 30000, 0, "px"),
      range("dy", "Vertical", -30000, 30000, 0, "px"),
      choice(
        "edge",
        "Undefined areas",
        ["Set to transparent", "Repeat edge pixels", "Wrap around"],
        2,
      ),
    ],
    apply: (p, v) => offset(p, num(v, "dx"), num(v, "dy"), EDGE_MODES[num(v, "edge")]),
  },
  {
    id: "repeat",
    name: "Repeat",
    group: "Other",
    parameters: [
      range("columns", "Columns", 1, 50, 2),
      range("rows", "Rows", 1, 50, 2),
      toggle("mirror", "Mirror", false),
    ],
    apply: (p, v) => repeat(p, num(v, "columns"), num(v, "rows"), bool(v, "mirror")),
  },
  {
    id: "color-to-alpha",
    name: "Color to Alpha",
    group: "Other",
    parameters: [
      range("r", "Red", 0, 255, 255),
      range("g", "Green", 0, 255, 255),
      range("b", "Blue", 0, 255, 255),
      range("threshold", "Transparency threshold", 0, 254, 0, "levels"),
    ],
    apply: (p, v) => colorToAlpha(p, num(v, "r"), num(v, "g"), num(v, "b"), num(v, "threshold")),
  },
  {
    id: "dither",
    name: "Dither",
    group: "Other",
    parameters: [
      range("levels", "Levels per channel", 2, 64, 4),
      choice("pattern", "Pattern", ["Diffusion (Floyd–Steinberg)", "Ordered (Bayer)", "Noise"]),
    ],
    apply: (p, v, ctx) => dither(p, num(v, "levels"), num(v, "pattern"), ctx.seed),
  },
  {
    id: "particles",
    name: "Particles",
    group: "Other",
    parameters: [
      range("count", "Particles per megapixel", 1, 5000, 400),
      range("size", "Size", 0.5, 200, 6, "px", 0.5),
      choice("kind", "Kind", ["Snow", "Sparks", "Bokeh"]),
    ],
    apply: (p, v, ctx) => particles(p, num(v, "count"), num(v, "size"), num(v, "kind"), ctx.seed),
  },
] as const satisfies readonly FilterDefinition[];
