import { describe, expect, it } from "vitest";
import { addGuide, clearGuides, moveGuide, removeGuide } from "../commands";
import { createDocument, createRasterLayer } from "../document/factory";
import type { EditorDocument } from "../document/types";
import { estimateTextSizer } from "../../rendering/text/text-layout";
import { alignDelta, snapPoint, snapRect, snapTargets, type SnapOptions } from "./snapping";

const all: SnapOptions = { guides: true, grid: null, canvas: true, layers: true };

function doc(): EditorDocument {
  const d = createDocument({ width: 200, height: 100, name: "Snap" });
  const layer = createRasterLayer({
    assetId: null,
    width: 40,
    height: 20,
    name: "L",
    x: 120,
    y: 30,
  });
  return { ...d, layers: [...d.layers, layer] };
}

describe("snapping", () => {
  it("snaps a box edge to the nearest canvas edge or centre within the threshold", () => {
    const t = snapTargets(doc(), estimateTextSizer, { ...all, layers: false });
    const r = snapRect({ x: 3, y: 50, width: 10, height: 10 }, t, 5);
    expect(r.dx).toBe(-3);
    expect(r.lines).toContainEqual({ axis: "x", value: 0, source: "canvas" });
    // Centre y (55) is 5 from the canvas centre (50); the top (50) is exactly on it.
    expect(r.dy).toBe(0);
    const none = snapRect({ x: 30, y: 20, width: 10, height: 10 }, t, 5);
    expect(none).toEqual({ dx: 0, dy: 0, lines: [] });
  });

  it("snaps to guides, which win ties against layer edges", () => {
    let d = doc();
    d = addGuide("vertical", 120).apply(d);
    const t = snapTargets(d, estimateTextSizer, all);
    const r = snapPoint({ x: 118, y: 7 }, t, 4);
    expect(r.dx).toBe(2);
    expect(r.lines[0]).toEqual({ axis: "x", value: 120, source: "guide" });
  });

  it("snaps to other layers' edges and centres but not the moving layer", () => {
    const d = doc();
    const moving = d.layers[d.layers.length - 1].id;
    const withLayer = snapTargets(d, estimateTextSizer, { ...all, canvas: false });
    expect(snapPoint({ x: 139, y: 0 }, withLayer, 2).dx).toBe(1);
    const excluded = snapTargets(d, estimateTextSizer, {
      ...all,
      canvas: false,
      excludeLayerIds: [moving],
    });
    expect(snapPoint({ x: 139, y: 0 }, excluded, 2).dx).toBe(0);
  });

  it("snaps to the grid and can limit to one axis", () => {
    const t = snapTargets(doc(), estimateTextSizer, {
      guides: false,
      canvas: false,
      layers: false,
      grid: 25,
    });
    const r = snapPoint({ x: 48, y: 73 }, t, 3, { x: true, y: false });
    expect(r).toEqual({ dx: 2, dy: 0, lines: [{ axis: "x", value: 50, source: "grid" }] });
  });

  it("computes alignment offsets", () => {
    const box = { x: 10, y: 10, width: 20, height: 10 };
    const canvas = { x: 0, y: 0, width: 100, height: 50 };
    expect(alignDelta(box, canvas, "left")).toEqual({ x: -10, y: 0 });
    expect(alignDelta(box, canvas, "center-x")).toEqual({ x: 30, y: 0 });
    expect(alignDelta(box, canvas, "right")).toEqual({ x: 70, y: 0 });
    expect(alignDelta(box, canvas, "center-y")).toEqual({ x: 0, y: 10 });
    expect(alignDelta(box, canvas, "bottom")).toEqual({ x: 0, y: 30 });
  });
});

describe("guide commands", () => {
  it("add, move, remove and clear guides", () => {
    let d = doc();
    d = addGuide("horizontal", 40, "g1").apply(d);
    d = addGuide("vertical", 10, "g2").apply(d);
    expect(d.guides).toHaveLength(2);
    d = moveGuide("g1", 55).apply(d);
    expect(d.guides[0].position).toBe(55);
    expect(moveGuide("g1", 55).apply(d)).toBe(d);
    d = removeGuide("g2").apply(d);
    expect(d.guides.map((g) => g.id)).toEqual(["g1"]);
    d = clearGuides().apply(d);
    expect(d.guides).toEqual([]);
    expect(clearGuides().apply(d)).toBe(d);
  });

  it("rejects non-finite positions and missing guides", () => {
    expect(() => addGuide("vertical", Number.NaN).apply(doc())).toThrow();
    expect(() => moveGuide("missing", 3).apply(doc())).toThrow();
  });
});
