import { describe, expect, it } from "vitest";
import { createDocument } from "../core/document/factory";
import type { SmartObjectLayer } from "../core/document/types";
import { deserializeProject, serializeDocument } from "./serialization";

const smart = (distortion: unknown): SmartObjectLayer =>
  ({
    id: "s",
    kind: "smart",
    name: "Smart",
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    content: createDocument({ name: "Inner", width: 40, height: 20 }),
    distortion,
  }) as SmartObjectLayer;

const doc = (layer: SmartObjectLayer) => ({
  ...createDocument({ name: "Doc", width: 100, height: 100 }),
  layers: [layer],
});

describe("smart object distortion in projects (schema v11)", () => {
  it("round-trips perspective and warp distortions", () => {
    for (const d of [
      { kind: "perspective", corners: [0, 0, 40, 5, 40, 20, 0, 15] },
      { kind: "warp", style: "arc", mesh: Array.from({ length: 32 }, (_, i) => i) },
    ]) {
      const result = deserializeProject(serializeDocument(doc(smart(d))));
      expect(result.ok).toBe(true);
      if (result.ok) expect((result.document.layers[0] as SmartObjectLayer).distortion).toEqual(d);
    }
  });

  it("rejects malformed distortions", () => {
    for (const d of [
      { kind: "perspective", corners: [0, 0, 1] },
      { kind: "warp", style: "arc", mesh: [Number.NaN] },
      { kind: "spiral" },
    ]) {
      const raw = JSON.parse(JSON.stringify(serializeDocument(doc(smart(d)))));
      expect(deserializeProject(raw).ok).toBe(false);
    }
  });
});
