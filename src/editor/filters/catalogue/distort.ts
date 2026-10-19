import type { RgbaPixels } from "../../selection/flood";
import { gaussianBlur, luma, seededRandom } from "../kernels";
import { centerOf, fractalNoise, warp, type EdgeMode } from "../sampling";
import { centerParams, choice, num, range, type FilterDefinition } from "../types";

/** Distort submenu (ADR-0036). Every filter is an inverse-mapped warp (`warp`). */

const EDGE_MODES: readonly EdgeMode[] = ["wrap", "clamp", "transparent"];
const edgeChoice = (defaultValue = 1) =>
  choice(
    "edge",
    "Undefined areas",
    ["Wrap around", "Repeat edge pixels", "Transparent"],
    defaultValue,
  );

/** Radius of the largest circle centred in the layer. */
const halfMin = (w: number, h: number) => Math.max(1, Math.min(w, h) / 2);

/**
 * Displace: move each pixel by a map's value (0.5 = no move), up to `scale`% of 128 px
 * horizontally and vertically, as in Photoshop. Maps: the layer's own luminance, clouds or
 * waves (Photoshop loads a file; Picstea never asks for one, see ADR-0036).
 */
export function displace(
  pixels: RgbaPixels,
  hScale: number,
  vScale: number,
  map: number,
  size: number,
  seed: number,
  edge: EdgeMode,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  let mx: Float32Array;
  let my: Float32Array;
  if (map === 0) {
    mx = new Float32Array(w * h);
    const blurred = gaussianBlur(pixels, Math.max(0.1, size / 8)).data;
    for (let p = 0; p < mx.length; p++) {
      const i = p * 4;
      mx[p] = blurred[i + 3] === 0 ? 0.5 : luma(blurred[i], blurred[i + 1], blurred[i + 2]) / 255;
    }
    my = mx;
  } else if (map === 1) {
    mx = fractalNoise(w, h, size, seed);
    my = fractalNoise(w, h, size, seed + 1);
  } else {
    mx = new Float32Array(w * h);
    my = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        mx[y * w + x] = 0.5 + 0.5 * Math.sin((2 * Math.PI * y) / Math.max(2, size));
        my[y * w + x] = 0.5 + 0.5 * Math.sin((2 * Math.PI * x) / Math.max(2, size));
      }
    }
  }
  const kx = (hScale / 100) * 128 * 2;
  const ky = (vScale / 100) * 128 * 2;
  return warp(
    pixels,
    (x, y, xy) => {
      const p = y * w + x;
      xy[0] = x + (mx[p] - 0.5) * kx;
      xy[1] = y + (my[p] - 0.5) * ky;
    },
    edge,
  );
}

/** Kaleidoscope: `segments` mirrored wedges around a centre, starting at `angle`°. */
export function kaleidoscope(
  pixels: RgbaPixels,
  segments: number,
  angle: number,
  cxPercent: number,
  cyPercent: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const { cx, cy } = centerOf(w, h, cxPercent, cyPercent);
  const wedge = (2 * Math.PI) / Math.max(2, Math.round(segments));
  const start = (angle * Math.PI) / 180;
  return warp(pixels, (x, y, xy) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    let a = Math.atan2(dy, dx) - start;
    a = ((a % wedge) + wedge) % wedge;
    if (a > wedge / 2) a = wedge - a;
    a += start;
    xy[0] = cx + r * Math.cos(a);
    xy[1] = cy + r * Math.sin(a);
  });
}

/** Pinch: squeeze (positive) or bulge (negative) the middle of the layer. */
export function pinch(pixels: RgbaPixels, amount: number): RgbaPixels {
  const { width: w, height: h } = pixels;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const rx = Math.max(1, w / 2);
  const ry = Math.max(1, h / 2);
  const k = amount / 100;
  return warp(pixels, (x, y, xy) => {
    const u = (x - cx) / rx;
    const v = (y - cy) / ry;
    const d = Math.hypot(u, v);
    if (d >= 1 || d === 0) {
      xy[0] = x;
      xy[1] = y;
      return;
    }
    const factor = Math.pow(Math.sin((Math.PI / 2) * d), -k);
    xy[0] = cx + u * factor * rx;
    xy[1] = cy + v * factor * ry;
  });
}

/** Polar Coordinates: rectangular → polar (0) or polar → rectangular (1). */
export function polarCoordinates(pixels: RgbaPixels, mode: number): RgbaPixels {
  const { width: w, height: h } = pixels;
  const cx = w / 2;
  const cy = h / 2;
  const rMax = Math.hypot(cx, cy) / Math.SQRT2;
  return warp(
    pixels,
    (x, y, xy) => {
      if (mode === 0) {
        // Output is polar: the source row is the radius, the source column the angle.
        const dx = x - cx;
        const dy = y - cy;
        let a = Math.atan2(dx, -dy);
        if (a < 0) a += 2 * Math.PI;
        xy[0] = (a / (2 * Math.PI)) * w;
        xy[1] = (Math.hypot(dx, dy) / rMax) * h;
      } else {
        const a = (x / w) * 2 * Math.PI;
        const r = (y / h) * rMax;
        xy[0] = cx + r * Math.sin(a);
        xy[1] = cy - r * Math.cos(a);
      }
    },
    mode === 0 ? "wrap" : "clamp",
  );
}

/** Ripple: small sideways waves, `amount`% strong, with a wavelength of `size` px. */
export function ripple(pixels: RgbaPixels, amount: number, size: number): RgbaPixels {
  const a = (amount / 100) * Math.max(1, size / 2);
  const f = (2 * Math.PI) / Math.max(2, size);
  return warp(pixels, (x, y, xy) => {
    xy[0] = x + a * Math.sin(y * f);
    xy[1] = y + a * Math.sin(x * f);
  });
}

/** Shear: bend the layer sideways along a smooth curve, `amount`% of half its width. */
export function shear(pixels: RgbaPixels, amount: number, edge: EdgeMode): RgbaPixels {
  const { width: w, height: h } = pixels;
  const k = (amount / 100) * (w / 2);
  return warp(
    pixels,
    (x, y, xy) => {
      const t = h > 1 ? (2 * y) / (h - 1) - 1 : 0;
      xy[0] = x - k * (1 - t * t);
      xy[1] = y;
    },
    edge,
  );
}

/** Spherize: wrap the layer around a sphere (positive) or the inside of one (negative). */
export function spherize(pixels: RgbaPixels, amount: number, mode: number): RgbaPixels {
  const { width: w, height: h } = pixels;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const rx = Math.max(1, w / 2);
  const ry = Math.max(1, h / 2);
  const k = amount / 100;
  const exponent = k >= 0 ? 1 + k : 1 / (1 - k);
  return warp(pixels, (x, y, xy) => {
    const u = (x - cx) / rx;
    const v = (y - cy) / ry;
    const d = mode === 1 ? Math.abs(u) : mode === 2 ? Math.abs(v) : Math.hypot(u, v);
    if (d >= 1 || d === 0) {
      xy[0] = x;
      xy[1] = y;
      return;
    }
    const factor = Math.pow(d, exponent) / d;
    xy[0] = mode === 2 ? x : cx + u * factor * rx;
    xy[1] = mode === 1 ? y : cy + v * factor * ry;
  });
}

/** Twirl: rotate the middle by `angle`°, less towards the edge of the centred circle. */
export function twirl(pixels: RgbaPixels, angle: number): RgbaPixels {
  const { width: w, height: h } = pixels;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const radius = halfMin(w, h);
  const rad = (angle * Math.PI) / 180;
  return warp(pixels, (x, y, xy) => {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy) / radius;
    if (d >= 1) {
      xy[0] = x;
      xy[1] = y;
      return;
    }
    const a = rad * (1 - d) * (1 - d);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    xy[0] = cx + dx * cos - dy * sin;
    xy[1] = cy + dx * sin + dy * cos;
  });
}

const waveShape = (type: number, phase: number) => {
  const t = phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI));
  if (type === 1) return 4 * Math.abs(t - 0.5) - 1;
  if (type === 2) return t < 0.5 ? 1 : -1;
  return Math.sin(phase);
};

/**
 * Wave: the sum of `generators` waves of random wavelength (between min and max px) and
 * amplitude (up to `amplitude` px), sine, triangle or square. Seeded.
 */
export function wave(
  pixels: RgbaPixels,
  generators: number,
  minWavelength: number,
  maxWavelength: number,
  amplitude: number,
  type: number,
  seed: number,
  edge: EdgeMode,
): RgbaPixels {
  const random = seededRandom(seed);
  const lo = Math.max(2, Math.min(minWavelength, maxWavelength));
  const hi = Math.max(lo, maxWavelength);
  const waves = Array.from({ length: Math.max(1, Math.round(generators)) }, () => ({
    fx: (2 * Math.PI) / (lo + random() * (hi - lo)),
    fy: (2 * Math.PI) / (lo + random() * (hi - lo)),
    ax: amplitude * (0.5 + random() * 0.5),
    ay: amplitude * (0.5 + random() * 0.5),
    px: random() * 2 * Math.PI,
    py: random() * 2 * Math.PI,
  }));
  const n = waves.length;
  return warp(
    pixels,
    (x, y, xy) => {
      let dx = 0;
      let dy = 0;
      for (const wv of waves) {
        dx += wv.ax * waveShape(type, y * wv.fy + wv.px);
        dy += wv.ay * waveShape(type, x * wv.fx + wv.py);
      }
      xy[0] = x + dx / Math.sqrt(n);
      xy[1] = y + dy / Math.sqrt(n);
    },
    edge,
  );
}

/** ZigZag: ripples out from the centre; around the centre, out from it, or like a pond. */
export function zigzag(
  pixels: RgbaPixels,
  amount: number,
  ridges: number,
  style: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const radius = halfMin(w, h);
  const k = amount / 100;
  return warp(pixels, (x, y, xy) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    const d = r / radius;
    if (d >= 1 || r === 0) {
      xy[0] = x;
      xy[1] = y;
      return;
    }
    const s = Math.sin(2 * Math.PI * ridges * d) * (1 - d);
    if (style === 0) {
      const a = k * s * 0.5;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      xy[0] = cx + dx * cos - dy * sin;
      xy[1] = cy + dx * sin + dy * cos;
    } else {
      const shift = style === 1 ? k * s * radius * 0.1 : k * s * radius * 0.1 * (1 - d);
      const nr = (r + shift) / r;
      const twist = style === 2 ? k * s * 0.2 : 0;
      const cos = Math.cos(twist);
      const sin = Math.sin(twist);
      xy[0] = cx + (dx * cos - dy * sin) * nr;
      xy[1] = cy + (dx * sin + dy * cos) * nr;
    }
  });
}

/** Dents: push pixels around by the slope of smooth random bumps of `size` px. Seeded. */
export function dents(
  pixels: RgbaPixels,
  size: number,
  strength: number,
  seed: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const noise = fractalNoise(w, h, Math.max(2, size), seed, 3);
  const at = (x: number, y: number) =>
    noise[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const k = strength * Math.max(2, size) * 0.5;
  return warp(pixels, (x, y, xy) => {
    xy[0] = x + (at(x + 1, y) - at(x - 1, y)) * k;
    xy[1] = y + (at(x, y + 1) - at(x, y - 1)) * k;
  });
}

export const DISTORT_FILTERS = [
  {
    id: "displace",
    name: "Displace",
    group: "Distort",
    parameters: [
      range("hScale", "Horizontal scale", -999, 999, 10, "%"),
      range("vScale", "Vertical scale", -999, 999, 10, "%"),
      choice("map", "Displacement map", ["Layer brightness", "Clouds", "Waves"]),
      range("size", "Map size", 2, 1000, 60, "px"),
      edgeChoice(),
    ],
    apply: (p, v, ctx) =>
      displace(
        p,
        num(v, "hScale"),
        num(v, "vScale"),
        num(v, "map"),
        num(v, "size"),
        ctx.seed,
        EDGE_MODES[num(v, "edge")],
      ),
  },
  {
    id: "kaleidoscope",
    name: "Kaleidoscope",
    group: "Distort",
    parameters: [
      range("segments", "Segments", 2, 32, 6),
      range("angle", "Angle", -180, 180, 0, "°"),
      ...centerParams(),
    ],
    apply: (p, v) =>
      kaleidoscope(p, num(v, "segments"), num(v, "angle"), num(v, "cx"), num(v, "cy")),
  },
  {
    id: "pinch",
    name: "Pinch",
    group: "Distort",
    parameters: [range("amount", "Amount", -100, 100, 50, "%")],
    apply: (p, v) => pinch(p, num(v, "amount")),
  },
  {
    id: "polar-coordinates",
    name: "Polar Coordinates",
    group: "Distort",
    parameters: [choice("mode", "Mode", ["Rectangular to polar", "Polar to rectangular"])],
    apply: (p, v) => polarCoordinates(p, num(v, "mode")),
  },
  {
    id: "ripple",
    name: "Ripple",
    group: "Distort",
    parameters: [
      range("amount", "Amount", -999, 999, 100, "%"),
      range("size", "Size", 2, 200, 16, "px"),
    ],
    apply: (p, v) => ripple(p, num(v, "amount"), num(v, "size")),
  },
  {
    id: "shear",
    name: "Shear",
    group: "Distort",
    parameters: [range("amount", "Amount", -100, 100, 30, "%"), edgeChoice(0)],
    apply: (p, v) => shear(p, num(v, "amount"), EDGE_MODES[num(v, "edge")]),
  },
  {
    id: "spherize",
    name: "Spherize",
    group: "Distort",
    parameters: [
      range("amount", "Amount", -100, 100, 100, "%"),
      choice("mode", "Mode", ["Normal", "Horizontal only", "Vertical only"]),
    ],
    apply: (p, v) => spherize(p, num(v, "amount"), num(v, "mode")),
  },
  {
    id: "twirl",
    name: "Twirl",
    group: "Distort",
    parameters: [range("angle", "Angle", -999, 999, 50, "°")],
    apply: (p, v) => twirl(p, num(v, "angle")),
  },
  {
    id: "wave",
    name: "Wave",
    group: "Distort",
    parameters: [
      range("generators", "Generators", 1, 20, 5),
      range("minWavelength", "Min wavelength", 2, 999, 10, "px"),
      range("maxWavelength", "Max wavelength", 2, 999, 120, "px"),
      range("amplitude", "Amplitude", 1, 999, 10, "px"),
      choice("type", "Type", ["Sine", "Triangle", "Square"]),
      edgeChoice(0),
    ],
    apply: (p, v, ctx) =>
      wave(
        p,
        num(v, "generators"),
        num(v, "minWavelength"),
        num(v, "maxWavelength"),
        num(v, "amplitude"),
        num(v, "type"),
        ctx.seed,
        EDGE_MODES[num(v, "edge")],
      ),
  },
  {
    id: "zigzag",
    name: "ZigZag",
    group: "Distort",
    parameters: [
      range("amount", "Amount", -100, 100, 10),
      range("ridges", "Ridges", 1, 20, 5),
      choice("style", "Style", ["Around center", "Out from center", "Pond ripples"], 2),
    ],
    apply: (p, v) => zigzag(p, num(v, "amount"), num(v, "ridges"), num(v, "style")),
  },
  {
    id: "dents",
    name: "Dents",
    group: "Distort",
    parameters: [
      range("size", "Size", 2, 500, 40, "px"),
      range("strength", "Strength", 0, 10, 2, undefined, 0.1),
    ],
    apply: (p, v, ctx) => dents(p, num(v, "size"), num(v, "strength"), ctx.seed),
  },
] as const satisfies readonly FilterDefinition[];
