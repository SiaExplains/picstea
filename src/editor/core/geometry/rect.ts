import type { Point } from "../viewport/viewport";
import type { Rect } from "./layer-geometry";
import type { ScaleHandle } from "./transform-handles";

/** Axis-aligned rectangle helpers (crop box, shape drafting). */

export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/**
 * Constrain a drag from `start` to `current`: equal sides for boxes, or 45° steps for lines.
 * Returns the adjusted end point.
 */
export function constrainDrag(start: Point, current: Point, mode: "square" | "angle45"): Point {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  if (mode === "square") {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: start.x + Math.sign(dx || 1) * side, y: start.y + Math.sign(dy || 1) * side };
  }
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  const length = Math.hypot(dx, dy);
  return { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
}

/** Move one edge/corner of an axis-aligned rect to `pointer`, keeping the result normalised. */
export function resizeRect(start: Rect, handle: ScaleHandle, pointer: Point): Rect {
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;
  if (handle.includes("w")) left = pointer.x;
  if (handle.includes("e")) right = pointer.x;
  if (handle.includes("n")) top = pointer.y;
  if (handle.includes("s")) bottom = pointer.y;
  return rectFromPoints({ x: left, y: top }, { x: right, y: bottom });
}

/** Round to whole pixels with a minimum size of 1×1. */
export function roundRect(rect: Rect): Rect {
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  return {
    x,
    y,
    width: Math.max(1, Math.round(rect.x + rect.width) - x),
    height: Math.max(1, Math.round(rect.y + rect.height) - y),
  };
}

export function rectHandles(rect: Rect): Record<ScaleHandle, Point> {
  const { x, y, width: w, height: h } = rect;
  return {
    nw: { x, y },
    n: { x: x + w / 2, y },
    ne: { x: x + w, y },
    e: { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s: { x: x + w / 2, y: y + h },
    sw: { x, y: y + h },
    w: { x, y: y + h / 2 },
  };
}
