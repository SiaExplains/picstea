import { mapPath, translatePath } from "../path/path";
import { mapLayers } from "../document/tree";
import type { Layer, LayerMask, Transform } from "../document/types";
import { transformGuide } from "../geometry/canvas-transform";
import { applyMatrix, type Matrix } from "../geometry/matrix";
import { withoutSelection } from "./selection-commands";
import { checkDimensions } from "../document/limits";
import { CommandError, type Command } from "./command";
import { translateAllLayers } from "./group-commands";

export const MAX_DOCUMENT_NAME_LENGTH = 255;

export function renameDocument(name: string): Command {
  return {
    type: "document.rename",
    label: "Rename Document",
    apply(doc) {
      const trimmed = name.trim();
      if (!trimmed) throw new CommandError("Document name cannot be empty.");
      if (trimmed.length > MAX_DOCUMENT_NAME_LENGTH) {
        throw new CommandError(
          `Document name can be at most ${MAX_DOCUMENT_NAME_LENGTH} characters.`,
        );
      }
      if (trimmed === doc.name) return doc;
      return { ...doc, name: trimmed };
    },
  };
}

export type CanvasAnchor = "top-left" | "center";

/**
 * Change the canvas size without resampling content. Layers keep their pixels; with a centre
 * anchor they shift so the old canvas stays centred in the new one.
 */
export function resizeCanvas(width: number, height: number, anchor: CanvasAnchor): Command {
  return {
    type: "document.resizeCanvas",
    label: "Canvas Size",
    apply(doc) {
      const check = checkDimensions(width, height);
      if (!check.ok) throw new CommandError(check.reason);
      if (width === doc.width && height === doc.height) return doc;
      const dx = anchor === "center" ? Math.round((width - doc.width) / 2) : 0;
      const dy = anchor === "center" ? Math.round((height - doc.height) / 2) : 0;
      const layers = translateAllLayers(doc, dx, dy);
      const workPath = doc.workPath && translatePath(doc.workPath, dx, dy);
      return { ...withoutSelection(doc), width, height, layers, ...(workPath ? { workPath } : {}) };
    },
  };
}

export interface CanvasTransformPlan {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  /** Old → new document coordinates. */
  readonly matrix: Matrix;
  /** New transforms of the layers that have one (computed with their content sizes). */
  readonly transforms: Readonly<Record<string, Transform>>;
  /** New raster masks (re-rendered through the matrix). */
  readonly masks: Readonly<Record<string, LayerMask>>;
  readonly resolution?: number;
}

/**
 * Image Size, Image Rotation and Flip Canvas (ADR-0033): the canvas, every layer, mask, vector
 * mask, the work path and the guides through one matrix. The selection is dropped.
 */
export function transformCanvas(plan: CanvasTransformPlan): Command {
  return {
    type: "document.transformCanvas",
    label: plan.label,
    apply(doc) {
      const check = checkDimensions(plan.width, plan.height);
      if (!check.ok) throw new CommandError(check.reason);
      const move = (p: { x: number; y: number }) => applyMatrix(plan.matrix, p);
      const layers = mapLayers(doc.layers, (layer) => {
        let next: Layer = layer;
        // Own entries only: a layer id such as "constructor" must not read inherited values.
        const transform = Object.hasOwn(plan.transforms, layer.id)
          ? plan.transforms[layer.id]
          : undefined;
        if (transform && "transform" in next && next.kind !== "group") {
          next = { ...next, transform } as Layer;
        }
        const mask = Object.hasOwn(plan.masks, layer.id) ? plan.masks[layer.id] : undefined;
        if (mask && next.mask) next = { ...next, mask } as Layer;
        if (next.vectorMask) {
          next = {
            ...next,
            vectorMask: { ...next.vectorMask, path: mapPath(next.vectorMask.path, move) },
          } as Layer;
        }
        return next;
      });
      const workPath = doc.workPath && mapPath(doc.workPath, move);
      return {
        ...withoutSelection(doc),
        width: plan.width,
        height: plan.height,
        layers,
        guides: doc.guides.map((g) => transformGuide(g, plan.matrix)),
        ...(workPath ? { workPath } : {}),
        ...(plan.resolution ? { resolution: plan.resolution } : {}),
      };
    },
  };
}
