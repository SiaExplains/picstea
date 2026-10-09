import type { VectorMask } from "../document/types";
import { applyMatrix, fromTransform } from "../geometry/matrix";
import { parsePath, pathBounds, translatePath, type VectorPath } from "../path/path";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";

/**
 * Commands for vector paths and masks (ADR-0015). Paths are validated like stored projects, so
 * whatever a tool produces is also what a saved project may contain.
 */

function checked(path: VectorPath): VectorPath {
  const parsed = parsePath(path);
  if (!parsed) throw new CommandError("That path is not valid or has too many points.");
  return parsed;
}

interface GestureOptions {
  readonly label?: string;
  /** Drags merge into one undo step until history is sealed. */
  readonly mergeKey?: string;
}

/** Set (or remove, with null) the document's work path. */
export function setWorkPath(path: VectorPath | null, options: GestureOptions = {}): Command {
  return {
    type: "document.workPath",
    label: options.label ?? (path ? "Work Path" : "Delete Path"),
    mergeKey: options.mergeKey,
    mergeUntilSealed: !!options.mergeKey,
    apply(doc) {
      if (!path || path.subpaths.length === 0) {
        if (!doc.workPath) return doc;
        const next = { ...doc };
        delete (next as { workPath?: unknown }).workPath;
        return next;
      }
      return { ...doc, workPath: checked(path) };
    },
  };
}

/**
 * Replace a path shape layer's outline (layer-local coordinates). The layer box is kept equal to
 * the path bounds: if an edit moves the outline past the box, the box and the transform origin
 * move with it so the shape stays exactly where it is on the canvas.
 */
export function setShapePath(
  layerId: string,
  path: VectorPath,
  options: GestureOptions = {},
): Command {
  return {
    type: "layer.shapePath",
    label: options.label ?? "Edit Path",
    mergeKey: options.mergeKey,
    mergeUntilSealed: !!options.mergeKey,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "shape" || layer.shape !== "path") {
        throw new CommandError("That layer is not a path shape.");
      }
      requireUnlocked(layer, doc);
      const local = checked(path);
      const b = pathBounds(local);
      if (!b) throw new CommandError("A shape needs at least one point.");
      const m = fromTransform(layer.transform);
      const origin = applyMatrix(m, { x: 0, y: 0 });
      const shifted = applyMatrix(m, { x: b.x, y: b.y });
      return replaceLayer(doc, {
        ...layer,
        path: translatePath(local, -b.x, -b.y),
        width: Math.max(1, b.width),
        height: Math.max(1, b.height),
        transform: {
          ...layer.transform,
          x: layer.transform.x + shifted.x - origin.x,
          y: layer.transform.y + shifted.y - origin.y,
        },
      });
    },
  };
}

/** Add, replace or (with null) remove a layer's vector mask. */
export function setVectorMask(
  layerId: string,
  mask: VectorMask | null,
  options: GestureOptions = {},
): Command {
  return {
    type: "layer.vectorMask",
    label: options.label ?? (mask ? "Vector Mask" : "Delete Vector Mask"),
    mergeKey: options.mergeKey,
    mergeUntilSealed: !!options.mergeKey,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      requireUnlocked(layer, doc);
      if (!mask) {
        if (!layer.vectorMask) return doc;
        const next = { ...layer };
        delete (next as { vectorMask?: unknown }).vectorMask;
        return replaceLayer(doc, next);
      }
      return replaceLayer(doc, { ...layer, vectorMask: { ...mask, path: checked(mask.path) } });
    },
  };
}

/** Layer → Create / Release Clipping Mask. */
export function setClipped(layerId: string, clipped: boolean): Command {
  return {
    type: "layer.clipped",
    label: clipped ? "Create Clipping Mask" : "Release Clipping Mask",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      requireUnlocked(layer, doc);
      if (!!layer.clipped === clipped) return doc;
      const next = { ...layer };
      if (clipped) (next as { clipped?: boolean }).clipped = true;
      else delete (next as { clipped?: unknown }).clipped;
      return replaceLayer(doc, next);
    },
  };
}
