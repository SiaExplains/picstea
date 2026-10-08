import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { createDocument, createRasterLayer } from "../core/document/factory";
import type { EditorDocument } from "../core/document/types";
import { IndexedDbProjectStorage } from "./indexeddb/indexeddb-project-storage";
import { MemoryProjectStorage } from "./memory/memory-project-storage";
import { StorageError, type ProjectStorage, type StoredAsset } from "./project-storage";

function asset(id: string, text = id): StoredAsset {
  return {
    id,
    mime: "image/png",
    width: 2,
    height: 2,
    blob: new Blob([text], { type: "image/png" }),
  };
}

function docWith(
  assetIds: string[],
  name = "Doc",
  modifiedAt = "2026-01-01T00:00:00.000Z",
): EditorDocument {
  const base = createDocument({ name, width: 10, height: 10 });
  const rasters = assetIds.map((id) =>
    createRasterLayer({ assetId: id, width: 2, height: 2, name: id }),
  );
  return {
    ...base,
    layers: [...base.layers, ...rasters],
    metadata: { createdAt: modifiedAt, modifiedAt },
  };
}

const implementations: [string, () => ProjectStorage][] = [
  ["IndexedDbProjectStorage", () => new IndexedDbProjectStorage(() => new IDBFactory())],
  ["MemoryProjectStorage", () => new MemoryProjectStorage()],
];

describe.each(implementations)("%s", (_name, create) => {
  it("saves, lists and restores a project with its assets", async () => {
    const storage = create();
    const doc = docWith(["a1", "a2"]);
    await storage.save({ document: doc, assets: [asset("a1", "one"), asset("a2", "two")] });

    const list = await storage.list();
    expect(list).toEqual([
      {
        id: doc.id,
        name: "Doc",
        width: 10,
        height: 10,
        layerCount: 3,
        modifiedAt: doc.metadata.modifiedAt,
      },
    ]);

    const loaded = await storage.load(doc.id);
    expect(loaded.document).toEqual(doc);
    expect(loaded.missingAssetIds).toEqual([]);
    const texts = await Promise.all(loaded.assets.map((a) => a.blob.text()));
    expect(texts.sort()).toEqual(["one", "two"]);
    expect(loaded.assets[0].blob.type).toBe("image/png");
  });

  it("lists most recently modified first", async () => {
    const storage = create();
    await storage.save({ document: docWith([], "Old", "2026-01-01T00:00:00.000Z"), assets: [] });
    await storage.save({ document: docWith([], "New", "2026-06-01T00:00:00.000Z"), assets: [] });
    expect((await storage.list()).map((p) => p.name)).toEqual(["New", "Old"]);
  });

  it("overwrites on re-save and drops assets no longer referenced", async () => {
    const storage = create();
    const doc = docWith(["a1", "a2"]);
    await storage.save({ document: doc, assets: [asset("a1"), asset("a2")] });
    const trimmed = {
      ...doc,
      name: "Trimmed",
      layers: doc.layers.filter((l) => l.kind !== "raster" || l.assetId === "a1"),
    };
    await storage.save({ document: trimmed, assets: [asset("a1")] });
    const loaded = await storage.load(doc.id);
    expect(loaded.document.name).toBe("Trimmed");
    expect(loaded.assets.map((a) => a.id)).toEqual(["a1"]);
    expect(await storage.list()).toHaveLength(1);
  });

  it("reports missing assets instead of failing", async () => {
    const storage = create();
    const doc = docWith(["present", "absent"]);
    await storage.save({ document: doc, assets: [asset("present")] });
    const loaded = await storage.load(doc.id);
    expect(loaded.missingAssetIds).toEqual(["absent"]);
  });

  it("deletes projects and their assets", async () => {
    const storage = create();
    const doc = docWith(["a1"]);
    await storage.save({ document: doc, assets: [asset("a1")] });
    await storage.delete(doc.id);
    expect(await storage.list()).toEqual([]);
    await expect(storage.load(doc.id)).rejects.toMatchObject({ code: "not-found" });
  });
});

describe("IndexedDbProjectStorage specifics", () => {
  it("does not rewrite assets that are already stored", async () => {
    const factory = new IDBFactory();
    const storage = new IndexedDbProjectStorage(() => factory);
    const doc = docWith(["a1"]);
    await storage.save({ document: doc, assets: [asset("a1", "original")] });
    // Same id, different bytes: immutable assets mean the stored copy must win.
    await storage.save({ document: { ...doc, name: "Again" }, assets: [asset("a1", "changed")] });
    const loaded = await storage.load(doc.id);
    expect(await loaded.assets[0].blob.text()).toBe("original");
  });

  it("rejects corrupt records with a corrupt error", async () => {
    const factory = new IDBFactory();
    const storage = new IndexedDbProjectStorage(() => factory);
    const doc = docWith([]);
    await storage.save({ document: doc, assets: [] });

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = factory.open("mylper", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("projects", "readwrite");
      tx.objectStore("projects").put({
        id: doc.id,
        schemaVersion: 1,
        document: { width: "huge" },
        summary: {},
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    await expect(storage.load(doc.id)).rejects.toBeInstanceOf(StorageError);
    await expect(storage.load(doc.id)).rejects.toMatchObject({ code: "corrupt" });
    // A malformed summary is skipped, not fatal.
    expect(await storage.list()).toEqual([]);
  });

  it("maps an unusable IndexedDB to an unavailable error", async () => {
    const storage = new IndexedDbProjectStorage(() => {
      throw new Error("SecurityError");
    });
    await expect(storage.list()).rejects.toMatchObject({ code: "unavailable" });
  });
});
