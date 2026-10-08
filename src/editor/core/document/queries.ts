import type { EditorDocument, Layer } from "./types";

export function findLayer(doc: EditorDocument, layerId: string): Layer | undefined {
  return doc.layers.find((layer) => layer.id === layerId);
}

export function layerIndex(doc: EditorDocument, layerId: string): number {
  return doc.layers.findIndex((layer) => layer.id === layerId);
}

export function activeLayer(doc: EditorDocument): Layer | undefined {
  return doc.activeLayerId ? findLayer(doc, doc.activeLayerId) : undefined;
}

/** Asset ids referenced by the document — what persistence must store alongside it. */
export function referencedAssetIds(doc: EditorDocument): string[] {
  const ids = new Set<string>();
  for (const layer of doc.layers) {
    if (layer.kind === "raster" && layer.assetId) ids.add(layer.assetId);
  }
  return [...ids];
}
