import type { EditorDocument, Layer } from "../core/document/types";
import { fromTransform, invertMatrix, multiplyMatrix, type Matrix } from "../core/geometry/matrix";
import type { SelectionMask } from "../selection/mask";
import {
  clipToSelection,
  context2d,
  PixelError,
  releaseSurface,
  selectionSurface,
  type PixelClip,
  type PixelEnv,
  type Surface,
} from "./layer-pixels";

/**
 * The pixels the Move tool moves: a pixel layer's content, or any layer's mask. Masks live in
 * document space (their box is offset, never scaled); an empty mask reveals everything.
 */
export interface PixelPlane {
  readonly layerId: string;
  readonly target: "content" | "mask";
  readonly assetId: string | null;
  readonly width: number;
  readonly height: number;
  /** Plane pixels → document. */
  readonly toDocument: Matrix;
}

/** The plane `target` addresses on `layer`, or null when there is none (no mask, not pixels). */
export function pixelPlane(layer: Layer, target: "content" | "mask"): PixelPlane | null {
  if (target === "mask") {
    const mask = layer.mask;
    if (!mask) return null;
    return {
      layerId: layer.id,
      target,
      assetId: mask.assetId,
      width: mask.width,
      height: mask.height,
      toDocument: [1, 0, 0, 1, mask.x, mask.y],
    };
  }
  if (layer.kind !== "raster") return null;
  return {
    layerId: layer.id,
    target,
    assetId: layer.assetId,
    width: layer.width,
    height: layer.height,
    toDocument: fromTransform(layer.transform),
  };
}

/**
 * Selected pixels lifted off a plane for the Move tool: what stays behind (`base`, plane space)
 * and what moves (`clip`, document space). Kept while the user drags, nudges and transforms, so
 * soft edges are cut out only once rather than at every step.
 */
export interface LiftedPixels {
  readonly plane: PixelPlane;
  readonly base: Surface;
  readonly clip: PixelClip;
}

/** Draw the plane's current pixels into a plane-sized context (white for an empty mask). */
function drawPlane(env: PixelEnv, plane: PixelPlane, ctx: ReturnType<typeof context2d>): boolean {
  if (plane.assetId) {
    const bitmap = env.assets.getBitmap(plane.assetId);
    if (!bitmap) return false;
    ctx.drawImage(bitmap, 0, 0, plane.width, plane.height);
  } else if (plane.target === "mask") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, plane.width, plane.height);
  }
  return true;
}

/**
 * Lift the selected pixels of `plane`. With `keepOriginal` (Alt-drag) the base keeps them, so a
 * copy moves. The vacated area turns transparent: empty on a pixel layer, and hidden on a mask
 * (masks keep their grey level in alpha), as with Photoshop's default black mask background.
 * Null while the plane is still loading or the selection is empty.
 */
export function liftSelection(
  env: PixelEnv,
  doc: EditorDocument,
  plane: PixelPlane,
  selection: SelectionMask,
  keepOriginal: boolean,
): LiftedPixels | null {
  const bounds = selection.bounds;
  if (!bounds) return null;
  const toPlane = invert(plane);
  const base = env.createSurface(plane.width, plane.height);
  const bctx = context2d(base);
  if (!drawPlane(env, plane, bctx)) {
    releaseSurface(base);
    return null;
  }
  // The selected pixels, in document space, cropped to the selection.
  const full = env.createSurface(doc.width, doc.height);
  let clip: PixelClip;
  try {
    const fctx = context2d(full);
    fctx.setTransform(...plane.toDocument);
    fctx.drawImage(base, 0, 0);
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    clipToSelection(env, full, selection);
    const surface = env.createSurface(bounds.width, bounds.height);
    context2d(surface).drawImage(full, -bounds.x, -bounds.y);
    clip = { surface, ...bounds };
  } finally {
    releaseSurface(full);
  }
  if (!keepOriginal) {
    bctx.setTransform(...toPlane);
    bctx.globalCompositeOperation = "destination-out";
    bctx.drawImage(selectionSurface(env, selection), 0, 0);
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.globalCompositeOperation = "source-over";
  }
  return { plane, base, clip };
}

/** A pure translation, as a document → document matrix. */
export const offsetMatrix = (dx: number, dy: number): Matrix => [1, 0, 0, 1, dx, dy];

/**
 * Draw the plane with the lifted pixels placed by `matrix` (document → document; a translation
 * for a move, any affine map for Free Transform) into `target` (plane space).
 */
export function composeMoved(lifted: LiftedPixels, matrix: Matrix, target: Surface): void {
  const ctx = context2d(target);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(lifted.base, 0, 0);
  ctx.setTransform(...multiplyMatrix(invert(lifted.plane), matrix));
  const { clip } = lifted;
  ctx.imageSmoothingEnabled = !isTranslation(matrix);
  ctx.drawImage(clip.surface, clip.x, clip.y);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

export function releaseLifted(lifted: LiftedPixels | null): void {
  if (!lifted) return;
  releaseSurface(lifted.base);
  releaseSurface(lifted.clip.surface);
}

export function isTranslation(m: Matrix): boolean {
  return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1;
}

function invert(plane: PixelPlane): Matrix {
  const matrix = invertMatrix(plane.toDocument);
  if (!matrix) throw new PixelError("This layer is scaled to nothing and cannot be edited.");
  return matrix;
}
