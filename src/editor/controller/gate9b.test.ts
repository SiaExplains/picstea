import { describe, expect, it } from "vitest";
import {
  addLayer,
  setSelection,
  setShapePath,
  setWorkPath,
  translateLayer,
} from "../core/commands";
import { createPathShapeLayer, createRasterLayer } from "../core/document/factory";
import { findLayer } from "../core/document/queries";
import { corner, type VectorPath } from "../core/path/path";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import { rectSelection } from "../selection/shapes";
import {
  CURRENT_SCHEMA_VERSION,
  deserializeProject,
  serializeDocument,
} from "../serialization/serialization";
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

const triangle: VectorPath = {
  subpaths: [{ closed: true, anchors: [corner(20, 10), corner(80, 10), corner(50, 70)] }],
};

function addBox(c: EditorController, name = "Box") {
  const layer = createRasterLayer({ assetId: null, width: 40, height: 20, name, x: 10, y: 10 });
  c.execute(addLayer(layer, "Add"));
  return layer.id;
}

describe("Gate 9b in the controller", () => {
  it("makes a selection from the work path and a work path from a selection", () => {
    const c = setup();
    c.execute(setWorkPath(triangle));
    c.selectionFromPath();
    expect(doc(c).selection?.bounds).toEqual({ x: 20, y: 10, width: 60, height: 60 });

    c.execute(setSelection(rectSelection(200, 100, { x: 5, y: 5, width: 30, height: 20 }), "Sel"));
    expect(c.workPathFromSelection(1)).toEqual({ ok: true });
    const anchors = doc(c).workPath!.subpaths[0].anchors.map((a) => [a.x, a.y]);
    expect(anchors).toHaveLength(4);
    expect(anchors).toContainEqual([5, 5]);
    expect(anchors).toContainEqual([35, 25]);
    c.deleteWorkPath();
    expect(doc(c).workPath).toBeUndefined();
    c.undo();
    expect(doc(c).workPath).toBeDefined();
  });

  it("explains when there is no path or selection", () => {
    const c = setup();
    c.selectionFromPath();
    expect(notices(c).at(-1)).toMatch(/Pen tool/);
    expect(c.workPathFromSelection()).toEqual({ ok: false, error: "Make a selection first." });
  });

  it("vector masks come from the work path and follow linked moves", () => {
    const c = setup();
    const id = addBox(c);
    c.execute(setWorkPath(triangle));
    c.vectorMaskFromPath();
    expect(findLayer(doc(c), id)!.vectorMask).toMatchObject({ enabled: true, linked: true });
    c.execute(translateLayer(id, 5, 7));
    expect(findLayer(doc(c), id)!.vectorMask!.path.subpaths[0].anchors[0]).toMatchObject({
      x: 25,
      y: 17,
    });
    c.toggleVectorMask();
    expect(findLayer(doc(c), id)!.vectorMask!.enabled).toBe(false);
    c.deleteVectorMask();
    expect(findLayer(doc(c), id)!.vectorMask).toBeUndefined();
  });

  it("clips a layer to the one below, not the bottom layer of a list", () => {
    const c = setup();
    const bottom = doc(c).layers[0].id;
    c.store.selectLayer(bottom);
    c.toggleClipping();
    expect(findLayer(doc(c), bottom)!.clipped).toBeUndefined();
    expect(notices(c).at(-1)).toMatch(/layer below/);
    const id = addBox(c);
    c.toggleClipping();
    expect(findLayer(doc(c), id)!.clipped).toBe(true);
    c.toggleClipping();
    expect(findLayer(doc(c), id)!.clipped).toBeUndefined();
  });

  it("shape from path keeps the outline in place as its box changes", () => {
    const c = setup();
    c.execute(setWorkPath(triangle));
    c.shapeFromWorkPath();
    const layer = findLayer(doc(c), doc(c).activeLayerId!)!;
    if (layer.kind !== "shape") throw new Error("shape");
    expect(layer).toMatchObject({ shape: "path", width: 60, height: 60 });
    expect(layer.transform).toMatchObject({ x: 20, y: 10 });
    // Drag the first anchor 10 px further left: the box grows and the origin moves with it.
    const local: VectorPath = {
      subpaths: [{ closed: true, anchors: [corner(-10, 0), corner(60, 0), corner(30, 60)] }],
    };
    c.execute(setShapePath(layer.id, local));
    const edited = findLayer(doc(c), layer.id)!;
    expect(edited).toMatchObject({ width: 70, transform: { x: 10, y: 10 } });
    if (edited.kind !== "shape") throw new Error("shape");
    expect(edited.path!.subpaths[0].anchors[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("projects keep the work path, path shapes, vector masks and clipping (schema v4+)", () => {
    const c = setup();
    const id = addBox(c);
    c.execute(setWorkPath(triangle));
    c.vectorMaskFromPath();
    c.toggleClipping();
    const shape = createPathShapeLayer({
      path: triangle,
      fill: "#ff0000",
      stroke: null,
      name: "S",
    })!;
    c.execute(addLayer(shape, "Add"));
    const saved = JSON.parse(JSON.stringify(serializeDocument(doc(c))));
    expect(saved.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const restored = deserializeProject(saved);
    if (!restored.ok) throw new Error(restored.error);
    expect(restored.document.workPath).toEqual(doc(c).workPath);
    expect(findLayer(restored.document, id)).toMatchObject({ clipped: true });
    expect(findLayer(restored.document, id)!.vectorMask).toEqual(findLayer(doc(c), id)!.vectorMask);
    expect(findLayer(restored.document, shape.id)).toMatchObject({ shape: "path" });
  });

  it("opens v3 projects and rejects malformed paths", () => {
    const c = setup();
    const v3 = { ...serializeDocument(doc(c)), schemaVersion: 3 };
    expect(deserializeProject(JSON.parse(JSON.stringify(v3))).ok).toBe(true);
    const bad = JSON.parse(JSON.stringify(serializeDocument(doc(c))));
    bad.document.workPath = { subpaths: [{ closed: true, anchors: [{ x: "1", y: 2 }] }] };
    expect(deserializeProject(bad).ok).toBe(false);
    const badShape = JSON.parse(JSON.stringify(serializeDocument(doc(c))));
    badShape.document.layers[0] = {
      ...badShape.document.layers[0],
      kind: "shape",
      shape: "path",
      width: 1,
      height: 1,
      fill: null,
      stroke: null,
      cornerRadius: 0,
    };
    expect(deserializeProject(badShape).ok).toBe(false);
  });
});
