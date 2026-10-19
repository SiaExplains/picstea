import { describe, expect, it } from "vitest";
import { LINEAR_CONTOUR, contourPreset } from "../../core/effects/model";
import {
  canvasStops,
  contourLut,
  gradientGeometry,
  hashNoise,
  isLinearContour,
  mixColor,
} from "./effect-paint";
import { shadowOffset, strokeOffsets } from "./effects";

describe("effect paint", () => {
  it("builds contour tables (linear at 50% range is the identity)", () => {
    const lut = contourLut(LINEAR_CONTOUR);
    expect([lut[0], lut[100], lut[255]]).toEqual([0, 100, 255]);
    const cone = contourLut(contourPreset("cone"));
    expect(cone[0]).toBe(0);
    expect(cone[128]).toBeGreaterThan(250);
    expect(cone[255]).toBe(0);
    // A narrower range reaches full strength sooner.
    expect(contourLut(LINEAR_CONTOUR, false, 0.25)[128]).toBe(255);
    const smooth = contourLut(contourPreset("sawtooth"), true);
    expect(smooth[85]).toBeLessThan(contourLut(contourPreset("sawtooth"))[85]);
    expect(isLinearContour(LINEAR_CONTOUR)).toBe(true);
    expect(isLinearContour(contourPreset("cone"))).toBe(false);
  });

  it("mixes colours with each interpolation method", () => {
    const black = [0, 0, 0] as const;
    const white = [255, 255, 255] as const;
    for (const method of ["classic", "perceptual", "linear"] as const) {
      expect(mixColor(black, white, 0, method)).toEqual([0, 0, 0]);
      expect(mixColor(black, white, 1, method)).toEqual([255, 255, 255]);
    }
    expect(mixColor(black, white, 0.5, "classic")[0]).toBe(128);
    // Linear light is brighter in the middle than gamma-encoded mixing.
    expect(mixColor(black, white, 0.5, "linear")[0]).toBeGreaterThan(180);
  });

  it("lays out stops: sorted, reversed, reflected and subdivided", () => {
    const stops = [
      { position: 1, color: "#ffffff" },
      { position: 0, color: "#000000" },
    ];
    expect(canvasStops(stops, false, "classic")).toEqual([
      { offset: 0, color: "rgb(0,0,0)" },
      { offset: 1, color: "rgb(255,255,255)" },
    ]);
    expect(canvasStops(stops, true, "classic")[0].color).toBe("rgb(255,255,255)");
    const reflected = canvasStops(stops, false, "classic", true);
    expect(reflected.map((s) => s.offset)).toEqual([0, 0.5, 0.5, 1]);
    expect(reflected[0].color).toBe("rgb(255,255,255)");
    expect(canvasStops(stops, false, "perceptual")).toHaveLength(9);
  });

  it("places gradients across the layer box", () => {
    const g = gradientGeometry({ x: 0, y: 0, width: 100, height: 50 }, 0, 1);
    expect(g).toMatchObject({ cx: 50, cy: 25, half: 50 });
    const offset = gradientGeometry({ x: 0, y: 0, width: 100, height: 50 }, 90, 0.5, 0.1, -0.2);
    expect(offset.cx).toBeCloseTo(60);
    expect(offset.cy).toBeCloseTo(15);
    expect(offset.half).toBeCloseTo(12.5);
  });

  it("makes repeatable noise and light offsets", () => {
    expect(hashNoise(42, 1)).toBe(hashNoise(42, 1));
    expect(hashNoise(42, 1)).not.toBe(hashNoise(43, 1));
    for (let i = 0; i < 1000; i++) {
      const v = hashNoise(i, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    const { dx, dy } = shadowOffset(120, 10);
    expect(dx).toBeCloseTo(5);
    expect(dy).toBeCloseTo(8.66, 1);
  });

  it("grows silhouettes with enough rings to stay solid", () => {
    expect(strokeOffsets(0)).toEqual([]);
    const small = strokeOffsets(2);
    expect(small.every((p) => Math.abs(Math.hypot(p.x, p.y) - 2) < 1e-9)).toBe(true);
    const radii = new Set(strokeOffsets(40).map((p) => Math.round(Math.hypot(p.x, p.y))));
    expect(radii.size).toBe(10);
    expect(Math.max(...radii)).toBe(40);
  });
});
