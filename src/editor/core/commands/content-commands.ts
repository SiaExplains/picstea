import { mapPath, translatePath } from "../path/path";
import {
  applyMatrix,
  fromTransform,
  IDENTITY,
  invertMatrix,
  multiplyMatrix,
  type Matrix,
} from "../geometry/matrix";
import type { SelectionMask } from "../../selection/mask";
import { withoutSelection } from "./selection-commands";
import { isHexColor } from "../document/factory";
import { checkDimensions } from "../document/limits";
import {
  type CharStyle,
  type Layer,
  type ParagraphStyle,
  type ShapeLayer,
  type TextLayer,
  type Transform,
} from "../document/types";
import { translateAllLayers } from "./group-commands";
import {
  CHAR_STYLE_KEYS,
  baseCharStyle,
  isFontFamilyName,
  normalizeParagraphs,
  normalizeRuns,
  paragraphRanges,
  shiftRuns,
} from "../document/text";
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
      // Linked masks follow the layer (ADR-0043). A pure move shifts them; a scale or rotation
      // maps a vector mask's path, and gives a raster mask a pending transform that the
      // controller bakes into new pixels when the gesture ends.
      const moved =
        t.scaleX === transform.scaleX &&
        t.scaleY === transform.scaleY &&
        t.rotation === transform.rotation;
      const inverse = moved ? null : invertMatrix(fromTransform(t));
      const delta = inverse ? multiplyMatrix(fromTransform(transform), inverse) : null;
      let mask = layer.mask;
      if (mask?.linked && moved && !mask.pendingTransform) {
        mask = { ...mask, x: mask.x + transform.x - t.x, y: mask.y + transform.y - t.y };
      } else if (mask?.linked) {
        const step: Matrix = delta ?? [1, 0, 0, 1, transform.x - t.x, transform.y - t.y];
        const pending = multiplyMatrix(step, mask.pendingTransform ?? IDENTITY);
        mask = { ...mask, pendingTransform: [...pending] };
      }
      let vectorMask = layer.vectorMask;
      if (vectorMask?.linked && moved) {
        vectorMask = {
          ...vectorMask,
          path: translatePath(vectorMask.path, transform.x - t.x, transform.y - t.y),
        };
      } else if (vectorMask?.linked && delta) {
        vectorMask = {
          ...vectorMask,
          path: mapPath(vectorMask.path, (p) => applyMatrix(delta, p)),
        };
      }
      return replaceLayer(doc, {
        ...layer,
        transform: { ...transform },
        ...(mask ? { mask } : {}),
        ...(vectorMask ? { vectorMask } : {}),
      } as Layer);
    },
  };
}

/**
 * Move or transform selected pixels (Move tool or Free Transform with a selection): the new
 * pixels of the layer — or of its mask, with `target: "mask"` — and the moved outline in one undo
 * step. `selection` is null when the outline was moved off the canvas.
 */
export function moveSelectedPixels(
  layerId: string,
  assetId: string,
  selection: SelectionMask | null,
  options: {
    label?: string;
    mergeKey?: string;
    gesture?: boolean;
    target?: "content" | "mask";
  } = {},
): Command {
  return {
    type: "layer.movePixels",
    label: options.label ?? "Move",
    mergeKey: options.mergeKey,
    mergeUntilSealed: options.gesture,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      const onMask = options.target === "mask";
      if (onMask && !layer.mask) throw new CommandError("This layer has no mask.");
      if (!onMask && layer.kind !== "raster") {
        throw new CommandError("Only pixel layers can be painted on.");
      }
      requireUnlocked(layer, doc);
      if (selection && (selection.width !== doc.width || selection.height !== doc.height)) {
        throw new CommandError("The selection does not match the canvas size.");
      }
      const moved = replaceLayer(
        doc,
        onMask
          ? ({ ...layer, mask: { ...layer.mask!, assetId } } as Layer)
          : ({ ...layer, assetId } as Layer),
      );
      return selection?.bounds ? { ...moved, selection } : withoutSelection(moved);
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

/**
 * New pixels for a layer that grew while painting (ADR-0043): content, size and position change
 * together, so undo restores the old box. `rect` is the new box in the layer's own pixels (its
 * old top-left is 0,0). Only for layers that are not scaled, rotated or flipped. The position is
 * set directly, not through `setLayerTransform`, so masks (document space) stay where they are.
 */
export function setRasterContentAndBounds(
  layerId: string,
  assetId: string,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  label: string,
): Command {
  return {
    type: "layer.rasterContentBounds",
    label,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "raster") throw new CommandError("Only pixel layers can be painted on.");
      requireUnlocked(layer, doc);
      const t = layer.transform;
      if (t.scaleX !== 1 || t.scaleY !== 1 || t.rotation !== 0) {
        throw new CommandError("Only unscaled, unrotated layers can grow.");
      }
      if (![rect.x, rect.y].every(Number.isInteger))
        throw new CommandError("Invalid layer bounds.");
      const size = checkDimensions(rect.width, rect.height);
      if (!size.ok) throw new CommandError(size.reason);
      return replaceLayer(doc, {
        ...layer,
        assetId,
        width: rect.width,
        height: rect.height,
        transform: { ...t, x: t.x + rect.x, y: t.y + rect.y },
      });
    },
  };
}

/**
 * Swap in finished versions of layers after a transform (ADR-0043): shapes with their scale baked
 * into their geometry, masks with their pending transform baked into new pixels. The controller
 * folds this into the transform's own undo step.
 */
export function bakeLayers(layers: readonly Layer[], label: string): Command {
  return {
    type: "layers.bake",
    label,
    apply(doc) {
      let next = doc;
      for (const layer of layers) {
        requireLayer(next, layer.id);
        next = replaceLayer(next, layer);
      }
      return next;
    },
  };
}

export const MAX_TEXT_LENGTH = 10_000;
const MAX_RUNS = 5_000;

export type TextPatch = Partial<
  Pick<TextLayer, "text" | "align" | "box" | "runs" | "paragraphs"> & CharStyle
>;

function checkCharStyle(style: Partial<CharStyle>): void {
  if (style.fontFamily !== undefined && !isFontFamilyName(style.fontFamily)) {
    throw new CommandError("Unknown font.");
  }
  if (style.fontSize !== undefined && !(style.fontSize >= 1 && style.fontSize <= 2000)) {
    throw new CommandError("Font size must be between 1 and 2000 px.");
  }
  if (style.fontWeight !== undefined && style.fontWeight !== 400 && style.fontWeight !== 700) {
    throw new CommandError("Font weight must be regular or bold.");
  }
  if (style.color !== undefined && !isHexColor(style.color)) {
    throw new CommandError("Colour must be a hex value like #336699.");
  }
  if (style.lineHeight !== undefined && !(style.lineHeight >= 0.5 && style.lineHeight <= 5)) {
    throw new CommandError("Line height must be between 0.5 and 5.");
  }
  if (
    style.letterSpacing !== undefined &&
    !(style.letterSpacing >= -100 && style.letterSpacing <= 500)
  ) {
    throw new CommandError("Letter spacing must be between -100 and 500 px.");
  }
  if (
    style.baselineShift !== undefined &&
    !(style.baselineShift >= -1000 && style.baselineShift <= 1000)
  ) {
    throw new CommandError("Baseline shift must be between -1000 and 1000 px.");
  }
  if (style.caps !== undefined && !["normal", "all-caps", "small-caps"].includes(style.caps)) {
    throw new CommandError("Unknown capitals setting.");
  }
}

const ALIGNS: readonly string[] = ["left", "center", "right", "justify"];

function checkParagraph(p: ParagraphStyle): void {
  if (!ALIGNS.includes(p.align)) throw new CommandError("Unknown alignment.");
  const lengths = [p.indentLeft, p.indentRight, p.indentFirst];
  if (!lengths.every((n) => Number.isFinite(n) && Math.abs(n) <= 1e5)) {
    throw new CommandError("Indents must be between -100000 and 100000 px.");
  }
  const spaces = [p.spaceBefore, p.spaceAfter];
  if (!spaces.every((n) => Number.isFinite(n) && n >= 0 && n <= 1e5)) {
    throw new CommandError("Paragraph spacing must be between 0 and 100000 px.");
  }
}

function checkTextPatch(patch: TextPatch): void {
  if (patch.text !== undefined && patch.text.length > MAX_TEXT_LENGTH) {
    throw new CommandError(
      `Text can be at most ${MAX_TEXT_LENGTH.toLocaleString("en-US")} characters.`,
    );
  }
  checkCharStyle(patch);
  if (patch.align !== undefined && !ALIGNS.includes(patch.align)) {
    throw new CommandError("Unknown alignment.");
  }
  if (
    patch.box &&
    !(
      patch.box.width >= 1 &&
      patch.box.width <= 1e6 &&
      patch.box.height >= 1 &&
      patch.box.height <= 1e6
    )
  ) {
    throw new CommandError("A text box must be between 1 and 1000000 px.");
  }
  if (patch.runs) {
    if (patch.runs.length > MAX_RUNS) throw new CommandError("Too many text styles.");
    for (const run of patch.runs) checkCharStyle(run.style);
  }
  if (patch.paragraphs) {
    if (patch.paragraphs.length > MAX_RUNS) throw new CommandError("Too many paragraphs.");
    patch.paragraphs.forEach(checkParagraph);
  }
}

/** Length of the common prefix and suffix of two strings (not overlapping). */
function textDiff(a: string, b: string): { from: number; to: number; inserted: number } {
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++;
  }
  return { from: prefix, to: a.length - suffix, inserted: b.length - prefix - suffix };
}

/** Paragraph styles kept with their paragraphs when lines are added or removed. */
function shiftParagraphs(
  layer: TextLayer,
  next: string,
  diff: { from: number; to: number; inserted: number },
): ParagraphStyle[] {
  if (layer.paragraphs.length === 0) return [];
  const before = paragraphRanges(layer.text);
  const startIndex = before.findIndex((r) => diff.from >= r.start && diff.from <= r.end);
  const removed = (layer.text.slice(diff.from, diff.to).match(/\n/g) ?? []).length;
  const added = (next.slice(diff.from, diff.from + diff.inserted).match(/\n/g) ?? []).length;
  const out = [...layer.paragraphs];
  const at = Math.max(0, startIndex) + 1;
  const style = out[at - 1];
  out.splice(at, removed, ...Array.from({ length: added }, () => style).filter(Boolean));
  return out;
}

/**
 * Edit a text layer. Changing the base character style without `runs` applies it to every
 * character (runs lose that override); changing `text` without `runs` keeps the existing styles
 * on the characters they covered.
 */
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
      const text = patch.text ?? layer.text;
      const diff = textDiff(layer.text, text);
      let runs = patch.runs ?? layer.runs;
      if (!patch.runs && text !== layer.text) {
        runs = shiftRuns(runs, diff.from, diff.to, diff.inserted);
      }
      const styleKeys = CHAR_STYLE_KEYS.filter((k) => patch[k] !== undefined);
      if (!patch.runs && styleKeys.length > 0) {
        runs = runs.map((r) => {
          const style: Record<string, unknown> = { ...r.style };
          for (const k of styleKeys) delete style[k];
          return { ...r, style: style as Partial<CharStyle> };
        });
      }
      let paragraphs = patch.paragraphs ?? layer.paragraphs;
      if (!patch.paragraphs && text !== layer.text) paragraphs = shiftParagraphs(layer, text, diff);
      if (patch.align !== undefined && !patch.paragraphs) {
        // The alignment buttons outside the Paragraph panel align every paragraph.
        paragraphs = paragraphs.map((p) => ({ ...p, align: patch.align! }));
      }
      const merged = {
        ...layer,
        ...patch,
        text,
        color: patch.color?.toLowerCase() ?? layer.color,
      } as TextLayer;
      const base = baseCharStyle(merged);
      const next: TextLayer = {
        ...merged,
        runs: normalizeRuns(
          runs.map((r) => ({
            ...r,
            style: r.style.color ? { ...r.style, color: r.style.color.toLowerCase() } : r.style,
          })),
          base,
          text.length,
        ),
        paragraphs: normalizeParagraphs(paragraphs, text, merged.align),
      };
      return sameText(next, layer) ? doc : replaceLayer(doc, next);
    },
  };
}

function sameText(a: TextLayer, b: TextLayer): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
export function cropDocument(
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  label = "Crop",
): Command {
  return {
    type: "document.crop",
    label,
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
