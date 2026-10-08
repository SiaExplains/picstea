import { describe, expect, it } from "vitest";
import { createDocument, createRasterLayer } from "../core/document/factory";
import { CURRENT_SCHEMA_VERSION, deserializeProject, serializeDocument } from "./serialization";

function sampleDocument() {
  const doc = createDocument({ name: "Sample", width: 300, height: 200 });
  const raster = createRasterLayer({
    assetId: "asset_1",
    width: 50,
    height: 40,
    name: "Photo",
    x: 10,
    y: 20,
  });
  return {
    ...doc,
    layers: [...doc.layers, { ...raster, opacity: 0.5, blendMode: "multiply" as const }],
    guides: [{ id: "g1", orientation: "vertical" as const, position: 150 }],
  };
}

describe("serialization", () => {
  it("round-trips a document losslessly", () => {
    const doc = sampleDocument();
    const serialized = serializeDocument(doc);
    expect(serialized.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const result = deserializeProject(JSON.parse(JSON.stringify(serialized)));
    expect(result).toEqual({ ok: true, document: doc, migratedFrom: null });
  });

  it("rejects projects from a newer version", () => {
    const serialized = {
      ...serializeDocument(sampleDocument()),
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    };
    const result = deserializeProject(serialized);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("newer version") });
  });

  it("rejects missing or invalid versions", () => {
    expect(deserializeProject(null).ok).toBe(false);
    expect(deserializeProject({ document: {} }).ok).toBe(false);
    expect(deserializeProject({ schemaVersion: "1", document: {} }).ok).toBe(false);
  });

  it("runs migrations in order", () => {
    const v1 = serializeDocument(sampleDocument());
    const legacy = {
      schemaVersion: 1,
      document: { ...(v1.document as object), legacyName: "Old" },
    };
    const migrations = {
      1: (d: unknown) => ({ ...(d as object), step: 1 }),
      2: (d: unknown) => {
        const { legacyName, step, ...rest } = d as { legacyName: string; step: number };
        expect(step).toBe(1);
        return { ...rest, name: legacyName };
      },
    };
    const result = deserializeProject(legacy, migrations, 3);
    expect(result.ok && result.document.name).toBe("Old");
    expect(result.ok && result.migratedFrom).toBe(1);
  });

  it("fails cleanly when a migration is missing or throws", () => {
    const v1 = serializeDocument(sampleDocument());
    expect(deserializeProject(v1, {}, 2)).toEqual({
      ok: false,
      error: expect.stringContaining("No upgrade path"),
    });
    const throwing = {
      1: () => {
        throw new Error("boom");
      },
    };
    expect(deserializeProject(v1, throwing, 2).ok).toBe(false);
  });

  describe("validation of damaged or hostile data", () => {
    const base = () =>
      serializeDocument(sampleDocument()) as {
        schemaVersion: number;
        document: Record<string, unknown>;
      };

    it.each([
      [
        "non-finite numbers",
        (d: Record<string, unknown>) => ({ ...d, width: Number.POSITIVE_INFINITY }),
      ],
      ["oversized dimensions", (d: Record<string, unknown>) => ({ ...d, width: 1e6, height: 1e6 })],
      [
        "unknown layer kinds",
        (d: Record<string, unknown>) => ({ ...d, layers: [{ kind: "script" }] }),
      ],
      [
        "bad colours",
        (d: Record<string, unknown>) => ({
          ...d,
          layers: [{ ...(d.layers as object[])[0], color: "javascript:alert(1)" }],
        }),
      ],
      [
        "duplicate layer ids",
        (d: Record<string, unknown>) => ({
          ...d,
          layers: [(d.layers as object[])[0], (d.layers as object[])[0]],
        }),
      ],
      [
        "opacity out of range",
        (d: Record<string, unknown>) => ({
          ...d,
          layers: [{ ...(d.layers as object[])[0], opacity: 2 }],
        }),
      ],
      ["a non-object document", () => "not a document"],
    ])("rejects %s", (_label, mutate) => {
      const project = base();
      const result = deserializeProject({ ...project, document: mutate(project.document) });
      expect(result).toEqual({ ok: false, error: expect.stringContaining("damaged") });
    });

    it("drops unknown keys, including __proto__", () => {
      const project = base();
      const hostile = JSON.parse(
        JSON.stringify(project).replace(
          '"name":"Sample"',
          '"name":"Sample","__proto__":{"polluted":true},"extra":1',
        ),
      );
      const result = deserializeProject(hostile);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(Object.keys(result.document)).not.toContain("extra");
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect((result.document as unknown as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("repairs a dangling active layer id instead of rejecting", () => {
      const project = base();
      const result = deserializeProject({
        ...project,
        document: { ...project.document, activeLayerId: "gone" },
      });
      expect(result.ok && result.document.activeLayerId).toBe(
        (project.document.layers as { id: string }[]).at(-1)!.id,
      );
    });
  });
});
