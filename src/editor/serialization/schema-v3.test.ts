import { describe, expect, it } from "vitest";
import { createGroup, DEFAULT_EFFECTS } from "../core/commands";
import {
  createAdjustmentLayer,
  createDocument,
  createMask,
  createShapeLayer,
} from "../core/document/factory";
import type { EditorDocument, Layer } from "../core/document/types";
import { shadowOffset, strokeOffsets } from "../rendering/compositing/effects";
import { deserializeProject, serializeDocument } from "./serialization";
import { MAX_GROUP_DEPTH } from "./validate";

function richDocument(): EditorDocument {
  const base = createDocument({ name: "Rich", width: 200, height: 100 });
  const shape = {
    ...createShapeLayer({
      shape: "ellipse",
      x: 1,
      y: 2,
      width: 30,
      height: 20,
      fill: "#00ff00",
      stroke: null,
      name: "s",
    }),
    mask: { ...createMask(base), assetId: "mask_1", linked: false },
    effects: { dropShadow: [DEFAULT_EFFECTS.dropShadow], stroke: [DEFAULT_EFFECTS.stroke] },
  };
  const adjustment = createAdjustmentLayer(
    base,
    { type: "hue-saturation", hue: 30, saturation: -20, lightness: 5 },
    "HS",
  );
  const group = { ...createGroup("Group 1", [shape, adjustment]), opacity: 0.5, expanded: false };
  const isolated = { ...createGroup("Group 2", []), blendMode: "multiply" as const };
  return { ...base, layers: [...base.layers, group, isolated] };
}

const raw = (doc: EditorDocument) => JSON.parse(JSON.stringify(serializeDocument(doc)));

describe("schema v3", () => {
  it("round-trips groups, masks, effects, adjustments and pass-through", () => {
    const doc = richDocument();
    expect(deserializeProject(raw(doc))).toEqual({ ok: true, document: doc, migratedFrom: null });
  });

  it("upgrades v2 projects unchanged", () => {
    const base = createDocument({ name: "Old", width: 10, height: 10 });
    const v2 = { schemaVersion: 2, document: JSON.parse(JSON.stringify(base)) };
    expect(deserializeProject(v2)).toEqual({ ok: true, document: base, migratedFrom: 2 });
  });

  it("rejects pass-through on non-groups and unknown adjustments", () => {
    const doc = richDocument();
    const r1 = raw(doc);
    r1.document.layers[0].blendMode = "pass-through";
    expect(deserializeProject(r1).ok).toBe(false);
    const r2 = raw(doc);
    r2.document.layers[1].children[1].adjustment = { type: "curves", points: [] };
    expect(deserializeProject(r2).ok).toBe(false);
  });

  it("rejects out-of-range effects and malformed masks", () => {
    const r1 = raw(richDocument());
    r1.document.layers[1].children[0].effects.stroke[0].size = 1e9;
    expect(deserializeProject(r1).ok).toBe(false);
    const r2 = raw(richDocument());
    r2.document.layers[1].children[0].mask.width = 0;
    expect(deserializeProject(r2).ok).toBe(false);
  });

  it("drops unknown effect fields", () => {
    const r = raw(richDocument());
    r.document.layers[1].children[0].effects.dropShadow[0].script = "alert(1)";
    const result = deserializeProject(r);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const shape = (result.document.layers[1] as Layer & { children: Layer[] }).children[0];
    expect(Object.keys(shape.effects!.dropShadow![0])).not.toContain("script");
  });

  it("rejects duplicate ids across the tree and excessive nesting", () => {
    const r1 = raw(richDocument());
    r1.document.layers[2].id = r1.document.layers[1].children[0].id;
    expect(deserializeProject(r1).ok).toBe(false);

    const base = createDocument({ name: "Deep", width: 10, height: 10 });
    let layer: Layer = createGroup("leaf");
    for (let i = 0; i <= MAX_GROUP_DEPTH; i++) layer = createGroup(`g${i}`, [layer]);
    expect(deserializeProject(raw({ ...base, layers: [layer] })).ok).toBe(false);
  });
});

describe("effect geometry", () => {
  it("casts shadows away from the light", () => {
    const { dx, dy } = shadowOffset(120, 10);
    expect(dx).toBeCloseTo(5);
    expect(dy).toBeCloseTo(8.66, 2);
  });

  it("samples rings for the outside stroke", () => {
    expect(strokeOffsets(0)).toEqual([]);
    const offsets = strokeOffsets(6);
    expect(offsets.length).toBeGreaterThan(8);
    expect(Math.max(...offsets.map((p) => Math.hypot(p.x, p.y)))).toBeCloseTo(6);
  });
});
