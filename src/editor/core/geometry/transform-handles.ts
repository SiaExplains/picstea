import type { Transform } from "../document/types";
import type { Point, Size } from "../viewport/viewport";
import { normalizeDegrees, rotateVector, toDegrees } from "./matrix";

/**
 * Free-transform maths. All functions take the transform and content size at the start of the
 * gesture plus the current pointer (document space) and return the new transform, so a drag is
 * a pure function of its start state — no accumulated drift.
 */

export type ScaleHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const SCALE_HANDLES: readonly ScaleHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** Handle position as a fraction of the content box. */
export const HANDLE_FRACTION: Record<ScaleHandle, Point> = {
  nw: { x: 0, y: 0 },
  n: { x: 0.5, y: 0 },
  ne: { x: 1, y: 0 },
  e: { x: 1, y: 0.5 },
  se: { x: 1, y: 1 },
  s: { x: 0.5, y: 1 },
  sw: { x: 0, y: 1 },
  w: { x: 0, y: 0.5 },
};

const MIN_SIZE_PX = 1;

/** Document position of a point given as a fraction of the content box. */
export function framePoint(t: Transform, size: Size, fraction: Point): Point {
  const scaled = {
    x: fraction.x * size.width * t.scaleX,
    y: fraction.y * size.height * t.scaleY,
  };
  const r = rotateVector(scaled, t.rotation);
  return { x: t.x + r.x, y: t.y + r.y };
}

function clampScale(scale: number, length: number): number {
  const min = MIN_SIZE_PX / Math.max(1, length);
  if (Math.abs(scale) >= min) return scale;
  return scale < 0 ? -min : min;
}

/**
 * Scale by dragging a handle. The opposite handle stays fixed (or the centre, with `fromCenter`).
 * `keepAspect` preserves the starting aspect ratio for corner handles.
 */
export function scaleFromHandle(
  start: Transform,
  size: Size,
  handle: ScaleHandle,
  pointer: Point,
  options: { keepAspect?: boolean; fromCenter?: boolean } = {},
): Transform {
  const h = HANDLE_FRACTION[handle];
  const anchorFraction = options.fromCenter ? { x: 0.5, y: 0.5 } : { x: 1 - h.x, y: 1 - h.y };
  const anchorDoc = framePoint(start, size, anchorFraction);

  // Pointer in the layer's rotated (but scaled) frame, relative to the anchor.
  const q = rotateVector(
    { x: pointer.x - anchorDoc.x, y: pointer.y - anchorDoc.y },
    -start.rotation,
  );

  let scaleX = start.scaleX;
  let scaleY = start.scaleY;
  const spanX = (h.x - anchorFraction.x) * size.width;
  const spanY = (h.y - anchorFraction.y) * size.height;
  if (spanX !== 0) scaleX = q.x / spanX;
  if (spanY !== 0) scaleY = q.y / spanY;

  const corner = spanX !== 0 && spanY !== 0;
  if (options.keepAspect && corner) {
    const rx = scaleX / start.scaleX;
    const ry = scaleY / start.scaleY;
    const r = Math.abs(rx) > Math.abs(ry) ? rx : ry;
    scaleX = start.scaleX * r;
    scaleY = start.scaleY * r;
  }
  scaleX = clampScale(scaleX, size.width);
  scaleY = clampScale(scaleY, size.height);

  // Re-solve the origin so the anchor stays where it was.
  const offset = rotateVector(
    { x: anchorFraction.x * size.width * scaleX, y: anchorFraction.y * size.height * scaleY },
    start.rotation,
  );
  return { ...start, scaleX, scaleY, x: anchorDoc.x - offset.x, y: anchorDoc.y - offset.y };
}

/** Rotate about the content centre by the pointer's angular movement. `snap` rounds to 15°. */
export function rotateAroundCenter(
  start: Transform,
  size: Size,
  pointerStart: Point,
  pointer: Point,
  snap = false,
): Transform {
  const center = framePoint(start, size, { x: 0.5, y: 0.5 });
  const a0 = Math.atan2(pointerStart.y - center.y, pointerStart.x - center.x);
  const a1 = Math.atan2(pointer.y - center.y, pointer.x - center.x);
  let rotation = start.rotation + toDegrees(a1 - a0);
  if (snap) rotation = Math.round(rotation / 15) * 15;
  rotation = normalizeDegrees(rotation);
  return setRotationAboutCenter(start, size, rotation);
}

/** Set an absolute rotation while keeping the content centre fixed. */
export function setRotationAboutCenter(start: Transform, size: Size, rotation: number): Transform {
  const center = framePoint(start, size, { x: 0.5, y: 0.5 });
  const half = rotateVector(
    { x: (size.width * start.scaleX) / 2, y: (size.height * start.scaleY) / 2 },
    rotation,
  );
  return { ...start, rotation, x: center.x - half.x, y: center.y - half.y };
}

/** Mirror the layer about its own centre. */
export function flipAboutCenter(
  start: Transform,
  size: Size,
  axis: "horizontal" | "vertical",
): Transform {
  const center = framePoint(start, size, { x: 0.5, y: 0.5 });
  const scaleX = axis === "horizontal" ? -start.scaleX : start.scaleX;
  const scaleY = axis === "vertical" ? -start.scaleY : start.scaleY;
  const half = rotateVector(
    { x: (size.width * scaleX) / 2, y: (size.height * scaleY) / 2 },
    start.rotation,
  );
  return { ...start, scaleX, scaleY, x: center.x - half.x, y: center.y - half.y };
}

/** Scale to an absolute size factor (1 = 100%) keeping the centre fixed (numeric transform). */
export function setScaleAboutCenter(
  start: Transform,
  size: Size,
  scaleX: number,
  scaleY: number,
): Transform {
  const center = framePoint(start, size, { x: 0.5, y: 0.5 });
  const sx = clampScale(scaleX, size.width);
  const sy = clampScale(scaleY, size.height);
  const half = rotateVector(
    { x: (size.width * sx) / 2, y: (size.height * sy) / 2 },
    start.rotation,
  );
  return { ...start, scaleX: sx, scaleY: sy, x: center.x - half.x, y: center.y - half.y };
}
