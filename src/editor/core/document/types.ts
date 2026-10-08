/**
 * MYLPER document model (docs/03_DOCUMENT_MODEL.md).
 *
 * Documents are immutable values: every edit produces a new document that shares unchanged
 * structure with the previous one. Pixel data never lives in the document — raster layers
 * reference immutable assets by id (see src/editor/assets).
 */

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

export type ColorSpace = "srgb";

/** Placement of a layer's content in document pixels. Rotation is in degrees, about the layer origin. */
export interface Transform {
  readonly x: number;
  readonly y: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
}

export interface BaseLayer {
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  /** 0..1 */
  readonly opacity: number;
  readonly blendMode: BlendMode;
  readonly transform: Transform;
}

/** Bitmap content stored as an immutable asset. */
export interface RasterLayer extends BaseLayer {
  readonly kind: "raster";
  readonly assetId: string;
  readonly width: number;
  readonly height: number;
}

/** A solid colour covering the whole document (also used for the default background). */
export interface FillLayer extends BaseLayer {
  readonly kind: "fill";
  /** `#rrggbb` */
  readonly color: string;
}

/*
 * Extension point: GroupLayer, TextLayer, ShapeLayer, AdjustmentLayer and SmartObjectLayer join
 * this union in their gates (3–4, 9). Adding a kind requires a renderer case, a validator case
 * and — if it changes stored data — a schema migration.
 */
export type Layer = RasterLayer | FillLayer;
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
  readonly metadata: DocumentMetadata;
}
