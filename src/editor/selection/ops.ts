import { createSelection, type SelectionMask } from "./mask";

export type SelectionMode = "replace" | "add" | "subtract" | "intersect";

export const SELECTION_MODES: readonly SelectionMode[] = [
  "replace",
  "add",
  "subtract",
  "intersect",
];

/** The mode implied by modifier keys while drawing (Shift add, Alt subtract, both intersect). */
export function modeFromModifiers(
  base: SelectionMode,
  shiftKey: boolean,
  altKey: boolean,
): SelectionMode {
  if (shiftKey && altKey) return "intersect";
  if (shiftKey) return "add";
  if (altKey) return "subtract";
  return base;
}

/**
 * Combine a new shape with the current selection. Returns null when the result selects nothing,
 * so "no selection" has a single representation.
 */
export function combineSelections(
  current: SelectionMask | null | undefined,
  shape: SelectionMask,
  mode: SelectionMode,
): SelectionMask | null {
  if (mode === "replace" || !current) {
    if (mode === "subtract" || mode === "intersect") return null;
    return shape.bounds ? shape : null;
  }
  if (current.width !== shape.width || current.height !== shape.height) {
    throw new RangeError("Selections must have the same size.");
  }
  const a = current.data;
  const b = shape.data;
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    switch (mode) {
      case "add":
        out[i] = a[i] > b[i] ? a[i] : b[i];
        break;
      case "subtract":
        out[i] = Math.round((a[i] * (255 - b[i])) / 255);
        break;
      case "intersect":
        out[i] = a[i] < b[i] ? a[i] : b[i];
        break;
    }
  }
  const result = createSelection(current.width, current.height, out);
  return result.bounds ? result : null;
}

export function invertSelection(
  mask: SelectionMask | null | undefined,
  width: number,
  height: number,
): SelectionMask | null {
  const out = new Uint8Array(width * height);
  if (!mask) out.fill(255);
  else for (let i = 0; i < out.length; i++) out[i] = 255 - mask.data[i];
  const result = createSelection(width, height, out);
  return result.bounds ? result : null;
}

/** Move the selection outline by whole pixels; coverage pushed off the canvas is lost. */
export function translateSelection(
  mask: SelectionMask,
  dx: number,
  dy: number,
): SelectionMask | null {
  const ox = Math.round(dx);
  const oy = Math.round(dy);
  if (ox === 0 && oy === 0) return mask;
  const { width, height, data } = mask;
  const out = new Uint8Array(width * height);
  const b = mask.bounds;
  if (b) {
    for (let y = b.y; y < b.y + b.height; y++) {
      const ty = y + oy;
      if (ty < 0 || ty >= height) continue;
      for (let x = b.x; x < b.x + b.width; x++) {
        const tx = x + ox;
        if (tx < 0 || tx >= width) continue;
        out[ty * width + tx] = data[y * width + x];
      }
    }
  }
  const result = createSelection(width, height, out);
  return result.bounds ? result : null;
}
