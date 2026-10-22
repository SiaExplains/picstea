import { describe, expect, it } from "vitest";
import {
  createDocument,
  createEmptyRasterLayer,
  createShapeLayer,
  createTextLayer,
  DEFAULT_TEXT_STYLE,
} from "../document/factory";
import type { EditorDocument, Layer } from "../document/types";
import { CommandError } from "./command";
import {
  cropDocument,
  moveSelectedPixels,
  setLayerTransform,
  setRasterContent,
  updateShapeLayer,
  updateTextLayer,
} from "./content-commands";
import { addLayer, setLayerLocked } from "./layer-commands";
import { createSelection } from "../../selection/mask";

function docWith(...layers: Layer[]): EditorDocument {
  return layers.reduce(
    (doc, layer) => addLayer(layer).apply(doc),
    createDocument({ name: "x", width: 200, height: 100 }),
  );
}

const text = () => ({
  ...createTextLayer({ text: "Hi", x: 10, y: 10, style: DEFAULT_TEXT_STYLE }),
  id: "t",
});
const shape = () => ({
  ...createShapeLayer({
    shape: "rect",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    fill: "#ff0000",
    stroke: null,
    name: "s",
  }),
  id: "s",
});
const line = () => ({
  ...createShapeLayer({
    shape: "line",
    x: 0,
    y: 0,
    width: 10,
    height: 0,
    fill: null,
    stroke: { color: "#000000", width: 2 },
    name: "l",
  }),
  id: "l",
});

describe("setLayerTransform", () => {
  it("replaces the transform and is a no-op for identical values", () => {
    const doc = docWith(shape());
    const next = setLayerTransform("s", { x: 5, y: 6, scaleX: 2, scaleY: 2, rotation: 45 }).apply(
      doc,
    );
    expect(next.layers[1].transform).toEqual({ x: 5, y: 6, scaleX: 2, scaleY: 2, rotation: 45 });
    expect(setLayerTransform("s", { ...doc.layers[1].transform }).apply(doc)).toBe(doc);
  });

  it("rejects fill layers, locked layers and invalid transforms", () => {
    const doc = docWith(shape());
    const bg = doc.layers[0].id;
    expect(() =>
      setLayerTransform(bg, { x: 1, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }).apply(doc),
    ).toThrow(CommandError);
    expect(() =>
      setLayerTransform("s", { x: 0, y: 0, scaleX: 0, scaleY: 1, rotation: 0 }).apply(doc),
    ).toThrow(CommandError);
    expect(() =>
      setLayerTransform("s", { x: Number.NaN, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }).apply(doc),
    ).toThrow(CommandError);
    const locked = setLayerLocked("s", true).apply(doc);
    expect(() =>
      setLayerTransform("s", { x: 1, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }).apply(locked),
    ).toThrow(/locked/);
  });

  it("marks gesture transforms as merge-until-sealed", () => {
    expect(
      setLayerTransform("s", shape().transform, { mergeKey: "k", gesture: true }).mergeUntilSealed,
    ).toBe(true);
  });
});

describe("setRasterContent", () => {
  it("swaps the asset of a pixel layer only", () => {
    const base = createDocument({ name: "x", width: 10, height: 10 });
    const pixel = { ...createEmptyRasterLayer(base, "p"), id: "p" };
    const doc = docWith(pixel, shape());
    const next = setRasterContent("p", "asset_1", "Brush Stroke").apply(doc);
    expect(next.layers[1]).toMatchObject({
      kind: "raster",
      assetId: "asset_1",
      width: 10,
      height: 10,
    });
    expect(() => setRasterContent("s", "asset_1", "x").apply(doc)).toThrow(/pixel layers/);
    expect(setRasterContent("p", null, "x").apply(doc)).toBe(doc);
  });
});

describe("updateTextLayer", () => {
  it("updates text and style with validation", () => {
    const doc = docWith(text());
    const next = updateTextLayer("t", { text: "Hello", fontSize: 72, color: "#FF0000" }).apply(doc);
    expect(next.layers[1]).toMatchObject({ text: "Hello", fontSize: 72, color: "#ff0000" });
    expect(updateTextLayer("t", { text: "Hi" }).apply(doc)).toBe(doc);
    expect(() => updateTextLayer("t", { fontSize: 0 }).apply(doc)).toThrow(CommandError);
    // @ts-expect-error runtime guard for untyped input
    expect(() => updateTextLayer("t", { fontFamily: "Comic Sans" }).apply(doc)).toThrow(
      CommandError,
    );
    expect(() => updateTextLayer("t", { text: "x".repeat(10_001) }).apply(doc)).toThrow(
      CommandError,
    );
    expect(() => updateTextLayer("s", { text: "x" }).apply(docWith(shape()))).toThrow(
      /not a text layer/,
    );
  });
});

describe("updateShapeLayer", () => {
  it("edits fill, stroke and radius; lines keep a stroke and no fill", () => {
    const doc = docWith(shape(), line());
    const next = updateShapeLayer("s", {
      fill: null,
      stroke: { color: "#00ff00", width: 3 },
      cornerRadius: 4,
    }).apply(doc);
    expect(next.layers[1]).toMatchObject({
      fill: null,
      stroke: { color: "#00ff00", width: 3 },
      cornerRadius: 4,
    });
    expect(updateShapeLayer("l", { fill: "#ff0000" }).apply(doc).layers[2]).toMatchObject({
      fill: null,
    });
    expect(() => updateShapeLayer("l", { stroke: null }).apply(doc)).toThrow(/needs a stroke/);
    expect(() => updateShapeLayer("s", { fill: "red" }).apply(doc)).toThrow(CommandError);
    expect(() =>
      updateShapeLayer("s", { stroke: { color: "#000000", width: 0 } }).apply(doc),
    ).toThrow(CommandError);
  });
});

describe("cropDocument", () => {
  it("resizes the canvas and shifts layers and guides without destroying content", () => {
    const doc = {
      ...docWith(shape()),
      guides: [{ id: "g", orientation: "vertical" as const, position: 50 }],
    };
    const next = cropDocument({ x: 20, y: 10, width: 100, height: 50 }).apply(doc);
    expect(next).toMatchObject({ width: 100, height: 50 });
    expect(next.layers[1].transform).toMatchObject({ x: -20, y: -10 });
    expect(next.layers[0]).toBe(doc.layers[0]);
    expect(next.guides[0].position).toBe(30);
  });

  it("validates the rectangle and ignores a full-canvas crop", () => {
    const doc = docWith(shape());
    expect(cropDocument({ x: 0, y: 0, width: 200, height: 100 }).apply(doc)).toBe(doc);
    expect(() => cropDocument({ x: 0.5, y: 0, width: 10, height: 10 }).apply(doc)).toThrow(
      CommandError,
    );
    expect(() => cropDocument({ x: 0, y: 0, width: 0, height: 10 }).apply(doc)).toThrow(
      CommandError,
    );
  });
});

describe("moveSelectedPixels", () => {
  const base = createDocument({ name: "x", width: 10, height: 10 });
  const pixel = () => ({ ...createEmptyRasterLayer(base, "p"), id: "p" });
  const square = (x: number) => {
    const data = new Uint8Array(100);
    for (let y = 2; y < 5; y++) for (let i = x; i < x + 3; i++) data[y * 10 + i] = 255;
    return createSelection(10, 10, data);
  };

  it("swaps the pixels and moves the outline in one step", () => {
    const doc = { ...docWith(pixel()), width: 10, height: 10, selection: square(1) };
    const next = moveSelectedPixels("p", "asset_2", square(5)).apply(doc);
    expect(next.layers[1]).toMatchObject({ kind: "raster", assetId: "asset_2" });
    expect(next.selection?.bounds).toEqual({ x: 5, y: 2, width: 3, height: 3 });
  });

  it("drops the selection when it was moved off the canvas", () => {
    const doc = { ...docWith(pixel()), width: 10, height: 10, selection: square(1) };
    expect(moveSelectedPixels("p", "asset_2", null).apply(doc).selection).toBeUndefined();
  });

  it("refuses locked and non-pixel layers and a selection of the wrong size", () => {
    const doc = { ...docWith(pixel(), shape()), width: 10, height: 10 };
    expect(() => moveSelectedPixels("s", "a", null).apply(doc)).toThrow(CommandError);
    const locked = setLayerLocked("p", true).apply(doc);
    expect(() => moveSelectedPixels("p", "a", null).apply(locked)).toThrow(/locked/);
    const wrong = createSelection(5, 5, new Uint8Array(25).fill(255));
    expect(() => moveSelectedPixels("p", "a", wrong).apply(doc)).toThrow(/canvas size/);
  });
});
