import type { EditorDocument, RasterLayer } from "../core/document/types";
import { fromTransform, invertMatrix } from "../core/geometry/matrix";
import type { SelectionMask } from "../selection/mask";
import {
  context2d,
  copySelectedPixels,
  PixelError,
  releaseSurface,
  selectionSurface,
  type PixelClip,
  type PixelEnv,
  type Surface,
} from "./layer-pixels";

/**
 * Selected pixels lifted off a pixel layer for the Move tool: what stays behind (`base`, layer
 * space) and what moves (`clip`, document space). Kept while the user drags and nudges, so soft
 * edges are moved once rather than cut and re-pasted at every step.
 */
export interface LiftedPixels {
  readonly base: Surface;
  readonly clip: PixelClip;
}

/**
 * Lift the selected pixels of `layer`. With `keepOriginal` (Alt-drag) the base keeps them, so a
 * copy moves. Null while the layer is still loading or the selection is empty.
 */
export function liftSelection(
  env: PixelEnv,
  doc: EditorDocument,
  layer: RasterLayer,
  selection: SelectionMask,
  keepOriginal: boolean,
): LiftedPixels | null {
  const existing = layer.assetId ? env.assets.getBitmap(layer.assetId) : undefined;
  if (layer.assetId && !existing) return null;
  const clip = copySelectedPixels(env, doc, layer, selection);
  if (!clip) return null;
  const base = env.createSurface(layer.width, layer.height);
  const ctx = context2d(base);
  if (existing) ctx.drawImage(existing, 0, 0, layer.width, layer.height);
  if (!keepOriginal) {
    ctx.setTransform(...toLocal(layer));
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(selectionSurface(env, selection), 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }
  return { base, clip };
}

/** Draw the layer with the lifted pixels moved by (dx, dy) into `target` (layer space). */
export function composeMoved(
  layer: RasterLayer,
  lifted: LiftedPixels,
  dx: number,
  dy: number,
  target: Surface,
): void {
  const ctx = context2d(target);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(lifted.base, 0, 0);
  ctx.setTransform(...toLocal(layer));
  const { clip } = lifted;
  ctx.drawImage(clip.surface, clip.x + dx, clip.y + dy);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export function releaseLifted(lifted: LiftedPixels | null): void {
  if (!lifted) return;
  releaseSurface(lifted.base);
  releaseSurface(lifted.clip.surface);
}

function toLocal(layer: RasterLayer) {
  const matrix = invertMatrix(fromTransform(layer.transform));
  if (!matrix) throw new PixelError("This layer is scaled to nothing and cannot be edited.");
  return matrix;
}
