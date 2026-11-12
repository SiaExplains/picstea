import { describe, expect, it } from "vitest";
import { CUSTOM_SHAPE_IDS, customShapePath } from "./custom-shapes";
import { polygonPath } from "./shape-tool";

describe("custom shapes and stars (ADR-0044)", () => {
  it("every built-in shape parses into closed, finite paths inside its box", () => {
    const box = { x: 10, y: 20, width: 200, height: 100 };
    for (const id of CUSTOM_SHAPE_IDS) {
      const path = customShapePath(id, box);
      expect(path.subpaths.length, id).toBeGreaterThan(0);
      for (const sp of path.subpaths) {
        expect(sp.closed, id).toBe(true);
        expect(sp.anchors.length, id).toBeGreaterThanOrEqual(3);
        for (const a of sp.anchors) {
          expect(a.x, id).toBeGreaterThanOrEqual(10 - 1e-9);
          expect(a.x, id).toBeLessThanOrEqual(210 + 1e-9);
          expect(a.y, id).toBeGreaterThanOrEqual(20 - 1e-9);
          expect(a.y, id).toBeLessThanOrEqual(120 + 1e-9);
        }
      }
    }
  });

  it("curves keep their control points; a closing curve does not duplicate its start", () => {
    const heart = customShapePath("heart", { x: 0, y: 0, width: 100, height: 100 }).subpaths[0];
    expect(heart.anchors.some((a) => a.in.x !== a.x || a.out.x !== a.x)).toBe(true);
    const first = heart.anchors[0];
    const last = heart.anchors[heart.anchors.length - 1];
    expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeGreaterThan(1);
  });

  it("a polygon with an indent becomes a star with twice the corners", () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    expect(polygonPath(box, 5).subpaths[0].anchors).toHaveLength(5);
    const star = polygonPath(box, 5, 0.5).subpaths[0].anchors;
    expect(star).toHaveLength(10);
    // Inner corners sit halfway in.
    expect(Math.hypot(star[1].x - 50, star[1].y - 50)).toBeCloseTo(25, 6);
  });
});
