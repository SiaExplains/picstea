import { findLayerDeep, topLevelSelection, walkLayers } from "../document/tree";
import type { EditorDocument, Layer, Transform } from "../document/types";
import type { Point, Size } from "../viewport/viewport";
import {
  boundsOf,
  isTransformable,
  layerLocalSize,
  type ContentSizer,
  type Rect,
} from "./layer-geometry";
import {
  applyMatrix,
  fromTransform,
  invertMatrix,
  multiplyMatrix,
  normalizeDegrees,
  toDegrees,
  type Matrix,
} from "./matrix";

/**
 * Transforming several layers (or a group) together (ADR-0020). The selection's frame is
 * transformed like a single layer; the change of the frame, as a matrix, is applied to every
 * layer and turned back into each layer's position, rotation and scale.
 */

/** A frame transform for the selection's axis-aligned bounds (identity scale and rotation). */
export function frameTransform(bounds: Rect): { transform: Transform; size: Size } {
  return {
    transform: { x: bounds.x, y: bounds.y, scaleX: 1, scaleY: 1, rotation: 0 },
    size: { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) },
  };
}

/** The matrix that takes the frame from `from` to `to`. Null for a degenerate frame. */
export function frameChange(from: Transform, to: Transform): Matrix | null {
  const inverse = invertMatrix(fromTransform(from));
  return inverse && multiplyMatrix(fromTransform(to), inverse);
}

const angleDistance = (a: number, b: number) => Math.abs(normalizeDegrees(a - b));

/**
 * Apply `change` to a layer with transform `t` and content `size`. Exact when the result has no
 * skew (moves, uniform scales, rotations, flips, and axis-aligned stretches). Otherwise the
 * skew is dropped — Picstea layers can't be skewed — while the content centre still lands exactly
 * where the full transform puts it. Of the two equivalent forms (flipped in x or y), the one
 * whose rotation is closer to the original is chosen, so a flip doesn't show up as 180°.
 */
export function transformThrough(change: Matrix, t: Transform, size: Size): Transform {
  const m = multiplyMatrix(change, fromTransform(t));
  const [a, b, c, d] = m;
  const length = Math.hypot(a, b);
  if (length < 1e-9) return t;
  const candidates = [1, -1].map((sign) => {
    const rotation = normalizeDegrees(toDegrees(Math.atan2(sign * b, sign * a)));
    const r = (rotation * Math.PI) / 180;
    // The y axis projected onto the direction perpendicular to the new x axis (drops skew).
    const scaleY = -Math.sin(r) * c + Math.cos(r) * d;
    return { rotation, scaleX: sign * length, scaleY };
  });
  const best =
    angleDistance(candidates[0].rotation, t.rotation) <=
    angleDistance(candidates[1].rotation, t.rotation)
      ? candidates[0]
      : candidates[1];
  const centre = applyMatrix(m, { x: size.width / 2, y: size.height / 2 });
  const r = (best.rotation * Math.PI) / 180;
  const hx = (size.width * best.scaleX) / 2;
  const hy = (size.height * best.scaleY) / 2;
  return {
    rotation: best.rotation,
    scaleX: best.scaleX,
    scaleY: best.scaleY,
    x: centre.x - (Math.cos(r) * hx - Math.sin(r) * hy),
    y: centre.y - (Math.sin(r) * hx + Math.cos(r) * hy),
  };
}

/** Mirror about a vertical (horizontal flip) or horizontal axis through `centre`. */
export function flipMatrix(centre: Point, axis: "horizontal" | "vertical"): Matrix {
  return axis === "horizontal" ? [-1, 0, 0, 1, 2 * centre.x, 0] : [1, 0, 0, -1, 0, 2 * centre.y];
}

export type DistributeMode = "centers-x" | "centers-y" | "spacing-x" | "spacing-y";

export const DISTRIBUTE_LABELS: Record<DistributeMode, string> = {
  "centers-x": "Distribute Horizontal Centers",
  "centers-y": "Distribute Vertical Centers",
  "spacing-x": "Distribute Horizontal Spacing",
  "spacing-y": "Distribute Vertical Spacing",
};

/**
 * How far to move each box (same order as given) to distribute them: evenly spaced centres, or
 * equal gaps between neighbours. The outermost boxes stay put. Fewer than 3 boxes: no moves.
 */
export function distributeDeltas(boxes: readonly Rect[], mode: DistributeMode): Point[] {
  const deltas = boxes.map(() => ({ x: 0, y: 0 }));
  if (boxes.length < 3) return deltas;
  const horizontal = mode.endsWith("-x");
  const start = (b: Rect) => (horizontal ? b.x : b.y);
  const extent = (b: Rect) => (horizontal ? b.width : b.height);
  const centre = (b: Rect) => start(b) + extent(b) / 2;
  const key = mode.startsWith("centers") ? centre : start;
  const order = boxes.map((_, i) => i).sort((i, j) => key(boxes[i]) - key(boxes[j]));
  const first = boxes[order[0]];
  const last = boxes[order.at(-1)!];
  const set = (i: number, shift: number) => {
    deltas[i] = horizontal ? { x: shift, y: 0 } : { x: 0, y: shift };
  };
  if (mode.startsWith("centers")) {
    const step = (centre(last) - centre(first)) / (order.length - 1);
    order.forEach((i, k) => set(i, centre(first) + step * k - centre(boxes[i])));
  } else {
    const total = order.reduce((sum, i) => sum + extent(boxes[i]), 0);
    const gap = (start(last) + extent(last) - start(first) - total) / (order.length - 1);
    let cursor = start(first);
    for (const i of order) {
      set(i, cursor - start(boxes[i]));
      cursor += extent(boxes[i]) + gap;
    }
  }
  return deltas;
}

/** A layer that moves with a multi-layer transform, and its content size. */
export interface TransformTarget {
  readonly layer: Layer & { readonly transform: Transform };
  readonly size: Size;
}

/**
 * The transformable layers a selection consists of: selected layers, and everything
 * transformable inside selected groups. Fill and adjustment layers don't take part.
 */
export function transformTargets(
  doc: EditorDocument,
  ids: readonly string[],
  sizer: ContentSizer,
): TransformTarget[] {
  const out: TransformTarget[] = [];
  const seen = new Set<string>();
  const add = (layer: Layer) => {
    if (seen.has(layer.id) || !isTransformable(layer)) return;
    seen.add(layer.id);
    out.push({
      layer: layer as Layer & { transform: Transform },
      size: layerLocalSize(layer, doc, sizer),
    });
  };
  for (const id of topLevelSelection(doc.layers, ids)) {
    const layer = findLayerDeep(doc.layers, id);
    if (!layer) continue;
    if (layer.kind === "group") walkLayers(layer.children, add);
    else add(layer);
  }
  return out;
}

/** Axis-aligned bounds of the targets, or null when there are none. */
export function targetsBounds(targets: readonly TransformTarget[]): Rect | null {
  if (targets.length === 0) return null;
  const points: Point[] = [];
  for (const { layer, size } of targets) {
    const m = fromTransform(layer.transform);
    for (const [x, y] of [
      [0, 0],
      [size.width, 0],
      [size.width, size.height],
      [0, size.height],
    ]) {
      points.push(applyMatrix(m, { x, y }));
    }
  }
  return boundsOf(points);
}

/** New transforms for every target after the frame change `change`. */
export function applyFrameChange(
  targets: readonly TransformTarget[],
  change: Matrix,
): { layerId: string; transform: Transform }[] {
  return targets.map(({ layer, size }) => ({
    layerId: layer.id,
    transform: transformThrough(change, layer.transform, size),
  }));
}
