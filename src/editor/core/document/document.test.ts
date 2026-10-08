import { describe, expect, it } from "vitest";
import { createGroup } from "../commands/group-commands";
import {
  createDocument,
  createMask,
  createRasterLayer,
  DocumentError,
  nextLayerName,
} from "./factory";
import { checkDimensions, MAX_DIMENSION, MAX_PIXELS } from "./limits";
import { activeLayer, referencedAssetIds } from "./queries";

describe("createDocument", () => {
  it("creates a white locked background by default", () => {
    const doc = createDocument({ name: "Poster", width: 800, height: 600 });
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0]).toMatchObject({
      kind: "fill",
      name: "Background",
      color: "#ffffff",
      locked: true,
    });
    expect(doc.activeLayerId).toBe(doc.layers[0].id);
    expect(activeLayer(doc)?.name).toBe("Background");
    expect(doc.colorSpace).toBe("srgb");
  });

  it("creates an empty document for a transparent background", () => {
    const doc = createDocument({
      name: "x",
      width: 10,
      height: 10,
      background: { kind: "transparent" },
    });
    expect(doc.layers).toEqual([]);
    expect(doc.activeLayerId).toBeNull();
  });

  it("falls back to Untitled for a blank name", () => {
    expect(createDocument({ name: "   ", width: 1, height: 1 }).name).toBe("Untitled");
  });

  it("rejects unsafe dimensions", () => {
    expect(() => createDocument({ name: "x", width: 0, height: 10 })).toThrow(DocumentError);
    expect(() => createDocument({ name: "x", width: MAX_DIMENSION + 1, height: 10 })).toThrow(
      DocumentError,
    );
    expect(() => createDocument({ name: "x", width: 10.5, height: 10 })).toThrow(DocumentError);
  });

  it("rejects an invalid background colour", () => {
    expect(() =>
      createDocument({
        name: "x",
        width: 1,
        height: 1,
        background: { kind: "color", color: "red" },
      }),
    ).toThrow(DocumentError);
  });
});

describe("checkDimensions", () => {
  it("enforces the megapixel budget", () => {
    const side = Math.ceil(Math.sqrt(MAX_PIXELS)) + 1;
    expect(checkDimensions(side, side).ok).toBe(false);
    expect(checkDimensions(1000, 1000).ok).toBe(true);
  });
});

describe("nextLayerName", () => {
  it("numbers after the highest existing Layer N", () => {
    const doc = createDocument({ name: "x", width: 1, height: 1 });
    expect(nextLayerName(doc)).toBe("Layer 1");
    const named = {
      ...doc,
      layers: [...doc.layers, { ...doc.layers[0], id: "a", name: "Layer 7" }],
    };
    expect(nextLayerName(named)).toBe("Layer 8");
  });
});

describe("referencedAssetIds", () => {
  it("deduplicates asset ids across raster layers, nested groups and masks", () => {
    const doc = createDocument({ name: "x", width: 1, height: 1 });
    const raster = createRasterLayer({ assetId: "asset_1", width: 1, height: 1, name: "r" });
    const masked = { ...raster, id: "b", mask: { ...createMask(doc), assetId: "mask_1" } };
    const group = { ...createGroup("g"), children: [masked] };
    const withRasters = { ...doc, layers: [raster, group] };
    expect(referencedAssetIds(withRasters)).toEqual(["asset_1", "mask_1"]);
  });
});
