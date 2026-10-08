import { describe, expect, it, vi } from "vitest";
import { addLayer, renameLayer, setLayerOpacity } from "./commands";
import { createDocument, createFillLayer } from "./document/factory";
import { EditorStore, isDirty } from "./editor-store";

function setup() {
  let now = 1_000_000;
  const store = new EditorStore(() => now);
  const doc = createDocument({ name: "Doc", width: 100, height: 100 });
  store.openDocument(doc);
  return { store, doc, tick: (ms: number) => (now += ms) };
}

describe("EditorStore", () => {
  it("opens documents as tabs and activates the latest", () => {
    const { store, doc } = setup();
    const second = createDocument({ name: "Two", width: 10, height: 10 });
    store.openDocument(second);
    expect(store.getState().sessions).toHaveLength(2);
    expect(store.getState().activeDocumentId).toBe(second.id);
    store.openDocument(doc);
    expect(store.getState().sessions).toHaveLength(2);
    expect(store.getState().activeDocumentId).toBe(doc.id);
  });

  it("dispatches commands, records history and notifies subscribers", () => {
    const { store, doc } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    const result = store.dispatch(renameLayer(doc.layers[0].id, "Paper"));
    expect(result).toEqual({ ok: true, changed: true });
    expect(store.getSession()!.document.layers[0].name).toBe("Paper");
    expect(store.getSession()!.history.past).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stamps modifiedAt from the injected clock", () => {
    const { store, doc } = setup();
    store.dispatch(renameLayer(doc.layers[0].id, "Paper"));
    expect(store.getSession()!.document.metadata.modifiedAt).toBe(
      new Date(1_000_000).toISOString(),
    );
  });

  it("returns user-facing errors instead of throwing for invalid commands", () => {
    const { store, doc } = setup();
    expect(store.dispatch(setLayerOpacity(doc.layers[0].id, 0.5))).toEqual({
      ok: false,
      error: expect.stringContaining("locked"),
    });
  });

  it("ignores no-op commands", () => {
    const { store, doc } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.dispatch(renameLayer(doc.layers[0].id, "Background"))).toEqual({
      ok: true,
      changed: false,
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it("undoes and redoes, tracking revision for dirty state", () => {
    const { store, doc } = setup();
    store.markSaved(doc.id, 0);
    expect(isDirty(store.getSession()!)).toBe(false);
    store.dispatch(renameLayer(doc.layers[0].id, "Paper"));
    expect(isDirty(store.getSession()!)).toBe(true);
    expect(store.undo()).toBe("Rename Layer");
    expect(store.getSession()!.document.layers[0].name).toBe("Background");
    expect(store.redo()).toBe("Rename Layer");
    expect(store.getSession()!.document.layers[0].name).toBe("Paper");
    expect(store.redo()).toBeNull();
  });

  it("collapses a slider drag into one undo step", () => {
    const { store, tick } = setup();
    const layer = { ...createFillLayer("#ff0000", "Red"), id: "red" };
    store.dispatch(addLayer(layer));
    for (const value of [0.9, 0.8, 0.7]) {
      tick(50);
      store.dispatch(setLayerOpacity("red", value));
    }
    store.sealHistory();
    tick(50);
    store.dispatch(setLayerOpacity("red", 0.1));
    expect(store.getSession()!.history.past).toHaveLength(3);
    store.undo();
    expect(store.getSession()!.document.layers[1].opacity).toBe(0.7);
    store.undo();
    expect(store.getSession()!.document.layers[1].opacity).toBe(1);
  });

  it("selecting a layer is not an undoable edit", () => {
    const { store } = setup();
    store.dispatch(addLayer({ ...createFillLayer("#ff0000", "Red"), id: "red" }));
    const bgId = store.getSession()!.document.layers[0].id;
    const revision = store.getSession()!.revision;
    store.selectLayer(bgId);
    expect(store.getSession()!.document.activeLayerId).toBe(bgId);
    expect(store.getSession()!.revision).toBe(revision);
    expect(store.getSession()!.history.past).toHaveLength(1);
    store.selectLayer("missing");
    expect(store.getSession()!.document.activeLayerId).toBe(bgId);
  });

  it("closes tabs and activates a neighbour", () => {
    const { store, doc } = setup();
    const second = createDocument({ name: "Two", width: 10, height: 10 });
    store.openDocument(second);
    store.closeDocument(second.id);
    expect(store.getState().activeDocumentId).toBe(doc.id);
    store.closeDocument(doc.id);
    expect(store.getState().activeDocumentId).toBeNull();
  });

  it("dispatch without an open document fails cleanly", () => {
    const store = new EditorStore();
    expect(store.dispatch(renameLayer("x", "y"))).toEqual({
      ok: false,
      error: "No document is open.",
    });
    expect(store.undo()).toBeNull();
  });

  it("stores the viewport per document", () => {
    const { store, doc } = setup();
    store.setViewport(doc.id, { zoom: 2, panX: 10, panY: 20 });
    expect(store.getSession()!.viewport).toEqual({ zoom: 2, panX: 10, panY: 20 });
    expect(store.getSession()!.viewportInitialized).toBe(true);
  });
});
