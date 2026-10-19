import type { RgbaPixels } from "../../selection/flood";
import { gaussianBlur, premultiply, unpremultiply } from "../kernels";
import { centerOf, clamp01, sampleBilinear } from "../sampling";
import { centerParams, num, range, toggle, bool, type FilterDefinition } from "../types";

/**
 * Blur Gallery (ADR-0036): blurs whose strength varies across the image. Photoshop places pins
 * on the canvas; here the same geometry is set with sliders, and the result is a mix of a few
 * pre-blurred copies, chosen per pixel by a 0–1 weight.
 */

/** Blur by `maxRadius` × weight(x, y), interpolating between four blur levels. */
export function variableBlur(
  pixels: RgbaPixels,
  maxRadius: number,
  weight: (x: number, y: number) => number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const levels = [0, 0.25, 0.5, 1];
  const copies = levels.map((l) =>
    l === 0 ? pixels.data : gaussianBlur(pixels, maxRadius * l).data,
  );
  const out = new Uint8ClampedArray(pixels.data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = clamp01(weight(x, y));
      let k = 0;
      while (k < levels.length - 2 && t > levels[k + 1]) k++;
      const f = (t - levels[k]) / (levels[k + 1] - levels[k]);
      const a = copies[k];
      const b = copies[k + 1];
      const i = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) out[i + c] = a[i + c] + (b[i + c] - a[i + c]) * f;
    }
  }
  return { width: w, height: h, data: out };
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
};

/** Field Blur: two pins, each with its own blur, blended along the line between them. */
export function fieldBlur(
  pixels: RgbaPixels,
  blur1: number,
  x1: number,
  y1: number,
  blur2: number,
  x2: number,
  y2: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const a = centerOf(w, h, x1, y1);
  const b = centerOf(w, h, x2, y2);
  const max = Math.max(blur1, blur2, 0.1);
  const vx = b.cx - a.cx;
  const vy = b.cy - a.cy;
  const len2 = vx * vx + vy * vy || 1;
  return variableBlur(pixels, max, (x, y) => {
    const t = clamp01(((x - a.cx) * vx + (y - a.cy) * vy) / len2);
    return (blur1 + (blur2 - blur1) * t) / max;
  });
}

/** Iris Blur: sharp inside an ellipse, blurring outward through a feathered edge. */
export function irisBlur(
  pixels: RgbaPixels,
  blur: number,
  cxPercent: number,
  cyPercent: number,
  rxPercent: number,
  ryPercent: number,
  angle: number,
  feather: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const { cx, cy } = centerOf(w, h, cxPercent, cyPercent);
  const rx = Math.max(1, (rxPercent / 100) * w);
  const ry = Math.max(1, (ryPercent / 100) * h);
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const inner = 1 - feather / 100;
  return variableBlur(pixels, blur, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const u = (dx * cos + dy * sin) / rx;
    const v = (-dx * sin + dy * cos) / ry;
    return smoothstep(inner, 1, Math.hypot(u, v));
  });
}

/** Tilt-Shift: a sharp band through the centre, blurring away from it on both sides. */
export function tiltShift(
  pixels: RgbaPixels,
  blur: number,
  cyPercent: number,
  angle: number,
  focusPercent: number,
  transitionPercent: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const { cx, cy } = centerOf(w, h, 50, cyPercent);
  const rad = (angle * Math.PI) / 180;
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);
  const focus = (focusPercent / 100) * h * 0.5;
  const transition = Math.max(1, (transitionPercent / 100) * h * 0.5);
  return variableBlur(pixels, blur, (x, y) => {
    const d = Math.abs((x - cx) * nx + (y - cy) * ny);
    return smoothstep(focus, focus + transition, d);
  });
}

/**
 * Path Blur: a motion blur along a curve, `angle`° and `distance` px long, bending by `curve`%
 * of its length. Centered spreads the streak both ways.
 */
export function pathBlur(
  pixels: RgbaPixels,
  angle: number,
  distance: number,
  curve: number,
  centered: boolean,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  const samples = Math.max(2, Math.min(64, Math.round(distance) + 1));
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = -Math.sin(rad);
  const bend = (curve / 100) * distance;
  const offsets = new Float64Array(samples * 2);
  for (let s = 0; s < samples; s++) {
    const u = s / (samples - 1);
    const t = (centered ? u - 0.5 : -u) * distance;
    const n = bend * (centered ? 4 * (u - 0.5) * (u - 0.5) : u * u);
    offsets[s * 2] = t * dx - n * dy;
    offsets[s * 2 + 1] = t * dy + n * dx;
  }
  const tmp = new Float32Array(4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let s = 0; s < samples; s++) {
        sampleBilinear(src, w, h, x + offsets[s * 2], y + offsets[s * 2 + 1], tmp, 0, "clamp");
        r += tmp[0];
        g += tmp[1];
        b += tmp[2];
        a += tmp[3];
      }
      const o = (y * w + x) * 4;
      out[o] = r / samples;
      out[o + 1] = g / samples;
      out[o + 2] = b / samples;
      out[o + 3] = a / samples;
    }
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

/** Spin Blur: a rotation blur of `angle`° inside an ellipse, fading out at its feathered edge. */
export function spinBlur(
  pixels: RgbaPixels,
  angle: number,
  cxPercent: number,
  cyPercent: number,
  radiusPercent: number,
  feather: number,
): RgbaPixels {
  const { width: w, height: h } = pixels;
  const { cx, cy } = centerOf(w, h, cxPercent, cyPercent);
  const radius = Math.max(1, (radiusPercent / 100) * Math.min(w, h));
  const src = premultiply(pixels.data);
  const out = new Uint8ClampedArray(src.length);
  const tmp = new Float32Array(4);
  const inner = 1 - feather / 100;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      const strength = 1 - smoothstep(inner, 1, d / radius);
      const o = (y * w + x) * 4;
      const span = (angle * strength * Math.PI) / 180;
      const samples = Math.max(1, Math.min(64, Math.ceil(d * span)));
      if (samples === 1) {
        for (let c = 0; c < 4; c++) out[o + c] = src[o + c];
        continue;
      }
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let s = 0; s < samples; s++) {
        const t = (s / (samples - 1) - 0.5) * span;
        const cos = Math.cos(t);
        const sin = Math.sin(t);
        sampleBilinear(
          src,
          w,
          h,
          cx + dx * cos - dy * sin,
          cy + dx * sin + dy * cos,
          tmp,
          0,
          "clamp",
        );
        r += tmp[0];
        g += tmp[1];
        b += tmp[2];
        a += tmp[3];
      }
      out[o] = r / samples;
      out[o + 1] = g / samples;
      out[o + 2] = b / samples;
      out[o + 3] = a / samples;
    }
  }
  return { width: w, height: h, data: unpremultiply(out) };
}

export const BLUR_GALLERY_FILTERS = [
  {
    id: "field-blur",
    name: "Field Blur",
    group: "Blur Gallery",
    parameters: [
      range("blur1", "Pin 1 blur", 0, 500, 15, "px"),
      range("x1", "Pin 1 X", 0, 100, 25, "%"),
      range("y1", "Pin 1 Y", 0, 100, 50, "%"),
      range("blur2", "Pin 2 blur", 0, 500, 0, "px"),
      range("x2", "Pin 2 X", 0, 100, 75, "%"),
      range("y2", "Pin 2 Y", 0, 100, 50, "%"),
    ],
    apply: (p, v) =>
      fieldBlur(
        p,
        num(v, "blur1"),
        num(v, "x1"),
        num(v, "y1"),
        num(v, "blur2"),
        num(v, "x2"),
        num(v, "y2"),
      ),
  },
  {
    id: "iris-blur",
    name: "Iris Blur",
    group: "Blur Gallery",
    parameters: [
      range("blur", "Blur", 0, 500, 15, "px"),
      ...centerParams(),
      range("rx", "Width", 1, 100, 30, "%"),
      range("ry", "Height", 1, 100, 30, "%"),
      range("angle", "Angle", -180, 180, 0, "°"),
      range("feather", "Feather", 0, 100, 50, "%"),
    ],
    apply: (p, v) =>
      irisBlur(
        p,
        num(v, "blur"),
        num(v, "cx"),
        num(v, "cy"),
        num(v, "rx"),
        num(v, "ry"),
        num(v, "angle"),
        num(v, "feather"),
      ),
  },
  {
    id: "tilt-shift",
    name: "Tilt-Shift",
    group: "Blur Gallery",
    parameters: [
      range("blur", "Blur", 0, 500, 15, "px"),
      range("cy", "Center Y", 0, 100, 50, "%"),
      range("angle", "Angle", -90, 90, 0, "°"),
      range("focus", "Focus band", 0, 100, 20, "%"),
      range("transition", "Transition", 1, 100, 30, "%"),
    ],
    apply: (p, v) =>
      tiltShift(
        p,
        num(v, "blur"),
        num(v, "cy"),
        num(v, "angle"),
        num(v, "focus"),
        num(v, "transition"),
      ),
  },
  {
    id: "path-blur",
    name: "Path Blur",
    group: "Blur Gallery",
    parameters: [
      range("angle", "Angle", -180, 180, 0, "°"),
      range("distance", "Speed", 1, 300, 40, "px"),
      range("curve", "Curve", -100, 100, 30, "%"),
      toggle("centered", "Centered blur", true),
    ],
    apply: (p, v) =>
      pathBlur(p, num(v, "angle"), num(v, "distance"), num(v, "curve"), bool(v, "centered")),
  },
  {
    id: "spin-blur",
    name: "Spin Blur",
    group: "Blur Gallery",
    parameters: [
      range("angle", "Blur angle", 0, 360, 15, "°"),
      ...centerParams(),
      range("radius", "Radius", 1, 100, 40, "%"),
      range("feather", "Feather", 0, 100, 20, "%"),
    ],
    apply: (p, v) =>
      spinBlur(p, num(v, "angle"), num(v, "cx"), num(v, "cy"), num(v, "radius"), num(v, "feather")),
  },
] as const satisfies readonly FilterDefinition[];
