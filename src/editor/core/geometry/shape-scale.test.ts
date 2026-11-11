import { describe, expect, it } from "vitest";
import { createDocument, createShapeLayer } from "../document/factory";
import type { ShapeLayer } from "../document/types";
import type { LayerEffects } from "../effects/model";
import { deserializeProject } from "../../serialization/serialization";
import { bakeShapeScale, hasShapeScale } from "./shape-scale";

const rect = (scaleX: number, scaleY: number, effects?: LayerEffects): ShapeLayer => {
  const layer = createShapeLayer({
    shape: "rect",
    width: 100,
    height: 50,
    x: 10,
    y: 20,
    fill: "#ff0000",
    stroke: { color: "#000000", width: 2 },
    name: "Rect",
    cornerRadius: 8,
  });
  return {
    ...layer,
    ...(effects ? { effects } : {}),
    transform: { ...layer.transform, scaleX, scaleY, rotation: 30 },
  };
};
const shadow = { dropShadow: [{ distance: 5, size: 4 }] } as unknown as LayerEffects;

describe("shape scale baking (ADR-0043)", () => {
  it("moves the scale into the geometry and keeps a 2 px stroke at 2 px", () => {
    const baked = bakeShapeScale(rect(3, 3), { scaleStroke: false, scaleEffects: false });
    expect([baked.width, baked.height, baked.cornerRadius]).toEqual([300, 150, 24]);
    expect(baked.stroke?.width).toBe(2);
    expect(baked.transform).toMatchObject({ x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 30 });
    expect(hasShapeScale(baked)).toBe(false);
  });

  it("keeps flips, and scales strokes and effects when asked", () => {
    const baked = bakeShapeScale(rect(-2, 0.5), { scaleStroke: true, scaleEffects: true });
    expect([baked.width, baked.height]).toEqual([200, 25]);
    expect([baked.transform.scaleX, baked.transform.scaleY]).toEqual([-1, 1]);
    expect(baked.stroke?.width).toBe(2);
    const big = bakeShapeScale(rect(4, 4, shadow), { scaleStroke: true, scaleEffects: true });
    expect(big.stroke?.width).toBe(8);
    expect(big.effects?.dropShadow?.[0]).toMatchObject({ distance: 20, size: 16 });
  });

  it("migrates scaled shapes in v9 projects so they look the same", () => {
    const layer = rect(3, 3);
    const doc = { ...createDocument({ name: "Old", width: 400, height: 300 }), layers: [layer] };
    const result = deserializeProject({
      schemaVersion: 9,
      document: JSON.parse(JSON.stringify(doc)),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const migrated = result.document.layers[0] as ShapeLayer;
    expect([migrated.width, migrated.transform.scaleX]).toEqual([300, 1]);
    // The old renderer widened the stroke with the scale; the migration keeps that look.
    expect(migrated.stroke?.width).toBe(6);
    expect(result.migratedFrom).toBe(9);
  });
});
