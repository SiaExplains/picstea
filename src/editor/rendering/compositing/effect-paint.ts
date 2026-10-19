import { hexToRgb } from "../../core/color";
import type { GradientStop } from "../../core/document/types";
import {
  evaluateContour,
  type Contour,
  type GradientMethod,
  type GradientStyle,
  type PatternId,
} from "../../core/effects/model";

/**
 * Paint for layer styles (ADR-0030): contour lookup tables, gradients in every style and
 * interpolation method, and the built-in patterns. Plain 2D canvas, so it runs in the render
 * worker too.
 */

export type Surface = HTMLCanvasElement | OffscreenCanvas;
export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type MakeSurface = (width: number, height: number) => Surface;

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function context(surface: Surface, willRead = false): Ctx {
  const ctx = surface.getContext(
    "2d",
    willRead ? { willReadFrequently: true } : undefined,
  ) as Ctx | null;
  if (!ctx) throw new Error("2D canvas is not available.");
  return ctx;
}

/** Whether a canvas can read its pixels back (the test doubles cannot). */
export const canReadPixels = (ctx: Ctx) => typeof ctx.getImageData === "function";

// ---------------------------------------------------------------------------------------------
// Contours and noise

export const isLinearContour = (c: Contour) =>
  c.points.length === 2 &&
  c.points[0].x === 0 &&
  c.points[0].y === 0 &&
  c.points[1].x === 1 &&
  c.points[1].y === 1;

/**
 * 256-entry table: input level → output level through the contour. `range` (0.01…1, glows and
 * bevels) stretches the input so that 50% is the identity; anti-aliasing smooths sharp corners.
 */
export function contourLut(contour: Contour, antiAlias = false, range = 0.5): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const stretch = 0.5 / Math.max(0.01, range);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(evaluateContour(contour, Math.min(1, (i / 255) * stretch)) * 255);
  }
  if (!antiAlias) return lut;
  const smooth = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const a = lut[Math.max(0, i - 2)];
    const b = lut[Math.max(0, i - 1)];
    const c = lut[i];
    const d = lut[Math.min(255, i + 1)];
    const e = lut[Math.min(255, i + 2)];
    smooth[i] = Math.round((a + b * 2 + c * 3 + d * 2 + e) / 9);
  }
  return smooth;
}

/** A repeatable pseudo-random value in [0, 1) for a pixel index, so noise never flickers. */
export function hashNoise(index: number, seed = 0): number {
  let h = (index ^ (seed * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Remap the alpha of a surface through a table, then darken it randomly by `noise` (0…1). */
export function mapAlpha(
  surface: Surface,
  lut: Uint8ClampedArray | null,
  noise = 0,
  seed = 0,
): void {
  const ctx = context(surface, true);
  if (!canReadPixels(ctx) || (!lut && noise <= 0)) return;
  const image = ctx.getImageData(0, 0, surface.width, surface.height);
  const d = image.data;
  for (let i = 3, p = 0; i < d.length; i += 4, p++) {
    if (d[i] === 0 && !(lut && lut[0] > 0)) continue;
    let a = lut ? lut[d[i]] : d[i];
    if (noise > 0) a *= 1 - noise * hashNoise(p, seed);
    d[i] = a;
  }
  ctx.putImageData(image, 0, 0);
}

// ---------------------------------------------------------------------------------------------
// Gradients

type Rgb = readonly [number, number, number];

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};

function toOklab([r, g, b]: Rgb): Rgb {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, A, B]: Rgb): Rgb {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Colour between two sRGB colours with Photoshop's interpolation methods. */
export function mixColor(a: Rgb, b: Rgb, k: number, method: GradientMethod): Rgb {
  if (method === "perceptual") {
    const la = toOklab(a);
    const lb = toOklab(b);
    return fromOklab([0, 1, 2].map((i) => la[i] + (lb[i] - la[i]) * k) as unknown as Rgb);
  }
  if (method === "linear") {
    return [0, 1, 2].map((i) =>
      fromLinear(toLinear(a[i]) + (toLinear(b[i]) - toLinear(a[i])) * k),
    ) as unknown as Rgb;
  }
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)) as unknown as Rgb;
}

export interface ColorStop {
  readonly offset: number;
  readonly color: string;
}

const css = ([r, g, b]: Rgb) => `rgb(${r},${g},${b})`;

/**
 * Canvas colour stops for gradient stops: sorted, optionally reversed and mirrored (reflected
 * gradients run from the middle out), with extra stops so canvas' sRGB interpolation follows
 * the perceptual and linear methods.
 */
export function canvasStops(
  stops: readonly GradientStop[],
  reverse: boolean,
  method: GradientMethod,
  reflected = false,
): ColorStop[] {
  const sorted = [...stops]
    .map((s) => ({ position: reverse ? 1 - s.position : s.position, rgb: hexToRgb(s.color) }))
    .sort((a, b) => a.position - b.position);
  const steps = method === "classic" ? 1 : 8;
  const line: { t: number; rgb: Rgb }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (i === 0 || steps === 1) {
      line.push({ t: s.position, rgb: s.rgb });
      continue;
    }
    const p = sorted[i - 1];
    for (let k = 1; k <= steps; k++) {
      line.push({
        t: p.position + ((s.position - p.position) * k) / steps,
        rgb: mixColor(p.rgb, s.rgb, k / steps, method),
      });
    }
  }
  const out: ColorStop[] = [];
  if (reflected) {
    for (let i = line.length - 1; i >= 0; i--)
      out.push({ offset: 0.5 - line[i].t / 2, color: css(line[i].rgb) });
    for (const s of line) out.push({ offset: 0.5 + s.t / 2, color: css(s.rgb) });
  } else {
    for (const s of line) out.push({ offset: s.t, color: css(s.rgb) });
  }
  return out;
}

export interface GradientSpec {
  readonly stops: readonly GradientStop[];
  readonly reverse: boolean;
  readonly style: GradientStyle;
  readonly method: GradientMethod;
  /** Degrees, counter-clockwise from +x (90° = bottom to top). */
  readonly angle: number;
  readonly scale: number;
  /** Fractions of the box. */
  readonly offsetX: number;
  readonly offsetY: number;
}

/** The centre and half-length of a gradient across a box. */
export function gradientGeometry(box: Box, angle: number, scale: number, offsetX = 0, offsetY = 0) {
  const rad = (angle * Math.PI) / 180;
  const half =
    ((Math.abs(Math.cos(rad)) * box.width + Math.abs(Math.sin(rad)) * box.height) / 2) * scale;
  return {
    cx: box.x + box.width / 2 + offsetX * box.width,
    cy: box.y + box.height / 2 + offsetY * box.height,
    ux: Math.cos(rad),
    uy: -Math.sin(rad),
    half: Math.max(0.5, half),
  };
}

const addStops = (g: CanvasGradient, stops: readonly ColorStop[]) => {
  for (const s of stops) g.addColorStop(Math.min(1, Math.max(0, s.offset)), s.color);
};

/** Fill the whole surface with a gradient laid out over `box`. */
export function fillGradient(ctx: Ctx, surface: Surface, box: Box, spec: GradientSpec): void {
  const { cx, cy, ux, uy, half } = gradientGeometry(
    box,
    spec.angle,
    spec.scale,
    spec.offsetX,
    spec.offsetY,
  );
  const W = surface.width;
  const H = surface.height;
  ctx.save();
  switch (spec.style) {
    case "linear":
    case "reflected": {
      const reflected = spec.style === "reflected";
      const g = ctx.createLinearGradient(
        cx - ux * half,
        cy - uy * half,
        cx + ux * half,
        cy + uy * half,
      );
      addStops(g, canvasStops(spec.stops, spec.reverse, spec.method, reflected));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case "radial": {
      const r = (Math.hypot(box.width, box.height) / 2) * spec.scale;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(0.5, r));
      addStops(g, canvasStops(spec.stops, spec.reverse, spec.method));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case "angle": {
      const stops = canvasStops(spec.stops, spec.reverse, spec.method);
      if (typeof ctx.createConicGradient === "function") {
        // Canvas starts at +x and turns clockwise; Photoshop turns counter-clockwise.
        const g = ctx.createConicGradient(Math.atan2(uy, ux), cx, cy);
        for (const s of stops) g.addColorStop(1 - Math.min(1, Math.max(0, s.offset)), s.color);
        ctx.fillStyle = g;
      } else {
        const g = ctx.createLinearGradient(
          cx - ux * half,
          cy - uy * half,
          cx + ux * half,
          cy + uy * half,
        );
        addStops(g, stops);
        ctx.fillStyle = g;
      }
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case "diamond": {
      // |u| + |v| in the gradient's frame: four triangles, each a linear gradient along its
      // diagonal.
      const stops = canvasStops(spec.stops, spec.reverse, spec.method);
      const far = Math.hypot(W, H) + Math.hypot(cx, cy) + half * 4;
      const vx = -uy;
      const vy = ux;
      for (const [su, sv] of [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1],
      ]) {
        const ax = ux * su;
        const ay = uy * su;
        const bx = vx * sv;
        const by = vy * sv;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + ax * far, cy + ay * far);
        ctx.lineTo(cx + (ax + bx) * far, cy + (ay + by) * far);
        ctx.lineTo(cx + bx * far, cy + by * far);
        ctx.closePath();
        ctx.clip();
        const g = ctx.createLinearGradient(
          cx,
          cy,
          cx + ((ax + bx) * half) / 2,
          cy + ((ay + by) * half) / 2,
        );
        addStops(g, stops);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
}

/** Break up banding: ±½ level of repeatable noise on every colour channel. */
export function dither(surface: Surface): void {
  const ctx = context(surface, true);
  if (!canReadPixels(ctx)) return;
  const image = ctx.getImageData(0, 0, surface.width, surface.height);
  const d = image.data;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    if (d[i + 3] === 0) continue;
    const n = hashNoise(p, 7) - 0.5;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);
}

// ---------------------------------------------------------------------------------------------
// Patterns

const LIGHT = "#d9d9d9";
const DARK = "#595959";

/** Draw one tile of a built-in pattern (document pixels). */
function drawTile(id: PatternId, make: MakeSurface): Surface {
  const size = id === "bricks" ? [32, 16] : id === "noise" ? [64, 64] : [16, 16];
  const tile = make(size[0], size[1]);
  const t = context(tile);
  const [w, h] = size;
  t.fillStyle = LIGHT;
  t.fillRect(0, 0, w, h);
  t.fillStyle = DARK;
  t.strokeStyle = DARK;
  switch (id) {
    case "checker":
      t.fillRect(0, 0, 8, 8);
      t.fillRect(8, 8, 8, 8);
      break;
    case "stripes":
      t.fillRect(0, 0, w, 8);
      break;
    case "diagonal-stripes":
      t.lineWidth = 4;
      t.beginPath();
      for (const o of [-16, 0, 16]) {
        t.moveTo(o, 16);
        t.lineTo(o + 16, 0);
      }
      t.stroke();
      break;
    case "dots":
      t.beginPath();
      t.arc(8, 8, 4, 0, Math.PI * 2);
      t.fill();
      break;
    case "grid":
      t.fillRect(0, 0, w, 2);
      t.fillRect(0, 0, 2, h);
      break;
    case "bricks":
      t.fillRect(0, 0, w, 2);
      t.fillRect(0, 8, w, 2);
      t.fillRect(0, 0, 2, 8);
      t.fillRect(16, 8, 2, 8);
      break;
    case "waves":
      t.lineWidth = 3;
      t.beginPath();
      for (let x = 0; x <= w; x++) {
        const y = 8 + Math.sin((x / w) * Math.PI * 2) * 4;
        if (x === 0) t.moveTo(x, y);
        else t.lineTo(x, y);
      }
      t.stroke();
      break;
    case "crosshatch":
      t.lineWidth = 2;
      t.beginPath();
      t.moveTo(0, 0);
      t.lineTo(16, 16);
      t.moveTo(16, 0);
      t.lineTo(0, 16);
      t.stroke();
      break;
    case "diamonds":
      t.beginPath();
      t.moveTo(8, 1);
      t.lineTo(15, 8);
      t.lineTo(8, 15);
      t.lineTo(1, 8);
      t.closePath();
      t.fill();
      break;
    case "noise":
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const v = Math.round(64 + hashNoise(y * w + x, 3) * 160);
          t.fillStyle = `rgb(${v},${v},${v})`;
          t.fillRect(x, y, 1, 1);
        }
      }
      break;
  }
  return tile;
}

export interface PatternPlacement {
  readonly pattern: PatternId;
  /** Surface pixels per pattern pixel. */
  readonly scale: number;
  readonly angle: number;
  /** Where a tile's corner lies, in surface pixels. */
  readonly originX: number;
  readonly originY: number;
}

/** Fill the whole surface with a repeating built-in pattern. */
export function fillPattern(
  ctx: Ctx,
  surface: Surface,
  make: MakeSurface,
  place: PatternPlacement,
) {
  const tile = drawTile(place.pattern, make);
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  const scale = Math.max(0.01, place.scale);
  const reach =
    (Math.hypot(surface.width, surface.height) + Math.hypot(place.originX, place.originY)) / scale;
  ctx.save();
  ctx.translate(place.originX, place.originY);
  ctx.rotate((-place.angle * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.fillStyle = pattern;
  ctx.fillRect(-reach, -reach, reach * 2, reach * 2);
  ctx.restore();
  tile.width = tile.height = 0;
}
