import { IDENTITY_TRANSFORM } from "../document/factory";
import { checkDimensions } from "../document/limits";
import { mapLayers } from "../document/tree";
import type {
  EditorDocument,
  Layer,
  RasterLayer,
  SmartFilter,
  SmartObjectLayer,
} from "../document/types";
import type { Rect } from "../geometry/layer-geometry";
import { createId } from "../ids";
import { filterById, parseFilterValues } from "../../filters/registry";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";
import { translateLayerContent } from "./group-commands";

/** Smart objects (ADR-0016): embedded documents drawn through a layer transform. */

export const MAX_SMART_FILTERS = 32;

/** Replace a layer by another one (different id allowed) at the same place in the tree. */
function swapLayer(doc: EditorDocument, layerId: string, next: Layer): EditorDocument {
  const layers = mapLayers(doc.layers, (l) => (l.id === layerId ? next : l));
  return {
    ...doc,
    layers,
    activeLayerId: doc.activeLayerId === layerId ? next.id : doc.activeLayerId,
  };
}

/**
 * Layer → Convert to Smart Object: the layer moves into a new embedded document sized to its
 * bounds (document pixels, as the layer appears); the smart object takes its place and its
 * clipping. `bounds` comes from the caller because measuring text needs the browser.
 */
export function convertToSmartObject(layerId: string, bounds: Rect): Command {
  return {
    type: "layer.toSmartObject",
    label: "Convert to Smart Object",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind === "fill" || layer.kind === "adjustment") {
        throw new CommandError("Fill and adjustment layers can't become smart objects.");
      }
      requireUnlocked(layer, doc);
      const x = Math.floor(bounds.x);
      const y = Math.floor(bounds.y);
      const width = Math.max(1, Math.ceil(bounds.x + bounds.width) - x);
      const height = Math.max(1, Math.ceil(bounds.y + bounds.height) - y);
      const check = checkDimensions(width, height);
      if (!check.ok) throw new CommandError(check.reason);

      // Inside, the layer keeps its own look; clipping and visibility belong to the outer layer.
      const moved = mapLayers([layer], (l) => translateLayerContent(l, -x, -y))[0];
      const inner = { ...moved, visible: true } as Layer;
      delete (inner as { clipped?: unknown }).clipped;
      const now = new Date().toISOString();
      const content: EditorDocument = {
        id: createId("document"),
        name: layer.name,
        width,
        height,
        resolution: doc.resolution,
        colorSpace: doc.colorSpace,
        layers: [inner],
        activeLayerId: inner.id,
        guides: [],
        metadata: { createdAt: now, modifiedAt: now },
      };
      const smart: SmartObjectLayer = {
        id: createId("layer"),
        kind: "smart",
        name: layer.name,
        visible: layer.visible,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        transform: { ...IDENTITY_TRANSFORM, x, y },
        content,
        ...(layer.clipped ? { clipped: true } : {}),
      };
      return swapLayer(doc, layerId, smart);
    },
  };
}

/**
 * Replace a smart object's contents (applying an Edit Contents tab). All updates from one editing
 * session share a merge key, so the parent records a single undo step.
 */
export function replaceSmartContent(
  layerId: string,
  content: EditorDocument,
  options: { mergeKey?: string } = {},
): Command {
  return {
    type: "layer.smartContent",
    label: "Edit Contents",
    mergeKey: options.mergeKey,
    mergeUntilSealed: !!options.mergeKey,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "smart") throw new CommandError("That layer is not a smart object.");
      requireUnlocked(layer, doc);
      const check = checkDimensions(content.width, content.height);
      if (!check.ok) throw new CommandError(check.reason);
      if (layer.content === content) return doc;
      // The selection is session state of the tab, never part of the embedded document.
      const stored = { ...content };
      delete (stored as { selection?: unknown }).selection;
      return replaceLayer(doc, { ...layer, content: stored });
    },
  };
}

function checkedFilters(filters: readonly SmartFilter[]): SmartFilter[] {
  if (filters.length > MAX_SMART_FILTERS) {
    throw new CommandError(`A smart object can have at most ${MAX_SMART_FILTERS} filters.`);
  }
  return filters.map((f) => {
    const filter = filterById(f.filterId);
    const values = filter && parseFilterValues(filter, f.values);
    if (!filter || !values) throw new CommandError("Those filter settings are out of range.");
    return { ...f, values };
  });
}

/** Set a smart object's filter list (add, edit, reorder, hide, delete). */
export function setSmartFilters(
  layerId: string,
  filters: readonly SmartFilter[],
  options: { label?: string; mergeKey?: string } = {},
): Command {
  return {
    type: "layer.smartFilters",
    label: options.label ?? "Smart Filters",
    mergeKey: options.mergeKey,
    mergeUntilSealed: !!options.mergeKey,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "smart") throw new CommandError("Smart filters need a smart object.");
      requireUnlocked(layer, doc);
      const checked = checkedFilters(filters);
      const next = { ...layer } as SmartObjectLayer;
      if (checked.length) (next as { filters?: SmartFilter[] }).filters = checked;
      else delete (next as { filters?: unknown }).filters;
      return replaceLayer(doc, next);
    },
  };
}

/**
 * Layer → Rasterize Layer: replace a smart object, shape or text layer by pixels that look the
 * same (rendered by the caller). Opacity, blend mode, masks, effects and clipping are kept.
 */
export function rasterizeLayer(
  layerId: string,
  pixels: { assetId: string; x: number; y: number; width: number; height: number },
): Command {
  return {
    type: "layer.rasterize",
    label: "Rasterize Layer",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "smart" && layer.kind !== "shape" && layer.kind !== "text") {
        throw new CommandError("Only smart objects, shapes and text can be rasterized.");
      }
      requireUnlocked(layer, doc);
      const raster: RasterLayer = {
        id: layer.id,
        kind: "raster",
        name: layer.name,
        visible: layer.visible,
        locked: false,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        transform: { ...IDENTITY_TRANSFORM, x: pixels.x, y: pixels.y },
        assetId: pixels.assetId,
        width: pixels.width,
        height: pixels.height,
        ...(layer.mask ? { mask: layer.mask } : {}),
        ...(layer.vectorMask ? { vectorMask: layer.vectorMask } : {}),
        ...(layer.effects ? { effects: layer.effects } : {}),
        ...(layer.clipped ? { clipped: true } : {}),
      };
      return replaceLayer(doc, raster);
    },
  };
}
