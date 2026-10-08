import type { Adjustment } from "../core/document/types";

/**
 * Pure colour adjustments on straight (non-premultiplied) RGBA bytes, applied in place.
 * Alpha is never changed. These are deliberately simple, documented formulas so results are
 * identical in every browser and in exports (ADR-0008).
 */

export type Pixels = Uint8ClampedArray;

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

function eachPixel(data: Pixels, fn: (r: number, g: number, b: number, i: number) => void): void {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    fn(data[i], data[i + 1], data[i + 2], i);
  }
}

/** brightness, contrast: −100…100. */
export function brightnessContrast(data: Pixels, brightness: number, contrast: number): void {
  const offset = (brightness / 100) * 127.5;
  const c = (contrast / 100) * 255 * 0.99;
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = clamp255(factor * (v - 128) + 128 + offset);
  applyLut(data, lut, lut, lut);
}

/** exposure in stops (−5…5), gamma 0.1…10 (1 = unchanged). */
export function exposure(data: Pixels, stops: number, gamma: number): void {
  const gain = 2 ** stops;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++)
    lut[v] = clamp255(255 * Math.min(1, (v / 255) * gain) ** (1 / gamma));
  applyLut(data, lut, lut, lut);
}

/** temperature (warm +), tint (magenta +): −100…100. */
export function temperatureTint(data: Pixels, temperature: number, tint: number): void {
  const k = (temperature / 100) * 40;
  const m = (tint / 100) * 40;
  eachPixel(data, (r, g, b, i) => {
    data[i] = r + k;
    data[i + 1] = g - m;
    data[i + 2] = b - k;
  });
}

export function blackWhite(data: Pixels): void {
  eachPixel(data, (r, g, b, i) => {
    const y = luma(r, g, b);
    data[i] = data[i + 1] = data[i + 2] = y;
  });
}

export function invert(data: Pixels): void {
  eachPixel(data, (r, g, b, i) => {
    data[i] = 255 - r;
    data[i + 1] = 255 - g;
    data[i + 2] = 255 - b;
  });
}

/** levels: 2…255 tones per channel. */
export function posterize(data: Pixels, levels: number): void {
  const n = Math.max(2, Math.min(255, Math.round(levels)));
  const step = 255 / (n - 1);
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round(Math.round(v / step) * step);
  applyLut(data, lut, lut, lut);
}

/** Pixels with luminance ≥ level become white, others black. */
export function threshold(data: Pixels, level: number): void {
  eachPixel(data, (r, g, b, i) => {
    const v = luma(r, g, b) >= level ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  });
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = (((h % 360) + 360) % 360) / 360;
  const channel = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [channel(hk + 1 / 3) * 255, channel(hk) * 255, channel(hk - 1 / 3) * 255];
}

/** hue −180…180°, saturation and lightness −100…100. */
export function hueSaturation(
  data: Pixels,
  hue: number,
  saturation: number,
  lightness: number,
): void {
  const sat = 1 + saturation / 100;
  const light = lightness / 100;
  eachPixel(data, (r, g, b, i) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    let [nr, ng, nb] = hslToRgb(h + hue, Math.min(1, Math.max(0, s * sat)), l);
    if (light > 0) {
      nr += (255 - nr) * light;
      ng += (255 - ng) * light;
      nb += (255 - nb) * light;
    } else if (light < 0) {
      nr *= 1 + light;
      ng *= 1 + light;
      nb *= 1 + light;
    }
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  });
}

function applyLut(
  data: Pixels,
  r: Uint8ClampedArray,
  g: Uint8ClampedArray,
  b: Uint8ClampedArray,
): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r[data[i]];
    data[i + 1] = g[data[i + 1]];
    data[i + 2] = b[data[i + 2]];
  }
}

/** Apply any adjustment in place. */
export function applyAdjustment(data: Pixels, adjustment: Adjustment): void {
  switch (adjustment.type) {
    case "brightness-contrast":
      return brightnessContrast(data, adjustment.brightness, adjustment.contrast);
    case "hue-saturation":
      return hueSaturation(data, adjustment.hue, adjustment.saturation, adjustment.lightness);
    case "exposure":
      return exposure(data, adjustment.exposure, adjustment.gamma);
    case "temperature-tint":
      return temperatureTint(data, adjustment.temperature, adjustment.tint);
    case "black-white":
      return blackWhite(data);
    case "invert":
      return invert(data);
    case "posterize":
      return posterize(data, adjustment.levels);
    case "threshold":
      return threshold(data, adjustment.level);
  }
}
