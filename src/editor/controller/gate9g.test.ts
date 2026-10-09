import { describe, expect, it } from "vitest";
import { serializeActions, parseActionsFile } from "../automation/actions";
import { addLayer, createGroup } from "../core/commands";
import { createRasterLayer } from "../core/document/factory";
import { findLayerDeep } from "../core/document/tree";
import type { GroupLayer, RasterLayer } from "../core/document/types";
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
  c.newDocument({ name: "Doc", width: 300, height: 100 });
  const ids = [0, 1, 2].map((i) => {
    const layer = createRasterLayer({
      assetId: null,
      width: 20,
      height: 10,
      name: `Box ${i}`,
      x: [10, 50, 200][i],
      y: [5, 30, 60][i],
    });
    c.execute(addLayer(layer));
    return layer.id;
  });
  c.store.selectLayer(ids[0]);
  c.store.toggleLayerSelected(ids[1]);
  c.store.toggleLayerSelected(ids[2]);
  return { c, ids };
}

const doc = (c: EditorController) => c.store.getSession()!.document;
const t = (c: EditorController, id: string) =>
  (findLayerDeep(doc(c).layers, id) as RasterLayer).transform;
const lastLabel = (c: EditorController) => c.store.getSession()!.history.past.at(-1)!.label;

describe("Gate 9g — selection-aware operations", () => {
  it("aligns several layers to their shared bounds in one step", () => {
    const { c, ids } = setup();
    c.alignActiveLayer("left");
    expect(ids.map((id) => t(c, id).x)).toEqual([10, 10, 10]);
    c.alignActiveLayer("bottom");
    expect(ids.map((id) => t(c, id).y)).toEqual([60, 60, 60]);
    expect(lastLabel(c)).toBe("Align Bottom Edges");
    c.undo();
    expect(ids.map((id) => t(c, id).y)).toEqual([5, 30, 60]);
  });

  it("distributes centres and refuses fewer than three layers", () => {
    const { c, ids } = setup();
    c.distributeSelectedLayers("centers-x");
    // Centres 20 and 210 stay; the middle one goes to 115 (x = 105).
    expect(ids.map((id) => t(c, id).x)).toEqual([10, 105, 200]);
    c.store.selectLayer(ids[0]);
    c.store.toggleLayerSelected(ids[1]);
    c.distributeSelectedLayers("centers-x");
    expect(c.status.get().notices.at(-1)?.message).toMatch(/at least three/);
  });

  it("flips the selection about its shared centre", () => {
    const { c, ids } = setup();
    // Bounds x 10…220: the left box ends up on the right.
    c.flipActiveLayer("horizontal");
    expect(t(c, ids[0])).toMatchObject({ x: 220, scaleX: -1 });
    expect(lastLabel(c)).toBe("Flip Horizontal");
  });

  it("groups, duplicates and deletes the selection", () => {
    const { c, ids } = setup();
    c.duplicateActiveLayer();
    const copies = c.selectedLayers();
    expect(copies).toHaveLength(3);
    expect(copies.every((id) => !ids.includes(id))).toBe(true);
    c.deleteSelectedLayers();
    expect(copies.every((id) => !findLayerDeep(doc(c).layers, id))).toBe(true);
    c.store.selectLayer(ids[0]);
    c.store.selectLayerRange(ids[2]);
    c.groupActiveLayer();
    const group = findLayerDeep(doc(c).layers, doc(c).activeLayerId!) as GroupLayer;
    expect(group.kind).toBe("group");
    expect(group.children.map((l) => l.name)).toEqual(["Box 0", "Box 1", "Box 2"]);
  });

  it("records distribute in actions", () => {
    const { c } = setup();
    const id = c.createAction("Spread")!;
    c.startRecording(id);
    c.distributeSelectedLayers("spacing-y");
    c.stopRecording();
    const steps = c.actions.get()[0].steps;
    expect(steps).toEqual([{ type: "distribute", mode: "spacing-y" }]);
    const [round] = parseActionsFile(serializeActions(c.actions.get()), () => "x");
    expect(round.steps).toEqual(steps);
  });

  it("acts on the group when a group and its own child are selected", () => {
    const { c, ids } = setup();
    c.store.selectLayer(ids[0]);
    c.groupActiveLayer();
    const groupId = doc(c).activeLayerId!;
    c.store.toggleLayerSelected(ids[0]);
    expect(c.selectedLayers()).toEqual([groupId, ids[0]]);
    c.duplicateActiveLayer();
    const copy = findLayerDeep(doc(c).layers, doc(c).activeLayerId!) as GroupLayer;
    expect(copy.kind).toBe("group");
    expect(copy.name).toBe("Group 1 copy");
  });

  it("refuses to group past the nesting limit", () => {
    const { c, ids } = setup();
    let deep = createGroup("Deep");
    for (let i = 0; i < 32; i++) deep = { ...createGroup(`L${i}`), children: [deep] };
    c.execute(addLayer(deep));
    c.store.selectLayer(deep.id);
    c.store.toggleLayerSelected(ids[0]);
    c.groupActiveLayer();
    expect(c.status.get().notices.at(-1)?.message).toMatch(/nested at most 32/);
  });
});
