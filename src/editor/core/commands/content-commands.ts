import { translatePath } from "../path/path";
import { withoutSelection } from "./selection-commands";
import { isHexColor } from "../document/factory";
import { checkDimensions } from "../document/limits";
import {
  FONT_FAMILIES,
  type Layer,
  type ShapeLayer,
  type TextLayer,
  type Transform,
} from "../document/types";
import { translateAllLayers } from "./group-commands";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";

const MAX_COORDINATE = 1e6;
const MAX_SCALE = 1000;

function validTransform(t: Transform): boolean {
  return (
    [t.x, t.y, t.scaleX, t.scaleY, t.rotation].every(Number.isFinite) &&
    Math.abs(t.x) <= MAX_COORDINATE &&
    Math.abs(t.y) <= MAX_COORDINATE &&
    Math.abs(t.scaleX) <= MAX_SCALE &&
    Math.abs(t.scaleY) <= MAX_SCALE &&
    t.scaleX !== 0 &&
    t.scaleY !== 0 &&
    Math.abs(t.rotation) <= 360
  );
}

/**
 * Replace a layer's transform (move, free transform, flip, numeric transform). Pass a
 * `mergeKey` so a drag collapses into one undo step.
 */
export function setLayerTransform(
  layerId: string,
  transform: Transform,
  options: { label?: string; mergeKey?: string; gesture?: boolean } = {},
): Command {
  return {
    type: "layer.transform",
    label: options.label ?? "Transform",
    mergeKey: options.mergeKey,
    mergeUntilSealed: options.gesture,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind === "fill" || layer.kind === "adjustment") {
        throw new CommandError("This layer always covers the canvas.");
      }
      if (layer.kind === "group")
        throw new CommandError("Groups can be moved but not transformed yet.");
      requireUnlocked(layer, doc);
      if (!validTransform(transform)) throw new CommandError("That transform is out of range.");
      const t = layer.transform;
      if (
        t.x === transform.x &&
        t.y === transform.y &&
        t.scaleX === transform.scaleX &&
        t.scaleY === transform.scaleY &&
        t.rotation === transform.rotation
      ) {
        return doc;
      }
      // A pure move carries a linked mask along; scaling/rotating leaves the mask in place.
      const moved =
        t.scaleX === transform.scaleX &&
        t.scaleY === transform.scaleY &&
        t.rotation === transform.rotation;
      const mask =
        layer.mask && layer.mask.linked && moved
          ? {
              ...layer.mask,
              x: layer.mask.x + transform.x - t.x,
              y: layer.mask.y + transform.y - t.y,
            }
          : layer.mask;
      const vectorMask =
        layer.vectorMask && layer.vectorMask.linked && moved
          ? {
              ...layer.vectorMask,
              path: translatePath(layer.vectorMask.path, transform.x - t.x, transform.y - t.y),
            }
          : layer.vectorMask;
      return replaceLayer(doc, {
        ...layer,
        transform: { ...transform },
        ...(mask ? { mask } : {}),
        ...(vectorMask ? { vectorMask } : {}),
      } as Layer);
    },
  };
}

/** Swap a pixel layer's content for another immutable asset (a finished brush stroke). */
export function setRasterContent(layerId: string, assetId: string | null, label: string): Command {
  return {
    type: "layer.rasterContent",
    label,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "raster") throw new CommandError("Only pixel layers can be painted on.");
      requireUnlocked(layer, doc);
      if (layer.assetId === assetId) return doc;
      return replaceLayer(doc, { ...layer, assetId });
    },
  };
}

export const MAX_TEXT_LENGTH = 10_000;
export type TextPatch = Partial<
  Pick<
    TextLayer,
    | "text"
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "italic"
    | "color"
    | "align"
    | "lineHeight"
    | "letterSpacing"
  >
>;

function checkTextPatch(patch: TextPatch): void {
  if (patch.text !== undefined && patch.text.length > MAX_TEXT_LENGTH) {
    throw new CommandError(
      `Text can be at most ${MAX_TEXT_LENGTH.toLocaleString("en-US")} characters.`,
    );
  }
  if (patch.fontFamily !== undefined && !FONT_FAMILIES.includes(patch.fontFamily)) {
    throw new CommandError("Unknown font.");
  }
  if (patch.fontSize !== undefined && !(patch.fontSize >= 1 && patch.fontSize <= 2000)) {
    throw new CommandError("Font size must be between 1 and 2000 px.");
  }
  if (patch.fontWeight !== undefined && patch.fontWeight !== 400 && patch.fontWeight !== 700) {
    throw new CommandError("Font weight must be regular or bold.");
  }
  if (patch.color !== undefined && !isHexColor(patch.color)) {
    throw new CommandError("Colour must be a hex value like #336699.");
  }
  if (patch.align !== undefined && !["left", "center", "right"].includes(patch.align)) {
    throw new CommandError("Unknown alignment.");
  }
  if (patch.lineHeight !== undefined && !(patch.lineHeight >= 0.5 && patch.lineHeight <= 5)) {
    throw new CommandError("Line height must be between 0.5 and 5.");
  }
  if (
    patch.letterSpacing !== undefined &&
    !(patch.letterSpacing >= -100 && patch.letterSpacing <= 500)
  ) {
    throw new CommandError("Letter spacing must be between -100 and 500 px.");
  }
}

export function updateTextLayer(layerId: string, patch: TextPatch, label = "Edit Text"): Command {
  return {
    type: "layer.text",
    label,
    mergeKey: `layer.text:${layerId}:${Object.keys(patch).sort().join(",")}`,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "text") throw new CommandError("That layer is not a text layer.");
      requireUnlocked(layer, doc);
      checkTextPatch(patch);
      const next: TextLayer = {
        ...layer,
        ...patch,
        color: patch.color?.toLowerCase() ?? layer.color,
      };
      const changed = (Object.keys(patch) as (keyof TextPatch)[]).some(
        (key) => next[key] !== layer[key],
      );
      return changed ? replaceLayer(doc, next) : doc;
    },
  };
}

export type ShapePatch = Partial<Pick<ShapeLayer, "fill" | "stroke" | "cornerRadius">>;

export function updateShapeLayer(
  layerId: string,
  patch: ShapePatch,
  label = "Edit Shape",
): Command {
  return {
    type: "layer.shape",
    label,
    mergeKey: `layer.shape:${layerId}:${Object.keys(patch).sort().join(",")}`,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "shape") throw new CommandError("That layer is not a shape layer.");
      requireUnlocked(layer, doc);
      if (patch.fill !== undefined && patch.fill !== null && !isHexColor(patch.fill)) {
        throw new CommandError("Fill must be a hex colour.");
      }
      if (patch.stroke) {
        if (!isHexColor(patch.stroke.color)) throw new CommandError("Stroke must be a hex colour.");
        if (!(patch.stroke.width > 0 && patch.stroke.width <= 1000)) {
          throw new CommandError("Stroke width must be between 0 and 1000 px.");
        }
      }
      if (
        patch.cornerRadius !== undefined &&
        !(patch.cornerRadius >= 0 && patch.cornerRadius <= 100_000)
      ) {
        throw new CommandError("Corner radius must be 0 or more.");
      }
      const next: ShapeLayer = {
        ...layer,
        ...patch,
        fill: layer.shape === "line" ? null : patch.fill !== undefined ? patch.fill : layer.fill,
      };
      if (layer.shape === "line" && !next.stroke) {
        throw new CommandError("A line needs a stroke.");
      }
      const same =
        next.fill === layer.fill &&
        next.cornerRadius === layer.cornerRadius &&
        next.stroke?.color === layer.stroke?.color &&
        next.stroke?.width === layer.stroke?.width;
      return same ? doc : replaceLayer(doc, next);
    },
  };
}

/**
 * Crop the canvas to a rectangle in document pixels. Non-destructive: layers are shifted, and
 * content outside the new canvas is kept (it can be revealed again by moving or undoing).
 */
export function cropDocument(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Command {
  return {
    type: "document.crop",
    label: "Crop",
    apply(doc) {
      const { x, y, width, height } = rect;
      if (![x, y].every(Number.isInteger)) throw new CommandError("Crop must be on whole pixels.");
      const check = checkDimensions(width, height);
      if (!check.ok) throw new CommandError(check.reason);
      if (x === 0 && y === 0 && width === doc.width && height === doc.height) return doc;
      const layers = translateAllLayers(doc, -x, -y);
      const guides = doc.guides.map((g) => ({
        ...g,
        position: g.position - (g.orientation === "vertical" ? x : y),
      }));
      const workPath = doc.workPath && translatePath(doc.workPath, -x, -y);
      return {
        ...withoutSelection(doc),
        width,
        height,
        layers,
        guides,
        ...(workPath ? { workPath } : {}),
      };
    },
  };
}
