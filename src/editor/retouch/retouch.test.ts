import { describe, expect, it } from "vitest";
import {
  BlurTiles,
  blurRadiusFor,
  cloneEffect,
  focusEffect,
  rangeWeight,
  spongeEffect,
  toneEffect,
} from "./effects";
import { HealStroke, pushPullFill } from "./heal";
import { SmudgeStroke } from "./smudge";
import { CoverageStroke, tipAlpha, type StrokeOptions } from "./stroke";

const W = 40;
const H = 30;

function image(fill: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) data.set(fill(x, y), (y * W + x) * 4);
  }
  return data;
}

const px = (data: Uint8ClampedArray, x: number, y: number) => [
  ...data.subarray((y * W + x) * 4, (y * W + x) * 4 + 4),
];

const options = (base: Uint8ClampedArray, extra: Partial<StrokeOptions> = {}): StrokeOptions => ({
  width: W,
  height: H,
  base,
  radius: 6,
  hardness: 1,
  strength: 1,
  selection: null,
  ...extra,
});

const grey =
  (v: number, a = 255) =>
  () =>
    [v, v, v, a] as [number, number, number, number];

describe("tip", () => {
  it("is solid inside, soft at the edge, zero outside", () => {
    expect(tipAlpha(0, 10, 0.5)).toBe(1);
    expect(tipAlpha(5, 10, 0.5)).toBe(1);
    const mid = tipAlpha(7.5, 10, 0.5);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
    expect(tipAlpha(10, 10, 0.5)).toBe(0);
    expect(tipAlpha(9.5, 10, 1)).toBe(1);
    expect(tipAlpha(11, 10, 1)).toBe(0);
  });
});

describe("coverage strokes", () => {
  it("never build past the strength within one stroke", () => {
    const base = image(grey(128));
    const stroke = new CoverageStroke(
      options(base, { strength: 0.5 }),
      toneEffect(base, W, "dodge", "midtones"),
    );
    for (let i = 0; i < 20; i++) stroke.dab({ x: 20, y: 15 });
    stroke.flush();
    const once = new CoverageStroke(
      options(base, { strength: 0.5 }),
      toneEffect(base, W, "dodge", "midtones"),
    );
    once.dab({ x: 20, y: 15 });
    once.flush();
    expect(px(stroke.out, 20, 15)).toEqual(px(once.out, 20, 15));
    expect(px(stroke.out, 20, 15)[0]).toBeGreaterThan(128);
    // Outside the tip nothing changes.
    expect(px(stroke.out, 2, 2)).toEqual([128, 128, 128, 255]);
  });

  it("respects the selection", () => {
    const base = image(grey(128));
    const selection = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < 20; x++) selection[y * W + x] = 255;
    const stroke = new CoverageStroke(
      options(base, { selection }),
      toneEffect(base, W, "burn", "midtones"),
    );
    stroke.dab({ x: 20, y: 15 });
    stroke.flush();
    expect(px(stroke.out, 18, 15)[0]).toBeLessThan(128);
    expect(px(stroke.out, 22, 15)).toEqual([128, 128, 128, 255]);
  });
});

describe("dodge, burn and sponge", () => {
  it("work on the chosen range and keep alpha", () => {
    expect(rangeWeight("shadows", 0.1)).toBeGreaterThan(rangeWeight("highlights", 0.1));
    expect(rangeWeight("midtones", 0.5)).toBe(1);
    const base = image((x) => (x < 20 ? [40, 40, 40, 200] : [220, 220, 220, 200]));
    const t = new Float32Array(4);
    const shadows = toneEffect(base, W, "dodge", "shadows");
    shadows.target(5, 5, t);
    const darkGain = t[0] - 40;
    shadows.target(30, 5, t);
    const lightGain = t[0] - 220;
    expect(darkGain).toBeGreaterThan(lightGain);
    expect(t[3]).toBe(200);
    toneEffect(base, W, "burn", "highlights").target(30, 5, t);
    expect(t[0]).toBeLessThan(220);
  });

  it("sponge saturates and desaturates", () => {
    const base = image(() => [200, 100, 100, 255]);
    const t = new Float32Array(4);
    spongeEffect(base, W, "desaturate").target(1, 1, t);
    expect(t[0]).toBeCloseTo(t[1]);
    spongeEffect(base, W, "saturate").target(1, 1, t);
    expect(t[0] - t[1]).toBeGreaterThan(100);
  });
});

describe("blur and sharpen", () => {
  const edge = image((x) => (x < 20 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
  const contrast = (data: Uint8ClampedArray) => px(data, 21, 15)[0] - px(data, 18, 15)[0];

  it("blur lowers edge contrast; sharpen raises it", () => {
    const tiles = new BlurTiles(edge, W, H, blurRadiusFor(6));
    const blur = new CoverageStroke(options(edge), focusEffect(edge, W, tiles, "blur"));
    blur.dab({ x: 20, y: 15 });
    blur.flush();
    expect(contrast(blur.out)).toBeLessThan(contrast(edge));

    const soft = image((x) => {
      const v = Math.round((x / (W - 1)) * 255);
      return [v, v, v, 255];
    });
    const sharpen = new CoverageStroke(
      options(soft),
      focusEffect(soft, W, new BlurTiles(soft, W, H, 2), "sharpen"),
    );
    // A linear ramp stays a ramp; sharpening it changes nothing in the middle.
    sharpen.dab({ x: 20, y: 15 });
    sharpen.flush();
    expect(Math.abs(px(sharpen.out, 20, 15)[0] - px(soft, 20, 15)[0])).toBeLessThanOrEqual(1);
    const blurred = new Uint8ClampedArray(blur.out);
    const resharpen = new CoverageStroke(
      options(blurred),
      focusEffect(blurred, W, new BlurTiles(blurred, W, H, 2), "sharpen"),
    );
    resharpen.dab({ x: 20, y: 15 });
    resharpen.flush();
    expect(contrast(resharpen.out)).toBeGreaterThan(contrast(blurred));
  });

  it("tiles match across tile borders", () => {
    const wide = 150;
    const data = new Uint8ClampedArray(wide * 4 * 4);
    for (let i = 0; i < wide * 4; i++) data.set([(i * 7) % 256, 0, 0, 255], i * 4);
    const tiles = new BlurTiles(data, wide, 4, 2);
    const a = new Float32Array(4);
    const b = new Float32Array(4);
    tiles.sample(63, 1, a);
    tiles.sample(64, 1, b);
    expect(Math.abs(a[0] - b[0])).toBeLessThan(40);
  });
});

describe("clone", () => {
  it("copies the source at the offset and skips outside the image", () => {
    const source = image((x, y) => [x * 6, y * 8, 0, 255]);
    const base = image(grey(255));
    const stroke = new CoverageStroke(options(base), cloneEffect(source, W, H, 10, 5));
    stroke.dab({ x: 10.5, y: 10.5 });
    stroke.flush();
    expect(px(stroke.out, 10, 10)).toEqual([120, 120, 0, 255]);
    const edge = new CoverageStroke(options(base), cloneEffect(source, W, H, 30, 0));
    edge.dab({ x: 20, y: 15 });
    edge.flush();
    expect(px(edge.out, 20, 15)).toEqual([255, 255, 255, 255]);
  });

  it("skips sources off the canvas", () => {
    const source = image(() => [0, 0, 0, 0]);
    const base = image(grey(255));
    const inside = new Uint8Array(W * H).fill(255);
    for (let y = 0; y < H; y++) for (let x = 30; x < W; x++) inside[y * W + x] = 0;
    const stroke = new CoverageStroke(options(base), cloneEffect(source, W, H, 10, 0, inside));
    stroke.dab({ x: 20, y: 15 });
    stroke.flush();
    // Off the canvas: unchanged instead of erased; on the canvas: cloned (transparent).
    expect(px(stroke.out, 24, 15)).toEqual([255, 255, 255, 255]);
    expect(px(stroke.out, 16, 15)[3]).toBe(0);
  });
});

describe("healing", () => {
  it("push–pull keeps known values and fills smoothly", () => {
    const w = 16;
    const h = 16;
    const values = new Float32Array(w * h);
    const known = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x > 3 && x < 12 && y > 3 && y < 12) continue;
        values[y * w + x] = x * 10;
        known[y * w + x] = 1;
      }
    }
    pushPullFill(values, known, w, h, 1);
    expect(values[0 * w + 2]).toBe(20);
    // The hole is filled between its left and right edges, increasing left to right.
    const row = [...values.subarray(8 * w + 4, 8 * w + 12)];
    expect(row[0]).toBeGreaterThan(20);
    expect(row[7]).toBeLessThan(130);
    for (let i = 1; i < row.length; i++) expect(row[i]).toBeGreaterThanOrEqual(row[i - 1] - 1);
  });

  it("matches the destination's tone and keeps the source's texture", () => {
    // A light-to-darker gradient with a dark blemish; the source area has fine texture.
    const base = image((x, y) => {
      const v = 200 - x * 2;
      if (Math.hypot(x - 25, y - 15) < 3) return [40, 40, 40, 255];
      return [v, v, v, 255];
    });
    const textured = image((x, y) => {
      const v = 200 - x * 2 + ((x + y) % 2 ? 6 : -6);
      return [v, v, v, 255];
    });
    const heal = new HealStroke(options(base, { radius: 5, hardness: 0.6 }), textured, -12, 0);
    heal.dab({ x: 25.5, y: 15.5 });
    heal.flush();
    heal.finish();
    const healed = px(heal.out, 25, 15)[0];
    const expected = 200 - 25 * 2;
    expect(Math.abs(healed - expected)).toBeLessThan(15);
    // Texture survives: neighbours differ like the source's checkerboard.
    expect(Math.abs(px(heal.out, 25, 15)[0] - px(heal.out, 26, 15)[0])).toBeGreaterThan(4);
    // Far away, nothing changed.
    expect(px(heal.out, 2, 2)).toEqual(px(base, 2, 2));
  });
});

describe("smudge", () => {
  it("drags colour along the stroke", () => {
    const base = image((x) => (x < 10 ? [255, 0, 0, 255] : [255, 255, 255, 255]));
    const stroke = new SmudgeStroke(options(base, { radius: 4, strength: 0.8 }));
    for (let x = 6; x <= 20; x++) stroke.dab({ x, y: 15 });
    const rect = stroke.flush();
    expect(rect).not.toBeNull();
    const moved = px(stroke.out, 14, 15);
    expect(moved[1]).toBeLessThan(200);
    expect(moved[0]).toBe(255);
    // Untouched rows keep their colours.
    expect(px(stroke.out, 14, 2)).toEqual([255, 255, 255, 255]);
  });
});
