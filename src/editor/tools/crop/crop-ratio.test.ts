import { describe, expect, it } from "vitest";
import { canvasTransform, straightenedCrop } from "../../core/geometry/canvas-transform";
import { applyMatrix } from "../../core/geometry/matrix";
import { perspectiveCropSize } from "../../pixels/perspective-crop";
import {
  centredRatioBox,
  constrainResize,
  cropRatio,
  ratioFromPoints,
  straightenAngle,
} from "./crop-ratio";

const settings = { ratio: "16:9", ratioW: 1, ratioH: 1, deletePixels: false } as const;

describe("crop presets (ADR-0044)", () => {
  it("reads ratios from the presets", () => {
    expect(cropRatio(settings, 800, 600)).toBeCloseTo(16 / 9);
    expect(cropRatio({ ...settings, ratio: "original" }, 800, 600)).toBeCloseTo(4 / 3);
    expect(cropRatio({ ...settings, ratio: "free" }, 800, 600)).toBeNull();
    expect(cropRatio({ ...settings, ratio: "custom", ratioW: 5, ratioH: 2 }, 1, 1)).toBe(2.5);
  });

  it("keeps the ratio while drawing and resizing", () => {
    expect(ratioFromPoints({ x: 100, y: 100 }, { x: 0, y: 150 }, 1)).toEqual({
      x: 0,
      y: 100,
      width: 100,
      height: 100,
    });
    const start = { x: 0, y: 0, width: 160, height: 90 };
    const r = constrainResize(start, { x: 0, y: 0, width: 320, height: 100 }, "se", 16 / 9);
    expect(r.width / r.height).toBeCloseTo(16 / 9);
    expect([r.x, r.y]).toEqual([0, 0]);
    const n = constrainResize(start, { x: 0, y: -90, width: 160, height: 180 }, "n", 16 / 9);
    expect(n.width).toBeCloseTo(320);
    expect(n.x).toBeCloseTo(-80);
    expect(centredRatioBox(800, 600, 1)).toEqual({ x: 100, y: 0, width: 600, height: 600 });
  });

  it("straightens to the nearest axis", () => {
    expect(straightenAngle({ x: 0, y: 0 }, { x: 100, y: 10 })).toBeCloseTo(-5.71, 1);
    expect(straightenAngle({ x: 0, y: 0 }, { x: 5, y: 100 })).toBeCloseTo(2.86, 1);
    expect(straightenAngle({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it("rotates the canvas by any angle around its centre and crops inside it", () => {
    const { matrix, width, height } = canvasTransform({ kind: "angle", degrees: 90 }, 400, 200);
    expect([width, height]).toEqual([200, 400]);
    const c = applyMatrix(matrix, { x: 200, y: 100 });
    expect(c.x).toBeCloseTo(100);
    expect(c.y).toBeCloseTo(200);
    const crop = straightenedCrop(400, 200, 0, 400, 200);
    expect(crop).toEqual({ x: 0, y: 0, width: 400, height: 200 });
    const tilted = straightenedCrop(400, 200, 10, 432, 267);
    expect(tilted.width / tilted.height).toBeCloseTo(2, 1);
    expect(tilted.width).toBeLessThan(400);
  });

  it("sizes a perspective crop from the average edges", () => {
    expect(perspectiveCropSize([0, 0, 200, 20, 210, 120, -10, 100])).toEqual({
      width: 211,
      height: 100,
    });
  });
});
