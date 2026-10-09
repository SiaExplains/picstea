import { describe, expect, it } from "vitest";
import { setAdjustment } from "../core/commands";
import { activeLayer } from "../core/document/queries";
import type { AdjustmentLayer } from "../core/document/types";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import { serializeActions } from "../automation/actions";
import { fakeDecoder, pngHeader } from "../test-utils/image-bytes";
import { EditorController } from "./editor-controller";

function setup() {
  const { decode } = fakeDecoder(10, 10);
  const storage = new MemoryProjectStorage();
  const controller = new EditorController({
    storage,
    decode,
    encode: async () => new Blob(["png"], { type: "image/png" }),
    autosaveDelayMs: 0,
  });
  controller.newDocument({ name: "Doc", width: 200, height: 100 });
  return { c: controller, storage };
}

const doc = (c: EditorController) => c.store.getSession()!.document;
const notices = (c: EditorController) => c.status.get().notices.map((n) => n.message);
const labels = (c: EditorController) => c.store.getSession()!.history.past.map((e) => e.label);

/** Record: Levels (then tweaked), a fill layer, select all, contract, align. */
function recordSample(c: EditorController): string {
  const id = c.createAction("Sample")!;
  c.startRecording(id);
  c.addAdjustmentLayer("brightness-contrast");
  const layer = activeLayer(doc(c)) as AdjustmentLayer;
  c.execute(
    setAdjustment(layer.id, { type: "brightness-contrast", brightness: 40, contrast: -10 }),
  );
  c.addFillLayer("#ff0000");
  c.selectAll();
  c.modifySelection("contract", 5);
  c.stopRecording();
  return id;
}

describe("Gate 9e — actions", () => {
  it("records steps, taking the final adjustment settings", () => {
    const { c } = setup();
    const id = recordSample(c);
    const action = c.actions.get().find((a) => a.id === id)!;
    expect(action.steps).toEqual([
      {
        type: "adjustment",
        adjustment: { type: "brightness-contrast", brightness: 40, contrast: -10 },
      },
      { type: "fillLayer", color: "#ff0000" },
      { type: "select", op: "all" },
      { type: "modifySelection", kind: "contract", radius: 5 },
    ]);
    expect(c.recording.get()).toBeNull();
  });

  it("does not record operations that failed or while not recording", () => {
    const { c } = setup();
    c.addPixelLayer();
    const id = c.createAction("Nothing")!;
    c.startRecording(id);
    c.flipActiveLayer("horizontal"); // empty pixel layer: still flips (transform only)
    c.cropToSelection(); // no selection: silently skipped, not recorded
    c.deselect(); // nothing selected: not recorded
    c.modifySelection("expand", 10_000); // invalid radius
    c.stopRecording();
    expect(c.actions.get()[0].steps).toEqual([{ type: "flip", axis: "horizontal" }]);
  });

  it("plays an action as one undo step", async () => {
    const { c } = setup();
    const id = recordSample(c);
    c.newDocument({ name: "Second", width: 200, height: 100 });
    expect(await c.playAction(id)).toEqual({ ok: true });
    const layers = doc(c).layers;
    expect(layers.map((l) => l.kind)).toEqual(["fill", "adjustment", "fill"]);
    const adjustment = layers.find((l) => l.kind === "adjustment") as AdjustmentLayer;
    expect(adjustment.adjustment).toEqual({
      type: "brightness-contrast",
      brightness: 40,
      contrast: -10,
    });
    expect(doc(c).selection?.bounds).toMatchObject({ width: 200, height: 100 });
    expect(labels(c)).toEqual(["Action: Sample"]);
    c.undo();
    expect(doc(c).layers).toHaveLength(1);
    expect(doc(c).selection).toBeFalsy();
    // Playback is never recorded into another action.
    expect(c.actions.get()[0].steps).toHaveLength(4);
  });

  it("stops at the first failing step and names it", async () => {
    const { c } = setup();
    const [imported] = [
      c.importActions(
        serializeActions([
          {
            id: "x",
            name: "Broken",
            steps: [{ type: "newLayer" }, { type: "cropToSelection" }, { type: "newLayer" }],
          },
        ]),
      ),
    ];
    expect(imported).toEqual({ ok: true, count: 1 });
    const result = await c.playAction(c.actions.get()[0].id);
    expect(result.ok).toBe(false);
    expect(notices(c).at(-1)).toBe('"Broken" stopped at step 2 (Crop to Selection).');
    expect(doc(c).layers).toHaveLength(2);
    expect(labels(c)).toEqual(["Action: Broken"]);
  });

  it("refuses to play while recording and rejects bad imports", async () => {
    const { c } = setup();
    const id = c.createAction("A")!;
    c.startRecording(id);
    expect((await c.playAction(id)).ok).toBe(false);
    c.stopRecording();
    expect(c.importActions('{"format":"nope"}').ok).toBe(false);
    expect(c.actions.get()).toHaveLength(1);
    c.renameAction(id, "  Renamed  ");
    c.deleteActionStep(id, 0);
    expect(c.actions.get()[0].name).toBe("Renamed");
    c.deleteAction(id);
    expect(c.actions.get()).toEqual([]);
  });
});

describe("Gate 9e — history panel", () => {
  it("jumps to any step and back", () => {
    const { c } = setup();
    c.addPixelLayer();
    c.addFillLayer("#00ff00");
    c.selectAll();
    c.store.goToHistory(1);
    expect(doc(c).layers).toHaveLength(2);
    expect(doc(c).selection).toBeFalsy();
    c.store.goToHistory(0);
    expect(doc(c).layers).toHaveLength(1);
    c.store.goToHistory(3);
    expect(doc(c).layers).toHaveLength(3);
    expect(doc(c).selection).toBeTruthy();
  });
});

describe("Gate 9e — batch", () => {
  it("opens files as transient documents, closes them and never stores them", async () => {
    const { c, storage } = setup();
    const original = doc(c).id;
    const id = c.createAction("Fill")!;
    c.startRecording(id);
    c.addFillLayer("#0000ff");
    c.stopRecording();
    c.undo();
    const png = new Blob([pngHeader(10, 10)], { type: "image/png" });
    const progress: number[] = [];
    // Exporting needs a canvas, which unit tests don't have: every file fails at export.
    const result = await c.runBatch({
      actionId: id,
      files: [
        { blob: png, name: "a.png" },
        { blob: new Blob(["nope"]), name: "b.txt" },
      ],
      export: { format: "png", quality: 1 },
      onProgress: (done) => progress.push(done),
    });
    await c.saveAllDirty();
    expect(result).toEqual({ ok: false, error: "No files were processed." });
    expect(progress).toEqual([0, 1, 2]);
    expect(c.store.getState().sessions.map((s) => s.document.id)).toEqual([original]);
    expect(c.store.getState().activeDocumentId).toBe(original);
    expect((await storage.list()).map((p) => p.name)).toEqual(["Doc"]);
    expect(notices(c).at(-1)).toMatch(/2 file\(s\) could not be processed: a.png, b.txt/);
  });

  it("checks its inputs", async () => {
    const { c } = setup();
    const id = c.createAction("A")!;
    const run = (files: number) =>
      c.runBatch({
        actionId: id,
        files: Array.from({ length: files }, () => ({ blob: new Blob([]), name: "x" })),
        export: { format: "png", quality: 1 },
      });
    expect(await run(0)).toEqual({ ok: false, error: "Choose at least one file." });
    expect((await run(201)).ok).toBe(false);
  });
});
