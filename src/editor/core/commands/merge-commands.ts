import { IDENTITY_TRANSFORM } from "../document/factory";
import { findLayerDeep, isGroup, locateLayer, mapLayersDeep } from "../document/tree";
import {
  LAYER_LABELS,
  type EditorDocument,
  type Layer,
  type LayerLabel,
  type RasterLayer,
} from "../document/types";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";

/**
 * Commands that bake layers into pixels (Merge Down, Flatten Image, Rasterize Layer Style) and
 * colour labels. The pixels are rendered by the controller beforehand and passed in as an asset,
 * so these stay pure document → document functions like every other command.
 */

export interface BakedPixels {
  readonly assetId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The layer directly below another one in the same list, if it can take a merge. */
export function mergeTarget(doc: EditorDocument, layerId: string): Layer | null {
  const location = locateLayer(doc.layers, layerId);
  if (!location || location.index === 0) return null;
  const upper = location.siblings[location.index];
  const lower = location.siblings[location.index - 1];
  if (isGroup(upper) || isGroup(lower) || lower.kind === "adjustment") return null;
  return lower;
}

function bakedLayer(
  from: Layer,
  pixels: BakedPixels,
  keep: Pick<Layer, "opacity" | "blendMode" | "visible">,
): RasterLayer {
  return {
    id: from.id,
    kind: "raster",
    name: from.name,
    visible: keep.visible,
    locked: false,
    opacity: keep.opacity,
    // Only groups pass through, and groups are never baked by these commands.
    blendMode: keep.blendMode === "pass-through" ? "normal" : keep.blendMode,
    transform: { ...IDENTITY_TRANSFORM, x: pixels.x, y: pixels.y },
    assetId: pixels.assetId,
    width: pixels.width,
    height: pixels.height,
    ...(from.clipped ? { clipped: true } : {}),
    ...(from.label ? { label: from.label } : {}),
  };
}

/**
 * Merge a layer into the one below it (Photoshop's Merge Down): the lower layer keeps its name,
 * opacity, blend mode, clipping and label; its pixels become both layers drawn together, with
 * masks and effects applied.
 */
export function mergeDown(layerId: string, pixels: BakedPixels): Command {
  return {
    type: "layer.mergeDown",
    label: "Merge Down",
    apply(doc) {
      const upper = requireLayer(doc, layerId);
      const lower = mergeTarget(doc, layerId);
      if (!lower)
        throw new CommandError("There is no layer below this one that it can merge into.");
      requireUnlocked(upper, doc);
      requireUnlocked(lower, doc);
      const merged = bakedLayer(lower, pixels, lower);
      const layers = mapLayersDeep(doc.layers, (l) => (l.id === lower.id ? merged : l));
      return { ...doc, layers: removeDeep(layers, upper.id), activeLayerId: lower.id };
    },
  };
}

function removeDeep(layers: readonly Layer[], id: string): Layer[] {
  return layers
    .filter((l) => l.id !== id)
    .map((l) => (isGroup(l) ? { ...l, children: removeDeep(l.children, id) } : l));
}

/** Replace every layer with one opaque-or-not pixel layer of the whole visible image. */
export function flattenImage(pixels: BakedPixels, newId: string): Command {
  return {
    type: "document.flatten",
    label: "Flatten Image",
    apply(doc) {
      if (doc.layers.length === 0) throw new CommandError("There are no layers to flatten.");
      const background: RasterLayer = {
        id: newId,
        kind: "raster",
        name: "Background",
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        transform: { ...IDENTITY_TRANSFORM, x: pixels.x, y: pixels.y },
        assetId: pixels.assetId,
        width: pixels.width,
        height: pixels.height,
      };
      return { ...doc, layers: [background], activeLayerId: newId };
    },
  };
}

/**
 * Bake a layer's effects (and masks) into its pixels. The result is a plain pixel layer with the
 * same opacity, blend mode, clipping and label.
 */
export function rasterizeLayerStyle(layerId: string, pixels: BakedPixels): Command {
  return {
    type: "layer.rasterizeStyle",
    label: "Rasterize Layer Style",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (isGroup(layer) || layer.kind === "adjustment") {
        throw new CommandError("Groups and adjustment layers can't be rasterized.");
      }
      if (!layer.effects) throw new CommandError("This layer has no layer style.");
      requireUnlocked(layer, doc);
      return replaceLayer(doc, bakedLayer(layer, pixels, layer));
    },
  };
}

/** Set (or clear, with null) the colour label of one or more layers. */
export function setLayerLabel(layerIds: readonly string[], label: LayerLabel | null): Command {
  if (label !== null && !LAYER_LABELS.includes(label)) {
    throw new CommandError("Unknown layer colour.");
  }
  return {
    type: "layer.label",
    label: "Layer Colour",
    apply(doc) {
      let next = doc;
      for (const id of layerIds) {
        const layer = findLayerDeep(next.layers, id);
        if (!layer || (layer.label ?? null) === label) continue;
        const updated: { label?: LayerLabel } = { ...layer };
        if (label) updated.label = label;
        else delete updated.label;
        next = replaceLayer(next, updated as Layer);
      }
      return next;
    },
  };
}
