import { flattenTopFirst, walkLayers } from "../document/tree";
import type { EditorDocument, GroupLayer, Layer, TextLayer } from "../document/types";
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
    case "adjustment":
      return { width: doc.width, height: doc.height };
    case "group": {
      const b = groupBounds(layer, doc, sizer);
      return { width: b.width, height: b.height };
    }
    case "raster":
    case "shape":
      return { width: layer.width, height: layer.height };
    case "text":
      return sizer.measureText(layer);
  }
}

/** Layers with their own transform (scale/rotate/flip). Fill and adjustment layers cover the canvas. */
export function isTransformable(layer: Layer): boolean {
  return layer.kind !== "fill" && layer.kind !== "adjustment" && layer.kind !== "group";
}

/** Layers the move tool can drag: transformable layers and groups. */
export function isMovable(layer: Layer): boolean {
  return isTransformable(layer) || layer.kind === "group";
}

/** Axis-aligned bounds of everything movable inside a group (the canvas if it is empty). */
export function groupBounds(group: GroupLayer, doc: EditorDocument, sizer: ContentSizer): Rect {
  const points: Point[] = [];
  walkLayers(group.children, (child) => {
    if (isTransformable(child)) points.push(...layerCorners(child, doc, sizer));
  });
  return points.length ? boundsOf(points) : { x: 0, y: 0, width: doc.width, height: doc.height };
}

/** The four corners of the content box in document space: nw, ne, se, sw. */
export function layerCorners(
  layer: Layer,
  doc: EditorDocument,
  sizer: ContentSizer,
): [Point, Point, Point, Point] {
  if (layer.kind === "group") {
    const b = groupBounds(layer, doc, sizer);
    return [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y },
      { x: b.x + b.width, y: b.y + b.height },
      { x: b.x, y: b.y + b.height },
    ];
  }
  const { width, height } = layerLocalSize(layer, doc, sizer);
  if (layer.kind === "fill" || layer.kind === "adjustment") {
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
  if (layer.kind === "fill" || layer.kind === "adjustment" || layer.kind === "group") return point;
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
  if (layer.kind === "group") {
    return layer.children.some(
      (child) => isMovable(child) && hitTestLayer(child, point, doc, sizer, tolerance),
    );
  }
  const local = documentToLayer(layer, point);
  if (!local) return false;
  const { width, height } = layerLocalSize(layer, doc, sizer);
  const t = isTransformable(layer) ? layer.transform : 0;
  const tx = t ? tolerance / Math.max(1e-6, Math.abs(t.scaleX)) : 0;
  const ty = t ? tolerance / Math.max(1e-6, Math.abs(t.scaleY)) : 0;
  return local.x >= -tx && local.x <= width + tx && local.y >= -ty && local.y <= height + ty;
}

/** Top-most visible content layer under the point (inside groups too), for auto-select. */
export function topLayerAt(
  doc: EditorDocument,
  point: Point,
  sizer: ContentSizer,
  tolerance = 0,
): Layer | undefined {
  for (const { layer, effectivelyVisible } of flattenTopFirst(doc.layers, {
    includeCollapsed: true,
  })) {
    if (!effectivelyVisible || !isTransformable(layer)) continue;
    if (hitTestLayer(layer, point, doc, sizer, tolerance)) return layer;
  }
  return undefined;
}
