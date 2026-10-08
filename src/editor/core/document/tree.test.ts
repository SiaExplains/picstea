import { describe, expect, it } from "vitest";
import { createGroup } from "../commands/group-commands";
import { createDocument, createFillLayer } from "./factory";
import {
  ancestorIds,
  countLayers,
  findLayerDeep,
  flattenTopFirst,
  insertLayerAt,
  isDescendant,
  locateLayer,
  mapLayers,
  maxDepth,
  removeLayerDeep,
  replaceLayerDeep,
} from "./tree";
import type { EditorDocument, Layer } from "./types";

const leaf = (id: string): Layer => ({ ...createFillLayer("#000000", id), id });
const group = (id: string, children: Layer[], expanded = true): Layer => ({
  ...createGroup(id, children),
  id,
  expanded,
});

/** root: [a, G1[b, G2[c]], d] (bottom → top) */
function tree(): readonly Layer[] {
  return [leaf("a"), group("G1", [leaf("b"), group("G2", [leaf("c")])]), leaf("d")];
}

describe("layer tree helpers", () => {
  it("finds and locates nested layers", () => {
    const layers = tree();
    expect(findLayerDeep(layers, "c")?.id).toBe("c");
    expect(locateLayer(layers, "c")).toMatchObject({ parentId: "G2", index: 0, depth: 2 });
    expect(locateLayer(layers, "d")).toMatchObject({ parentId: null, index: 2, depth: 0 });
    expect(locateLayer(layers, "nope")).toBeUndefined();
    expect(ancestorIds(layers, "c")).toEqual(["G2", "G1"]);
  });

  it("replaces, removes and inserts deep without touching other branches", () => {
    const layers = tree();
    const replaced = replaceLayerDeep(layers, { ...leaf("c"), name: "changed" });
    expect(findLayerDeep(replaced, "c")?.name).toBe("changed");
    expect(replaced[0]).toBe(layers[0]);
    expect(replaced[2]).toBe(layers[2]);

    const removed = removeLayerDeep(layers, "b");
    expect(findLayerDeep(removed, "b")).toBeUndefined();
    expect(countLayers(removed)).toBe(5);

    const inserted = insertLayerAt(layers, "G2", 1, leaf("e"));
    expect(locateLayer(inserted, "e")).toMatchObject({ parentId: "G2", index: 1 });
    expect(insertLayerAt(layers, "missing", 0, leaf("e"))).toBe(layers);
  });

  it("knows descendants and depth", () => {
    const layers = tree();
    expect(isDescendant(layers, "G1", "c")).toBe(true);
    expect(isDescendant(layers, "G2", "b")).toBe(false);
    expect(maxDepth(layers)).toBe(2);
    expect(countLayers(layers)).toBe(6);
  });

  it("flattens top-first with depth, respecting collapsed groups and hidden ancestors", () => {
    const layers = [leaf("a"), { ...group("G", [leaf("b")]), visible: false }];
    expect(flattenTopFirst(layers).map((r) => [r.layer.id, r.depth, r.effectivelyVisible])).toEqual(
      [
        ["G", 0, false],
        ["b", 1, false],
        ["a", 0, true],
      ],
    );
    const collapsed = [leaf("a"), group("G", [leaf("b")], false)];
    expect(flattenTopFirst(collapsed).map((r) => r.layer.id)).toEqual(["G", "a"]);
    expect(flattenTopFirst(collapsed, { includeCollapsed: true }).map((r) => r.layer.id)).toEqual([
      "G",
      "b",
      "a",
    ]);
  });

  it("maps every layer bottom-up", () => {
    const renamed = mapLayers(tree(), (l) => ({ ...l, name: `${l.id}!` }));
    expect(findLayerDeep(renamed, "c")?.name).toBe("c!");
    expect(findLayerDeep(renamed, "G1")?.name).toBe("G1!");
  });
});

export function nestedDoc(): EditorDocument {
  return {
    ...createDocument({ name: "x", width: 100, height: 100, background: { kind: "transparent" } }),
    layers: tree(),
  };
}
