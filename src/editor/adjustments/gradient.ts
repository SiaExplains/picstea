import { hexToRgb, parseHexColor } from "../core/color";
import type { GradientStop } from "../core/document/types";

/** Gradients for Gradient Map and the gradient overlay style (Gate 9h). */

export const MIN_GRADIENT_STOPS = 2;
export const MAX_GRADIENT_STOPS = 16;

const own = (o: object, key: string): unknown =>
  Object.hasOwn(o, key) ? (o as Record<string, unknown>)[key] : undefined;

/**
 * Validate stops from untrusted input: 2–16 stops, positions 0…1, hex colours. The order is
 * kept (the editor's rows stay put while a stop is dragged past another); users of the stops
 * sort them by position.
 */
export function parseGradientStops(value: unknown): GradientStop[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length < MIN_GRADIENT_STOPS || value.length > MAX_GRADIENT_STOPS) return null;
  const stops: GradientStop[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const position = own(item, "position");
    const color = own(item, "color");
    const hex = typeof color === "string" ? parseHexColor(color) : null;
    if (typeof position !== "number" || !Number.isFinite(position) || !hex) return null;
    if (position < 0 || position > 1) return null;
    stops.push({ position, color: hex });
  }
  return stops;
}

const sorted = (stops: readonly GradientStop[]) =>
  [...stops].sort((a, b) => a.position - b.position);

/** Colour at `t` (0…1) along the stops, interpolated linearly in RGB. */
export function gradientColor(
  unsorted: readonly GradientStop[],
  t: number,
  reverse = false,
): [number, number, number] {
  const stops = sorted(unsorted);
  const x = reverse ? 1 - t : t;
  if (x <= stops[0].position) return hexToRgb(stops[0].color);
  const last = stops[stops.length - 1];
  if (x >= last.position) return hexToRgb(last.color);
  for (let i = 1; i < stops.length; i++) {
    const b = stops[i];
    if (x > b.position) continue;
    const a = stops[i - 1];
    const span = b.position - a.position;
    const k = span > 0 ? (x - a.position) / span : 1;
    const ca = hexToRgb(a.color);
    const cb = hexToRgb(b.color);
    return [0, 1, 2].map((c) => ca[c] + (cb[c] - ca[c]) * k) as [number, number, number];
  }
  return hexToRgb(last.color);
}

/** 256-entry lookup table per channel: index = input level 0…255. */
export function gradientLut(
  stops: readonly GradientStop[],
  reverse = false,
): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const r = new Uint8ClampedArray(256);
  const g = new Uint8ClampedArray(256);
  const b = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const [cr, cg, cb] = gradientColor(stops, v / 255, reverse);
    r[v] = cr;
    g[v] = cg;
    b[v] = cb;
  }
  return [r, g, b];
}
