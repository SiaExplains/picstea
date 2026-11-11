import { describe, expect, it } from "vitest";
import { addLayer, addLayerMask, setLayerTransform } from "../core/commands";
import { createShapeLayer } from "../core/document/factory";
import { findLayerDeep } from "../core/document/tree";
import type { ShapeLayer } from "../core/document/types";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import { fakeDecoder } from "../test-utils/image-bytes";
import { EditorController } from "./editor-controller";

function setup() {
  const { decode } = fakeDecoder(10, 10);
  const c = new EditorController({
    storage: new MemoryProjectStorage(),
    decode,
    encode: async () => new Blob(["png"], { type: "image/png" }),
    autosaveDelayMs: 0,
  });
  c.newDocument({ name: "Doc", width: 300, height: 200 });
  const shape = createShapeLayer({
    shape: "rect",
    x: 10,
    y: 10,
    width: 40,
    height: 20,
    fill: null,
    stroke: { color: "#000000", width: 2 },
    name: "Box",
  });
  c.execute(addLayer(shape));
  return { c, id: shape.id };
}

const layer = (c: EditorController, id: string) =>
  findLayerDeep(c.store.getSession()!.document.layers, id) as ShapeLayer;
const scaled = (x: number) => ({ x: 10, y: 10, scaleX: x, scaleY: x, rotation: 0 });

describe("baking transforms when they end (ADR-0043)", () => {
  it("bakes a shape's scale after the gesture, keeping the stroke, as one undo step", () => {
    const { c, id } = setup();
    const before = c.store.getSession()!.history.past.length;
    for (const s of [1.5, 2, 3]) {
      c.store.dispatch(setLayerTransform(id, scaled(s), { mergeKey: "drag", gesture: true }));
    }
    // Mid-gesture: still scaled.
    expect(layer(c, id).transform.scaleX).toBe(3);
    c.store.sealHistory();
    expect([layer(c, id).width, layer(c, id).transform.scaleX, layer(c, id).stroke?.width]).toEqual(
      [120, 1, 2],
    );
    expect(c.store.getSession()!.history.past.length).toBe(before + 1);
    c.undo();
    expect([layer(c, id).width, layer(c, id).transform.scaleX]).toEqual([40, 1]);
  });

  it("scales the stroke too with Scale strokes & effects on", () => {
    const { c, id } = setup();
    c.store.updateToolSettings("move", { scaleStyles: true });
    c.execute(setLayerTransform(id, scaled(3)));
    expect([layer(c, id).width, layer(c, id).stroke?.width]).toEqual([120, 6]);
  });

  it("bakes an empty linked mask's pending transform into its box", () => {
    const { c, id } = setup();
    c.execute(addLayerMask(id));
    c.execute(setLayerTransform(id, { ...scaled(1), scaleX: 2 }));
    const mask = layer(c, id).mask!;
    expect(mask.pendingTransform).toBeUndefined();
    expect(mask.width).toBeGreaterThan(0);
  });
});
