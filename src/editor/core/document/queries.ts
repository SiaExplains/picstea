import { allLayers, findLayerDeep, walkLayers } from "./tree";
import type { EditorDocument, Layer } from "./types";

export function findLayer(doc: EditorDocument, layerId: string): Layer | undefined {
  return findLayerDeep(doc.layers, layerId);
}

export function activeLayer(doc: EditorDocument): Layer | undefined {
  return doc.activeLayerId ? findLayer(doc, doc.activeLayerId) : undefined;
}

/** Asset ids referenced by the document (pixels and masks) — what persistence must store. */
export function referencedAssetIds(doc: EditorDocument): string[] {
  const ids = new Set<string>();
  walkLayers(doc.layers, (layer) => {
    if (layer.kind === "raster" && layer.assetId) ids.add(layer.assetId);
    if (layer.mask?.assetId) ids.add(layer.mask.assetId);
  });
  return [...ids];
}

export { allLayers };
