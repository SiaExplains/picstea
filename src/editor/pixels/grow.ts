import { checkDimensions } from "../core/document/limits";
import type { EditorDocument, RasterLayer } from "../core/document/types";

/**
 * Growing pixel layers (ADR-0043). Painting may extend a layer past its box as long as the layer
 * is neither scaled, rotated nor flipped; the paint area is the layer's box plus the canvas.
 * Layers grow in 64 px steps, only towards the painted area, so they never gain empty borders
 * beyond that step.
 *
 * Rects here are in **layer pixels** (x/y relative to the layer's top-left corner, whole numbers),
 * so a layer at a fractional position keeps its pixel grid.
 */

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const GROW_STEP = 64;

/** True if a layer can grow: unscaled, unrotated, unflipped. */
export function canGrow(layer: RasterLayer): boolean {
  const t = layer.transform;
  return t.scaleX === 1 && t.scaleY === 1 && t.rotation === 0;
}

/**
 * Where painting on `layer` may happen, in layer pixels: its box plus the canvas. Null when the
 * layer can't grow — then painting stays inside its box, as before.
 */
export function paintArea(doc: EditorDocument, layer: RasterLayer): Rect | null {
  if (!canGrow(layer)) return null;
  const { x: tx, y: ty } = layer.transform;
  const x = Math.min(0, Math.floor(-tx));
  const y = Math.min(0, Math.floor(-ty));
  const right = Math.max(layer.width, Math.ceil(doc.width - tx));
  const bottom = Math.max(layer.height, Math.ceil(doc.height - ty));
  const area = { x, y, width: right - x, height: bottom - y };
  return checkDimensions(area.width, area.height).ok ? area : null;
}

/**
 * The layer's new box (layer pixels) after painting `painted`: the old box `[0, 0, w, h]` plus the
 * painted area, grown in 64 px steps and kept inside `area`. Null when the box doesn't change.
 */
export function grownBox(
  layer: Pick<RasterLayer, "width" | "height">,
  painted: Rect | null,
  area: Rect,
): Rect | null {
  if (!painted || painted.width <= 0 || painted.height <= 0) return null;
  const px0 = Math.floor(painted.x);
  const py0 = Math.floor(painted.y);
  const px1 = Math.ceil(painted.x + painted.width);
  const py1 = Math.ceil(painted.y + painted.height);
  if (px0 >= 0 && py0 >= 0 && px1 <= layer.width && py1 <= layer.height) return null;
  const step = (v: number) => Math.ceil(v / GROW_STEP) * GROW_STEP;
  const left = Math.max(area.x, px0 < 0 ? -step(-px0) : 0);
  const top = Math.max(area.y, py0 < 0 ? -step(-py0) : 0);
  const right = Math.min(
    area.x + area.width,
    px1 > layer.width ? layer.width + step(px1 - layer.width) : layer.width,
  );
  const bottom = Math.min(
    area.y + area.height,
    py1 > layer.height ? layer.height + step(py1 - layer.height) : layer.height,
  );
  if (left === 0 && top === 0 && right === layer.width && bottom === layer.height) return null;
  const box = { x: left, y: top, width: right - left, height: bottom - top };
  return checkDimensions(box.width, box.height).ok ? box : null;
}
