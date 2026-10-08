import { describe, expect, it } from "vitest";
import { DEFAULT_TOOL_SETTINGS, stepBrushSize } from "../core/tool-settings";
import { StrokeInterpolator } from "./brush/stroke-interpolator";
import { shapeFromDrag } from "./shape/shape-tool";

describe("StrokeInterpolator", () => {
  it("places dabs at even spacing across segments", () => {
    const interp = new StrokeInterpolator(10);
    expect(interp.start({ x: 0, y: 0 })).toEqual([{ x: 0, y: 0 }]);
    expect(interp.moveTo({ x: 25, y: 0 })).toEqual([
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ]);
    // 5 px carried over: the next dab lands 5 px into the new segment.
    expect(interp.moveTo({ x: 25, y: 12 })).toEqual([{ x: 25, y: 5 }]);
    expect(interp.moveTo({ x: 25, y: 13 })).toEqual([]);
    expect(interp.moveTo({ x: 25, y: 15 })).toEqual([{ x: 25, y: 15 }]);
  });

  it("starts implicitly and rejects bad spacing", () => {
    expect(new StrokeInterpolator(1).moveTo({ x: 3, y: 3 })).toEqual([{ x: 3, y: 3 }]);
    expect(() => new StrokeInterpolator(0)).toThrow(RangeError);
  });
});

describe("shapeFromDrag", () => {
  const settings = DEFAULT_TOOL_SETTINGS.shape;
  const opts = { constrain: false, fromCenter: false };

  it("builds rectangles and ellipses from any drag direction", () => {
    const rect = shapeFromDrag(settings, { x: 50, y: 40 }, { x: 10, y: 20 }, opts)!;
    expect(rect).toMatchObject({
      shape: "rect",
      width: 40,
      height: 20,
      fill: settings.fill,
      stroke: null,
    });
    expect(rect.transform).toMatchObject({ x: 10, y: 20 });
    const ellipse = shapeFromDrag(
      { ...settings, kind: "ellipse" },
      { x: 0, y: 0 },
      { x: 30, y: 10 },
      { constrain: true, fromCenter: false },
    )!;
    expect(ellipse).toMatchObject({ width: 30, height: 30 });
  });

  it("draws from the centre with Alt", () => {
    const rect = shapeFromDrag(
      settings,
      { x: 50, y: 50 },
      { x: 60, y: 55 },
      { constrain: false, fromCenter: true },
    )!;
    expect(rect).toMatchObject({ width: 20, height: 10 });
    expect(rect.transform).toMatchObject({ x: 40, y: 45 });
  });

  it("encodes line direction with flips and always strokes lines", () => {
    const line = shapeFromDrag(
      { ...settings, kind: "line" },
      { x: 100, y: 10 },
      { x: 40, y: 50 },
      opts,
    )!;
    expect(line).toMatchObject({ shape: "line", width: 60, height: 40, fill: null });
    expect(line.stroke).not.toBeNull();
    expect(line.transform).toMatchObject({ x: 100, y: 10, scaleX: -1, scaleY: 1 });
  });

  it("ignores clicks and shapes with neither fill nor stroke", () => {
    expect(shapeFromDrag(settings, { x: 0, y: 0 }, { x: 1, y: 1 }, opts)).toBeNull();
    expect(
      shapeFromDrag(
        { ...settings, fillEnabled: false, strokeEnabled: false },
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        opts,
      ),
    ).toBeNull();
  });
});

describe("brush size steps", () => {
  it("grows faster at larger sizes and stays in range", () => {
    expect(stepBrushSize(5, 1)).toBe(6);
    expect(stepBrushSize(40, 1)).toBe(45);
    expect(stepBrushSize(1, -1)).toBe(1);
    expect(stepBrushSize(1000, 1)).toBe(1000);
  });
});
