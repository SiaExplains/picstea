import { describe, expect, it } from "vitest";
import {
  createAdjustmentLayer,
  createDocument,
  createFillLayer,
  createShapeLayer,
} from "../document/factory";
import { findLayerDeep, flattenTopFirst, locateLayer } from "../document/tree";
import type { EditorDocument, GroupLayer, Layer } from "../document/types";
import { CommandError } from "./command";
import { setAdjustment } from "./adjustment-commands";
import { cropDocument, setLayerTransform } from "./content-commands";
import { DEFAULT_EFFECTS, setLayerEffect } from "./effect-commands";
import {
  createGroup,
  groupLayer,
  setGroupExpanded,
  translateLayer,
  ungroup,
} from "./group-commands";
import {
  addLayer,
  deleteLayer,
  duplicateLayer,
  moveLayerRelative,
  moveLayerTo,
  setLayerBlendMode,
  setLayerLocked,
  setLayerOpacity,
  shiftLayer,
} from "./layer-commands";
import { addLayerMask, deleteLayerMask, setMaskContent, setMaskEnabled } from "./mask-commands";

const shape = (id: string, x = 0, y = 0): Layer => ({
  ...createShapeLayer({
    shape: "rect",
    x,
    y,
    width: 10,
    height: 10,
    fill: "#ff0000",
    stroke: null,
    name: id,
  }),
  id,
});
const grp = (id: string, children: Layer[]): GroupLayer => ({ ...createGroup(id, children), id });

/** root: [bg, a, G[b, c], d] */
function doc(): EditorDocument {
  const base = createDocument({ name: "x", width: 100, height: 100 });
  return {
    ...base,
    layers: [...base.layers, shape("a"), grp("G", [shape("b", 5, 5), shape("c")]), shape("d")],
    activeLayerId: "d",
  };
}

const order = (d: EditorDocument) =>
  flattenTopFirst(d.layers, { includeCollapsed: true }).map((r) =>
    r.layer.name === "Background" ? "bg" : r.layer.id,
  );

describe("tree-aware layer commands", () => {
  it("adds above the active layer in its group, or inside an active group", () => {
    const inGroup = addLayer(shape("e")).apply({ ...doc(), activeLayerId: "b" });
    expect(locateLayer(inGroup.layers, "e")).toMatchObject({ parentId: "G", index: 1 });
    const intoGroup = addLayer(shape("e")).apply({ ...doc(), activeLayerId: "G" });
    expect(locateLayer(intoGroup.layers, "e")).toMatchObject({ parentId: "G", index: 2 });
  });

  it("deletes nested layers and whole groups, selecting a neighbour", () => {
    const d = deleteLayer("b").apply({ ...doc(), activeLayerId: "b" });
    expect(findLayerDeep(d.layers, "b")).toBeUndefined();
    expect(d.activeLayerId).toBe("c");
    const g = deleteLayer("G").apply({ ...doc(), activeLayerId: "c" });
    expect(order(g)).toEqual(["d", "a", "bg"]);
    expect(g.activeLayerId).toBe("a");
  });

  it("edits nested layers through the shared helpers", () => {
    const d = setLayerOpacity("c", 0.5).apply(doc());
    expect((findLayerDeep(d.layers, "c") as Layer).opacity).toBe(0.5);
  });

  it("respects locked groups for their contents", () => {
    const locked = setLayerLocked("G", true).apply(doc());
    expect(() => setLayerOpacity("b", 0.5).apply(locked)).toThrow(/Unlock the group/);
  });

  it("allows pass-through only on groups", () => {
    expect(
      (findLayerDeep(setLayerBlendMode("G", "multiply").apply(doc()).layers, "G") as Layer)
        .blendMode,
    ).toBe("multiply");
    expect(() => setLayerBlendMode("a", "pass-through").apply(doc())).toThrow(CommandError);
  });

  it("moves between parents and refuses cycles", () => {
    const d = moveLayerTo("a", "G", 0).apply(doc());
    expect(order(d)).toEqual(["d", "G", "c", "b", "a", "bg"]);
    const nested = moveLayerTo("G", null, 0).apply(doc());
    expect(order(nested)[0]).toBe("d");
    const withInner = addLayer(grp("H", [])).apply({ ...doc(), activeLayerId: "G" });
    expect(() => moveLayerTo("G", "H", 0).apply(withInner)).toThrow(/into itself/);
  });

  it("moves relative to a target, as drag and drop does", () => {
    expect(order(moveLayerRelative("d", "b", "below").apply(doc()))).toEqual([
      "G",
      "c",
      "b",
      "d",
      "a",
      "bg",
    ]);
    expect(order(moveLayerRelative("a", "c", "above").apply(doc()))).toEqual([
      "d",
      "G",
      "a",
      "c",
      "b",
      "bg",
    ]);
    expect(order(moveLayerRelative("d", "G", "inside").apply(doc()))).toEqual([
      "G",
      "d",
      "c",
      "b",
      "a",
      "bg",
    ]);
    const same = doc();
    expect(moveLayerRelative("d", "G", "above").apply(same)).toBe(same);
    expect(() => moveLayerRelative("a", "d", "inside").apply(doc())).toThrow(CommandError);
  });

  it("shifts into neighbouring groups and out at group edges", () => {
    const d = doc();
    expect(order(shiftLayer(d, "a", 1).apply(d))).toEqual(["d", "G", "c", "b", "a", "bg"]);
    expect(order(shiftLayer(d, "d", -1).apply(d))).toEqual(["G", "d", "c", "b", "a", "bg"]);
    expect(order(shiftLayer(d, "c", 1).apply(d))).toEqual(["d", "c", "G", "b", "a", "bg"]);
    // b leaves the group downwards and lands just below it, at the root.
    const out = shiftLayer(d, "b", -1).apply(d);
    expect(locateLayer(out.layers, "b")).toMatchObject({ parentId: null, index: 2 });
  });

  it("duplicates groups deeply with fresh ids", () => {
    let n = 0;
    const d = duplicateLayer("G", "G2", () => `new${++n}`).apply(doc());
    const copy = findLayerDeep(d.layers, "G2") as GroupLayer;
    expect(copy.children.map((c) => c.id)).toEqual(["new1", "new2"]);
    expect(copy.name).toBe("G copy");
  });

  it("groups and ungroups in place", () => {
    const g = groupLayer("a", grp("N", [])).apply(doc());
    expect(locateLayer(g.layers, "a")).toMatchObject({ parentId: "N", index: 0 });
    expect(locateLayer(g.layers, "N")).toMatchObject({ parentId: null, index: 1 });
    const u = ungroup("G").apply(doc());
    expect(order(u)).toEqual(["d", "c", "b", "a", "bg"]);
    expect(() => ungroup("a").apply(doc())).toThrow(CommandError);
  });

  it("expands groups without changing anything else", () => {
    const d = doc();
    const collapsed = setGroupExpanded(d, "G", false);
    expect((findLayerDeep(collapsed.layers, "G") as GroupLayer).expanded).toBe(false);
    expect(setGroupExpanded(collapsed, "G", false)).toBe(collapsed);
  });

  it("translates a group's contents and its linked masks", () => {
    const masked = addLayerMask("b").apply(doc());
    const moved = translateLayer("G", 10, 20).apply(masked);
    const b = findLayerDeep(moved.layers, "b")!;
    expect(b.kind === "shape" && b.transform).toMatchObject({ x: 15, y: 25 });
    expect(b.mask).toMatchObject({ x: 10, y: 20 });
    expect(() => translateLayer("bg-missing", 1, 1).apply(doc())).toThrow(CommandError);
  });

  it("crop shifts nested layers and masks", () => {
    const masked = addLayerMask("c").apply(doc());
    const cropped = cropDocument({ x: 5, y: 5, width: 50, height: 50 }).apply(masked);
    const c = findLayerDeep(cropped.layers, "c")!;
    expect(c.kind === "shape" && c.transform).toMatchObject({ x: -5, y: -5 });
    expect(c.mask).toMatchObject({ x: -5, y: -5 });
  });
});

describe("masks", () => {
  it("adds, toggles, paints and deletes a mask", () => {
    let d = addLayerMask("a").apply(doc());
    expect(findLayerDeep(d.layers, "a")?.mask).toEqual({
      assetId: null,
      enabled: true,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      linked: true,
    });
    expect(addLayerMask("a").apply(d)).toBe(d);
    d = setMaskEnabled("a", false).apply(d);
    expect(findLayerDeep(d.layers, "a")?.mask?.enabled).toBe(false);
    d = setMaskContent("a", "asset_m").apply(d);
    expect(findLayerDeep(d.layers, "a")?.mask?.assetId).toBe("asset_m");
    d = deleteLayerMask("a").apply(d);
    expect(findLayerDeep(d.layers, "a")?.mask).toBeUndefined();
    expect(() => setMaskEnabled("a", true).apply(d)).toThrow(/no mask/);
  });

  it("a linked mask follows a move but not a scale", () => {
    const d = addLayerMask("a").apply(doc());
    const moved = setLayerTransform("a", { x: 7, y: 3, scaleX: 1, scaleY: 1, rotation: 0 }).apply(
      d,
    );
    expect(findLayerDeep(moved.layers, "a")?.mask).toMatchObject({ x: 7, y: 3 });
    const scaled = setLayerTransform("a", { x: 7, y: 3, scaleX: 2, scaleY: 1, rotation: 0 }).apply(
      d,
    );
    expect(findLayerDeep(scaled.layers, "a")?.mask).toMatchObject({ x: 0, y: 0 });
  });
});

describe("effects", () => {
  it("sets, validates and removes effects", () => {
    let d = setLayerEffect("a", "dropShadow", DEFAULT_EFFECTS.dropShadow).apply(doc());
    expect(findLayerDeep(d.layers, "a")?.effects?.dropShadow).toEqual(DEFAULT_EFFECTS.dropShadow);
    expect(setLayerEffect("a", "dropShadow", DEFAULT_EFFECTS.dropShadow).apply(d)).toBe(d);
    expect(() =>
      setLayerEffect("a", "stroke", { ...DEFAULT_EFFECTS.stroke, size: 9999 }).apply(d),
    ).toThrow(CommandError);
    expect(() =>
      setLayerEffect("a", "colorOverlay", { ...DEFAULT_EFFECTS.colorOverlay, color: "red" }).apply(
        d,
      ),
    ).toThrow(CommandError);
    d = setLayerEffect("a", "dropShadow", null).apply(d);
    expect(findLayerDeep(d.layers, "a")?.effects).toBeUndefined();
  });
});

describe("adjustment layers", () => {
  it("updates settings within range and keeps the type", () => {
    const base = doc();
    const adj = {
      ...createAdjustmentLayer(base, { type: "posterize", levels: 4 }, "Posterize"),
      id: "p",
    };
    const d = addLayer(adj).apply(base);
    expect(findLayerDeep(d.layers, "p")?.mask?.assetId).toBeNull();
    const next = setAdjustment("p", { type: "posterize", levels: 8 }).apply(d);
    expect(findLayerDeep(next.layers, "p")).toMatchObject({ adjustment: { levels: 8 } });
    expect(() => setAdjustment("p", { type: "posterize", levels: 1 }).apply(d)).toThrow(
      CommandError,
    );
    expect(() => setAdjustment("p", { type: "invert" }).apply(d)).toThrow(CommandError);
    expect(() =>
      setLayerTransform("p", { x: 1, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }).apply(d),
    ).toThrow(CommandError);
    expect(() => setLayerEffect("p", "stroke", DEFAULT_EFFECTS.stroke).apply(d)).toThrow(
      CommandError,
    );
  });

  it("fill layers still cannot be moved", () => {
    const d = addLayer({ ...createFillLayer("#000000", "f"), id: "f" }).apply(doc());
    expect(() => translateLayer("f", 1, 1).apply(d)).toThrow(CommandError);
  });
});
