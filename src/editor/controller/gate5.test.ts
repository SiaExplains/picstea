import { describe, expect, it } from "vitest";
import { cropDocument, resizeCanvas, setSelection } from "../core/commands";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import { rectSelection } from "../selection/shapes";
import { serializeDocument } from "../serialization/serialization";
import { fakeDecoder } from "../test-utils/image-bytes";
import { EditorController, sessionSelectionBytes } from "./editor-controller";

function setup() {
  const { decode } = fakeDecoder(10, 10);
  const controller = new EditorController({
    storage: new MemoryProjectStorage(),
    decode,
    encode: async () => new Blob(["png"], { type: "image/png" }),
    autosaveDelayMs: 0,
  });
  controller.newDocument({ name: "Doc", width: 100, height: 50 });
  return controller;
}

const doc = (c: EditorController) => c.store.getSession()!.document;
const box = (x: number, y: number, w: number, h: number) =>
  rectSelection(100, 50, { x, y, width: w, height: h });

describe("Gate 5 selection in the controller", () => {
  it("select all, inverse, deselect and reselect are undoable steps", () => {
    const c = setup();
    c.selectAll();
    expect(doc(c).selection?.bounds).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    c.invertSelection();
    expect(doc(c).selection).toBeUndefined();
    c.undo();
    expect(doc(c).selection?.bounds?.width).toBe(100);
    c.deselect();
    expect(doc(c).selection).toBeUndefined();
    expect(c.canReselect()).toBe(true);
    c.reselect();
    expect(doc(c).selection?.bounds?.width).toBe(100);
  });

  it("modifies the selection and reports invalid radii", () => {
    const c = setup();
    c.applySelection(box(20, 10, 20, 20), "Selection");
    expect(c.modifySelection("expand", 5)).toEqual({ ok: true });
    expect(doc(c).selection?.bounds).toEqual({ x: 15, y: 5, width: 30, height: 30 });
    expect(c.modifySelection("contract", 0).ok).toBe(false);
    expect(c.modifySelection("feather", 9999).ok).toBe(false);
  });

  it("drops the selection when the canvas size changes", () => {
    const c = setup();
    c.applySelection(box(20, 10, 20, 20), "Selection");
    c.execute(cropDocument({ x: 0, y: 0, width: 50, height: 50 }));
    expect(doc(c).selection).toBeUndefined();
    c.undo();
    expect(doc(c).selection).toBeDefined();
    c.execute(resizeCanvas(200, 200, "center"));
    expect(doc(c).selection).toBeUndefined();
  });

  it("crops to the selection bounds", () => {
    const c = setup();
    c.applySelection(box(20, 10, 30, 20), "Selection");
    c.cropToSelection();
    expect([doc(c).width, doc(c).height]).toEqual([30, 20]);
  });

  it("refuses a selection of the wrong size", () => {
    const c = setup();
    const wrong = rectSelection(10, 10, { x: 0, y: 0, width: 5, height: 5 });
    expect(c.store.dispatch(setSelection(wrong)).ok).toBe(false);
  });

  it("never serialises the selection", () => {
    const c = setup();
    c.selectAll();
    const saved = serializeDocument(doc(c));
    expect(saved.document).not.toHaveProperty("selection");
    expect(doc(c).selection).toBeDefined();
  });

  it("counts each distinct selection mask once for the memory budget", () => {
    const c = setup();
    c.applySelection(box(0, 0, 10, 10), "A");
    c.applySelection(box(0, 0, 20, 20), "B");
    // Two masks of 100 × 50 bytes, shared between the current document and history entries.
    expect(sessionSelectionBytes(c.store.getSession()!)).toBe(2 * 100 * 50);
  });

  it("explains that clipboard and pixel edits need a selection or a pixel layer", () => {
    const c = setup();
    expect(c.pasteClipboard()).toBe(false);
    expect(c.clearSelection()).toBe(false);
    c.selectAll();
    expect(c.clearSelection()).toBe(false); // the background is a fill layer
    const notices = c.status.get().notices.map((n) => n.message);
    expect(notices).toEqual([
      "Nothing to paste. Make a selection and copy it first.",
      "Make a selection first.",
      "Clear works on pixel layers. Select a pixel layer and try again.",
    ]);
  });
});
