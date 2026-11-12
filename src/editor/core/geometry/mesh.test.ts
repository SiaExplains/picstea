import { describe, expect, it } from "vitest";
import {
  boxMesh,
  boxQuad,
  drawMapped,
  isBoxMesh,
  mapBounds,
  perspectiveMap,
  triangleAffine,
  warpMap,
  type MeshContext,
} from "./mesh";
import { presetMesh, WARP_STYLES } from "./warp-presets";

const near = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
};

describe("non-affine maps (ADR-0044)", () => {
  it("a perspective map sends the box corners exactly onto the quad", () => {
    const quad = [10, 20, 210, 0, 230, 160, 0, 140];
    const map = perspectiveMap(quad)!;
    near(map(0, 0), { x: 10, y: 20 });
    near(map(1, 0), { x: 210, y: 0 });
    near(map(1, 1), { x: 230, y: 160 });
    near(map(0, 1), { x: 0, y: 140 });
    expect(perspectiveMap([0, 0, 0, 0, 0, 0, 0, 0])).toBeNull();
    expect(mapBounds(map)).toMatchObject({ x: 0, y: 0, width: 230, height: 160 });
  });

  it("the identity mesh maps the box onto itself", () => {
    const map = warpMap(boxMesh(300, 120));
    near(map(0, 0), { x: 0, y: 0 });
    near(map(0.5, 0.25), { x: 150, y: 30 });
    near(map(1, 1), { x: 300, y: 120 });
    expect(isBoxMesh(boxMesh(300, 120), 300, 120)).toBe(true);
    // A box quad as a perspective map is the identity too.
    near(perspectiveMap(boxQuad(300, 120))!(0.3, 0.7), { x: 90, y: 84 });
  });

  it("presets are the identity at bend 0 and symmetric where Photoshop's are", () => {
    for (const style of WARP_STYLES) {
      const flat = presetMesh(200, 100, { style, bend: 0, horizontal: 0, vertical: 0 });
      expect(isBoxMesh(flat, 200, 100), style).toBe(true);
    }
    const arc = warpMap(
      presetMesh(200, 100, { style: "arch", bend: 0.5, horizontal: 0, vertical: 0 }),
    );
    expect(arc(0.5, 0).y).toBeLessThan(0);
    expect(arc(0.25, 0).y).toBeCloseTo(arc(0.75, 0).y, 6);
    near(arc(0, 1), { x: 0, y: 100 });
  });

  it("finds the affine matrix between two triangles", () => {
    const m = triangleAffine(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      { x: 5, y: 5 },
      { x: 25, y: 5 },
      { x: 5, y: 35 },
    )!;
    expect(m).toEqual([2, 0, 0, 3, 5, 5]);
  });

  it("draws every cell as two clipped triangles", () => {
    const calls: string[] = [];
    const ctx: MeshContext = {
      save: () => calls.push("save"),
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => calls.push("clip"),
      transform: () => {},
      drawImage: () => calls.push("draw"),
    };
    drawMapped(ctx, {} as CanvasImageSource, 100, 50, warpMap(boxMesh(100, 50)), 4);
    expect(calls.filter((c) => c === "draw")).toHaveLength(32);
    expect(calls.filter((c) => c === "clip")).toHaveLength(32);
  });
});
