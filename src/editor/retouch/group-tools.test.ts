import { describe, expect, it } from "vitest";
import { backgroundEraseEffect, colorReplaceEffect, redEyeEffect } from "./effects";
import { chooseSpotOffset } from "./spot";

/** A w×h image filled with one colour, with an optional differently coloured square. */
function image(
  w: number,
  h: number,
  fill: number[],
  square?: { x: number; y: number; s: number; c: number[] },
) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside =
        square &&
        x >= square.x &&
        x < square.x + square.s &&
        y >= square.y &&
        y < square.y + square.s;
      data.set(inside ? square!.c : fill, (y * w + x) * 4);
    }
  }
  return data;
}

const target = (effect: ReturnType<typeof redEyeEffect>, x: number, y: number) => {
  const t = new Float32Array(4);
  return effect.target(x, y, t) ? Array.from(t).map(Math.round) : null;
};

describe("Background Eraser", () => {
  it("clears colours within tolerance of the sample and leaves others", () => {
    const base = image(4, 1, [250, 250, 250, 255], { x: 2, y: 0, s: 1, c: [20, 60, 200, 255] });
    const effect = backgroundEraseEffect(base, 4, [255, 255, 255], 20);
    expect(target(effect, 0, 0)).toEqual([250, 250, 250, 0]);
    expect(target(effect, 2, 0)).toBeNull();
  });
});

describe("Color Replacement", () => {
  it("takes the new hue but keeps each pixel's lightness", () => {
    const base = image(2, 1, [200, 40, 40, 255], { x: 1, y: 0, s: 1, c: [100, 20, 20, 255] });
    const effect = colorReplaceEffect(base, 2, [200, 40, 40], 120, [0, 0, 255]);
    const light = target(effect, 0, 0)!;
    const dark = target(effect, 1, 0)!;
    expect(light[2]).toBeGreaterThan(light[0]);
    expect(dark[2]).toBeGreaterThan(dark[0]);
    // Lightness ordering is kept: the darker pixel stays darker.
    expect(dark[2]).toBeLessThan(light[2]);
  });
});

describe("Red Eye", () => {
  it("removes the red cast from red pupils and ignores skin tones", () => {
    const base = new Uint8ClampedArray([210, 40, 40, 255, 220, 170, 140, 255]);
    const effect = redEyeEffect(base, 2, 0.5);
    const fixed = target(effect, 0, 0)!;
    expect(fixed[0]).toBeLessThan(60);
    expect(Math.abs(fixed[0] - fixed[1])).toBeLessThan(20);
    expect(target(effect, 1, 0)).toBeNull();
  });
});

describe("Spot Healing source", () => {
  it("picks a nearby patch that matches the surroundings, inside the image", () => {
    // Grey image with a dark spot, and a bright red region to the right that must not be chosen.
    const w = 120;
    const h = 120;
    const data = image(w, h, [128, 128, 128, 255], { x: 55, y: 55, s: 10, c: [0, 0, 0, 255] });
    for (let y = 0; y < h; y++)
      for (let x = 85; x < w; x++) data.set([255, 0, 0, 255], (y * w + x) * 4);
    const { dx, dy } = chooseSpotOffset(data, w, h, { x: 60, y: 60 }, 8);
    expect(Math.hypot(dx, dy)).toBeGreaterThan(16);
    // The chosen patch is plain grey (not the spot, not the red area) and inside the image.
    const cx = 60 + dx;
    const cy = 60 + dy;
    for (const [x, y] of [
      [cx, cy],
      [cx - 7, cy],
      [cx + 7, cy],
      [cx, cy - 7],
      [cx, cy + 7],
    ]) {
      const i = (y * w + x) * 4;
      expect([data[i], data[i + 1], data[i + 2]]).toEqual([128, 128, 128]);
    }
  });
});
