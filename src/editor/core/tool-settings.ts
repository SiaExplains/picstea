import { DEFAULT_TEXT_STYLE, type TextStyle } from "./document/factory";
import type { ShapeKind } from "./document/types";

/** Tool options and colours. UI state: shared by tools and panels, never part of undo history. */

export type ToolId = "move" | "crop" | "brush" | "eraser" | "shape" | "text" | "hand" | "zoom";

export interface BrushSettings {
  /** Diameter in document pixels. */
  readonly size: number;
  /** 0 (soft) … 1 (hard) */
  readonly hardness: number;
  /** 0 … 1 */
  readonly opacity: number;
}

export interface ShapeSettings {
  readonly kind: ShapeKind;
  readonly fillEnabled: boolean;
  readonly fill: string;
  readonly strokeEnabled: boolean;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly cornerRadius: number;
}

export interface ToolSettings {
  readonly move: { readonly autoSelect: boolean };
  readonly brush: BrushSettings;
  readonly eraser: BrushSettings;
  readonly shape: ShapeSettings;
  /** Text colour comes from the foreground colour. */
  readonly text: Omit<TextStyle, "color">;
}

export interface Colors {
  readonly foreground: string;
  readonly background: string;
}

export const DEFAULT_COLORS: Colors = { foreground: "#000000", background: "#ffffff" };

export const MIN_BRUSH_SIZE = 1;
export const MAX_BRUSH_SIZE = 1000;

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  move: { autoSelect: true },
  brush: { size: 24, hardness: 0.8, opacity: 1 },
  eraser: { size: 40, hardness: 0.8, opacity: 1 },
  shape: {
    kind: "rect",
    fillEnabled: true,
    fill: "#4c8dff",
    strokeEnabled: false,
    stroke: "#000000",
    strokeWidth: 4,
    cornerRadius: 0,
  },
  text: {
    fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
    fontSize: DEFAULT_TEXT_STYLE.fontSize,
    fontWeight: DEFAULT_TEXT_STYLE.fontWeight,
    italic: DEFAULT_TEXT_STYLE.italic,
    align: DEFAULT_TEXT_STYLE.align,
    lineHeight: DEFAULT_TEXT_STYLE.lineHeight,
    letterSpacing: DEFAULT_TEXT_STYLE.letterSpacing,
  },
};

/** Brush size steps for [ and ], growing faster at larger sizes like professional editors. */
export function stepBrushSize(size: number, direction: 1 | -1): number {
  const step = size < 10 ? 1 : size < 50 ? 5 : size < 100 ? 10 : size < 300 ? 25 : 50;
  return Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, size + direction * step));
}
