import { DEFAULT_TEXT_STYLE, type TextStyle } from "./document/factory";
import type { ShapeKind } from "./document/types";
import type { SelectionMode } from "../selection/ops";

/** Tool options and colours. UI state: shared by tools and panels, never part of undo history. */

export type ToolId =
  | "move"
  | "marquee"
  | "lasso"
  | "wand"
  | "crop"
  | "eyedropper"
  | "brush"
  | "pencil"
  | "eraser"
  | "bucket"
  | "gradient"
  | "shape"
  | "text"
  | "hand"
  | "zoom";

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

export interface MarqueeSettings {
  readonly shape: "rect" | "ellipse";
  readonly mode: SelectionMode;
}

export interface LassoSettings {
  readonly kind: "freehand" | "polygonal";
  readonly mode: SelectionMode;
}

export interface FloodSettings {
  /** 0 … 255, largest per-channel difference from the clicked colour. */
  readonly tolerance: number;
  readonly contiguous: boolean;
  /** Sample the visible image instead of the active layer only. */
  readonly sampleAll: boolean;
}

export interface WandSettings extends FloodSettings {
  readonly mode: SelectionMode;
}

export interface GradientSettings {
  readonly kind: "linear" | "radial";
  /** Foreground → background, or foreground → transparent. */
  readonly to: "background" | "transparent";
  /** 0 … 1 */
  readonly opacity: number;
}

export interface EyedropperSettings {
  readonly sampleAll: boolean;
}

export interface ToolSettings {
  readonly move: { readonly autoSelect: boolean };
  readonly marquee: MarqueeSettings;
  readonly lasso: LassoSettings;
  readonly wand: WandSettings;
  readonly eyedropper: EyedropperSettings;
  readonly brush: BrushSettings;
  /** Pencil: hard, aliased edges; hardness is ignored. */
  readonly pencil: BrushSettings;
  readonly eraser: BrushSettings;
  readonly bucket: FloodSettings;
  readonly gradient: GradientSettings;
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
  marquee: { shape: "rect", mode: "replace" },
  lasso: { kind: "freehand", mode: "replace" },
  wand: { tolerance: 32, contiguous: true, sampleAll: false, mode: "replace" },
  eyedropper: { sampleAll: true },
  brush: { size: 24, hardness: 0.8, opacity: 1 },
  pencil: { size: 1, hardness: 1, opacity: 1 },
  eraser: { size: 40, hardness: 0.8, opacity: 1 },
  bucket: { tolerance: 32, contiguous: true, sampleAll: false },
  gradient: { kind: "linear", to: "background", opacity: 1 },
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
