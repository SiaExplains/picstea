import { createId } from "../ids";
import {
  flattenTopFirst,
  findLayerDeep,
  insertLayerAt,
  locateLayer,
  MAX_GROUP_DEPTH,
  maxDepth,
  removeLayerDeep,
  topLevelSelection,
} from "../document/tree";
import type { EditorDocument, GroupLayer, Layer, Transform } from "../document/types";
import { CommandError, type Command } from "./command";
import { setLayerTransform } from "./content-commands";
import { groupLayer, translateLayer } from "./group-commands";
import { deleteLayer, duplicateLayer } from "./layer-commands";

/**
 * Commands on several selected layers at once (ADR-0020). Each is one undo step built from the
 * single-layer commands, so validation, locking and mask handling stay in one place. Layer ids
 * are normalised with `topLevelSelection`: a layer inside a selected group is handled by its
 * group, never twice.
 */

type GestureOptions = { label?: string; mergeKey?: string; gesture?: boolean };

function compose(
  type: string,
  label: string,
  options: GestureOptions,
  run: (doc: EditorDocument) => EditorDocument,
): Command {
  return {
    type,
    label: options.label ?? label,
    mergeKey: options.mergeKey,
    mergeUntilSealed: options.gesture,
    apply: run,
  };
}

const movable = (layer: Layer | undefined) =>
  !!layer && layer.kind !== "fill" && layer.kind !== "adjustment";

/** Move several layers (groups with their contents) by a delta. Linked masks follow. */
export function translateLayers(
  ids: readonly string[],
  dx: number,
  dy: number,
  options: GestureOptions = {},
): Command {
  return compose("layers.translate", "Move", options, (doc) => {
    let next = doc;
    for (const id of topLevelSelection(doc.layers, ids)) {
      if (!movable(findLayerDeep(next.layers, id))) continue;
      next = translateLayer(id, dx, dy).apply(next);
    }
    return next;
  });
}

/** Move each layer by its own delta in one step (align, distribute). */
export function translateLayersEach(
  moves: readonly { readonly layerId: string; readonly dx: number; readonly dy: number }[],
  label: string,
): Command {
  return compose("layers.translateEach", label, {}, (doc) => {
    let next = doc;
    for (const { layerId, dx, dy } of moves) next = translateLayer(layerId, dx, dy).apply(next);
    return next;
  });
}

/** Set the transforms of several layers in one step (group scale, rotate, flip). */
export function transformLayers(
  entries: readonly { readonly layerId: string; readonly transform: Transform }[],
  options: GestureOptions = {},
): Command {
  return compose("layers.transform", "Transform", options, (doc) => {
    let next = doc;
    for (const { layerId, transform } of entries) {
      next = setLayerTransform(layerId, transform).apply(next);
    }
    return next;
  });
}

export function deleteLayers(ids: readonly string[]): Command {
  return compose("layers.delete", "Delete Layers", {}, (doc) => {
    const selected = topLevelSelection(doc.layers, ids);
    if (selected.length === 0) throw new CommandError("Those layers no longer exist.");
    let next = doc;
    for (const id of selected) next = deleteLayer(id).apply(next);
    return next;
  });
}

/** Duplicate several layers; `newIds[i]` is the copy of `ids[i]`, each placed above its original. */
export function duplicateLayers(
  ids: readonly string[],
  newIds: readonly string[],
  makeId: () => string = () => createId("layer"),
): Command {
  return compose("layers.duplicate", "Duplicate Layers", {}, (doc) => {
    if (ids.length !== newIds.length) throw new CommandError("Nothing to duplicate.");
    let next = doc;
    ids.forEach((id, i) => {
      next = duplicateLayer(id, newIds[i], makeId).apply(next);
    });
    return next;
  });
}

/**
 * Put several layers into one new group, where the top-most of them was, keeping their order
 * as shown in the Layers panel — even if they came from different groups.
 */
export function groupLayers(ids: readonly string[], group: GroupLayer): Command {
  return {
    type: "layers.group",
    label: "Group Layers",
    apply(doc) {
      const selected = topLevelSelection(doc.layers, ids);
      if (selected.length === 0) throw new CommandError("Those layers no longer exist.");
      if (selected.length === 1) return groupLayer(selected[0], group).apply(doc);
      const panelOrder = flattenTopFirst(doc.layers, { includeCollapsed: true }).map(
        (row) => row.layer.id,
      );
      const topFirst = [...selected].sort((a, b) => panelOrder.indexOf(a) - panelOrder.indexOf(b));
      const top = topFirst[0];
      const children = topFirst
        .toReversed()
        .map((id) => findLayerDeep(doc.layers, id))
        .filter((l): l is Layer => !!l);
      let layers = doc.layers;
      for (const id of topFirst.slice(1)) layers = removeLayerDeep(layers, id);
      const location = locateLayer(layers, top);
      if (!location) throw new CommandError("Those layers no longer exist.");
      layers = removeLayerDeep(layers, top);
      const wrapped: GroupLayer = { ...group, children };
      const result = insertLayerAt(layers, location.parentId, location.index, wrapped);
      if (maxDepth(result) > MAX_GROUP_DEPTH) {
        throw new CommandError(`Groups can be nested at most ${MAX_GROUP_DEPTH} levels deep.`);
      }
      return { ...doc, layers: result, activeLayerId: wrapped.id };
    },
  };
}
