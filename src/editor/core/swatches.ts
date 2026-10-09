import { parseHexColor } from "./color";

/**
 * Colour swatches (Swatches panel). They belong to the user, not to a document, so they live
 * outside the document store; the UI persists them locally.
 */
export interface Swatch {
  /** `#rrggbb` */
  readonly color: string;
  readonly name?: string;
}

export const MAX_SWATCHES = 300;
export const MAX_SWATCH_NAME_LENGTH = 64;

export const DEFAULT_SWATCHES: readonly Swatch[] = [
  "#000000",
  "#404040",
  "#808080",
  "#bfbfbf",
  "#ffffff",
  "#ff0000",
  "#ff8000",
  "#ffff00",
  "#80ff00",
  "#00ff00",
  "#00ff80",
  "#00ffff",
  "#0080ff",
  "#0000ff",
  "#8000ff",
  "#ff00ff",
  "#ff0080",
  "#800000",
  "#804000",
  "#808000",
  "#008000",
  "#008080",
  "#000080",
  "#400080",
  "#800040",
  "#ffc0c0",
  "#ffe0b0",
  "#ffffc0",
  "#c0ffc0",
  "#c0e0ff",
].map((color) => ({ color }));

/** Read stored swatches, dropping anything malformed; null when the value is not a list. */
export function parseSwatches(value: unknown): Swatch[] | null {
  if (!Array.isArray(value)) return null;
  const out: Swatch[] = [];
  for (const item of value.slice(0, MAX_SWATCHES)) {
    if (typeof item !== "object" || item === null) continue;
    const color = Object.hasOwn(item, "color") ? (item as { color: unknown }).color : undefined;
    const hex = typeof color === "string" ? parseHexColor(color) : null;
    if (!hex) continue;
    const name = Object.hasOwn(item, "name") ? (item as { name: unknown }).name : undefined;
    out.push(
      typeof name === "string" && name.trim()
        ? { color: hex, name: name.trim().slice(0, MAX_SWATCH_NAME_LENGTH) }
        : { color: hex },
    );
  }
  return out;
}

/** Add a swatch at the end, ignoring duplicates and the limit. */
export function addSwatch(swatches: readonly Swatch[], color: string): readonly Swatch[] {
  const hex = parseHexColor(color);
  if (!hex || swatches.length >= MAX_SWATCHES || swatches.some((s) => s.color === hex)) {
    return swatches;
  }
  return [...swatches, { color: hex }];
}
