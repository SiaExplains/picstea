import { describe, expect, it } from "vitest";
import type { Adjustment } from "../core/document/types";
import { applyAdjustment } from "./pixel-ops";
import { adjustmentDefinition, parseAdjustment } from "./registry";
import {
  addCurvePoint,
  curveLut,
  histogram,
  levelsLut,
  moveCurvePoint,
  NEUTRAL_CURVE,
  NEUTRAL_LEVELS,
  parseCurve,
  removeCurvePoint,
} from "./tone";

describe("levels", () => {
  it("neutral levels are the identity", () => {
    const lut = levelsLut(NEUTRAL_LEVELS);
    expect([...lut]).toEqual(Array.from({ length: 256 }, (_, i) => i));
  });

  it("input black/white stretch, output black/white compress, gamma bends", () => {
    const stretch = levelsLut({ ...NEUTRAL_LEVELS, inBlack: 50, inWhite: 200 });
    expect(stretch[50]).toBe(0);
    expect(stretch[200]).toBe(255);
    expect(stretch[125]).toBe(128);
    const out = levelsLut({ ...NEUTRAL_LEVELS, outBlack: 20, outWhite: 220 });
    expect(out[0]).toBe(20);
    expect(out[255]).toBe(220);
    const bright = levelsLut({ ...NEUTRAL_LEVELS, gamma: 2 });
    expect(bright[128]).toBeGreaterThan(128);
    expect(bright[0]).toBe(0);
    expect(bright[255]).toBe(255);
  });
});

describe("curves", () => {
  it("the neutral curve is the identity", () => {
    expect([...curveLut(NEUTRAL_CURVE)]).toEqual(Array.from({ length: 256 }, (_, i) => i));
  });

  it("passes through its points and stays monotone (no overshoot)", () => {
    const pts = [
      [0, 0],
      [64, 120],
      [128, 128],
      [255, 255],
    ] as const;
    const lut = curveLut(pts);
    expect(lut[64]).toBe(120);
    expect(lut[128]).toBe(128);
    for (let v = 1; v < 256; v++) expect(lut[v]).toBeGreaterThanOrEqual(lut[v - 1]);
    for (let v = 64; v <= 128; v++) expect(lut[v]).toBeLessThanOrEqual(128);
  });

  it("is flat beyond the end points", () => {
    const lut = curveLut([
      [30, 10],
      [200, 240],
    ]);
    expect(lut[0]).toBe(10);
    expect(lut[255]).toBe(240);
  });

  it("edits points: add, move between neighbours, remove (keeps two)", () => {
    let pts = addCurvePoint(NEUTRAL_CURVE, [100, 150]);
    expect(pts).toEqual([
      [0, 0],
      [100, 150],
      [255, 255],
    ]);
    pts = moveCurvePoint(pts, 1, [300, -5]);
    expect(pts[1]).toEqual([254, 0]);
    pts = removeCurvePoint(pts, 1);
    expect(pts).toHaveLength(2);
    expect(removeCurvePoint(pts, 0)).toHaveLength(2);
  });

  it("validates point arrays strictly", () => {
    expect(parseCurve([[0, 0]])).toBeNull();
    expect(
      parseCurve([
        [10, 0],
        [10, 5],
      ]),
    ).toBeNull();
    expect(
      parseCurve([
        [0, 0],
        [300, 5],
      ]),
    ).toBeNull();
    expect(parseCurve("[[0,0],[255,255]]")).toBeNull();
    expect(parseCurve(Array.from({ length: 17 }, (_, i) => [i, i]))).toBeNull();
    expect(parseCurve(NEUTRAL_CURVE)).toEqual(NEUTRAL_CURVE);
  });
});

describe("tone adjustments", () => {
  it("parse round-trips defaults and rejects malformed channels", () => {
    for (const type of ["levels", "curves"] as const) {
      const def = adjustmentDefinition(type).defaults;
      expect(parseAdjustment(JSON.parse(JSON.stringify(def)))).toEqual(def);
      expect(parseAdjustment({ ...def, red: undefined })).toBeNull();
    }
    expect(
      parseAdjustment({
        ...adjustmentDefinition("levels").defaults,
        rgb: { ...NEUTRAL_LEVELS, gamma: 20 },
      }),
    ).toBeNull();
  });

  it("applies RGB first, then the colour channel", () => {
    const curves: Adjustment = {
      type: "curves",
      rgb: [
        [0, 255],
        [255, 0],
      ],
      red: NEUTRAL_CURVE,
      green: NEUTRAL_CURVE,
      blue: [
        [0, 0],
        [255, 0],
      ],
    };
    const d = new Uint8ClampedArray([10, 20, 30, 255]);
    applyAdjustment(d, curves);
    expect([...d]).toEqual([245, 235, 0, 255]);
  });

  it("histogram counts luminance and skips transparent pixels", () => {
    const bins = histogram(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 255]));
    expect(bins[255]).toBe(1);
    expect(bins[0]).toBe(1);
    expect(histogram(new Uint8ClampedArray([200, 0, 0, 255]), "red")[200]).toBe(1);
  });
});
