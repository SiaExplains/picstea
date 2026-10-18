/**
 * Picstea document model (docs/03_DOCUMENT_MODEL.md).
 *
 * Documents are immutable values: every edit produces a new document that shares unchanged
 * structure with the previous one. Pixel data never lives in the document — raster layers
 * reference immutable assets by id (see src/editor/assets).
 */

import type { SelectionMask } from "../../selection/mask";
import type { VectorPath } from "../path/path";

export const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
] as const;

export type BlendMode = (typeof BLEND_MODES)[number];

/** Groups can also pass blending straight through to the layers below (the default for groups). */
export type GroupBlendMode = BlendMode | "pass-through";

export type ColorSpace = "srgb";

/** Placement of a layer's content in document pixels. Rotation is in degrees, about the layer origin. */
export interface Transform {
  readonly x: number;
  readonly y: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
}

/**
 * Raster layer mask in document space. Alpha is the reveal amount (opaque = visible). The mask
 * covers its own rectangle; outside it everything is revealed. `assetId: null` reveals all.
 */
export interface LayerMask {
  readonly assetId: string | null;
  readonly enabled: boolean;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Moves with the layer when the layer is moved. */
  readonly linked: boolean;
}

export interface DropShadowEffect {
  readonly enabled: boolean;
  readonly color: string;
  /** 0..1 */
  readonly opacity: number;
  /** Degrees; the light comes from this direction, the shadow falls opposite. */
  readonly angle: number;
  readonly distance: number;
  readonly blur: number;
}

export interface OuterGlowEffect {
  readonly enabled: boolean;
  readonly color: string;
  readonly opacity: number;
  readonly size: number;
}

export interface StrokeEffect {
  readonly enabled: boolean;
  readonly color: string;
  readonly opacity: number;
  /** Outside stroke width in px. */
  readonly size: number;
}

export interface ColorOverlayEffect {
  readonly enabled: boolean;
  readonly color: string;
  readonly opacity: number;
}

/** A colour at a position (0…1) along a gradient (Gradient Map, gradient overlay). */
export interface GradientStop {
  readonly position: number;
  /** `#rrggbb` */
  readonly color: string;
}

/** Shadow cast inside the layer's edges (Gate 9h). */
export interface InnerShadowEffect {
  readonly enabled: boolean;
  readonly color: string;
  readonly opacity: number;
  readonly angle: number;
  readonly distance: number;
  readonly blur: number;
}

/**
 * Inner bevel: a highlight on the edges facing the light and a shadow on the others. `color` and
 * `opacity` are the highlight's.
 */
export interface BevelEffect {
  readonly enabled: boolean;
  readonly color: string;
  readonly opacity: number;
  readonly shadowColor: string;
  readonly shadowOpacity: number;
  /** Degrees, like the drop shadow's light angle. */
  readonly angle: number;
  /** Width of the bevel in px. */
  readonly size: number;
  /** "up" raises the shape; "down" presses it in. */
  readonly direction: "up" | "down";
}

export interface GradientOverlayEffect {
  readonly enabled: boolean;
  readonly opacity: number;
  readonly angle: number;
  readonly stops: readonly GradientStop[];
  readonly reverse: boolean;
}

export interface LayerEffects {
  readonly dropShadow?: DropShadowEffect;
  readonly outerGlow?: OuterGlowEffect;
  readonly innerShadow?: InnerShadowEffect;
  readonly bevel?: BevelEffect;
  readonly gradientOverlay?: GradientOverlayEffect;
  readonly stroke?: StrokeEffect;
  readonly colorOverlay?: ColorOverlayEffect;
}

export type EffectKind = keyof LayerEffects;

/**
 * Vector mask (ADR-0015): the layer shows only inside the filled path (even-odd). The path is in
 * document space and, when linked, moves with the layer.
 */
export interface VectorMask {
  readonly path: VectorPath;
  readonly enabled: boolean;
  readonly linked: boolean;
}

/** Colour tags for organising the Layers panel (Photoshop's layer colours). */
export const LAYER_LABELS = ["red", "orange", "yellow", "green", "blue", "violet", "gray"] as const;

export type LayerLabel = (typeof LAYER_LABELS)[number];

export interface BaseLayer {
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  /** 0..1 */
  readonly opacity: number;
  readonly blendMode: BlendMode;
  readonly transform: Transform;
  readonly mask?: LayerMask;
  readonly vectorMask?: VectorMask;
  readonly effects?: LayerEffects;
  /**
   * Clipping mask (ADR-0015): shown only where the nearest unclipped layer below it in the same
   * list (the base) has pixels.
   */
  readonly clipped?: boolean;
  /** Colour tag in the Layers panel; no effect on rendering. */
  readonly label?: LayerLabel;
}

/** Bitmap content stored as an immutable asset. */
export interface RasterLayer extends BaseLayer {
  readonly kind: "raster";
  /** null = fully transparent (a new, unpainted layer). */
  readonly assetId: string | null;
  readonly width: number;
  readonly height: number;
}

/** A solid colour covering the whole document (also used for the default background). */
export interface FillLayer extends BaseLayer {
  readonly kind: "fill";
  /** `#rrggbb` */
  readonly color: string;
}

export type ShapeKind = "rect" | "ellipse" | "line" | "path";

export interface StrokeStyle {
  /** `#rrggbb` */
  readonly color: string;
  readonly width: number;
}

/**
 * Vector shape in layer-local coordinates: the box (0,0)–(width,height). A line runs from the
 * top-left to the bottom-right corner of its box (negative sizes are normalised by flipping the
 * transform's scale, so width/height are always ≥ 0).
 */
export interface ShapeLayer extends BaseLayer {
  readonly kind: "shape";
  readonly shape: ShapeKind;
  readonly width: number;
  readonly height: number;
  /** `#rrggbb` or null for no fill. Lines ignore fill. */
  readonly fill: string | null;
  readonly stroke: StrokeStyle | null;
  readonly cornerRadius: number;
  /** For `shape: "path"`: the outline in layer-local coordinates, within the box. */
  readonly path?: VectorPath;
}

export const FONT_FAMILIES = [
  "system-ui",
  "Arial",
  "Helvetica",
  "Verdana",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Impact",
] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

export type TextAlign = "left" | "center" | "right";

/** Point text: lines split on "\n", no automatic wrapping. Origin is the top-left of the block. */
export interface TextLayer extends BaseLayer {
  readonly kind: "text";
  readonly text: string;
  readonly fontFamily: FontFamily;
  /** px */
  readonly fontSize: number;
  readonly fontWeight: 400 | 700;
  readonly italic: boolean;
  /** `#rrggbb` */
  readonly color: string;
  readonly align: TextAlign;
  /** Multiple of fontSize. */
  readonly lineHeight: number;
  /** px */
  readonly letterSpacing: number;
}

/** A folder of layers. Children are ordered bottom-most first, like `EditorDocument.layers`. */
export interface GroupLayer extends Omit<BaseLayer, "blendMode"> {
  readonly kind: "group";
  readonly blendMode: GroupBlendMode;
  readonly children: readonly Layer[];
  /** Panel state: whether the group is open in the layers panel. */
  readonly expanded: boolean;
}

export type Adjustment =
  | { readonly type: "brightness-contrast"; readonly brightness: number; readonly contrast: number }
  | {
      readonly type: "hue-saturation";
      readonly hue: number;
      readonly saturation: number;
      readonly lightness: number;
    }
  | { readonly type: "exposure"; readonly exposure: number; readonly gamma: number }
  | { readonly type: "temperature-tint"; readonly temperature: number; readonly tint: number }
  | { readonly type: "black-white" }
  | { readonly type: "invert" }
  | { readonly type: "posterize"; readonly levels: number }
  | { readonly type: "threshold"; readonly level: number }
  | ({ readonly type: "levels" } & ToneChannels<LevelsChannel>)
  | ({ readonly type: "curves" } & ToneChannels<readonly CurvePoint[]>)
  | { readonly type: "vibrance"; readonly vibrance: number; readonly saturation: number }
  | {
      readonly type: "color-balance";
      readonly shadows: ColorBalanceRange;
      readonly midtones: ColorBalanceRange;
      readonly highlights: ColorBalanceRange;
      readonly preserveLuminosity: boolean;
    }
  | {
      readonly type: "photo-filter";
      readonly color: string;
      /** 1…100 % */
      readonly density: number;
      readonly preserveLuminosity: boolean;
    }
  | {
      readonly type: "channel-mixer";
      readonly red: MixerRow;
      readonly green: MixerRow;
      readonly blue: MixerRow;
      /** Every output channel uses the `red` row (shown as "Gray"). */
      readonly monochrome: boolean;
    }
  | {
      readonly type: "gradient-map";
      readonly stops: readonly GradientStop[];
      readonly reverse: boolean;
    };

/** Color Balance shift for one tonal range, each −100…100. */
export interface ColorBalanceRange {
  readonly cyanRed: number;
  readonly magentaGreen: number;
  readonly yellowBlue: number;
}

/** Channel Mixer: how much of each source channel (and a constant) feeds one output, −200…200 %. */
export interface MixerRow {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly constant: number;
}

/** Levels for one channel, all in 0…255 except `gamma` (0.1…9.99, 1 = unchanged). */
export interface LevelsChannel {
  readonly inBlack: number;
  readonly inWhite: number;
  readonly gamma: number;
  readonly outBlack: number;
  readonly outWhite: number;
}

/** A curve control point: input → output, both 0…255. */
export type CurvePoint = readonly [number, number];

/** Settings for the composite RGB channel and each colour channel (applied after RGB). */
export interface ToneChannels<T> {
  readonly rgb: T;
  readonly red: T;
  readonly green: T;
  readonly blue: T;
}

export type ToneChannel = keyof ToneChannels<unknown>;

export type AdjustmentType = Adjustment["type"];

/** Non-destructively adjusts the composite of everything below it (within its group). */
export interface AdjustmentLayer extends BaseLayer {
  readonly kind: "adjustment";
  readonly adjustment: Adjustment;
}

/** A non-destructive filter on a smart object (ADR-0016), from the filter catalogue. */
export interface SmartFilter {
  readonly id: string;
  /** Id in the filter registry (`src/editor/filters/registry.ts`). */
  readonly filterId: string;
  readonly values: Readonly<Record<string, number | boolean>>;
  readonly enabled: boolean;
  /** Seed for filters with randomness, so every render looks the same. */
  readonly seed: number;
}

/**
 * Smart object (ADR-0016): an embedded document drawn through the layer transform. It is
 * re-rendered from its contents at the size it appears, so scaling never loses quality, and
 * smart filters apply on top without changing the contents.
 */
export interface SmartObjectLayer extends BaseLayer {
  readonly kind: "smart";
  readonly content: EditorDocument;
  readonly filters?: readonly SmartFilter[];
}

/*
 * Adding a kind requires a renderer case, a validator case, geometry sizing and — if it changes
 * stored data — a schema migration.
 */
export type Layer =
  | RasterLayer
  | FillLayer
  | ShapeLayer
  | TextLayer
  | GroupLayer
  | AdjustmentLayer
  | SmartObjectLayer;
export type LayerKind = Layer["kind"];

export interface Guide {
  readonly id: string;
  readonly orientation: "horizontal" | "vertical";
  readonly position: number;
}

export interface DocumentMetadata {
  /** ISO 8601 */
  readonly createdAt: string;
  /** ISO 8601 */
  readonly modifiedAt: string;
}

export interface EditorDocument {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Pixels per inch. */
  readonly resolution: number;
  readonly colorSpace: ColorSpace;
  /** Bottom-most layer first. */
  readonly layers: readonly Layer[];
  readonly activeLayerId: string | null;
  readonly guides: readonly Guide[];
  /** The Pen tool's work path in document space (ADR-0015), if any. */
  readonly workPath?: VectorPath;
  readonly metadata: DocumentMetadata;
  /**
   * The active selection (ADR-0010). Part of the document so selection changes are undoable,
   * but never saved: `serializeDocument` drops it.
   */
  readonly selection?: SelectionMask;
}
