import { isHexColor } from "../document/factory";
import { BLEND_MODES, type BlendMode, type EditorDocument, type Layer } from "../document/types";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";

/** Insert a layer directly above the active layer (or at the top when none is active). */
export function addLayer(layer: Layer, label = "New Layer"): Command {
  return {
    type: "layer.add",
    label,
    apply(doc) {
      if (doc.layers.some((l) => l.id === layer.id)) throw new CommandError("Duplicate layer id.");
      const activeIndex = doc.activeLayerId
        ? doc.layers.findIndex((l) => l.id === doc.activeLayerId)
        : -1;
      const insertAt = activeIndex === -1 ? doc.layers.length : activeIndex + 1;
      const layers = [...doc.layers];
      layers.splice(insertAt, 0, layer);
      return { ...doc, layers, activeLayerId: layer.id };
    },
  };
}

export function deleteLayer(layerId: string): Command {
  return {
    type: "layer.delete",
    label: "Delete Layer",
    apply(doc) {
      const index = doc.layers.findIndex((l) => l.id === layerId);
      if (index === -1) throw new CommandError("That layer no longer exists.");
      const layers = doc.layers.filter((l) => l.id !== layerId);
      let activeLayerId = doc.activeLayerId;
      if (activeLayerId === layerId) {
        // Select the layer that was below, like professional editors do; fall back to the new bottom.
        activeLayerId = (layers[index - 1] ?? layers[0])?.id ?? null;
      }
      return { ...doc, layers, activeLayerId };
    },
  };
}

export const MAX_LAYER_NAME_LENGTH = 255;

export function renameLayer(layerId: string, name: string): Command {
  return {
    type: "layer.rename",
    label: "Rename Layer",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      const trimmed = name.trim();
      if (!trimmed) throw new CommandError("Layer name cannot be empty.");
      if (trimmed.length > MAX_LAYER_NAME_LENGTH) {
        throw new CommandError(`Layer name can be at most ${MAX_LAYER_NAME_LENGTH} characters.`);
      }
      if (trimmed === layer.name) return doc;
      return replaceLayer(doc, { ...layer, name: trimmed });
    },
  };
}

export function setLayerVisibility(layerId: string, visible: boolean): Command {
  return {
    type: "layer.visibility",
    label: visible ? "Show Layer" : "Hide Layer",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.visible === visible) return doc;
      return replaceLayer(doc, { ...layer, visible });
    },
  };
}

export function setLayerLocked(layerId: string, locked: boolean): Command {
  return {
    type: "layer.lock",
    label: locked ? "Lock Layer" : "Unlock Layer",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.locked === locked) return doc;
      return replaceLayer(doc, { ...layer, locked });
    },
  };
}

export function setLayerOpacity(layerId: string, opacity: number): Command {
  return {
    type: "layer.opacity",
    label: "Layer Opacity",
    mergeKey: `layer.opacity:${layerId}`,
    apply(doc) {
      if (!Number.isFinite(opacity)) throw new CommandError("Opacity must be a number.");
      const layer = requireLayer(doc, layerId);
      requireUnlocked(layer);
      const clamped = Math.min(1, Math.max(0, opacity));
      if (layer.opacity === clamped) return doc;
      return replaceLayer(doc, { ...layer, opacity: clamped });
    },
  };
}

export function setLayerBlendMode(layerId: string, blendMode: BlendMode): Command {
  return {
    type: "layer.blendMode",
    label: "Blend Mode",
    apply(doc) {
      if (!BLEND_MODES.includes(blendMode)) throw new CommandError("Unknown blend mode.");
      const layer = requireLayer(doc, layerId);
      requireUnlocked(layer);
      if (layer.blendMode === blendMode) return doc;
      return replaceLayer(doc, { ...layer, blendMode });
    },
  };
}

export function setFillColor(layerId: string, color: string): Command {
  return {
    type: "layer.fillColor",
    label: "Fill Color",
    mergeKey: `layer.fillColor:${layerId}`,
    apply(doc) {
      if (!isHexColor(color)) throw new CommandError("Colour must be a hex value like #336699.");
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "fill") throw new CommandError("Only fill layers have a colour.");
      requireUnlocked(layer);
      const normalized = color.toLowerCase();
      if (layer.color === normalized) return doc;
      return replaceLayer(doc, { ...layer, color: normalized });
    },
  };
}

/** Move a layer to `toIndex` in bottom-to-top order. */
export function moveLayer(layerId: string, toIndex: number): Command {
  return {
    type: "layer.move",
    label: "Reorder Layer",
    apply(doc) {
      const from = doc.layers.findIndex((l) => l.id === layerId);
      if (from === -1) throw new CommandError("That layer no longer exists.");
      const target = Math.min(doc.layers.length - 1, Math.max(0, Math.trunc(toIndex)));
      if (target === from) return doc;
      const layers = [...doc.layers];
      const [moved] = layers.splice(from, 1);
      layers.splice(target, 0, moved);
      return { ...doc, layers };
    },
  };
}

/** Move a layer one step up (+1) or down (−1) in the stack. */
export function shiftLayer(doc: EditorDocument, layerId: string, delta: 1 | -1): Command {
  const from = doc.layers.findIndex((l) => l.id === layerId);
  return moveLayer(layerId, from + delta);
}

export function duplicateLayer(layerId: string, newId: string): Command {
  return {
    type: "layer.duplicate",
    label: "Duplicate Layer",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      const index = doc.layers.indexOf(layer);
      // Raster assets are immutable, so the copy can share the same asset id.
      const copy: Layer = { ...layer, id: newId, name: `${layer.name} copy`, locked: false };
      const layers = [...doc.layers];
      layers.splice(index + 1, 0, copy);
      return { ...doc, layers, activeLayerId: newId };
    },
  };
}
