import { hexToRgb } from "../core/color";
import type { ColorBalanceRange, GradientStop, MixerRow } from "../core/document/types";
import { gradientLut } from "./gradient";
import type { Pixels } from "./pixel-ops";

/**
 * Colour adjustments added in Gate 9h (ADR-0021): Vibrance, Color Balance, Photo Filter,
 * Channel Mixer and Gradient Map. Pure functions on straight RGBA bytes, in place; alpha is
 * never changed and fully transparent pixels are skipped.
 */

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

function each(data: Pixels, fn: (i: number) => void): void {
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] !== 0) fn(i);
}

/** Shift r, g, b equally so the pixel's luma is `target` again. */
function restoreLuma(data: Pixels, i: number, target: number): void {
  const shift = target - luma(data[i], data[i + 1], data[i + 2]);
  data[i] = clamp255(data[i] + shift);
  data[i + 1] = clamp255(data[i + 1] + shift);
  data[i + 2] = clamp255(data[i + 2] + shift);
}

/**
 * Vibrance (−100…100) raises the saturation of muted colours more than of vivid ones;
 * Saturation (−100…100) scales every colour's distance from grey.
 */
export function vibrance(data: Pixels, amount: number, saturation: number): void {
  const v = amount / 100;
  const s = 1 + saturation / 100;
  each(data, (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    const factor = s * (1 + v * (1 - sat));
    const y = luma(r, g, b);
    data[i] = clamp255(y + (r - y) * factor);
    data[i + 1] = clamp255(y + (g - y) * factor);
    data[i + 2] = clamp255(y + (b - y) * factor);
  });
}

/** How much a channel level (0…1) belongs to each tonal range. */
const rangeWeights = (l: number) => ({
  shadows: (1 - l) * (1 - l),
  midtones: 4 * l * (1 - l),
  highlights: l * l,
});

/** At ±100 a level fully in a range moves by this much (of 255). */
const BALANCE_REACH = 0.3;

/**
 * Color Balance: per range, cyan–red moves the red channel, magenta–green the green and
 * yellow–blue the blue (−100…100). With `preserveLuminosity`, each pixel's luma is restored.
 */
export function colorBalance(
  data: Pixels,
  ranges: {
    shadows: ColorBalanceRange;
    midtones: ColorBalanceRange;
    highlights: ColorBalanceRange;
  },
  preserveLuminosity: boolean,
): void {
  const keys = ["cyanRed", "magentaGreen", "yellowBlue"] as const;
  const luts = keys.map((key) => {
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      const w = rangeWeights(v / 255);
      const shift =
        (w.shadows * ranges.shadows[key] +
          w.midtones * ranges.midtones[key] +
          w.highlights * ranges.highlights[key]) /
        100;
      lut[v] = clamp255(v + shift * BALANCE_REACH * 255);
    }
    return lut;
  });
  each(data, (i) => {
    const before = luma(data[i], data[i + 1], data[i + 2]);
    data[i] = luts[0][data[i]];
    data[i + 1] = luts[1][data[i + 1]];
    data[i + 2] = luts[2][data[i + 2]];
    if (preserveLuminosity) restoreLuma(data, i, before);
  });
}

/**
 * Photo Filter: like a coloured lens — the image is mixed with itself multiplied by `color` by
 * `density` (1…100 %). With `preserveLuminosity` the brightness is kept.
 */
export function photoFilter(
  data: Pixels,
  color: string,
  density: number,
  preserveLuminosity: boolean,
): void {
  const [fr, fg, fb] = hexToRgb(color).map((c) => c / 255);
  const d = Math.min(1, Math.max(0, density / 100));
  each(data, (i) => {
    const before = luma(data[i], data[i + 1], data[i + 2]);
    data[i] = clamp255(data[i] * (1 - d + d * fr));
    data[i + 1] = clamp255(data[i + 1] * (1 - d + d * fg));
    data[i + 2] = clamp255(data[i + 2] * (1 - d + d * fb));
    if (preserveLuminosity) restoreLuma(data, i, before);
  });
}

/**
 * Channel Mixer: each output channel is a mix of the inputs (−200…200 % each) plus a constant
 * (−200…200 % of white). Monochrome uses the first row for all three.
 */
export function channelMixer(
  data: Pixels,
  rows: { red: MixerRow; green: MixerRow; blue: MixerRow },
  monochrome: boolean,
): void {
  const out = monochrome ? [rows.red, rows.red, rows.red] : [rows.red, rows.green, rows.blue];
  each(data, (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    for (let c = 0; c < 3; c++) {
      const row = out[c];
      data[i + c] = clamp255(
        (r * row.red + g * row.green + b * row.blue + 255 * row.constant) / 100,
      );
    }
  });
}

/** Gradient Map: each pixel's luma picks a colour along the gradient (dark → first stop). */
export function gradientMap(data: Pixels, stops: readonly GradientStop[], reverse: boolean): void {
  const [lr, lg, lb] = gradientLut(stops, reverse);
  each(data, (i) => {
    const y = Math.round(luma(data[i], data[i + 1], data[i + 2]));
    data[i] = lr[y];
    data[i + 1] = lg[y];
    data[i + 2] = lb[y];
  });
}
