import type { CurvePoint, LevelsChannel, ToneChannel, ToneChannels } from "../core/document/types";

/**
 * Levels and Curves (ADR-0014): both compile to one lookup table per channel. The composite RGB
 * table is applied first, then each colour channel's own table, like other editors.
 */

export const TONE_CHANNELS: readonly ToneChannel[] = ["rgb", "red", "green", "blue"];
export const TONE_CHANNEL_LABELS: Record<ToneChannel, string> = {
  rgb: "RGB",
  red: "Red",
  green: "Green",
  blue: "Blue",
};

export const NEUTRAL_LEVELS: LevelsChannel = {
  inBlack: 0,
  inWhite: 255,
  gamma: 1,
  outBlack: 0,
  outWhite: 255,
};

export const NEUTRAL_CURVE: readonly CurvePoint[] = [
  [0, 0],
  [255, 255],
];

export const MAX_CURVE_POINTS = 16;

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function levelsLut(l: LevelsChannel): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const span = Math.max(1, l.inWhite - l.inBlack);
  for (let v = 0; v < 256; v++) {
    const t = Math.min(1, Math.max(0, (v - l.inBlack) / span)) ** (1 / l.gamma);
    lut[v] = clamp255(l.outBlack + t * (l.outWhite - l.outBlack));
  }
  return lut;
}

/**
 * A curve through the control points (sorted by input) with monotone cubic (Fritsch–Carlson)
 * interpolation, so it never overshoots between points. Flat beyond the end points.
 */
export function curveLut(points: readonly CurvePoint[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const p = [...points].sort((a, b) => a[0] - b[0]);
  const n = p.length;
  if (n === 0) {
    for (let v = 0; v < 256; v++) lut[v] = v;
    return lut;
  }
  if (n === 1) return lut.fill(p[0][1]);
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(p[i + 1][0] - p[i][0]);
    slope.push((p[i + 1][1] - p[i][1]) / dx[i]);
  }
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    m.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  m.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let seg = 0;
  for (let v = 0; v < 256; v++) {
    if (v <= p[0][0]) {
      lut[v] = p[0][1];
      continue;
    }
    if (v >= p[n - 1][0]) {
      lut[v] = p[n - 1][1];
      continue;
    }
    while (v > p[seg + 1][0]) seg++;
    const h = dx[seg];
    const t = (v - p[seg][0]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    lut[v] = clamp255(
      (2 * t3 - 3 * t2 + 1) * p[seg][1] +
        (t3 - 2 * t2 + t) * h * m[seg] +
        (-2 * t3 + 3 * t2) * p[seg + 1][1] +
        (t3 - t2) * h * m[seg + 1],
    );
  }
  return lut;
}

/** Combine the RGB table with each channel's table: channel(rgb(v)). */
export function toneLuts<T>(
  channels: ToneChannels<T>,
  build: (settings: T) => Uint8ClampedArray,
): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const rgb = build(channels.rgb);
  const compose = (c: Uint8ClampedArray) => rgb.map((v) => c[v]);
  return [
    compose(build(channels.red)),
    compose(build(channels.green)),
    compose(build(channels.blue)),
  ];
}

const isByte = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 255;

export function parseLevelsChannel(value: unknown): LevelsChannel | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const { inBlack, inWhite, gamma, outBlack, outWhite } = v;
  if (!isByte(inBlack) || !isByte(inWhite) || !isByte(outBlack) || !isByte(outWhite)) return null;
  if (typeof gamma !== "number" || !Number.isFinite(gamma) || gamma < 0.1 || gamma > 9.99) {
    return null;
  }
  if (inWhite - inBlack < 2) return null;
  return { inBlack, inWhite, gamma, outBlack, outWhite };
}

/** 2…16 points with strictly increasing inputs, all within 0…255. */
export function parseCurve(value: unknown): readonly CurvePoint[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_CURVE_POINTS) return null;
  const out: CurvePoint[] = [];
  for (const point of value) {
    if (!Array.isArray(point) || point.length !== 2) return null;
    const [x, y] = point as unknown[];
    if (!isByte(x) || !isByte(y)) return null;
    if (out.length > 0 && x <= out[out.length - 1][0]) return null;
    out.push([x, y]);
  }
  return out;
}

export function parseToneChannels<T>(
  value: unknown,
  parse: (v: unknown) => T | null,
): ToneChannels<T> | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const rgb = parse(v.rgb);
  const red = parse(v.red);
  const green = parse(v.green);
  const blue = parse(v.blue);
  if (rgb === null || red === null || green === null || blue === null) return null;
  return { rgb, red, green, blue };
}

/** Insert a point into a curve (replacing one at the same input), keeping inputs increasing. */
export function addCurvePoint(points: readonly CurvePoint[], point: CurvePoint): CurvePoint[] {
  const x = Math.round(clamp255(point[0]));
  const y = Math.round(clamp255(point[1]));
  const rest = points.filter((p) => p[0] !== x);
  if (rest.length >= MAX_CURVE_POINTS) return [...points];
  return [...rest, [x, y] as CurvePoint].sort((a, b) => a[0] - b[0]);
}

/**
 * Move point `index` to `to`, kept between its neighbours' inputs (exclusive) so the order never
 * changes while dragging.
 */
export function moveCurvePoint(
  points: readonly CurvePoint[],
  index: number,
  to: CurvePoint,
): CurvePoint[] {
  const lo = index > 0 ? points[index - 1][0] + 1 : 0;
  const hi = index < points.length - 1 ? points[index + 1][0] - 1 : 255;
  const x = Math.round(Math.min(hi, Math.max(lo, to[0])));
  const y = Math.round(clamp255(to[1]));
  return points.map((p, i) => (i === index ? ([x, y] as CurvePoint) : p));
}

/** Remove a point; the two end points of a two-point curve stay. */
export function removeCurvePoint(points: readonly CurvePoint[], index: number): CurvePoint[] {
  if (points.length <= 2) return [...points];
  return points.filter((_, i) => i !== index);
}

/** 256-bin luminance histogram (or one channel) of straight RGBA, ignoring transparent pixels. */
export function histogram(data: Uint8ClampedArray, channel: ToneChannel = "rgb"): Uint32Array {
  const bins = new Uint32Array(256);
  const offset = channel === "red" ? 0 : channel === "green" ? 1 : channel === "blue" ? 2 : -1;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const v =
      offset >= 0
        ? data[i + offset]
        : Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    bins[v]++;
  }
  return bins;
}
