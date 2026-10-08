import { describe, expect, it } from "vitest";
import { ADJUSTMENTS, parseAdjustment } from "./registry";
import {
  applyAdjustment,
  blackWhite,
  brightnessContrast,
  exposure,
  hslToRgb,
  hueSaturation,
  invert,
  posterize,
  rgbToHsl,
  temperatureTint,
  threshold,
} from "./pixel-ops";

const px = (...rgba: number[]) => new Uint8ClampedArray(rgba);

describe("pixel operations", () => {
  it("inverts colour and leaves alpha and transparent pixels alone", () => {
    const d = px(10, 20, 30, 128, 1, 2, 3, 0);
    invert(d);
    expect([...d]).toEqual([245, 235, 225, 128, 1, 2, 3, 0]);
  });

  it("brightness/contrast: neutral is identity, brightness lifts, contrast spreads", () => {
    const d = px(0, 128, 255, 255);
    brightnessContrast(d, 0, 0);
    expect([...d]).toEqual([0, 128, 255, 255]);
    const b = px(100, 100, 100, 255);
    brightnessContrast(b, 100, 0);
    expect(b[0]).toBe(228);
    const c = px(100, 156, 128, 255);
    brightnessContrast(c, 0, 50);
    expect(c[0]).toBeLessThan(100);
    expect(c[1]).toBeGreaterThan(156);
    expect(c[2]).toBe(128);
  });

  it("exposure doubles per stop; gamma bends midtones", () => {
    const d = px(50, 100, 200, 255);
    exposure(d, 1, 1);
    expect([...d.slice(0, 3)]).toEqual([100, 200, 255]);
    const g = px(64, 64, 64, 255);
    exposure(g, 0, 2);
    expect(g[0]).toBe(128);
  });

  it("temperature warms (red up, blue down) and tint shifts green", () => {
    const d = px(100, 100, 100, 255);
    temperatureTint(d, 100, 100);
    expect([...d.slice(0, 3)]).toEqual([140, 60, 60]);
  });

  it("black & white uses perceptual weights", () => {
    const d = px(255, 0, 0, 255);
    blackWhite(d);
    expect([...d.slice(0, 3)]).toEqual([76, 76, 76]);
  });

  it("posterize snaps to evenly spaced levels; threshold splits on luminance", () => {
    const p = px(0, 100, 200, 255);
    posterize(p, 2);
    expect([...p.slice(0, 3)]).toEqual([0, 0, 255]);
    const t = px(200, 200, 200, 255, 10, 10, 10, 255);
    threshold(t, 128);
    expect([...t]).toEqual([255, 255, 255, 255, 0, 0, 0, 255]);
  });

  it("HSL round-trips and hue rotation turns red into green", () => {
    const [h, s, l] = rgbToHsl(51, 102, 153);
    const [r, g, b] = hslToRgb(h, s, l);
    expect([Math.round(r), Math.round(g), Math.round(b)]).toEqual([51, 102, 153]);
    const d = px(255, 0, 0, 255);
    hueSaturation(d, 120, 0, 0);
    expect([...d.slice(0, 3)]).toEqual([0, 255, 0]);
    const grey = px(255, 0, 0, 255);
    hueSaturation(grey, 0, -100, 0);
    expect(grey[0]).toBe(grey[1]);
    const light = px(0, 0, 0, 255);
    hueSaturation(light, 0, 0, 100);
    expect([...light.slice(0, 3)]).toEqual([255, 255, 255]);
  });

  it("dispatches every registered adjustment", () => {
    for (const def of ADJUSTMENTS) {
      const d = px(10, 120, 240, 255);
      expect(() => applyAdjustment(d, def.defaults)).not.toThrow();
    }
  });
});

describe("parseAdjustment", () => {
  it("accepts defaults and rejects unknown types or out-of-range values", () => {
    for (const def of ADJUSTMENTS) expect(parseAdjustment(def.defaults)).toEqual(def.defaults);
    expect(parseAdjustment({ type: "curves" })).toBeNull();
    expect(parseAdjustment({ type: "posterize", levels: 300 })).toBeNull();
    expect(parseAdjustment({ type: "exposure", exposure: Number.NaN, gamma: 1 })).toBeNull();
    expect(parseAdjustment({ type: "invert", __proto__: { evil: true } })).toEqual({
      type: "invert",
    });
  });
});
