import { describe, expect, it } from "vitest";
import { addLayer } from "../core/commands";
import { createRasterLayer } from "../core/document/factory";
import { isDirty } from "../core/editor-store";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import { StorageError } from "../persistence/project-storage";
import { fakeDecoder } from "../test-utils/image-bytes";
import { EditorController } from "./editor-controller";

/** Storage that is full: every save fails like IndexedDB's QuotaExceededError. */
class FullStorage extends MemoryProjectStorage {
  override async save(): Promise<void> {
    throw new StorageError(
      "quota",
      "Your browser's storage is full. Export your work or delete old projects to free space.",
    );
  }
}

describe("launch readiness — storage full", () => {
  it("explains the problem, keeps the document open and unsaved", async () => {
    const { decode } = fakeDecoder(10, 10);
    const c = new EditorController({
      storage: new FullStorage(),
      decode,
      encode: async () => new Blob(["png"], { type: "image/png" }),
      autosaveDelayMs: 0,
    });
    c.newDocument({ name: "Doc", width: 50, height: 50 });
    c.execute(addLayer(createRasterLayer({ assetId: null, width: 10, height: 10, name: "A" })));
    const result = await c.save();
    expect(result.ok).toBe(false);
    expect(c.status.get().notices.at(-1)?.message).toMatch(/storage is full/);
    const session = c.store.getSession()!;
    expect(session.document.layers.map((l) => l.name)).toContain("A");
    expect(isDirty(session)).toBe(true);
    // Closing is refused rather than losing the work.
    expect((await c.closeDocument(session.document.id)).ok).toBe(false);
    expect(c.store.getSession()).toBeDefined();
  });

  it("reports a failed crash-time save honestly and keeps typed text", async () => {
    const { decode } = fakeDecoder(10, 10);
    const full = new EditorController({
      storage: new FullStorage(),
      decode,
      encode: async () => new Blob(["png"], { type: "image/png" }),
      autosaveDelayMs: 0,
    });
    full.newDocument({ name: "Doc", width: 50, height: 50 });
    full.execute(addLayer(createRasterLayer({ assetId: null, width: 10, height: 10, name: "A" })));
    expect(await full.saveAfterCrash()).toBe(false);

    const ok = new EditorController({
      storage: new MemoryProjectStorage(),
      decode,
      encode: async () => new Blob(["png"], { type: "image/png" }),
      autosaveDelayMs: 0,
    });
    ok.newDocument({ name: "Doc", width: 50, height: 50 });
    ok.beginTextEdit({ mode: "new", at: { x: 5, y: 5 } });
    ok.updateTextDraft({ text: "Typed" });
    // Memory storage doesn't survive a reload: never claim it was saved in the browser.
    expect(await ok.saveAfterCrash()).toBe(false);
    expect(ok.store.getSession()!.document.layers.some((l) => l.kind === "text")).toBe(true);
  });
});
