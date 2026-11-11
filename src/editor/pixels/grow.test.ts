import { describe, expect, it } from "vitest";
import { addLayer, setRasterContentAndBounds } from "../core/commands";
import { createDocument, createRasterLayer } from "../core/document/factory";
import type { RasterLayer } from "../core/document/types";
import { EditorStore } from "../core/editor-store";
import { canGrow, grownBox, paintArea } from "./grow";

const doc = createDocument({ name: "Doc", width: 400, height: 300 });
const small = (x = 100, y = 50, extra: Partial<RasterLayer["transform"]> = {}) => {
  const layer = createRasterLayer({ assetId: null, width: 40, height: 30, name: "S", x, y });
  return { ...layer, transform: { ...layer.transform, ...extra } } as RasterLayer;
};

describe("growing pixel layers (ADR-0043)", () => {
  it("only grows unscaled, unrotated, unflipped layers", () => {
    expect(canGrow(small())).toBe(true);
    expect(canGrow(small(0, 0, { scaleX: 2 }))).toBe(false);
    expect(canGrow(small(0, 0, { scaleX: -1 }))).toBe(false);
    expect(canGrow(small(0, 0, { rotation: 15 }))).toBe(false);
    expect(paintArea(doc, small(0, 0, { rotation: 15 }))).toBeNull();
  });

  it("paints over the layer's box plus the canvas, in layer pixels", () => {
    expect(paintArea(doc, small(100, 50))).toEqual({ x: -100, y: -50, width: 400, height: 300 });
    // A layer partly off the canvas keeps its own pixels too.
    expect(paintArea(doc, small(-20, 280))).toEqual({ x: 0, y: -280, width: 420, height: 310 });
    // Fractional positions keep whole-pixel offsets.
    expect(paintArea(doc, small(10.5, 0))?.x).toBe(-11);
  });

  it("grows in 64 px steps towards the painted area, inside the paint area", () => {
    const layer = small(100, 50);
    const area = paintArea(doc, layer)!;
    expect(grownBox(layer, { x: 5, y: 5, width: 10, height: 10 }, area)).toBeNull();
    expect(grownBox(layer, null, area)).toBeNull();
    expect(grownBox(layer, { x: 30, y: 10, width: 20, height: 5 }, area)).toEqual({
      x: 0,
      y: 0,
      width: 40 + 64,
      height: 30,
    });
    expect(grownBox(layer, { x: -10, y: -70, width: 5, height: 5 }, area)).toEqual({
      x: -64,
      y: -50,
      width: 104,
      height: 80,
    });
    // Painting the whole canvas grows to exactly the canvas.
    expect(grownBox(layer, area, area)).toEqual(area);
  });

  it("commits new pixels, size and position as one undo step", () => {
    const store = new EditorStore(() => 0);
    store.openDocument(doc);
    const layer = small(100, 50);
    store.dispatch(addLayer(layer));
    store.dispatch(
      setRasterContentAndBounds(layer.id, "a1", { x: -64, y: 0, width: 104, height: 30 }, "Brush"),
    );
    const grown = store.getSession()!.document.layers.at(-1) as RasterLayer;
    expect([grown.assetId, grown.width, grown.height]).toEqual(["a1", 104, 30]);
    expect([grown.transform.x, grown.transform.y]).toEqual([36, 50]);
    store.undo();
    const back = store.getSession()!.document.layers.at(-1) as RasterLayer;
    expect([back.width, back.transform.x]).toEqual([40, 100]);
    const scaled = small(0, 0, { scaleX: 2 });
    store.dispatch(addLayer(scaled));
    const refused = store.dispatch(
      setRasterContentAndBounds(scaled.id, "a2", { x: 0, y: 0, width: 50, height: 30 }, "Brush"),
    );
    expect(refused.ok).toBe(false);
  });
});
