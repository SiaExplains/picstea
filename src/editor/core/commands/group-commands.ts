import { createId } from "../ids";
import {
  findLayerDeep,
  insertLayerAt,
  isGroup,
  locateLayer,
  mapLayers,
  removeLayerDeep,
  updateChildren,
  walkLayers,
} from "../document/tree";
import { IDENTITY_TRANSFORM } from "../document/factory";
import type { EditorDocument, GroupLayer, Layer } from "../document/types";
import { CommandError, requireLayer, requireUnlocked, type Command } from "./command";

/** Shift a single layer's own content (and its mask) by a delta; groups are handled via children. */
export function translateLayerContent(layer: Layer, dx: number, dy: number): Layer {
  let next: Layer = layer;
  if (layer.kind !== "fill" && layer.kind !== "group" && layer.kind !== "adjustment") {
    next = {
      ...layer,
      transform: { ...layer.transform, x: layer.transform.x + dx, y: layer.transform.y + dy },
    };
  }
  if (next.mask)
    next = { ...next, mask: { ...next.mask, x: next.mask.x + dx, y: next.mask.y + dy } } as Layer;
  return next;
}

/** Shift every layer and mask in the document (canvas resize and crop). */
export function translateAllLayers(doc: EditorDocument, dx: number, dy: number): readonly Layer[] {
  if (dx === 0 && dy === 0) return doc.layers;
  return mapLayers(doc.layers, (layer) => translateLayerContent(layer, dx, dy));
}

export function createGroup(name: string, children: readonly Layer[] = []): GroupLayer {
  return {
    id: createId("layer"),
    kind: "group",
    name,
    children,
    expanded: true,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "pass-through",
    transform: IDENTITY_TRANSFORM,
  };
}

/** Next free "Group N" name. */
export function nextGroupName(doc: EditorDocument): string {
  let max = 0;
  walkLayers(doc.layers, (layer) => {
    const match = /^Group (\d+)$/.exec(layer.name);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return `Group ${max + 1}`;
}

/** Put a layer into a new group at the layer's position (Mod+G). */
export function groupLayer(layerId: string, group: GroupLayer): Command {
  return {
    type: "layer.group",
    label: "Group Layers",
    apply(doc) {
      const location = locateLayer(doc.layers, layerId);
      if (!location) throw new CommandError("That layer no longer exists.");
      const layer = location.siblings[location.index];
      const without = removeLayerDeep(doc.layers, layerId);
      const wrapped: GroupLayer = { ...group, children: [layer] };
      return {
        ...doc,
        layers: insertLayerAt(without, location.parentId, location.index, wrapped),
        activeLayerId: wrapped.id,
      };
    },
  };
}

/** Replace a group by its children, in place (Mod+Shift+G). */
export function ungroup(groupId: string): Command {
  return {
    type: "layer.ungroup",
    label: "Ungroup Layers",
    apply(doc) {
      const group = requireLayer(doc, groupId);
      if (!isGroup(group)) throw new CommandError("Select a group to ungroup.");
      requireUnlocked(group, doc);
      const location = locateLayer(doc.layers, groupId)!;
      const layers = updateChildren(doc.layers, location.parentId, (siblings) => {
        const next = [...siblings];
        next.splice(location.index, 1, ...group.children);
        return next;
      });
      return { ...doc, layers, activeLayerId: group.children.at(-1)?.id ?? doc.activeLayerId };
    },
  };
}

/** Open or close a group in the layers panel. Panel state, so callers bypass history. */
export function setGroupExpanded(
  doc: EditorDocument,
  groupId: string,
  expanded: boolean,
): EditorDocument {
  const group = findLayerDeep(doc.layers, groupId);
  if (!group || !isGroup(group) || group.expanded === expanded) return doc;
  return {
    ...doc,
    layers: mapLayers(doc.layers, (l) => (l.id === groupId ? { ...l, expanded } : l)),
  };
}

/** Move a layer — or everything inside a group — by a delta. Linked masks follow. */
export function translateLayer(
  layerId: string,
  dx: number,
  dy: number,
  options: { label?: string; mergeKey?: string; gesture?: boolean } = {},
): Command {
  return {
    type: "layer.translate",
    label: options.label ?? "Move",
    mergeKey: options.mergeKey,
    mergeUntilSealed: options.gesture,
    apply(doc) {
      if (![dx, dy].every(Number.isFinite)) throw new CommandError("That move is out of range.");
      const layer = requireLayer(doc, layerId);
      requireUnlocked(layer, doc);
      if (layer.kind === "fill" || layer.kind === "adjustment") {
        throw new CommandError("This layer covers the whole canvas and cannot be moved.");
      }
      if (dx === 0 && dy === 0) return doc;
      const moved = isGroup(layer)
        ? mapLayers([layer], (l) =>
            l.mask?.linked === false
              ? translateUnlinked(l, dx, dy)
              : translateLayerContent(l, dx, dy),
          )[0]
        : layer.mask && !layer.mask.linked
          ? translateUnlinked(layer, dx, dy)
          : translateLayerContent(layer, dx, dy);
      return { ...doc, layers: mapLayers(doc.layers, (l) => (l.id === layerId ? moved : l)) };
    },
  };
}

/** Move content but leave an unlinked mask where it is. */
function translateUnlinked(layer: Layer, dx: number, dy: number): Layer {
  const moved = translateLayerContent(layer, dx, dy);
  return layer.mask ? ({ ...moved, mask: layer.mask } as Layer) : moved;
}
