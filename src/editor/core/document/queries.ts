import { allLayers, findLayerDeep, walkLayers } from "./tree";
import type { EditorDocument, Layer } from "./types";

export function findLayer(doc: EditorDocument, layerId: string): Layer | undefined {
  return findLayerDeep(doc.layers, layerId);
}

export function activeLayer(doc: EditorDocument): Layer | undefined {
  return doc.activeLayerId ? findLayer(doc, doc.activeLayerId) : undefined;
}

/**
 * Asset ids referenced by the document (pixels and masks), including inside smart objects —
 * what persistence must store and memory must keep.
 */
export function referencedAssetIds(doc: EditorDocument): string[] {
  const ids = new Set<string>();
  const visit = (layers: EditorDocument["layers"]) =>
    walkLayers(layers, (layer) => {
      if (layer.kind === "raster" && layer.assetId) ids.add(layer.assetId);
      if (layer.mask?.assetId) ids.add(layer.mask.assetId);
      if (layer.kind === "smart") visit(layer.content.layers);
    });
  visit(doc.layers);
  return [...ids];
}

export { allLayers };
