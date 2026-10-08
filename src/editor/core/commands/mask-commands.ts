import { createMask } from "../document/factory";
import type { Layer } from "../document/types";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";

/** Add a reveal-all mask covering the canvas. */
/** Add a document-sized mask: reveal-all, or the given pixels (e.g. made from a selection). */
export function addLayerMask(
  layerId: string,
  assetId: string | null = null,
  label = "Add Layer Mask",
): Command {
  return {
    type: "mask.add",
    label,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      requireUnlocked(layer, doc);
      if (layer.mask) return doc;
      return replaceLayer(doc, { ...layer, mask: { ...createMask(doc), assetId } } as Layer);
    },
  };
}

export function deleteLayerMask(layerId: string): Command {
  return {
    type: "mask.delete",
    label: "Delete Layer Mask",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      requireUnlocked(layer, doc);
      if (!layer.mask) return doc;
      const { mask: _removed, ...rest } = layer;
      void _removed;
      return replaceLayer(doc, rest as Layer);
    },
  };
}

export function setMaskEnabled(layerId: string, enabled: boolean): Command {
  return {
    type: "mask.enabled",
    label: enabled ? "Enable Layer Mask" : "Disable Layer Mask",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (!layer.mask) throw new CommandError("This layer has no mask.");
      if (layer.mask.enabled === enabled) return doc;
      return replaceLayer(doc, { ...layer, mask: { ...layer.mask, enabled } } as Layer);
    },
  };
}

export function setMaskLinked(layerId: string, linked: boolean): Command {
  return {
    type: "mask.linked",
    label: linked ? "Link Mask" : "Unlink Mask",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (!layer.mask) throw new CommandError("This layer has no mask.");
      if (layer.mask.linked === linked) return doc;
      return replaceLayer(doc, { ...layer, mask: { ...layer.mask, linked } } as Layer);
    },
  };
}

/** Swap a mask's pixels for another immutable asset (a finished brush stroke on the mask). */
export function setMaskContent(
  layerId: string,
  assetId: string | null,
  label = "Paint Mask",
): Command {
  return {
    type: "mask.content",
    label,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (!layer.mask) throw new CommandError("This layer has no mask.");
      requireUnlocked(layer, doc);
      if (layer.mask.assetId === assetId) return doc;
      return replaceLayer(doc, { ...layer, mask: { ...layer.mask, assetId } } as Layer);
    },
  };
}
