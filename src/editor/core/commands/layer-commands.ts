import { isHexColor } from "../document/factory";
import { createId } from "../ids";
import {
  childrenOf,
  findLayerDeep,
  insertLayerAt,
  isDescendant,
  isGroup,
  locateLayer,
  removeLayerDeep,
  replaceLayerDeep,
} from "../document/tree";
import {
  BLEND_MODES,
  type EditorDocument,
  type GroupBlendMode,
  type GroupLayer,
  type Layer,
} from "../document/types";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";

/**
 * Insert a layer directly above the active layer in the same group, inside an active group (at
 * its top), or at the top of the document when nothing is active.
 */
export function addLayer(layer: Layer, label = "New Layer"): Command {
  return {
    type: "layer.add",
    label,
    apply(doc) {
      if (findLayerDeep(doc.layers, layer.id)) throw new CommandError("Duplicate layer id.");
      const active = doc.activeLayerId ? findLayerDeep(doc.layers, doc.activeLayerId) : undefined;
      let parentId: string | null = null;
      let index = doc.layers.length;
      if (active && isGroup(active)) {
        parentId = active.id;
        index = active.children.length;
      } else if (active) {
        const location = locateLayer(doc.layers, active.id)!;
        parentId = location.parentId;
        index = location.index + 1;
      }
      let layers = insertLayerAt(doc.layers, parentId, index, layer);
      // Make sure the new layer is visible in the panel.
      if (parentId) {
        const parent = findLayerDeep(layers, parentId);
        if (parent && isGroup(parent) && !parent.expanded) {
          layers = replaceLayerDeep(layers, { ...parent, expanded: true });
        }
      }
      return { ...doc, layers, activeLayerId: layer.id };
    },
  };
}

export function deleteLayer(layerId: string): Command {
  return {
    type: "layer.delete",
    label: "Delete Layer",
    apply(doc) {
      const location = locateLayer(doc.layers, layerId);
      if (!location) throw new CommandError("That layer no longer exists.");
      const layers = removeLayerDeep(doc.layers, layerId);
      let activeLayerId = doc.activeLayerId;
      const activeGone =
        activeLayerId === layerId ||
        (activeLayerId !== null && isDescendant(doc.layers, layerId, activeLayerId));
      if (activeGone) {
        // Select the layer that was below, like professional editors do; then the one above,
        // then the parent group, then the new top of the document.
        const siblings = location.siblings.filter((l) => l.id !== layerId);
        activeLayerId =
          siblings[location.index - 1]?.id ??
          siblings[location.index]?.id ??
          location.parentId ??
          layers.at(-1)?.id ??
          null;
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
      requireUnlocked(layer, doc);
      const clamped = Math.min(1, Math.max(0, opacity));
      if (layer.opacity === clamped) return doc;
      return replaceLayer(doc, { ...layer, opacity: clamped });
    },
  };
}

export function setLayerBlendMode(layerId: string, blendMode: GroupBlendMode): Command {
  return {
    type: "layer.blendMode",
    label: "Blend Mode",
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      const valid =
        (BLEND_MODES as readonly string[]).includes(blendMode) ||
        (blendMode === "pass-through" && layer.kind === "group");
      if (!valid) throw new CommandError("Unknown blend mode.");
      requireUnlocked(layer, doc);
      if (layer.blendMode === blendMode) return doc;
      return replaceLayer(doc, { ...layer, blendMode } as Layer);
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
      requireUnlocked(layer, doc);
      const normalized = color.toLowerCase();
      if (layer.color === normalized) return doc;
      return replaceLayer(doc, { ...layer, color: normalized });
    },
  };
}

/**
 * Move a layer into `parentId` (null = document root) at `index` (bottom-to-top order, counted
 * after the layer has been removed from its old place). Groups cannot move into themselves.
 */
export function moveLayerTo(layerId: string, parentId: string | null, index: number): Command {
  return {
    type: "layer.move",
    label: "Reorder Layer",
    apply(doc) {
      const location = locateLayer(doc.layers, layerId);
      if (!location) throw new CommandError("That layer no longer exists.");
      if (parentId !== null) {
        const parent = findLayerDeep(doc.layers, parentId);
        if (!parent || !isGroup(parent))
          throw new CommandError("Layers can only be moved into groups.");
        if (parentId === layerId || isDescendant(doc.layers, layerId, parentId)) {
          throw new CommandError("A group cannot be moved into itself.");
        }
      }
      const layer = location.siblings[location.index];
      const without = removeLayerDeep(doc.layers, layerId);
      const target = childrenOf({ ...doc, layers: without }, parentId)!;
      const clamped = Math.max(0, Math.min(Math.trunc(index), target.length));
      if (parentId === location.parentId && clamped === location.index) return doc;
      return { ...doc, layers: insertLayerAt(without, parentId, clamped, layer) };
    },
  };
}

/** Move a layer to `toIndex` within its current parent. */
export function moveLayer(layerId: string, toIndex: number): Command {
  return {
    type: "layer.move",
    label: "Reorder Layer",
    apply(doc) {
      const location = locateLayer(doc.layers, layerId);
      if (!location) throw new CommandError("That layer no longer exists.");
      const max = location.siblings.length - 1;
      return moveLayerTo(layerId, location.parentId, Math.min(max, Math.max(0, toIndex))).apply(
        doc,
      );
    },
  };
}

/**
 * Move a layer one step up (+1) or down (−1), like Bring Forward / Send Backward in
 * professional editors: moving onto a neighbouring group enters it (at its bottom when moving
 * up, at its top when moving down); at the edge of a group the layer steps out of it.
 */
export function shiftLayer(doc: EditorDocument, layerId: string, delta: 1 | -1): Command {
  const location = locateLayer(doc.layers, layerId);
  if (!location) return moveLayer(layerId, 0);
  const neighbour = location.siblings[location.index + delta];
  if (neighbour && isGroup(neighbour) && !neighbour.locked) {
    return moveLayerTo(layerId, neighbour.id, delta > 0 ? 0 : neighbour.children.length);
  }
  const target = location.index + delta;
  if (target >= 0 && target < location.siblings.length) return moveLayer(layerId, target);
  if (location.parentId === null) return moveLayer(layerId, location.index);
  const parentLocation = locateLayer(doc.layers, location.parentId)!;
  return moveLayerTo(
    layerId,
    parentLocation.parentId,
    delta > 0 ? parentLocation.index + 1 : parentLocation.index,
  );
}

/** Copy of a layer with fresh ids (groups are copied deeply; pixel assets are shared). */
export function cloneLayer(layer: Layer, newId: string, makeId: () => string): Layer {
  if (isGroup(layer)) {
    return {
      ...layer,
      id: newId,
      children: layer.children.map((c) => cloneLayer(c, makeId(), makeId)),
    };
  }
  return { ...layer, id: newId };
}

export function duplicateLayer(
  layerId: string,
  newId: string,
  makeId: () => string = () => createId("layer"),
): Command {
  return {
    type: "layer.duplicate",
    label: "Duplicate Layer",
    apply(doc) {
      const location = locateLayer(doc.layers, layerId);
      if (!location) throw new CommandError("That layer no longer exists.");
      const layer = location.siblings[location.index];
      // Immutable assets mean the copy can share pixel and mask asset ids.
      const copy = {
        ...cloneLayer(layer, newId, makeId),
        name: `${layer.name} copy`,
        locked: false,
      } as Layer;
      const layers = insertLayerAt(doc.layers, location.parentId, location.index + 1, copy);
      return { ...doc, layers, activeLayerId: newId };
    },
  };
}

export type DropPosition = "above" | "below" | "inside";

/**
 * Move a layer relative to another one, as in layers-panel drag and drop: just above it, just
 * below it, or (for groups) to the top of its children.
 */
export function moveLayerRelative(
  layerId: string,
  targetId: string,
  position: DropPosition,
): Command {
  return {
    type: "layer.move",
    label: "Reorder Layer",
    apply(doc) {
      if (layerId === targetId) return doc;
      const target = findLayerDeep(doc.layers, targetId);
      if (!target) throw new CommandError("That layer no longer exists.");
      if (position === "inside" && !isGroup(target))
        throw new CommandError("Layers can only be moved into groups.");
      if (isDescendant(doc.layers, layerId, targetId))
        throw new CommandError("A group cannot be moved into itself.");
      const moving = findLayerDeep(doc.layers, layerId);
      if (!moving) throw new CommandError("That layer no longer exists.");
      // Work out the destination after the moving layer has been taken out.
      const without = removeLayerDeep(doc.layers, layerId);
      let parentId: string | null;
      let index: number;
      if (position === "inside") {
        parentId = targetId;
        index = (findLayerDeep(without, targetId) as GroupLayer).children.length;
      } else {
        const location = locateLayer(without, targetId)!;
        parentId = location.parentId;
        index = position === "above" ? location.index + 1 : location.index;
      }
      const before = locateLayer(doc.layers, layerId)!;
      const layers = insertLayerAt(without, parentId, index, moving);
      const after = locateLayer(layers, layerId)!;
      if (before.parentId === after.parentId && before.index === after.index) return doc;
      return { ...doc, layers };
    },
  };
}
