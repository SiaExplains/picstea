import type { EditorDocument, GroupLayer, Layer } from "./types";

/**
 * Pure helpers for the layer tree (ADR-0008). `EditorDocument.layers` is the root list and
 * group children are nested lists; every list is ordered bottom-most first. All functions return
 * new structures and share untouched branches.
 */

export interface LayerLocation {
  /** null = the document root. */
  readonly parentId: string | null;
  readonly index: number;
  readonly siblings: readonly Layer[];
  readonly depth: number;
}

export const isGroup = (layer: Layer): layer is GroupLayer => layer.kind === "group";

/** Depth-first, bottom-to-top, parents before children. Return `false` to skip a group's children. */
export function walkLayers(
  layers: readonly Layer[],
  visit: (layer: Layer, depth: number, parent: GroupLayer | null) => void | false,
  depth = 0,
  parent: GroupLayer | null = null,
): void {
  for (const layer of layers) {
    const descend = visit(layer, depth, parent);
    if (descend !== false && isGroup(layer)) walkLayers(layer.children, visit, depth + 1, layer);
  }
}

export function allLayers(doc: EditorDocument): Layer[] {
  const out: Layer[] = [];
  walkLayers(doc.layers, (layer) => {
    out.push(layer);
  });
  return out;
}

export function findLayerDeep(layers: readonly Layer[], id: string): Layer | undefined {
  for (const layer of layers) {
    if (layer.id === id) return layer;
    if (isGroup(layer)) {
      const found = findLayerDeep(layer.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function locateLayer(
  layers: readonly Layer[],
  id: string,
  parentId: string | null = null,
  depth = 0,
): LayerLocation | undefined {
  const index = layers.findIndex((l) => l.id === id);
  if (index !== -1) return { parentId, index, siblings: layers, depth };
  for (const layer of layers) {
    if (isGroup(layer)) {
      const found = locateLayer(layer.children, id, layer.id, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

/** The list a layer lives in: the root list or a group's children. */
export function childrenOf(
  doc: EditorDocument,
  parentId: string | null,
): readonly Layer[] | undefined {
  if (parentId === null) return doc.layers;
  const parent = findLayerDeep(doc.layers, parentId);
  return parent && isGroup(parent) ? parent.children : undefined;
}

/** Apply `fn` to every layer (bottom-up rebuild so groups see already-mapped children). */
export function mapLayers(layers: readonly Layer[], fn: (layer: Layer) => Layer): Layer[] {
  return layers.map((layer) => {
    const mapped = isGroup(layer) ? { ...layer, children: mapLayers(layer.children, fn) } : layer;
    return fn(mapped);
  });
}

/** Replace the list identified by `parentId` (root when null). Returns the same array if missing. */
export function updateChildren(
  layers: readonly Layer[],
  parentId: string | null,
  update: (children: readonly Layer[]) => readonly Layer[],
): readonly Layer[] {
  if (parentId === null) return update(layers);
  let changed = false;
  const next = layers.map((layer) => {
    if (!isGroup(layer)) return layer;
    if (layer.id === parentId) {
      changed = true;
      return { ...layer, children: update(layer.children) };
    }
    const children = updateChildren(layer.children, parentId, update);
    if (children === layer.children) return layer;
    changed = true;
    return { ...layer, children };
  });
  return changed ? next : layers;
}

export function replaceLayerDeep(layers: readonly Layer[], next: Layer): readonly Layer[] {
  const location = locateLayer(layers, next.id);
  if (!location) return layers;
  return updateChildren(layers, location.parentId, (siblings) =>
    siblings.map((l) => (l.id === next.id ? next : l)),
  );
}

export function removeLayerDeep(layers: readonly Layer[], id: string): readonly Layer[] {
  const location = locateLayer(layers, id);
  if (!location) return layers;
  return updateChildren(layers, location.parentId, (siblings) =>
    siblings.filter((l) => l.id !== id),
  );
}

export function insertLayerAt(
  layers: readonly Layer[],
  parentId: string | null,
  index: number,
  layer: Layer,
): readonly Layer[] {
  return updateChildren(layers, parentId, (siblings) => {
    const next = [...siblings];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, layer);
    return next;
  });
}

/** Whether `maybeDescendantId` is inside the group `ancestorId` (at any depth). */
export function isDescendant(
  layers: readonly Layer[],
  ancestorId: string,
  maybeDescendantId: string,
): boolean {
  const ancestor = findLayerDeep(layers, ancestorId);
  return !!ancestor && isGroup(ancestor) && !!findLayerDeep(ancestor.children, maybeDescendantId);
}

/** Ids of the group's ancestors, innermost first. */
export function ancestorIds(layers: readonly Layer[], id: string): string[] {
  const out: string[] = [];
  let location = locateLayer(layers, id);
  while (location?.parentId) {
    out.push(location.parentId);
    location = locateLayer(layers, location.parentId);
  }
  return out;
}

export interface FlatLayer {
  readonly layer: Layer;
  readonly depth: number;
  readonly parentId: string | null;
  /** False if this layer or any ancestor is hidden. */
  readonly effectivelyVisible: boolean;
}

/**
 * Top-most first, as shown in a layers panel. Children of collapsed groups are skipped unless
 * `includeCollapsed` is set.
 */
export function flattenTopFirst(
  layers: readonly Layer[],
  options: { includeCollapsed?: boolean } = {},
  depth = 0,
  parentId: string | null = null,
  parentVisible = true,
): FlatLayer[] {
  const out: FlatLayer[] = [];
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const visible = parentVisible && layer.visible;
    out.push({ layer, depth, parentId, effectivelyVisible: visible });
    if (isGroup(layer) && (layer.expanded || options.includeCollapsed)) {
      out.push(...flattenTopFirst(layer.children, options, depth + 1, layer.id, visible));
    }
  }
  return out;
}

export function countLayers(layers: readonly Layer[]): number {
  let n = 0;
  walkLayers(layers, () => {
    n++;
  });
  return n;
}

export function maxDepth(layers: readonly Layer[]): number {
  let max = 0;
  walkLayers(layers, (_layer, depth) => {
    max = Math.max(max, depth);
  });
  return max;
}
