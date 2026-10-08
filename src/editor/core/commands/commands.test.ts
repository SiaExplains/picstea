import { describe, expect, it } from "vitest";
import { createDocument, createFillLayer } from "../document/factory";
import type { EditorDocument } from "../document/types";
import { CommandError } from "./command";
import { renameDocument, resizeCanvas } from "./document-commands";
import {
  addLayer,
  deleteLayer,
  duplicateLayer,
  moveLayer,
  renameLayer,
  setFillColor,
  setLayerBlendMode,
  setLayerLocked,
  setLayerOpacity,
  setLayerVisibility,
  shiftLayer,
} from "./layer-commands";

function docWithLayers(): EditorDocument {
  const base = createDocument({ name: "Doc", width: 100, height: 50 });
  const a = { ...createFillLayer("#ff0000", "A"), id: "a" };
  const b = { ...createFillLayer("#00ff00", "B"), id: "b" };
  return addLayer(b).apply(addLayer(a).apply(base));
}

const names = (doc: EditorDocument) => doc.layers.map((l) => l.name);

describe("layer commands", () => {
  it("adds above the active layer and activates the new layer", () => {
    const doc = docWithLayers();
    expect(names(doc)).toEqual(["Background", "A", "B"]);
    const withActiveA = { ...doc, activeLayerId: "a" };
    const c = { ...createFillLayer("#0000ff", "C"), id: "c" };
    const next = addLayer(c).apply(withActiveA);
    expect(names(next)).toEqual(["Background", "A", "C", "B"]);
    expect(next.activeLayerId).toBe("c");
  });

  it("does not mutate the input document", () => {
    const doc = docWithLayers();
    const snapshot = JSON.stringify(doc);
    renameLayer("a", "Renamed").apply(doc);
    deleteLayer("b").apply(doc);
    moveLayer("a", 0).apply(doc);
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it("deletes and selects the layer below", () => {
    const doc = { ...docWithLayers(), activeLayerId: "b" };
    const next = deleteLayer("b").apply(doc);
    expect(names(next)).toEqual(["Background", "A"]);
    expect(next.activeLayerId).toBe("a");
  });

  it("deleting the last layer leaves no active layer", () => {
    const doc = createDocument({ name: "x", width: 1, height: 1 });
    const next = deleteLayer(doc.layers[0].id).apply(doc);
    expect(next.layers).toEqual([]);
    expect(next.activeLayerId).toBeNull();
  });

  it("renames with trimming and rejects empty names", () => {
    const doc = docWithLayers();
    expect(renameLayer("a", "  Sky  ").apply(doc).layers[1].name).toBe("Sky");
    expect(() => renameLayer("a", "   ").apply(doc)).toThrow(CommandError);
    expect(renameLayer("a", "A").apply(doc)).toBe(doc);
  });

  it("returns the same document for no-op changes", () => {
    const doc = docWithLayers();
    expect(setLayerVisibility("a", true).apply(doc)).toBe(doc);
    expect(setLayerLocked("a", false).apply(doc)).toBe(doc);
    expect(setLayerOpacity("a", 1).apply(doc)).toBe(doc);
    expect(setLayerBlendMode("a", "normal").apply(doc)).toBe(doc);
    expect(moveLayer("a", 1).apply(doc)).toBe(doc);
  });

  it("clamps opacity and rejects non-finite values", () => {
    const doc = docWithLayers();
    expect(
      setLayerOpacity("a", 1.7).apply(setLayerOpacity("a", 0.2).apply(doc)).layers[1].opacity,
    ).toBe(1);
    expect(setLayerOpacity("a", -1).apply(doc).layers[1].opacity).toBe(0);
    expect(() => setLayerOpacity("a", Number.NaN).apply(doc)).toThrow(CommandError);
  });

  it("refuses to edit a locked layer's appearance but still allows visibility and rename", () => {
    const doc = setLayerLocked("a", true).apply(docWithLayers());
    expect(() => setLayerOpacity("a", 0.5).apply(doc)).toThrow(/locked/);
    expect(() => setLayerBlendMode("a", "multiply").apply(doc)).toThrow(/locked/);
    expect(() => setFillColor("a", "#123456").apply(doc)).toThrow(/locked/);
    expect(setLayerVisibility("a", false).apply(doc).layers[1].visible).toBe(false);
    expect(renameLayer("a", "Z").apply(doc).layers[1].name).toBe("Z");
  });

  it("sets blend mode and validates it", () => {
    const doc = docWithLayers();
    expect(setLayerBlendMode("a", "multiply").apply(doc).layers[1].blendMode).toBe("multiply");
    // @ts-expect-error — runtime guard for values arriving from untyped UI
    expect(() => setLayerBlendMode("a", "bogus").apply(doc)).toThrow(CommandError);
  });

  it("validates fill colours and layer kinds", () => {
    const doc = docWithLayers();
    expect(setFillColor("a", "#ABCDEF").apply(doc).layers[1]).toMatchObject({ color: "#abcdef" });
    expect(() => setFillColor("a", "blue").apply(doc)).toThrow(CommandError);
  });

  it("reorders with clamping", () => {
    const doc = docWithLayers();
    expect(names(moveLayer("b", 0).apply(doc))).toEqual(["B", "Background", "A"]);
    expect(names(moveLayer(doc.layers[0].id, 99).apply(doc))).toEqual(["A", "B", "Background"]);
    expect(names(shiftLayer(doc, "a", 1).apply(doc))).toEqual(["Background", "B", "A"]);
    expect(shiftLayer(doc, "b", 1).apply(doc)).toBe(doc);
  });

  it("duplicates above the source, unlocked, and activates the copy", () => {
    const doc = setLayerLocked("a", true).apply(docWithLayers());
    const next = duplicateLayer("a", "a2").apply(doc);
    expect(names(next)).toEqual(["Background", "A", "A copy", "B"]);
    expect(next.layers[2]).toMatchObject({ id: "a2", locked: false });
    expect(next.activeLayerId).toBe("a2");
  });

  it("errors on unknown layers", () => {
    const doc = docWithLayers();
    expect(() => renameLayer("nope", "x").apply(doc)).toThrow(CommandError);
    expect(() => deleteLayer("nope").apply(doc)).toThrow(CommandError);
  });
});

describe("document commands", () => {
  it("renames the document", () => {
    const doc = docWithLayers();
    expect(renameDocument("New").apply(doc).name).toBe("New");
    expect(() => renameDocument("").apply(doc)).toThrow(CommandError);
  });

  it("resizes the canvas and shifts raster layers when centred", () => {
    const base = createDocument({
      name: "x",
      width: 100,
      height: 100,
      background: { kind: "transparent" },
    });
    const raster = {
      ...createFillLayer("#000000", "r"),
      kind: "raster" as const,
      assetId: "asset",
      width: 10,
      height: 10,
    };
    const doc = { ...base, layers: [raster] };
    const centred = resizeCanvas(200, 120, "center").apply(doc);
    expect(centred).toMatchObject({ width: 200, height: 120 });
    expect(centred.layers[0].transform).toMatchObject({ x: 50, y: 10 });
    expect(resizeCanvas(200, 120, "top-left").apply(doc).layers[0].transform).toMatchObject({
      x: 0,
      y: 0,
    });
    expect(() => resizeCanvas(0, 10, "center").apply(doc)).toThrow(CommandError);
  });
});
