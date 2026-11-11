/**
 * Picstea document model (docs/03_DOCUMENT_MODEL.md).
 *
 * Documents are immutable values: every edit produces a new document that shares unchanged
 * structure with the previous one. Pixel data never lives in the document — raster layers
 * reference immutable assets by id (see src/editor/assets).
 */

import type { SelectionMask } from "../../selection/mask";
import type { VectorPath } from "../path/path";
import type { GlobalLight, LayerEffects } from "../effects/model";
import type { BlendIf, ChannelSet } from "./blending";

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
  /** Moves, scales and rotates with the layer when the layer is transformed. */
  readonly linked: boolean;
  /**
   * A transform still to be applied to the mask's pixels (document space, `[a,b,c,d,e,f]`),
   * set while its layer is scaled or rotated and baked into new pixels when the gesture ends
   * (ADR-0043). Never saved.
   */
  readonly pendingTransform?: readonly [number, number, number, number, number, number];
}

/** A colour at a position (0…1) along a gradient (Gradient Map, gradient overlay). */
export interface GradientStop {
  readonly position: number;
  /** `#rrggbb` */
  readonly color: string;
}

// Layer styles live in their own module (ADR-0030); re-exported here for existing imports.
export type {
  AnyEffect,
  BevelEffect,
  ColorOverlayEffect,
  Contour,
  DropShadowEffect,
  EffectByKind,
  EffectKind,
  GlobalLight,
  GradientOverlayEffect,
  InnerGlowEffect,
  InnerShadowEffect,
  LayerEffects,
  OuterGlowEffect,
  PatternOverlayEffect,
  SatinEffect,
  StrokeEffect,
} from "../effects/model";

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
  /**
   * Fill opacity (Layer Style → Blending Options), 0…1: fades the layer's own content but not
   * its effects. Absent = 1.
   */
  readonly fillOpacity?: number;
  /** Blending Options → Blend If (ADR-0031); absent = no limits. */
  readonly blendIf?: BlendIf;
  /** Blending Options → Channels; absent = all channels. */
  readonly channels?: ChannelSet;
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

/**
 * Fonts every computer is expected to have (always offered, never stored with a project). Other
 * families come from Picstea's bundled Google Fonts, the user's computer or an uploaded file and
 * are listed in `EditorDocument.fonts` (ADR-0040).
 */
export const SYSTEM_FONTS = [
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
/** A CSS font family name. */
export type FontFamily = string;

/** Where a document font comes from (ADR-0040). */
export type FontSource = "bundled" | "local" | "uploaded";

/** A font face a document uses beyond the system fonts. */
export interface DocumentFont {
  readonly family: string;
  readonly weight: 400 | 700;
  readonly italic: boolean;
  readonly source: FontSource;
  /** PostScript name, for local fonts and PSD export. */
  readonly postscriptName?: string;
  /** Uploaded fonts: the font file in the asset store. */
  readonly assetId?: string;
}

export type TextAlign = "left" | "center" | "right" | "justify";
export type FontCaps = "normal" | "all-caps" | "small-caps";

/** Character formatting (Character panel, ADR-0041). */
export interface CharStyle {
  readonly fontFamily: FontFamily;
  /** px */
  readonly fontSize: number;
  /** 700 = bold (faux bold when the font has no bold face). */
  readonly fontWeight: 400 | 700;
  readonly italic: boolean;
  /** `#rrggbb` */
  readonly color: string;
  /** Leading, as a multiple of fontSize. */
  readonly lineHeight: number;
  /** Tracking, px. */
  readonly letterSpacing: number;
  /** px, up is positive. */
  readonly baselineShift: number;
  readonly caps: FontCaps;
  /** Use the font's kerning pairs. */
  readonly kerning: boolean;
}

/** Paragraph formatting (Paragraph panel, ADR-0041). Sizes in px. */
export interface ParagraphStyle {
  readonly align: TextAlign;
  readonly indentLeft: number;
  readonly indentRight: number;
  /** Extra indent of a paragraph's first line (may be negative for a hanging indent). */
  readonly indentFirst: number;
  readonly spaceBefore: number;
  readonly spaceAfter: number;
}

/** Character formatting for `text[start, end)`, over the layer's own style. */
export interface TextRun {
  readonly start: number;
  readonly end: number;
  readonly style: Partial<CharStyle>;
}

/**
 * Text. Point text (`box: null`) grows with its lines, which only break at "\n"; paragraph text
 * wraps inside its box and is clipped to it. The layer's own fields are the base character and
 * paragraph style; `runs` override characters and `paragraphs[i]` the i-th paragraph (ADR-0041).
 * The origin is the top-left of the block.
 */
export interface TextLayer extends BaseLayer, CharStyle {
  readonly kind: "text";
  readonly text: string;
  /** Base paragraph alignment. */
  readonly align: TextAlign;
  /** Paragraph text box in layer units, or null for point text. */
  readonly box: { readonly width: number; readonly height: number } | null;
  /** Sorted, non-overlapping character runs. */
  readonly runs: readonly TextRun[];
  /** Per-paragraph styles; missing entries use the base alignment and no indents or spacing. */
  readonly paragraphs: readonly ParagraphStyle[];
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
  /** Photoshop's global light for effects with "Use global angle" (ADR-0030). Absent = default. */
  readonly globalLight?: GlobalLight;
  /** Fonts beyond the system fonts that text layers use (ADR-0040). Absent = none. */
  readonly fonts?: readonly DocumentFont[];
}
