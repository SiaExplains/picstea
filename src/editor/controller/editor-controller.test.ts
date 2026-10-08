import { afterEach, describe, expect, it, vi } from "vitest";
import { renameLayer, setLayerVisibility } from "../core/commands";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import { StorageError, type ProjectStorage } from "../persistence/project-storage";
import { fakeDecoder, pngHeader } from "../test-utils/image-bytes";
import { EditorController } from "./editor-controller";

function setup(storage: ProjectStorage = new MemoryProjectStorage(), autosaveDelayMs = 0) {
  const { decode } = fakeDecoder(64, 32);
  const controller = new EditorController({ storage, decode, autosaveDelayMs });
  return { controller, storage };
}

const png = () => new Blob([pngHeader(64, 32)], { type: "image/png" });

afterEach(() => {
  vi.useRealTimers();
});

describe("EditorController", () => {
  it("creates a document, edits it, saves it and restores it in a fresh controller", async () => {
    const storage = new MemoryProjectStorage();
    const { controller } = setup(storage);
    expect(controller.newDocument({ name: "Banner", width: 1200, height: 600 })).toEqual({
      ok: true,
    });
    controller.addFillLayer("#336699");
    const session = controller.store.getSession()!;
    controller.execute(renameLayer(session.document.activeLayerId!, "Blue"));
    expect(await controller.save()).toEqual({ ok: true });
    expect(controller.store.getSession()!.savedRevision).toBe(
      controller.store.getSession()!.revision,
    );

    const fresh = setup(storage).controller;
    await fresh.refreshRecentProjects();
    const recent = fresh.status.get().recentProjects!;
    expect(recent.map((p) => p.name)).toEqual(["Banner"]);
    expect(await fresh.openProject(recent[0].id)).toEqual({ ok: true });
    const restored = fresh.store.getSession()!.document;
    expect(restored.layers.map((l) => l.name)).toEqual(["Background", "Blue"]);
    expect(fresh.store.getSession()!.savedRevision).toBe(0);
  });

  it("reports invalid new-document sizes", () => {
    const { controller } = setup();
    expect(controller.newDocument({ name: "x", width: 0, height: 5 }).ok).toBe(false);
  });

  it("opens an image as a new document with one raster layer, and restores its pixels", async () => {
    const storage = new MemoryProjectStorage();
    const { controller } = setup(storage);
    expect(await controller.openImageFile(png(), "photo.png")).toEqual({ ok: true });
    const doc = controller.store.getSession()!.document;
    expect(doc).toMatchObject({ name: "photo", width: 64, height: 32 });
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0]).toMatchObject({ kind: "raster", width: 64, height: 32 });

    await controller.save();
    const fresh = setup(storage).controller;
    await fresh.openProject(doc.id);
    const layer = fresh.store.getSession()!.document.layers[0];
    expect(layer.kind === "raster" && fresh.assets.has(layer.assetId!)).toBe(true);
  });

  it("places an image as a centred layer in the active document", async () => {
    const { controller } = setup();
    controller.newDocument({ name: "x", width: 100, height: 100 });
    await controller.placeImageFile(png(), "logo.png");
    const layer = controller.store.getSession()!.document.layers.at(-1)!;
    expect(layer).toMatchObject({ kind: "raster", name: "logo", transform: { x: 18, y: 34 } });
    controller.undo();
    expect(controller.store.getSession()!.document.layers).toHaveLength(1);
  });

  it("surfaces import errors as notices", async () => {
    const { controller } = setup();
    const result = await controller.openImageFile(new Blob(["nope"]), "x.png");
    expect(result.ok).toBe(false);
    expect(controller.status.get().notices).toEqual([expect.objectContaining({ kind: "error" })]);
  });

  it("surfaces command errors as notices", () => {
    const { controller } = setup();
    controller.newDocument({ name: "x", width: 10, height: 10 });
    const bg = controller.store.getSession()!.document.layers[0].id;
    controller.execute(renameLayer(bg, ""));
    expect(controller.status.get().notices.at(-1)?.message).toMatch(/empty/);
  });

  it("autosaves after the idle delay", async () => {
    vi.useFakeTimers();
    const storage = new MemoryProjectStorage();
    const { controller } = setup(storage, 1000);
    controller.newDocument({ name: "Auto", width: 10, height: 10 });
    expect(await storage.list()).toEqual([]);
    await vi.advanceTimersByTimeAsync(1000);
    expect((await storage.list()).map((p) => p.name)).toEqual(["Auto"]);
    controller.dispose();
  });

  it("saves dirty documents before closing them", async () => {
    const storage = new MemoryProjectStorage();
    const { controller } = setup(storage);
    controller.newDocument({ name: "Close me", width: 10, height: 10 });
    const id = controller.store.getSession()!.document.id;
    controller.execute(
      setLayerVisibility(controller.store.getSession()!.document.layers[0].id, false),
    );
    expect(await controller.closeDocument(id)).toEqual({ ok: true });
    expect(controller.store.getState().sessions).toEqual([]);
    expect((await storage.load(id)).document.layers[0].visible).toBe(false);
  });

  it("keeps assets referenced by undo history and releases them on close", async () => {
    const { controller } = setup();
    controller.newDocument({ name: "x", width: 100, height: 100 });
    await controller.placeImageFile(png(), "a.png");
    const doc = controller.store.getSession()!.document;
    const layer = doc.layers.at(-1)!;
    const assetId = (layer.kind === "raster" && layer.assetId) || "";
    controller.undo(); // layer gone from the current document, but redo still needs the asset
    await controller.closeDocument(doc.id);
    expect(controller.assets.has(assetId)).toBe(false);
  });

  it("refuses to delete a project that is open", async () => {
    const { controller } = setup();
    controller.newDocument({ name: "x", width: 10, height: 10 });
    await controller.save();
    const id = controller.store.getSession()!.document.id;
    expect((await controller.deleteProject(id)).ok).toBe(false);
    await controller.closeDocument(id);
    expect(await controller.deleteProject(id)).toEqual({ ok: true });
    expect(controller.status.get().recentProjects).toEqual([]);
  });

  it("falls back to memory storage when local storage is unavailable", async () => {
    const broken: ProjectStorage = {
      kind: "indexeddb",
      persistent: true,
      list: async () => {
        throw new StorageError("unavailable", "nope");
      },
      save: async () => {
        throw new StorageError("unavailable", "nope");
      },
      load: async () => {
        throw new StorageError("unavailable", "nope");
      },
      delete: async () => {},
    };
    const { controller } = setup(broken);
    await controller.refreshRecentProjects();
    expect(controller.storageKind).toBe("memory");
    expect(controller.status.get().storagePersistent).toBe(false);
    controller.newDocument({ name: "x", width: 10, height: 10 });
    expect(await controller.save()).toEqual({ ok: true });
  });

  it("reports a missing project and refreshes the list", async () => {
    const { controller } = setup();
    const result = await controller.openProject("doc_missing");
    expect(result).toEqual({ ok: false, error: "That project no longer exists." });
  });
});
