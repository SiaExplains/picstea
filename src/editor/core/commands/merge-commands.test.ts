import { describe, expect, it } from "vitest";
import { createDocument, createShapeLayer } from "../document/factory";
import { findLayerDeep, locateLayer } from "../document/tree";
import type { EditorDocument, GroupLayer, Layer } from "../document/types";
import { validateDocument } from "../../serialization/validate";
import { DEFAULT_EFFECTS } from "../effects/model";
import { createGroup } from "./group-commands";
import {
  flattenImage,
  mergeDown,
  mergeTarget,
  rasterizeLayerStyle,
  setLayerLabel,
} from "./merge-commands";

const shape = (id: string, patch: Partial<Layer> = {}): Layer =>
  ({
    ...createShapeLayer({
      shape: "rect",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: "#ff0000",
      stroke: null,
      name: id,
    }),
    id,
    ...patch,
  }) as Layer;

const pixels = { assetId: "asset-1", x: 2, y: 3, width: 40, height: 30 };

/** root: [bg, a, b, G[c, d]] — bottom first. */
function doc(): EditorDocument {
  const base = createDocument({ name: "x", width: 100, height: 100 });
  const group: GroupLayer = { ...createGroup("G", [shape("c"), shape("d")]), id: "G" };
  return {
    ...base,
    layers: [
      ...base.layers,
      shape("a", { opacity: 0.5, blendMode: "multiply", label: "green" }),
      shape("b"),
      group,
    ],
    activeLayerId: "b",
  };
}

describe("Merge Down", () => {
  it("bakes the layer into the one below, keeping the lower layer's settings", () => {
    const next = mergeDown("b", pixels).apply(doc());
    expect(findLayerDeep(next.layers, "b")).toBeUndefined();
    const merged = findLayerDeep(next.layers, "a")!;
    expect(merged).toMatchObject({
      kind: "raster",
      name: "a",
      opacity: 0.5,
      blendMode: "multiply",
      label: "green",
      assetId: "asset-1",
      width: 40,
      height: 30,
      transform: { x: 2, y: 3, scaleX: 1, scaleY: 1, rotation: 0 },
    });
    expect(next.activeLayerId).toBe("a");
  });

  it("works inside groups and refuses groups or the bottom layer", () => {
    const next = mergeDown("d", pixels).apply(doc());
    expect(findLayerDeep(next.layers, "d")).toBeUndefined();
    expect(locateLayer(next.layers, "c")).toMatchObject({ parentId: "G", index: 0 });
    expect(mergeTarget(doc(), "G")).toBeNull();
    expect(mergeTarget(doc(), "c")).toBeNull();
    const d = doc();
    expect(() => mergeDown(d.layers[0].id, pixels).apply(d)).toThrow(/no layer below/);
  });

  it("respects locks", () => {
    const d = doc();
    const locked = {
      ...d,
      layers: d.layers.map((l) => (l.id === "a" ? { ...l, locked: true } : l)),
    };
    expect(() => mergeDown("b", pixels).apply(locked)).toThrow(/locked/);
  });
});

describe("Flatten Image", () => {
  it("replaces every layer with one Background layer", () => {
    const next = flattenImage({ ...pixels, x: 0, y: 0, width: 100, height: 100 }, "flat").apply(
      doc(),
    );
    expect(next.layers).toHaveLength(1);
    expect(next.layers[0]).toMatchObject({ id: "flat", name: "Background", kind: "raster" });
    expect(next.activeLayerId).toBe("flat");
  });
});

describe("Rasterize Layer Style", () => {
  it("only applies to layers with a style and keeps their settings", () => {
    expect(() => rasterizeLayerStyle("b", pixels).apply(doc())).toThrow(/no layer style/);
    const d = doc();
    const styled = {
      ...d,
      layers: d.layers.map((l) =>
        l.id === "b"
          ? {
              ...l,
              opacity: 0.7,
              effects: {
                stroke: [DEFAULT_EFFECTS.stroke],
              },
            }
          : l,
      ),
    };
    const next = rasterizeLayerStyle("b", pixels).apply(styled);
    const b = findLayerDeep(next.layers, "b")!;
    expect(b).toMatchObject({ kind: "raster", opacity: 0.7, assetId: "asset-1" });
    expect(b.effects).toBeUndefined();
    expect(() => rasterizeLayerStyle("G", pixels).apply(styled)).toThrow(/Groups/);
  });
});

describe("layer colour labels", () => {
  it("sets and clears labels on several layers, deep in groups", () => {
    const labelled = setLayerLabel(["b", "c"], "blue").apply(doc());
    expect(findLayerDeep(labelled.layers, "b")!.label).toBe("blue");
    expect(findLayerDeep(labelled.layers, "c")!.label).toBe("blue");
    const cleared = setLayerLabel(["b"], null).apply(labelled);
    expect("label" in findLayerDeep(cleared.layers, "b")!).toBe(false);
    // Unchanged labels return the same document (nothing recorded in history).
    expect(setLayerLabel(["b"], "blue").apply(labelled)).toBe(labelled);
  });

  it("round-trips through project validation and rejects unknown colours", () => {
    const labelled = setLayerLabel(["a"], "violet").apply(doc());
    const copy = validateDocument(JSON.parse(JSON.stringify(labelled)));
    expect(findLayerDeep(copy.layers, "a")!.label).toBe("violet");
    const bad = JSON.parse(JSON.stringify(labelled));
    bad.layers[1].label = "purple";
    expect(() => validateDocument(bad)).toThrow();
  });
});
