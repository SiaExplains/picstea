import type { RgbaPixels } from "../../selection/flood";
import { pixelate } from "../filters";
import { premultiply, seededRandom, unpremultiply } from "../kernels";
import { clamp01, clamp255, copyPixels } from "../sampling";
import { choice, num, range, type FilterDefinition } from "../types";

/** Pixelate submenu (ADR-0036). */

/**
 * Colour Halftone: CMYK screens at the given angles; each screen cell holds a dot whose area
 * matches the ink under it, up to `maxRadius` px. Alpha is kept.
 */
export function colorHalftone(
  pixels: RgbaPixels,
  maxRadius: number,
  angles: readonly number[],
): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const out = copyPixels(pixels);
  const d = out.data;
  const cell = Math.max(2, maxRadius * 2);
  const ink = (x: number, y: number, ch: number) => {
    const sx = Math.min(w - 1, Math.max(0, Math.round(x)));
    const sy = Math.min(h - 1, Math.max(0, Math.round(y)));
    const i = (sy * w + sx) * 4;
    const r = src[i] / 255;
    const g = src[i + 1] / 255;
    const b = src[i + 2] / 255;
    const k = 1 - Math.max(r, g, b);
    if (ch === 3) return k;
    if (k >= 1) return 0;
    return (1 - [r, g, b][ch] - k) / (1 - k);
  };
  const screens = angles.map((a) => {
    const rad = (a * Math.PI) / 180;
    return { cos: Math.cos(rad), sin: Math.sin(rad) };
  });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const coverage = [0, 0, 0, 0];
      for (let ch = 0; ch < 4; ch++) {
        const { cos, sin } = screens[ch];
        // Into screen space, find the cell centre, sample the ink there, draw the dot.
        const u = x * cos + y * sin;
        const v = -x * sin + y * cos;
        const cu = (Math.floor(u / cell) + 0.5) * cell;
        const cv = (Math.floor(v / cell) + 0.5) * cell;
        const px = cu * cos - cv * sin;
        const py = cu * sin + cv * cos;
        const amount = ink(px, py, ch);
        const radius = Math.sqrt(amount) * cell * 0.7071;
        const dist = Math.hypot(u - cu, v - cv);
        coverage[ch] = clamp01(radius - dist + 0.5);
      }
      const i = (y * w + x) * 4;
      const k = coverage[3];
      d[i] = 255 * (1 - coverage[0]) * (1 - k);
      d[i + 1] = 255 * (1 - coverage[1]) * (1 - k);
      d[i + 2] = 255 * (1 - coverage[2]) * (1 - k);
    }
  }
  return out;
}

interface Cells {
  /** Nearest seed index for every pixel. */
  readonly owner: Int32Array;
  readonly seeds: Float64Array;
}

/** Voronoi cells from one jittered seed per `size`×`size` grid square. Seeded. */
function voronoi(w: number, h: number, size: number, seed: number): Cells {
  const s = Math.max(2, size);
  const cols = Math.ceil(w / s);
  const rows = Math.ceil(h / s);
  const random = seededRandom(seed);
  const seeds = new Float64Array(cols * rows * 2);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = (j * cols + i) * 2;
      seeds[k] = (i + random()) * s;
      seeds[k + 1] = (j + random()) * s;
    }
  }
  const owner = new Int32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gj = Math.floor(y / s);
    for (let x = 0; x < w; x++) {
      const gi = Math.floor(x / s);
      let best = 0;
      let bestD = Infinity;
      for (let dj = -1; dj <= 1; dj++) {
        const j = gj + dj;
        if (j < 0 || j >= rows) continue;
        for (let di = -1; di <= 1; di++) {
          const i = gi + di;
          if (i < 0 || i >= cols) continue;
          const k = j * cols + i;
          const d = (seeds[k * 2] - x) ** 2 + (seeds[k * 2 + 1] - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = k;
          }
        }
      }
      owner[y * w + x] = best;
    }
  }
  return { owner, seeds };
}

/** Average premultiplied colour of each cell. */
function cellAverages(src: Uint8ClampedArray, owner: Int32Array, count: number): Float64Array {
  const sums = new Float64Array(count * 5);
  for (let p = 0; p < owner.length; p++) {
    const k = owner[p] * 5;
    const i = p * 4;
    sums[k] += src[i];
    sums[k + 1] += src[i + 1];
    sums[k + 2] += src[i + 2];
    sums[k + 3] += src[i + 3];
    sums[k + 4]++;
  }
  for (let k = 0; k < count; k++) {
    const n = sums[k * 5 + 4] || 1;
    for (let c = 0; c < 4; c++) sums[k * 5 + c] /= n;
  }
  return sums;
}

/** Crystallize: Voronoi cells of about `size` px, each its average colour. */
export function crystallize(pixels: RgbaPixels, size: number, seed: number): RgbaPixels {
  const { width: w, height: h } = pixels;
  const { owner, seeds } = voronoi(w, h, size, seed);
  const src = premultiply(pixels.data);
  const avg = cellAverages(src, owner, seeds.length / 2);
  const out = new Uint8ClampedArray(src.length);
  for (let p = 0; p < owner.length; p++) {
    const k = owner[p] * 5;
    for (let c = 0; c < 4; c++) out[p * 4 + c] = avg[k + c];
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

/** Fragment: four copies offset by 4 px, averaged, like a shaky double exposure. */
export function fragment(pixels: RgbaPixels): RgbaPixels {
  const { width: w, height: h } = pixels;
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  const offsets = [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
  ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (const [dx, dy] of offsets) {
          const sx = Math.min(w - 1, Math.max(0, x + dx));
          const sy = Math.min(h - 1, Math.max(0, y + dy));
          sum += src[(sy * w + sx) * 4 + c];
        }
        out[o + c] = sum / 4;
      }
    }
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

/**
 * Mezzotint: every channel becomes fully on or off by comparing it with a random screen;
 * dots use per-pixel randomness, lines and strokes stretch it horizontally. Seeded.
 */
export function mezzotint(pixels: RgbaPixels, type: number, seed: number): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const random = seededRandom(seed);
  const out = copyPixels(pixels);
  const d = out.data;
  // Fine dots, medium dots, grainy dots, coarse dots, short lines, medium lines, long lines,
  // short strokes, medium strokes, long strokes.
  const dotSize = [1, 2, 1, 3][type] ?? 1;
  const lineLength = type >= 4 ? [4, 10, 24, 6, 12, 24][type - 4] : 0;
  const strokes = type >= 7;
  for (let y = 0; y < h; y++) {
    let lineValue = [0, 0, 0];
    let left = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (lineLength > 0) {
        if (left <= 0) {
          lineValue = [random(), random(), random()];
          left = Math.max(1, Math.round(lineLength * (0.5 + random())));
        }
        left--;
      }
      for (let c = 0; c < 3; c++) {
        let t: number;
        if (lineLength > 0) t = strokes ? lineValue[0] : lineValue[c];
        else {
          const bx = Math.floor(x / dotSize);
          const by = Math.floor(y / dotSize);
          t = hash(bx, by, c + seed * 3);
          if (type === 2) t = 0.5 + (t - 0.5) * 0.6;
        }
        d[i + c] = src[i + c] / 255 > t ? 255 : 0;
      }
    }
  }
  return out;
}

/** Deterministic pseudo-random value in [0, 1) for integer coordinates. */
function hash(x: number, y: number, z: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Mosaic (Photoshop's name for pixelate): every cell becomes its average colour. */
export const mosaic = pixelate;

/**
 * Pointillize: random dots in the colour under them on a background (white, black or
 * transparent), dot size about `size` px. Seeded.
 */
export function pointillize(
  pixels: RgbaPixels,
  size: number,
  background: number,
  seed: number,
): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const { owner, seeds } = voronoi(w, h, size, seed);
  const random = seededRandom(seed ^ 0x5bd1e995);
  const jitter = Array.from({ length: seeds.length / 2 }, () => (random() - 0.5) * 40);
  const radius = Math.max(1, size * 0.55);
  const bg = [
    [255, 255, 255, 255],
    [0, 0, 0, 255],
    [0, 0, 0, 0],
  ][background];
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = owner[y * w + x];
      const sx = seeds[k * 2];
      const sy = seeds[k * 2 + 1];
      const cover = clamp01(radius - Math.hypot(x - sx, y - sy) + 0.5);
      const si =
        (Math.min(h - 1, Math.max(0, Math.round(sy))) * w +
          Math.min(w - 1, Math.max(0, Math.round(sx)))) *
        4;
      const o = (y * w + x) * 4;
      const alpha = src[si + 3] / 255;
      const a = cover * alpha;
      const outA = a * 255 + bg[3] * (1 - a);
      for (let c = 0; c < 3; c++) {
        const dot = clamp255(src[si + c] + jitter[k]);
        const premul = dot * a * 255 + bg[c] * bg[3] * (1 - a);
        out[o + c] = outA > 0 ? premul / outA : 0;
      }
      out[o + 3] = outA;
    }
  }
  return { width: w, height: h, data: out };
}

/**
 * Shape Mosaic: a grid of cells, each filled with its average colour in a shape (circle,
 * diamond, triangle or rounded square) on a gap colour.
 */
export function shapeMosaic(
  pixels: RgbaPixels,
  size: number,
  shape: number,
  gap: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const blocks = pixelate(pixels, size).data;
  const cell = Math.max(2, Math.round(size));
  const gapColor = [
    [0, 0, 0, 255],
    [255, 255, 255, 255],
    [0, 0, 0, 0],
  ][gap];
  const out = new Uint8ClampedArray(blocks.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = ((x % cell) + 0.5) / cell - 0.5;
      const v = ((y % cell) + 0.5) / cell - 0.5;
      let inside: number;
      if (shape === 0) inside = 0.45 - Math.hypot(u, v);
      else if (shape === 1) inside = 0.48 - (Math.abs(u) + Math.abs(v));
      else if (shape === 2) inside = Math.min(v + 0.4, 0.4 - v - 2 * Math.abs(u) * 0.95) / 1.5;
      else {
        const qx = Math.max(Math.abs(u) - 0.3, 0);
        const qy = Math.max(Math.abs(v) - 0.3, 0);
        inside = 0.12 - Math.hypot(qx, qy);
      }
      const t = clamp01(inside * cell + 0.5);
      const i = (y * w + x) * 4;
      const a = (blocks[i + 3] / 255) * t;
      const outA = a * 255 + gapColor[3] * (1 - a);
      for (let c = 0; c < 3; c++) {
        const premul = blocks[i + c] * a * 255 + gapColor[c] * gapColor[3] * (1 - a);
        out[i + c] = outA > 0 ? premul / outA : 0;
      }
      out[i + 3] = outA;
    }
  }
  return { width: w, height: h, data: out };
}

const BACKGROUNDS = ["White", "Black", "Transparent"];

export const PIXELATE_FILTERS = [
  {
    id: "color-halftone",
    name: "Color Halftone",
    group: "Pixelate",
    parameters: [
      range("radius", "Max. radius", 2, 127, 8, "px"),
      range("cyan", "Cyan angle", -360, 360, 108, "°"),
      range("magenta", "Magenta angle", -360, 360, 162, "°"),
      range("yellow", "Yellow angle", -360, 360, 90, "°"),
      range("black", "Black angle", -360, 360, 45, "°"),
    ],
    apply: (p, v) =>
      colorHalftone(p, num(v, "radius"), [
        num(v, "cyan"),
        num(v, "magenta"),
        num(v, "yellow"),
        num(v, "black"),
      ]),
  },
  {
    id: "crystallize",
    name: "Crystallize",
    group: "Pixelate",
    parameters: [range("size", "Cell size", 3, 300, 10, "px")],
    apply: (p, v, ctx) => crystallize(p, num(v, "size"), ctx.seed),
  },
  {
    id: "fragment",
    name: "Fragment",
    group: "Pixelate",
    parameters: [],
    apply: (p) => fragment(p),
  },
  {
    id: "mezzotint",
    name: "Mezzotint",
    group: "Pixelate",
    parameters: [
      choice("type", "Type", [
        "Fine dots",
        "Medium dots",
        "Grainy dots",
        "Coarse dots",
        "Short lines",
        "Medium lines",
        "Long lines",
        "Short strokes",
        "Medium strokes",
        "Long strokes",
      ]),
    ],
    apply: (p, v, ctx) => mezzotint(p, num(v, "type"), ctx.seed),
  },
  {
    // The id predates the Photoshop name; saved smart filters still use it.
    id: "pixelate",
    name: "Mosaic",
    group: "Pixelate",
    parameters: [range("size", "Cell size", 2, 200, 10, "px")],
    apply: (p, v) => mosaic(p, num(v, "size")),
  },
  {
    id: "pointillize",
    name: "Pointillize",
    group: "Pixelate",
    parameters: [
      range("size", "Cell size", 3, 300, 8, "px"),
      choice("background", "Background", BACKGROUNDS),
    ],
    apply: (p, v, ctx) => pointillize(p, num(v, "size"), num(v, "background"), ctx.seed),
  },
  {
    id: "shape-mosaic",
    name: "Shape Mosaic",
    group: "Pixelate",
    parameters: [
      range("size", "Cell size", 4, 300, 16, "px"),
      choice("shape", "Shape", ["Circle", "Diamond", "Triangle", "Rounded square"]),
      choice("gap", "Gaps", ["Black", "White", "Transparent"]),
    ],
    apply: (p, v) => shapeMosaic(p, num(v, "size"), num(v, "shape"), num(v, "gap")),
  },
] as const satisfies readonly FilterDefinition[];
