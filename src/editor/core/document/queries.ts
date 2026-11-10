import { allLayers, findLayerDeep, walkLayers } from "./tree";
import type { EditorDocument, Layer } from "./types";

export function findLayer(doc: EditorDocument, layerId: string): Layer | undefined {
  return findLayerDeep(doc.layers, layerId);
}

export function activeLayer(doc: EditorDocument): Layer | undefined {
  return doc.activeLayerId ? findLayer(doc, doc.activeLayerId) : undefined;
}

/**
 * Asset ids referenced by the document — pixels and masks (inside smart objects too) and uploaded
 * fonts — what persistence must store and memory must keep.
 */
export function referencedAssetIds(doc: EditorDocument): string[] {
  const ids = new Set(imageAssetIds(doc));
  // Fonts belong to the top-level document; smart object contents use its fonts.
  for (const font of doc.fonts ?? []) if (font.assetId) ids.add(font.assetId);
  return [...ids];
}

/** Asset ids of the pixels the document draws (pixel layers and masks, smart objects too). */
export function imageAssetIds(doc: Pick<EditorDocument, "layers">): string[] {
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
