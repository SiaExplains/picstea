import { describe, expect, it } from "vitest";
import { addLayer, convertToSmartObject, setClipped } from "../core/commands";
import { createRasterLayer } from "../core/document/factory";
import { findLayer, referencedAssetIds } from "../core/document/queries";
import type { EditorDocument, SmartObjectLayer } from "../core/document/types";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import { deserializeProject, serializeDocument } from "../serialization/serialization";
import { MAX_SMART_DEPTH } from "../serialization/validate";
import { fakeDecoder } from "../test-utils/image-bytes";
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
  return { controller, storage };
}

const doc = (c: EditorController) => c.store.getSession()!.document;

function addBox(c: EditorController, assetId: string | null = null) {
  const layer = createRasterLayer({ assetId, width: 40, height: 20, name: "Box", x: 30, y: 25 });
  c.execute(addLayer(layer, "Add"));
  return layer.id;
}

function smart(c: EditorController): SmartObjectLayer {
  const layer = findLayer(doc(c), doc(c).activeLayerId!);
  if (layer?.kind !== "smart") throw new Error("expected a smart object");
  return layer;
}

describe("Gate 9c smart objects", () => {
  it("converts a layer into an embedded document sized to its bounds", () => {
    const { controller: c } = setup();
    const id = addBox(c, "asset-1");
    c.execute(setClipped(id, true));
    c.convertToSmartObject();
    const s = smart(c);
    expect(s).toMatchObject({ name: "Box", clipped: true, transform: { x: 30, y: 25 } });
    expect(s.content).toMatchObject({ width: 40, height: 20 });
    const inner = s.content.layers[0];
    expect(inner).toMatchObject({ id, transform: { x: 0, y: 0 } });
    expect(inner.clipped).toBeUndefined();
    // Embedded pixels are still referenced (saved, kept in memory).
    expect(referencedAssetIds(doc(c))).toContain("asset-1");
    c.undo();
    expect(findLayer(doc(c), id)?.kind).toBe("raster");
  });

  it("refuses fill and adjustment layers", () => {
    const { controller: c } = setup();
    const bg = doc(c).layers[0].id;
    expect(() =>
      convertToSmartObject(bg, { x: 0, y: 0, width: 1, height: 1 }).apply(doc(c)),
    ).toThrow();
  });

  it("Edit Contents opens a tab that saves into the parent as one undo step", async () => {
    const { controller: c, storage } = setup();
    addBox(c);
    c.convertToSmartObject();
    const parentId = doc(c).id;
    const layerId = smart(c).id;
    c.editSmartContents();
    const childId = doc(c).id;
    expect(childId).not.toBe(parentId);
    expect(c.isSmartChild(childId)).toBe(true);
    expect(doc(c).name).toBe("Box (Smart Object)");

    addBox(c);
    addBox(c);
    expect((await c.save(childId)).ok).toBe(true);
    addBox(c);
    expect((await c.save(childId)).ok).toBe(true);
    const parent = c.store.getSession(parentId)!;
    const updated = findLayer(parent.document, layerId) as SmartObjectLayer;
    expect(updated.content.layers).toHaveLength(4);
    expect(updated.content.name).toBe("Box");
    // Both applies merged into one step; the child tab itself never became a project.
    expect(parent.history.past.at(-1)?.label).toBe("Edit Contents");
    c.store.undo(parentId);
    expect(
      (findLayer(c.store.getSession(parentId)!.document, layerId) as SmartObjectLayer).content
        .layers,
    ).toHaveLength(1);
    const stored = await storage.list();
    expect(stored.map((p) => p.id)).not.toContain(childId);
  });

  it("closing the parent applies and closes its Edit Contents tab", async () => {
    const { controller: c } = setup();
    addBox(c);
    c.convertToSmartObject();
    const parentId = doc(c).id;
    const layerId = smart(c).id;
    c.editSmartContents();
    const childId = doc(c).id;
    addBox(c);
    c.store.setActiveDocument(parentId);
    // Re-opening the same smart object switches to its tab instead of opening another.
    c.editSmartContents(layerId);
    expect(doc(c).id).toBe(childId);
    await c.closeDocument(parentId);
    expect(c.store.getSession(childId)).toBeUndefined();
    expect(c.store.getSession(parentId)).toBeUndefined();
  });

  it("explains when the smart object is gone", async () => {
    const { controller: c } = setup();
    addBox(c);
    c.convertToSmartObject();
    const parentId = doc(c).id;
    c.editSmartContents();
    const childId = doc(c).id;
    addBox(c);
    c.store.setActiveDocument(parentId);
    c.undo(); // undo the conversion: the smart object no longer exists
    const result = await c.save(childId);
    expect(result.ok).toBe(false);
    expect(c.store.getSession(childId)).toBeDefined();
  });

  it("adds, edits, hides, reorders and removes smart filters (undoable)", () => {
    const { controller: c } = setup();
    addBox(c);
    c.convertToSmartObject();
    const layerId = smart(c).id;
    const blur = c.addSmartFilter("gaussian-blur", { radius: 3 })!;
    const noise = c.addSmartFilter("add-noise", {
      amount: 5,
      gaussian: false,
      monochromatic: true,
    })!;
    expect(smart(c).filters?.map((f) => f.filterId)).toEqual(["gaussian-blur", "add-noise"]);
    c.updateSmartFilter(layerId, blur, { values: { radius: 8 } });
    c.updateSmartFilter(layerId, noise, { enabled: false });
    c.moveSmartFilter(layerId, blur, 1);
    expect(smart(c).filters?.map((f) => [f.filterId, f.enabled])).toEqual([
      ["add-noise", false],
      ["gaussian-blur", true],
    ]);
    expect(c.updateSmartFilter(layerId, blur, { values: { radius: 9999 } })).toBe(false);
    c.updateSmartFilter(layerId, blur, null);
    c.updateSmartFilter(layerId, noise, null);
    expect(smart(c).filters).toBeUndefined();
    c.undo();
    expect(smart(c).filters).toHaveLength(1);
  });

  it("projects keep smart objects and their filters; invalid ones are rejected", () => {
    const { controller: c } = setup();
    addBox(c);
    c.convertToSmartObject();
    c.addSmartFilter("pixelate", { size: 4 });
    const saved = JSON.parse(JSON.stringify(serializeDocument(doc(c))));
    const restored = deserializeProject(saved);
    if (!restored.ok) throw new Error(restored.error);
    const back = findLayer(restored.document, smart(c).id) as SmartObjectLayer;
    expect(back.content.layers[0].name).toBe("Box");
    expect(back.filters?.[0]).toMatchObject({ filterId: "pixelate", values: { size: 4 } });

    const badFilter = JSON.parse(JSON.stringify(saved));
    const layers = badFilter.document.layers;
    layers[layers.length - 1].filters[0].values.size = -1;
    expect(deserializeProject(badFilter).ok).toBe(false);

    const unknown = JSON.parse(JSON.stringify(saved));
    unknown.document.layers.at(-1).filters[0].filterId = "__proto__";
    expect(deserializeProject(unknown).ok).toBe(false);
  });

  it("limits how deep smart objects may nest", () => {
    const { controller: c } = setup();
    const base = serializeDocument(doc(c)).document as EditorDocument;
    let inner: EditorDocument = base;
    for (let i = 0; i <= MAX_SMART_DEPTH; i++) {
      const wrapper = {
        ...base,
        id: `doc-${i}`,
        layers: [
          {
            id: `smart-${i}`,
            kind: "smart",
            name: "S",
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: "normal",
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
            content: inner,
          },
        ],
      } as unknown as EditorDocument;
      inner = wrapper;
    }
    expect(deserializeProject({ schemaVersion: 5, document: inner }).ok).toBe(false);
  });
});
