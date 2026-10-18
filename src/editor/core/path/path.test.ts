import { describe, expect, it } from "vitest";
import { ellipseSelection, polygonsSelection, rectSelection } from "../../selection/shapes";
import type { SelectionMask } from "../../selection/mask";
import {
  corner,
  flattenPath,
  hitTestPath,
  MAX_ANCHORS,
  moveHandle,
  parsePath,
  pathBounds,
  pathToSvgD,
  removeAnchor,
  toggleSmooth,
  translatePath,
  type VectorPath,
} from "./path";
import { pathToSelection, selectionToPath, simplifyRing, traceSelection } from "./trace";

const triangle: VectorPath = {
  subpaths: [{ closed: true, anchors: [corner(10, 10), corner(50, 10), corner(30, 40)] }],
};

const curve: VectorPath = {
  subpaths: [
    {
      closed: false,
      anchors: [
        { x: 0, y: 0, in: { x: 0, y: 0 }, out: { x: 0, y: 50 } },
        { x: 100, y: 0, in: { x: 100, y: 50 }, out: { x: 100, y: 0 } },
      ],
    },
  ],
};

const count = (m: SelectionMask) => m.data.reduce((n, v) => n + v / 255, 0);

function iou(a: SelectionMask, b: SelectionMask): number {
  let inter = 0;
  let union = 0;
  for (let i = 0; i < a.data.length; i++) {
    const x = a.data[i] >= 128;
    const y = b.data[i] >= 128;
    if (x && y) inter++;
    if (x || y) union++;
  }
  return union === 0 ? 1 : inter / union;
}

describe("path maths", () => {
  it("writes SVG path data with lines for corners and curves for handles", () => {
    expect(pathToSvgD(triangle)).toBe("M10 10 L50 10 L30 40 L10 10 Z");
    expect(pathToSvgD(curve)).toBe("M0 0 C0 50 100 50 100 0");
  });

  it("flattens curves accurately and bounds them", () => {
    const [ring] = flattenPath(curve, 0.1);
    // The cubic peaks at y = 37.5 in the middle.
    const peak = Math.max(...ring.points.map((p) => p.y));
    expect(peak).toBeCloseTo(37.5, 0);
    expect(pathBounds(curve)).toMatchObject({ x: 0, y: 0, width: 100 });
    expect(pathBounds(curve)!.height).toBeCloseTo(37.5, 0);
    expect(pathBounds({ subpaths: [] })).toBeNull();
  });

  it("hit-tests anchors before handles before segments", () => {
    expect(hitTestPath(triangle, { x: 11, y: 11 }, 3)).toEqual({
      kind: "anchor",
      subpath: 0,
      anchor: 0,
    });
    expect(hitTestPath(curve, { x: 0, y: 49 }, 3)).toMatchObject({ kind: "handle", side: "out" });
    expect(hitTestPath(triangle, { x: 30, y: 11 }, 2)).toMatchObject({ kind: "segment" });
    expect(hitTestPath(triangle, { x: 30, y: 25 }, 2)).toBeNull();
  });

  it("moves handles symmetrically unless independent, toggles smooth, removes anchors", () => {
    const a = { x: 0, y: 0, in: { x: -10, y: 0 }, out: { x: 10, y: 0 } };
    expect(moveHandle(a, "out", { x: 0, y: 20 }, false).in).toMatchObject({ y: -10 });
    expect(moveHandle(a, "out", { x: 0, y: 20 }, true).in).toEqual({ x: -10, y: 0 });
    const smooth = toggleSmooth(triangle, 0, 2);
    expect(smooth.subpaths[0].anchors[2].in).not.toEqual({ x: 30, y: 40 });
    expect(toggleSmooth(smooth, 0, 2).subpaths[0].anchors[2]).toEqual(corner(30, 40));
    const two = removeAnchor(triangle, 0, 1);
    expect(two.subpaths[0]).toMatchObject({ closed: false });
    expect(removeAnchor(two, 0, 0).subpaths).toHaveLength(0);
    expect(translatePath(triangle, 5, 5).subpaths[0].anchors[0]).toEqual(corner(15, 15));
  });

  it("validates untrusted paths", () => {
    expect(parsePath(JSON.parse(JSON.stringify(curve)))).toEqual(curve);
    expect(parsePath({ subpaths: [{ closed: true, anchors: [{ x: 1, y: 1 }] }] })).toBeNull();
    expect(
      parsePath({
        subpaths: [
          { closed: true, anchors: [{ x: NaN, y: 1, in: { x: 0, y: 0 }, out: { x: 0, y: 0 } }] },
        ],
      }),
    ).toBeNull();
    expect(parsePath({ subpaths: "nope" })).toBeNull();
    const many = Array.from({ length: MAX_ANCHORS + 1 }, (_, i) => corner(i, 0));
    expect(parsePath({ subpaths: [{ closed: false, anchors: many }] })).toBeNull();
  });
});

describe("path ↔ selection", () => {
  it("rasterises rings even-odd, so an inner ring is a hole", () => {
    const outer = [
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ];
    const inner = [
      { x: 30, y: 30 },
      { x: 70, y: 30 },
      { x: 70, y: 70 },
      { x: 30, y: 70 },
    ];
    const m = polygonsSelection(100, 100, [outer, inner]);
    expect(m.data[20 * 100 + 20]).toBe(255);
    expect(m.data[50 * 100 + 50]).toBe(0);
    expect(count(m)).toBeCloseTo(80 * 80 - 40 * 40, -1);
  });

  it("turns a triangle path into the matching selection", () => {
    const m = pathToSelection(triangle, 60, 50);
    expect(m.bounds).toEqual({ x: 10, y: 10, width: 40, height: 30 });
    expect(count(m)).toBeCloseTo(600, -1);
  });

  it("traces a rectangle into one ring of four corners", () => {
    const rings = traceSelection(rectSelection(50, 40, { x: 5, y: 6, width: 20, height: 10 }));
    expect(rings).toHaveLength(1);
    expect(simplifyRing(rings[0], 0.5)).toHaveLength(4);
  });

  it("round-trips selection → path → selection (holes included)", () => {
    const ring = ellipseSelection(120, 100, { x: 10, y: 10, width: 100, height: 80 });
    const hole = rectSelection(120, 100, { x: 50, y: 40, width: 20, height: 20 });
    const data = ring.data.map((v, i) => (hole.data[i] ? 0 : v));
    const mask = { ...ring, data };
    const result = selectionToPath(mask, 1);
    if (!result.ok) throw new Error(result.reason);
    expect(result.path.subpaths.length).toBe(2);
    expect(iou(mask, pathToSelection(result.path, 120, 100))).toBeGreaterThan(0.98);
  });

  it("reports empty and overly complex selections", () => {
    const empty = rectSelection(10, 10, { x: 0, y: 0, width: 0, height: 0 });
    expect(selectionToPath(empty)).toEqual({ ok: false, reason: "empty" });
    // A checkerboard's boundary zigzags at every pixel; at 0.5 px nothing simplifies away.
    const data = new Uint8Array(200 * 200).map((_, i) =>
      ((i % 200) + Math.floor(i / 200)) % 2 ? 255 : 0,
    );
    const board = {
      width: 200,
      height: 200,
      data,
      bounds: { x: 0, y: 0, width: 200, height: 200 },
    };
    expect(selectionToPath(board, 0.5)).toEqual({ ok: false, reason: "too-complex" });
  });
});

describe("adding anchors (Add Anchor Point tool)", () => {
  it("finds the nearest segment position and splits it without changing the shape", async () => {
    const { distanceToSegment, insertAnchor, nearestOnPath, flattenPath } = await import("./path");
    const curve = {
      subpaths: [
        {
          closed: false,
          anchors: [
            { x: 0, y: 0, in: { x: 0, y: 0 }, out: { x: 30, y: -40 } },
            { x: 100, y: 0, in: { x: 70, y: -40 }, out: { x: 100, y: 0 } },
          ],
        },
      ],
    };
    const hit = nearestOnPath(curve, { x: 50, y: -28 })!;
    expect(hit.subpath).toBe(0);
    expect(hit.index).toBe(0);
    expect(hit.t).toBeCloseTo(0.5, 1);
    expect(hit.distance).toBeLessThan(3);
    const split = insertAnchor(curve, 0, 0, 0.5);
    expect(split.subpaths[0].anchors).toHaveLength(3);
    // Same outline: every flattened point of the split path lies on the original.
    const before = flattenPath(curve, 0.25)[0].points;
    for (const q of flattenPath(split, 0.25)[0].points) {
      const d = Math.min(...before.slice(1).map((b, i) => distanceToSegment(q, before[i], b)));
      expect(d).toBeLessThan(0.5);
    }
  });

  it("keeps straight segments straight and works on the closing segment", async () => {
    const { insertAnchor, isCorner } = await import("./path");
    const square = {
      subpaths: [
        {
          closed: true,
          anchors: [corner(0, 0), corner(10, 0), corner(10, 10), corner(0, 10)],
        },
      ],
    };
    const split = insertAnchor(square, 0, 3, 0.5);
    const anchors = split.subpaths[0].anchors;
    expect(anchors).toHaveLength(5);
    expect(anchors[4]).toMatchObject({ x: 0, y: 5 });
    expect(anchors.every(isCorner)).toBe(true);
  });
});
