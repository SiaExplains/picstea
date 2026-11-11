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
import type {
  EditorDocument,
  GroupBlendMode,
  GroupLayer,
  Layer,
  Transform,
} from "../document/types";
import { CommandError, replaceLayer, type Command } from "./command";
import type { Matrix } from "../geometry/matrix";
import { setLayerTransform } from "./content-commands";
import { groupLayer, translateLayer } from "./group-commands";
import {
  deleteLayer,
  duplicateLayer,
  setLayerBlendMode,
  setLayerLocked,
  setLayerOpacity,
  setLayerVisibility,
} from "./layer-commands";

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

/**
 * Set the transforms of several layers in one step (group scale, rotate, flip). `groupMasks`
 * carries the frame change since the gesture began to the linked raster masks of the selected
 * groups (their children's masks follow through `setLayerTransform`), baked on release (ADR-0043).
 */
export function transformLayers(
  entries: readonly { readonly layerId: string; readonly transform: Transform }[],
  options: GestureOptions & {
    groupMasks?: { readonly ids: readonly string[]; readonly change: Matrix };
  } = {},
): Command {
  return compose("layers.transform", "Transform", options, (doc) => {
    let next = doc;
    for (const { layerId, transform } of entries) {
      next = setLayerTransform(layerId, transform).apply(next);
    }
    for (const id of options.groupMasks?.ids ?? []) {
      const group = findLayerDeep(next.layers, id);
      if (group?.kind !== "group" || !group.mask?.linked) continue;
      const change = options.groupMasks!.change;
      next = replaceLayer(next, {
        ...group,
        mask: { ...group.mask, pendingTransform: [...change] },
      });
    }
    return next;
  });
}

/**
 * Apply a single-layer property command to every selected layer in one undo step. Unlike moves,
 * the ids are used as selected (a selected layer inside a selected group is changed too). Layers
 * the command refuses (locked, or a blend mode they can't take) are skipped; only if every layer
 * refuses does the error surface.
 */
function forEachSelected(
  type: string,
  label: string,
  ids: readonly string[],
  make: (id: string) => Command,
  mergeKey?: string,
): Command {
  return {
    type,
    label,
    mergeKey,
    apply(doc) {
      const unique = [...new Set(ids)].filter((id) => findLayerDeep(doc.layers, id));
      if (unique.length === 0) throw new CommandError("Those layers no longer exist.");
      let next = doc;
      let firstError: unknown = null;
      let applied = 0;
      for (const id of unique) {
        try {
          next = make(id).apply(next);
          applied++;
        } catch (error) {
          if (!(error instanceof CommandError)) throw error;
          firstError ??= error;
        }
      }
      if (applied === 0 && firstError) throw firstError;
      return next;
    },
  };
}

const idsKey = (ids: readonly string[]) => [...new Set(ids)].sort().join(",");

/** Opacity of several layers (0–1); a slider drag merges into one step. */
export function setLayersOpacity(ids: readonly string[], opacity: number): Command {
  return forEachSelected(
    "layers.opacity",
    "Layer Opacity",
    ids,
    (id) => setLayerOpacity(id, opacity),
    `layers.opacity:${idsKey(ids)}`,
  );
}

/** Blend mode of several layers; "pass-through" changes only the groups among them. */
export function setLayersBlendMode(ids: readonly string[], mode: GroupBlendMode): Command {
  return forEachSelected("layers.blendMode", "Blend Mode", ids, (id) =>
    setLayerBlendMode(id, mode),
  );
}

export function setLayersVisibility(ids: readonly string[], visible: boolean): Command {
  return forEachSelected("layers.visibility", visible ? "Show Layers" : "Hide Layers", ids, (id) =>
    setLayerVisibility(id, visible),
  );
}

export function setLayersLocked(ids: readonly string[], locked: boolean): Command {
  return forEachSelected("layers.lock", locked ? "Lock Layers" : "Unlock Layers", ids, (id) =>
    setLayerLocked(id, locked),
  );
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
