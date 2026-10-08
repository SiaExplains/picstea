import { describe, expect, it } from "vitest";
import { setRasterContent } from "../core/commands";
import { createShapeLayer, createTextLayer, DEFAULT_TEXT_STYLE } from "../core/document/factory";
import { addLayer } from "../core/commands";
import { recordChange, createHistory } from "../core/history/history";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import { deserializeProject, serializeDocument } from "../serialization/serialization";
import { fakeDecoder } from "../test-utils/image-bytes";
import { EditorController } from "./editor-controller";

function setup(options: { pixelBudgetBytes?: number } = {}) {
  const { decode } = fakeDecoder(10, 10);
  const encoded: string[] = [];
  const storage = new MemoryProjectStorage();
  const controller = new EditorController({
    storage,
    decode,
    encode: async (_bitmap, width, height) => {
      encoded.push(`${width}x${height}`);
      return new Blob(["png"], { type: "image/png" });
    },
    autosaveDelayMs: 0,
    ...options,
  });
  controller.newDocument({ name: "Doc", width: 100, height: 50 });
  return { controller, storage, encoded };
}

const doc = (c: EditorController) => c.store.getSession()!.document;
const fakeBitmap = { width: 100, height: 50 } as unknown as CanvasImageSource;

describe("Gate 3 controller features", () => {
  it("adds an empty pixel layer the size of the canvas", () => {
    const { controller } = setup();
    controller.addPixelLayer();
    expect(doc(controller).layers[1]).toMatchObject({
      kind: "raster",
      assetId: null,
      width: 100,
      height: 50,
      name: "Layer 1",
    });
  });

  it("encodes painted pixels on save and restores them", async () => {
    const { controller, storage, encoded } = setup();
    controller.addPixelLayer();
    const layerId = doc(controller).activeLayerId!;
    const asset = controller.assets.addBitmap(fakeBitmap, 100, 50);
    controller.execute(setRasterContent(layerId, asset.id, "Brush Stroke"));
    expect(await controller.save()).toEqual({ ok: true });
    expect(encoded).toEqual(["100x50"]);
    const loaded = await storage.load(doc(controller).id);
    expect(loaded.assets.map((a) => a.id)).toEqual([asset.id]);
    // Encoded once, then cached.
    await controller.save();
    expect(encoded).toHaveLength(1);
  });

  it("creates, edits and removes text through the text-edit session", () => {
    const { controller } = setup();
    controller.beginTextEdit({ mode: "new", at: { x: 5, y: 6 } });
    controller.updateTextDraft({ text: "Hello\nworld  " });
    controller.commitTextEdit();
    const text = doc(controller).layers.at(-1)!;
    expect(text).toMatchObject({
      kind: "text",
      text: "Hello\nworld",
      name: "Hello",
      transform: { x: 5, y: 6 },
    });
    expect(controller.textEdit.get()).toBeNull();

    controller.beginTextEdit({ mode: "edit", layerId: text.id });
    controller.updateTextDraft({ text: "Bye", style: { fontSize: 99 } });
    controller.commitTextEdit();
    expect(doc(controller).layers.at(-1)).toMatchObject({ text: "Bye", fontSize: 99 });

    controller.beginTextEdit({ mode: "edit", layerId: text.id });
    controller.updateTextDraft({ text: "" });
    controller.commitTextEdit();
    expect(doc(controller).layers.some((l) => l.id === text.id)).toBe(false);
  });

  it("does not create empty text and can cancel", () => {
    const { controller } = setup();
    const before = doc(controller);
    controller.beginTextEdit({ mode: "new", at: { x: 0, y: 0 } });
    controller.commitTextEdit();
    controller.beginTextEdit({ mode: "new", at: { x: 0, y: 0 } });
    controller.updateTextDraft({ text: "nope" });
    controller.cancelTextEdit();
    expect(doc(controller)).toBe(before);
  });

  it("commits typing when switching tools", () => {
    const { controller } = setup();
    controller.store.setActiveTool("text");
    controller.beginTextEdit({ mode: "new", at: { x: 0, y: 0 } });
    controller.updateTextDraft({ text: "Kept" });
    controller.store.setActiveTool("move");
    expect(doc(controller).layers.at(-1)).toMatchObject({ kind: "text", text: "Kept" });
  });

  it("flips the active layer and refuses fill layers", () => {
    const { controller } = setup();
    controller.flipActiveLayer("horizontal");
    expect(controller.status.get().notices.at(-1)?.message).toMatch(/cannot be flipped/);
    const shape = createShapeLayer({
      shape: "rect",
      x: 10,
      y: 10,
      width: 20,
      height: 10,
      fill: "#000000",
      stroke: null,
      name: "s",
    });
    controller.execute(addLayer(shape));
    controller.flipActiveLayer("horizontal");
    expect(doc(controller).layers.at(-1)!.transform).toMatchObject({ x: 30, scaleX: -1 });
  });

  it("trims the oldest undo steps when pixel memory exceeds the budget", () => {
    const { controller } = setup({ pixelBudgetBytes: 100 * 50 * 4 * 3 });
    controller.addPixelLayer();
    const layerId = doc(controller).activeLayerId!;
    for (let i = 0; i < 6; i++) {
      const asset = controller.assets.addBitmap(fakeBitmap, 100, 50);
      controller.execute(setRasterContent(layerId, asset.id, "Brush Stroke"));
      controller.enforcePixelBudget();
    }
    const session = controller.store.getSession()!;
    const pixelSteps = session.history.past.filter((e) => e.label === "Brush Stroke");
    expect(pixelSteps.length).toBeLessThan(6);
    // The current pixels are always kept.
    const current = doc(controller).layers[1];
    expect(current.kind === "raster" && controller.assets.has(current.assetId!)).toBe(true);
  });

  it("reports export problems without throwing", async () => {
    const { controller } = setup();
    const result = await controller.exportActive({ format: "png", quality: 1 });
    expect(result.ok).toBe(false);
  });
});

describe("schema v2 round trip", () => {
  it("serializes and validates text, shape and empty pixel layers", () => {
    const { controller } = setup();
    controller.addPixelLayer();
    controller.execute(
      addLayer(
        createTextLayer({ text: "T", x: 1, y: 2, style: { ...DEFAULT_TEXT_STYLE, italic: true } }),
      ),
    );
    controller.execute(
      addLayer(
        createShapeLayer({
          shape: "line",
          x: 0,
          y: 0,
          width: 5,
          height: 5,
          fill: null,
          stroke: { color: "#123456", width: 2 },
          name: "l",
          scaleX: -1,
        }),
      ),
    );
    const original = doc(controller);
    const result = deserializeProject(JSON.parse(JSON.stringify(serializeDocument(original))));
    expect(result).toEqual({ ok: true, document: original, migratedFrom: null });
  });

  it("rejects unknown fonts in stored text layers", () => {
    const { controller } = setup();
    controller.execute(
      addLayer(createTextLayer({ text: "T", x: 0, y: 0, style: DEFAULT_TEXT_STYLE })),
    );
    const raw = JSON.parse(JSON.stringify(serializeDocument(doc(controller))));
    raw.document.layers[1].fontFamily = "url(evil)";
    expect(deserializeProject(raw).ok).toBe(false);
  });
});

describe("gesture merging", () => {
  it("merges a slow gesture until sealed", () => {
    const { controller } = setup();
    const [a, b, c] = [doc(controller), { ...doc(controller) }, { ...doc(controller) }];
    let h = createHistory();
    h = recordChange(
      h,
      { label: "Move", before: a, after: b, mergeKey: "k", mergeUntilSealed: true },
      0,
    );
    h = recordChange(
      h,
      { label: "Move", before: b, after: c, mergeKey: "k", mergeUntilSealed: true },
      60_000,
    );
    expect(h.past).toHaveLength(1);
  });
});
