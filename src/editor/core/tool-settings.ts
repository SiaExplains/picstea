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
  | "clone"
  | "heal"
  | "tone"
  | "focus"
  | "bucket"
  | "gradient"
  | "shape"
  | "pen"
  | "path-select"
  | "text"
  | "hand"
  | "zoom"
  // Photoshop-style group members (ADR-0027).
  | "spot-heal"
  | "red-eye"
  | "bg-eraser"
  | "magic-eraser"
  | "color-replace"
  | "color-sampler"
  | "ruler"
  | "path-move"
  | "anchor-add"
  | "anchor-delete"
  | "anchor-convert";

export interface BrushSettings {
  /** Diameter in document pixels. */
  readonly size: number;
  /** 0 (soft) … 1 (hard) */
  readonly hardness: number;
  /** 0 … 1 */
  readonly opacity: number;
}

export interface ShapeSettings {
  /** Paths come from the Pen tool; a polygon is drawn as an editable path shape. */
  readonly kind: Exclude<ShapeKind, "path"> | "polygon";
  /** Polygon corners, 3 … 64. */
  readonly sides: number;
  readonly fillEnabled: boolean;
  readonly fill: string;
  readonly strokeEnabled: boolean;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly cornerRadius: number;
}

export interface PenSettings {
  /** Shape: the finished path becomes a shape layer (Shape tool fill/stroke). Path: the work path. */
  readonly mode: "shape" | "path";
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

/** Clone Stamp and Healing Brush (ADR-0019). */
export interface SourceBrushSettings {
  readonly size: number;
  readonly hardness: number;
  /** 0 … 1 (the healing brush always paints at full opacity). */
  readonly opacity: number;
  /** Keep the same source offset for every stroke, or restart at the source each time. */
  readonly aligned: boolean;
  /** Sample the active layer only, or everything visible. */
  readonly sample: "current" | "all";
}

/** Dodge, Burn and Sponge. */
export interface ToneSettings {
  readonly size: number;
  readonly hardness: number;
  readonly mode: "dodge" | "burn" | "sponge";
  readonly range: "shadows" | "midtones" | "highlights";
  /** Dodge/burn exposure, 0 … 1. */
  readonly exposure: number;
  readonly sponge: "saturate" | "desaturate";
  /** Sponge flow, 0 … 1. */
  readonly flow: number;
}

/** Blur, Sharpen and Smudge. */
export interface FocusSettings {
  readonly size: number;
  readonly hardness: number;
  readonly mode: "blur" | "sharpen" | "smudge";
  /** 0 … 1 */
  readonly strength: number;
}

/** Spot Healing Brush: heals from the surroundings it picks itself. */
export interface TipSettings {
  readonly size: number;
  readonly hardness: number;
}

/** Background Eraser and Color Replacement: act on colours like the one under the first dab. */
export interface SampledBrushSettings extends TipSettings {
  /** 0 … 255, largest per-channel difference from the sampled colour. */
  readonly tolerance: number;
}

export interface RedEyeSettings {
  /** Pupil brush size in document pixels. */
  readonly size: number;
  /** How dark the repaired pupil becomes, 0 … 1. */
  readonly darken: number;
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
  readonly clone: SourceBrushSettings;
  readonly heal: SourceBrushSettings;
  readonly tone: ToneSettings;
  readonly focus: FocusSettings;
  readonly bucket: FloodSettings;
  readonly gradient: GradientSettings;
  readonly shape: ShapeSettings;
  readonly pen: PenSettings;
  /** Text colour comes from the foreground colour. */
  readonly text: Omit<TextStyle, "color">;
  readonly "spot-heal": TipSettings;
  readonly "red-eye": RedEyeSettings;
  readonly "bg-eraser": SampledBrushSettings;
  readonly "color-replace": SampledBrushSettings;
  readonly "magic-eraser": FloodSettings;
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
  clone: { size: 40, hardness: 0.5, opacity: 1, aligned: true, sample: "current" },
  heal: { size: 30, hardness: 0.5, opacity: 1, aligned: true, sample: "current" },
  tone: {
    size: 60,
    hardness: 0,
    mode: "dodge",
    range: "midtones",
    exposure: 0.5,
    sponge: "desaturate",
    flow: 0.5,
  },
  focus: { size: 40, hardness: 0, mode: "blur", strength: 0.5 },
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
    sides: 6,
  },
  pen: { mode: "shape" },
  text: {
    fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
    fontSize: DEFAULT_TEXT_STYLE.fontSize,
    fontWeight: DEFAULT_TEXT_STYLE.fontWeight,
    italic: DEFAULT_TEXT_STYLE.italic,
    align: DEFAULT_TEXT_STYLE.align,
    lineHeight: DEFAULT_TEXT_STYLE.lineHeight,
    letterSpacing: DEFAULT_TEXT_STYLE.letterSpacing,
  },
  "spot-heal": { size: 30, hardness: 0.5 },
  "red-eye": { size: 30, darken: 0.5 },
  "bg-eraser": { size: 40, hardness: 0.8, tolerance: 40 },
  "color-replace": { size: 30, hardness: 0.6, tolerance: 60 },
  "magic-eraser": { tolerance: 32, contiguous: true, sampleAll: false },
};

/** Brush size steps for [ and ], growing faster at larger sizes like professional editors. */
export function stepBrushSize(size: number, direction: 1 | -1): number {
  const step = size < 10 ? 1 : size < 50 ? 5 : size < 100 ? 10 : size < 300 ? 25 : 50;
  return Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, size + direction * step));
}
