import type { EditorDocument, Layer, TextLayer } from "../document/types";
import type { Point, Size } from "../viewport/viewport";
import { applyMatrix, fromTransform, invertMatrix } from "./matrix";

/**
 * Measures content whose size depends on the browser (text). Injected so geometry stays pure;
 * the rendering layer provides the canvas-backed implementation.
 */
export interface ContentSizer {
  measureText(layer: TextLayer): Size;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Size of the layer's content box in its own (unscaled) coordinates. */
export function layerLocalSize(layer: Layer, doc: EditorDocument, sizer: ContentSizer): Size {
  switch (layer.kind) {
    case "fill":
      return { width: doc.width, height: doc.height };
    case "raster":
    case "shape":
      return { width: layer.width, height: layer.height };
    case "text":
      return sizer.measureText(layer);
  }
}

/** Fill layers always cover the document; everything else can be moved and transformed. */
export function isTransformable(layer: Layer): boolean {
  return layer.kind !== "fill";
}

/** The four corners of the content box in document space: nw, ne, se, sw. */
export function layerCorners(
  layer: Layer,
  doc: EditorDocument,
  sizer: ContentSizer,
): [Point, Point, Point, Point] {
  const { width, height } = layerLocalSize(layer, doc, sizer);
  if (layer.kind === "fill") {
    return [
      { x: 0, y: 0 },
      { x: doc.width, y: 0 },
      { x: doc.width, y: doc.height },
      { x: 0, y: doc.height },
    ];
  }
  const m = fromTransform(layer.transform);
  return [
    applyMatrix(m, { x: 0, y: 0 }),
    applyMatrix(m, { x: width, y: 0 }),
    applyMatrix(m, { x: width, y: height }),
    applyMatrix(m, { x: 0, y: height }),
  ];
}

export function boundsOf(points: readonly Point[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Map a document point into the layer's local coordinates (null for degenerate transforms). */
export function documentToLayer(layer: Layer, point: Point): Point | null {
  if (layer.kind === "fill") return point;
  const inverse = invertMatrix(fromTransform(layer.transform));
  return inverse ? applyMatrix(inverse, point) : null;
}

/**
 * Whether a document point hits the layer's content box. `tolerance` is in document pixels and
 * keeps thin shapes (lines) clickable.
 */
export function hitTestLayer(
  layer: Layer,
  point: Point,
  doc: EditorDocument,
  sizer: ContentSizer,
  tolerance = 0,
): boolean {
  if (!layer.visible) return false;
  const local = documentToLayer(layer, point);
  if (!local) return false;
  const { width, height } = layerLocalSize(layer, doc, sizer);
  const t = layer.kind === "fill" ? 0 : layer.transform;
  const tx = t ? tolerance / Math.max(1e-6, Math.abs(t.scaleX)) : 0;
  const ty = t ? tolerance / Math.max(1e-6, Math.abs(t.scaleY)) : 0;
  return local.x >= -tx && local.x <= width + tx && local.y >= -ty && local.y <= height + ty;
}

/** Top-most visible, non-fill layer under the point, for the move tool's auto-select. */
export function topLayerAt(
  doc: EditorDocument,
  point: Point,
  sizer: ContentSizer,
  tolerance = 0,
): Layer | undefined {
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const layer = doc.layers[i];
    if (isTransformable(layer) && hitTestLayer(layer, point, doc, sizer, tolerance)) return layer;
  }
  return undefined;
}
