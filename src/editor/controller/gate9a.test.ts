import { describe, expect, it } from "vitest";
import { addLayer, setAdjustment, setSelection } from "../core/commands";
import { createRasterLayer } from "../core/document/factory";
import { findLayer } from "../core/document/queries";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import { rectSelection } from "../selection/shapes";
import { deserializeProject, serializeDocument } from "../serialization/serialization";
import { fakeDecoder } from "../test-utils/image-bytes";
import { EditorController } from "./editor-controller";

function setup() {
  const { decode } = fakeDecoder(10, 10);
  const controller = new EditorController({
    storage: new MemoryProjectStorage(),
    decode,
    encode: async () => new Blob(["png"], { type: "image/png" }),
    autosaveDelayMs: 0,
  });
  controller.newDocument({ name: "Doc", width: 200, height: 100 });
  return controller;
}

const doc = (c: EditorController) => c.store.getSession()!.document;
const notices = (c: EditorController) => c.status.get().notices.map((n) => n.message);

function addBox(c: EditorController, x: number, y: number) {
  const layer = createRasterLayer({ assetId: null, width: 40, height: 20, name: "Box", x, y });
  c.execute(addLayer(layer, "Add"));
  return layer.id;
}

describe("Gate 9a in the controller", () => {
  it("adds and clears guides as undoable steps and shows hidden guides", () => {
    const c = setup();
    c.setView({ guides: false });
    expect(c.addGuide("vertical", 50)).toBe(true);
    expect(c.view.get().guides).toBe(true);
    c.addGuide("horizontal", 25);
    expect(doc(c).guides.map((g) => [g.orientation, g.position])).toEqual([
      ["vertical", 50],
      ["horizontal", 25],
    ]);
    c.clearGuides();
    expect(doc(c).guides).toEqual([]);
    c.undo();
    expect(doc(c).guides).toHaveLength(2);
  });

  it("aligns the active layer to the canvas, or to the selection", () => {
    const c = setup();
    const id = addBox(c, 10, 10);
    c.alignActiveLayer("center-x");
    c.alignActiveLayer("bottom");
    const moved = findLayer(doc(c), id)!;
    expect(moved.transform).toMatchObject({ x: 80, y: 80 });
    c.execute(setSelection(rectSelection(200, 100, { x: 0, y: 0, width: 60, height: 30 }), "Sel"));
    c.alignActiveLayer("left");
    c.alignActiveLayer("top");
    expect(findLayer(doc(c), id)!.transform).toMatchObject({ x: 0, y: 0 });
    c.undo();
    expect(findLayer(doc(c), id)!.transform).toMatchObject({ x: 0, y: 80 });
  });

  it("explains why a filter cannot run", () => {
    const c = setup();
    expect(c.beginFilter()).toBe(false);
    expect(notices(c).at(-1)).toMatch(/pixel layers/);
    addBox(c, 0, 0);
    expect(c.beginFilter()).toBe(false);
    expect(notices(c).at(-1)).toMatch(/empty/);
  });

  it("view settings update immutably", () => {
    const c = setup();
    const before = c.view.get();
    c.setView({ grid: true, gridSize: 25 });
    expect(c.view.get()).toMatchObject({ grid: true, gridSize: 25, snap: before.snap });
    expect(c.view.get()).not.toBe(before);
  });

  it("projects keep guides and Levels/Curves layers", () => {
    const c = setup();
    c.addGuide("vertical", 12.5);
    c.addAdjustmentLayer("curves");
    const curves = doc(c).activeLayerId!;
    const layer = findLayer(doc(c), curves)!;
    if (layer.kind !== "adjustment" || layer.adjustment.type !== "curves") throw new Error("type");
    c.execute(
      setAdjustment(curves, {
        ...layer.adjustment,
        rgb: [
          [0, 0],
          [100, 160],
          [255, 255],
        ],
      }),
    );
    c.addAdjustmentLayer("levels");
    const restored = deserializeProject(JSON.parse(JSON.stringify(serializeDocument(doc(c)))));
    if (!restored.ok) throw new Error(restored.error);
    expect(restored.document.guides[0].position).toBe(12.5);
    const back = findLayer(restored.document, curves);
    expect(back?.kind === "adjustment" && back.adjustment).toMatchObject({
      type: "curves",
      rgb: [
        [0, 0],
        [100, 160],
        [255, 255],
      ],
    });
  });

  it("rejects invalid curve edits", () => {
    const c = setup();
    c.addAdjustmentLayer("curves");
    const id = doc(c).activeLayerId!;
    const layer = findLayer(doc(c), id)!;
    if (layer.kind !== "adjustment" || layer.adjustment.type !== "curves") throw new Error("type");
    const ok = c.execute(
      setAdjustment(id, {
        ...layer.adjustment,
        red: [
          [10, 0],
          [5, 255],
        ],
      }),
    );
    expect(ok).toBe(false);
    expect(notices(c).at(-1)).toMatch(/out of range/);
  });
});
