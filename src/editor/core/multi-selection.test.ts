import { describe, expect, it } from "vitest";
import {
  addLayer,
  createGroup,
  deleteLayers,
  duplicateLayers,
  groupLayers,
  setLayerLocked,
  transformLayers,
  translateLayers,
} from "./commands";
import { createDocument, createRasterLayer } from "./document/factory";
import { findLayerDeep, topLevelSelection } from "./document/tree";
import type { GroupLayer, Layer, RasterLayer } from "./document/types";
import { EditorStore, selectedLayerIds } from "./editor-store";
import { fromTransform, applyMatrix } from "./geometry/matrix";
import {
  distributeDeltas,
  flipMatrix,
  frameChange,
  frameTransform,
  transformThrough,
} from "./geometry/multi-transform";
import { scaleFromHandle, rotateAroundCenter } from "./geometry/transform-handles";

const box = (name: string, x: number, y: number, w = 20, h = 10) =>
  createRasterLayer({ assetId: null, width: w, height: h, name, x, y });

/** A document with A, B, C at the top level and D, E inside group G (bottom to top). */
function setup() {
  const store = new EditorStore(() => 0);
  store.openDocument(createDocument({ name: "Doc", width: 200, height: 100 }));
  const [a, b, c, d, e] = ["A", "B", "C", "D", "E"].map((n, i) => box(n, i * 30, 10));
  for (const l of [a, b, c]) store.dispatch(addLayer(l));
  const g: GroupLayer = { ...createGroup("G"), children: [d, e] };
  store.dispatch(addLayer(g));
  const ids = { a: a.id, b: b.id, c: c.id, d: d.id, e: e.id, g: g.id };
  return { store, ids };
}

const doc = (store: EditorStore) => store.getSession()!.document;
const selection = (store: EditorStore) => selectedLayerIds(store.getSession());
const names = (store: EditorStore, ids: readonly string[]) =>
  ids.map((id) => findLayerDeep(doc(store).layers, id)!.name);

describe("layer selection", () => {
  it("toggles, keeps the active layer and collapses when the active layer changes", () => {
    const { store, ids } = setup();
    store.selectLayer(ids.a);
    store.toggleLayerSelected(ids.c);
    expect(names(store, selection(store))).toEqual(["A", "C"]);
    expect(doc(store).activeLayerId).toBe(ids.c);
    store.toggleLayerSelected(ids.c);
    expect(names(store, selection(store))).toEqual(["A"]);
    expect(doc(store).activeLayerId).toBe(ids.a);
    // The only selected layer can't be deselected.
    store.toggleLayerSelected(ids.a);
    expect(selection(store)).toEqual([ids.a]);
    store.toggleLayerSelected(ids.b);
    // A command that changes the active layer resets the selection.
    store.dispatch(addLayer(box("New", 0, 0)));
    expect(names(store, selection(store))).toEqual(["New"]);
  });

  it("selects a range in panel order and keeps the anchor active", () => {
    const { store, ids } = setup();
    store.selectLayer(ids.b);
    store.selectLayerRange(ids.e);
    // Panel order, top first: G, E, D, C, B, A.
    expect(names(store, selection(store)).sort()).toEqual(["B", "C", "D", "E"]);
    expect(doc(store).activeLayerId).toBe(ids.b);
    store.selectAllLayers();
    expect(names(store, selection(store)).sort()).toEqual(["A", "B", "Background", "C", "G"]);
  });

  it("drops deleted layers after undo/redo", () => {
    const { store, ids } = setup();
    store.selectLayer(ids.a);
    store.toggleLayerSelected(ids.b);
    store.dispatch(deleteLayers(selection(store)));
    expect(findLayerDeep(doc(store).layers, ids.a)).toBeUndefined();
    expect(selection(store)).toHaveLength(1);
    store.undo();
    expect(findLayerDeep(doc(store).layers, ids.b)).toBeDefined();
  });

  it("normalises nested selections", () => {
    const { store, ids } = setup();
    expect(names(store, topLevelSelection(doc(store).layers, [ids.e, ids.g, ids.a]))).toEqual([
      "A",
      "G",
    ]);
  });
});

describe("multi-layer commands", () => {
  it("moves several layers (groups with their contents) in one step", () => {
    const { store, ids } = setup();
    store.dispatch(translateLayers([ids.a, ids.g, ids.d], 5, 7));
    const t = (id: string) => (findLayerDeep(doc(store).layers, id) as RasterLayer).transform;
    expect([t(ids.a).x, t(ids.a).y]).toEqual([5, 17]);
    // D is inside G: moved once, not twice.
    expect([t(ids.d).x, t(ids.e).x]).toEqual([95, 125]);
    expect(t(ids.b).x).toBe(30);
    expect(store.getSession()!.history.past.at(-1)!.label).toBe("Move");
  });

  it("refuses locked layers as a whole", () => {
    const { store, ids } = setup();
    store.dispatch(setLayerLocked(ids.b, true));
    const result = store.dispatch(translateLayers([ids.a, ids.b], 5, 0));
    expect(result.ok).toBe(false);
    expect((findLayerDeep(doc(store).layers, ids.a) as RasterLayer).transform.x).toBe(0);
  });

  it("deletes, duplicates and transforms several layers", () => {
    const { store, ids } = setup();
    store.dispatch(duplicateLayers([ids.a, ids.b], ["a2", "b2"]));
    expect(names(store, ["a2", "b2"])).toEqual(["A copy", "B copy"]);
    store.dispatch(
      transformLayers([
        { layerId: ids.a, transform: { x: 1, y: 2, scaleX: 2, scaleY: 2, rotation: 0 } },
        { layerId: ids.b, transform: { x: 3, y: 4, scaleX: 1, scaleY: 1, rotation: 90 } },
      ]),
    );
    expect((findLayerDeep(doc(store).layers, ids.b) as RasterLayer).transform.rotation).toBe(90);
    store.dispatch(deleteLayers([ids.a, ids.b, "a2"]));
    expect(
      names(
        store,
        doc(store).layers.map((l) => l.id),
      ),
    ).toEqual(["Background", "B copy", "C", "G"]);
    expect(findLayerDeep(doc(store).layers, ids.a)).toBeUndefined();
    expect(findLayerDeep(doc(store).layers, "b2")).toBeDefined();
  });

  it("groups layers from different parents in panel order at the top-most position", () => {
    const { store, ids } = setup();
    const group = createGroup("New");
    store.dispatch(groupLayers([ids.a, ids.e, ids.c], group));
    const created = findLayerDeep(doc(store).layers, group.id) as GroupLayer;
    // Bottom to top, as the panel showed them: A, C, E.
    expect(created.children.map((l: Layer) => l.name)).toEqual(["A", "C", "E"]);
    // E was the top-most, inside G: the new group sits there.
    const g = findLayerDeep(doc(store).layers, ids.g) as GroupLayer;
    expect(g.children.map((l) => l.name)).toEqual(["D", "New"]);
    expect(doc(store).activeLayerId).toBe(group.id);
  });
});

describe("multi transform maths", () => {
  const size = { width: 20, height: 10 };
  const corners = (t: Parameters<typeof fromTransform>[0]) =>
    [
      [0, 0],
      [20, 0],
      [20, 10],
      [0, 10],
    ].map(([x, y]) => applyMatrix(fromTransform(t), { x, y }));
  const close = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1e-6);

  it("maps every corner exactly for moves, uniform scales, rotations and flips", () => {
    const t = { x: 30, y: 40, scaleX: 1.5, scaleY: -0.5, rotation: 30 };
    const frame = frameTransform({ x: 0, y: 0, width: 100, height: 100 });
    const changes = [
      frameChange(frame.transform, { ...frame.transform, x: 7, y: -3 })!,
      frameChange(
        frame.transform,
        scaleFromHandle(
          frame.transform,
          frame.size,
          "se",
          { x: 200, y: 200 },
          { keepAspect: true },
        ),
      )!,
      frameChange(
        frame.transform,
        rotateAroundCenter(frame.transform, frame.size, { x: 100, y: 50 }, { x: 50, y: 100 }),
      )!,
      flipMatrix({ x: 50, y: 50 }, "horizontal"),
      flipMatrix({ x: 50, y: 50 }, "vertical"),
    ];
    for (const m of changes) {
      const next = transformThrough(m, t, size);
      corners(next).forEach((p, i) => close(p, applyMatrix(m, corners(t)[i])));
    }
  });

  it("stretches axis-aligned layers exactly and keeps the centre of rotated ones", () => {
    const frame = frameTransform({ x: 0, y: 0, width: 100, height: 100 });
    const stretched = scaleFromHandle(frame.transform, frame.size, "e", { x: 200, y: 50 });
    const m = frameChange(frame.transform, stretched)!;
    const flat = { x: 10, y: 10, scaleX: 1, scaleY: 1, rotation: 0 };
    expect(transformThrough(m, flat, size)).toMatchObject({ x: 20, y: 10, scaleX: 2, scaleY: 1 });
    const rotated = { ...flat, rotation: 45 };
    const next = transformThrough(m, rotated, size);
    const centre = (t: typeof flat) => applyMatrix(fromTransform(t), { x: 10, y: 5 });
    close(centre(next), applyMatrix(m, centre(rotated)));
  });

  it("keeps a flip from showing up as a 180° turn", () => {
    const t = { x: 10, y: 10, scaleX: 1, scaleY: 1, rotation: 0 };
    const h = transformThrough(flipMatrix({ x: 50, y: 50 }, "horizontal"), t, size);
    expect(h.rotation).toBeCloseTo(0);
    expect(h.scaleX).toBeCloseTo(-1);
  });

  it("distributes centres and spacing, keeping the outer boxes", () => {
    const boxes = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 70, y: 0, width: 30, height: 10 },
      { x: 20, y: 0, width: 10, height: 10 },
    ];
    const centres = distributeDeltas(boxes, "centers-x");
    // Centres 5 and 85 stay; the middle one goes to 45.
    expect(centres.map((d) => d.x)).toEqual([0, 0, 20]);
    const spacing = distributeDeltas(boxes, "spacing-x");
    // Span 0…100, widths 50: gaps of 25 → the 10-wide box starts at 35.
    expect(spacing.map((d) => d.x)).toEqual([0, 0, 15]);
    expect(distributeDeltas(boxes.slice(0, 2), "spacing-x")).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });
});
