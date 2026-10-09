import { walkLayers } from "../document/tree";
import type { EditorDocument } from "../document/types";
import type { Point } from "../viewport/viewport";
import { boundsOf, isMovable, layerCorners, type ContentSizer, type Rect } from "./layer-geometry";

/**
 * Snapping (ADR-0014): pure maths that pulls a moving point or box onto nearby guides, grid
 * lines, the canvas edges and centre, and other layers' edges and centres. Tools call it with a
 * threshold in document units (a few screen pixels at the current zoom) and draw the returned
 * lines as smart guides.
 */

export type SnapSource = "guide" | "grid" | "canvas" | "layer";

/** A vertical (`axis: "x"`) or horizontal (`axis: "y"`) line something snapped to. */
export interface SnapLine {
  readonly axis: "x" | "y";
  readonly value: number;
  readonly source: SnapSource;
}

interface Candidate {
  readonly value: number;
  readonly source: SnapSource;
}

export interface SnapTargets {
  readonly x: readonly Candidate[];
  readonly y: readonly Candidate[];
  /** Grid spacing in document pixels, or null without a grid. */
  readonly grid: number | null;
}

export const NO_SNAP_TARGETS: SnapTargets = { x: [], y: [], grid: null };

export interface SnapOptions {
  readonly guides: boolean;
  readonly grid: number | null;
  readonly canvas: boolean;
  readonly layers: boolean;
  /** Layers that are being moved, so they don't snap to themselves. */
  readonly excludeLayerIds?: readonly string[];
}

/** Collect what can be snapped to in a document. */
export function snapTargets(
  doc: EditorDocument,
  sizer: ContentSizer,
  options: SnapOptions,
): SnapTargets {
  const x: Candidate[] = [];
  const y: Candidate[] = [];
  if (options.canvas) {
    for (const v of [0, doc.width / 2, doc.width]) x.push({ value: v, source: "canvas" });
    for (const v of [0, doc.height / 2, doc.height]) y.push({ value: v, source: "canvas" });
  }
  if (options.guides) {
    for (const g of doc.guides) {
      (g.orientation === "vertical" ? x : y).push({ value: g.position, source: "guide" });
    }
  }
  if (options.layers) {
    const excluded = new Set(options.excludeLayerIds ?? []);
    walkLayers(doc.layers, (layer) => {
      // Skip moving layers (and everything inside a moving group) and hidden layers.
      if (excluded.has(layer.id) || !layer.visible) return false;
      if (layer.kind === "group" || !isMovable(layer)) return;
      const b = boundsOf(layerCorners(layer, doc, sizer));
      for (const v of [b.x, b.x + b.width / 2, b.x + b.width])
        x.push({ value: v, source: "layer" });
      for (const v of [b.y, b.y + b.height / 2, b.y + b.height])
        y.push({ value: v, source: "layer" });
    });
  }
  return { x, y, grid: options.grid && options.grid > 0 ? options.grid : null };
}

/** Earlier sources win ties, so a guide beats a layer edge at the same distance. */
const PRIORITY: Record<SnapSource, number> = { guide: 0, canvas: 1, layer: 2, grid: 3 };

interface Match {
  readonly delta: number;
  readonly line: Candidate;
}

/** Best match for any of `values` on one axis within `threshold`; null if nothing is close. */
function bestMatch(
  values: readonly number[],
  candidates: readonly Candidate[],
  grid: number | null,
  threshold: number,
): Match | null {
  let best: Match | null = null;
  const consider = (value: number, line: Candidate) => {
    const delta = line.value - value;
    const d = Math.abs(delta);
    if (d > threshold) return;
    if (
      !best ||
      d < Math.abs(best.delta) - 1e-9 ||
      (Math.abs(d - Math.abs(best.delta)) <= 1e-9 &&
        PRIORITY[line.source] < PRIORITY[best.line.source])
    ) {
      best = { delta, line };
    }
  };
  for (const value of values) {
    for (const c of candidates) consider(value, c);
    if (grid) consider(value, { value: Math.round(value / grid) * grid, source: "grid" });
  }
  return best;
}

export interface SnapResult {
  /** Offset to add to the moving point or box. */
  readonly dx: number;
  readonly dy: number;
  readonly lines: readonly SnapLine[];
}

const NO_SNAP: SnapResult = { dx: 0, dy: 0, lines: [] };

function result(mx: Match | null, my: Match | null): SnapResult {
  if (!mx && !my) return NO_SNAP;
  const lines: SnapLine[] = [];
  if (mx) lines.push({ axis: "x", value: mx.line.value, source: mx.line.source });
  if (my) lines.push({ axis: "y", value: my.line.value, source: my.line.source });
  return { dx: mx?.delta ?? 0, dy: my?.delta ?? 0, lines };
}

/** Snap a box by its edges and centre (moving a layer). */
export function snapRect(rect: Rect, targets: SnapTargets, threshold: number): SnapResult {
  const xs = [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
  const ys = [rect.y, rect.y + rect.height / 2, rect.y + rect.height];
  return result(
    bestMatch(xs, targets.x, targets.grid, threshold),
    bestMatch(ys, targets.y, targets.grid, threshold),
  );
}

/** Snap a single point (a corner being dragged, a crop edge, a guide). */
export function snapPoint(
  point: Point,
  targets: SnapTargets,
  threshold: number,
  axes: { x?: boolean; y?: boolean } = { x: true, y: true },
): SnapResult {
  return result(
    axes.x === false ? null : bestMatch([point.x], targets.x, targets.grid, threshold),
    axes.y === false ? null : bestMatch([point.y], targets.y, targets.grid, threshold),
  );
}

/** Snap distance in CSS pixels; converted to document units by the caller (÷ zoom). */
export const SNAP_DISTANCE_PX = 6;

export type AlignEdge = "left" | "center-x" | "right" | "top" | "center-y" | "bottom";

/** How far to move `box` so the given edge (or centre) lines up with the same edge of `target`. */
export function alignDelta(box: Rect, target: Rect, edge: AlignEdge): Point {
  switch (edge) {
    case "left":
      return { x: target.x - box.x, y: 0 };
    case "center-x":
      return { x: target.x + target.width / 2 - (box.x + box.width / 2), y: 0 };
    case "right":
      return { x: target.x + target.width - (box.x + box.width), y: 0 };
    case "top":
      return { x: 0, y: target.y - box.y };
    case "center-y":
      return { x: 0, y: target.y + target.height / 2 - (box.y + box.height / 2) };
    case "bottom":
      return { x: 0, y: target.y + target.height - (box.y + box.height) };
  }
}
