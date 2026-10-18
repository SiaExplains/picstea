import { describe, expect, it } from "vitest";
import {
  BlurTiles,
  blurRadiusFor,
  cloneEffect,
  focusEffect,
  spongeEffect,
  toneEffect,
} from "./effects";
import { HealStroke } from "./heal";
import { LazyTiles } from "./lazy-tiles";
import { SmudgeStroke } from "./smudge";
import {
  CoverageStroke,
  type PixelPrepare,
  type PixelRect,
  type PixelStroke,
  type StrokeOptions,
} from "./stroke";

const W = 300;
const H = 200;

/** A busy image so every effect has something to change. */
function picture(seed: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      data[i] = (x * 7 + y * 3 + seed) % 256;
      data[i + 1] = (x * 3 + y * 11 + seed * 5) % 256;
      data[i + 2] = ((x ^ y) * 5 + seed) % 256;
      data[i + 3] = x % 37 === 0 ? 0 : 200 + ((x + y) % 56);
    }
  }
  return data;
}

/** A lazily filled copy of `full`, with a log of what was read. */
function lazyCopy(full: Uint8ClampedArray, tile = 32) {
  const data = new Uint8ClampedArray(full.length);
  const reads: PixelRect[] = [];
  const tiles = new LazyTiles(
    W,
    H,
    (r) => {
      reads.push(r);
      for (let y = r.y0; y < r.y1; y++) {
        data.set(full.subarray((y * W + r.x0) * 4, (y * W + r.x1) * 4), (y * W + r.x0) * 4);
      }
    },
    tile,
  );
  return { data, prepare: tiles.prepare as PixelPrepare, reads, tiles };
}

const PATH = Array.from({ length: 40 }, (_, k) => ({
  x: 60 + k * 4.3,
  y: 70 + Math.sin(k / 4) * 30,
}));

/** Apply the stroke's reported areas onto `onto` (what the tool uploads). */
function runStroke(stroke: PixelStroke, onto: Uint8ClampedArray): Uint8ClampedArray {
  const result = new Uint8ClampedArray(onto);
  const apply = (r: PixelRect | null) => {
    if (!r) return;
    for (let y = r.y0; y < r.y1; y++) {
      result.set(stroke.out.subarray((y * W + r.x0) * 4, (y * W + r.x1) * 4), (y * W + r.x0) * 4);
    }
  };
  PATH.forEach((p, k) => {
    stroke.dab(p);
    if (k % 3 === 2) apply(stroke.flush());
  });
  apply(stroke.flush());
  apply(stroke.finish());
  return result;
}

const opts = (base: Uint8ClampedArray, prepare?: PixelPrepare): StrokeOptions => ({
  width: W,
  height: H,
  base,
  radius: 9,
  hardness: 0.5,
  strength: 0.8,
  selection: null,
  prepare,
});

type Make = (
  base: Uint8ClampedArray,
  prepare: PixelPrepare | undefined,
  source: { data: Uint8ClampedArray; inside: Uint8Array | null; prepare?: PixelPrepare },
) => PixelStroke;

const TOOLS: Record<string, Make> = {
  dodge: (b, p) => new CoverageStroke(opts(b, p), toneEffect(b, W, "dodge", "midtones")),
  burn: (b, p) => new CoverageStroke(opts(b, p), toneEffect(b, W, "burn", "shadows")),
  sponge: (b, p) => new CoverageStroke(opts(b, p), spongeEffect(b, W, "saturate")),
  blur: (b, p) =>
    new CoverageStroke(
      opts(b, p),
      focusEffect(b, W, new BlurTiles(b, W, H, blurRadiusFor(9), p), "blur"),
    ),
  sharpen: (b, p) =>
    new CoverageStroke(
      opts(b, p),
      focusEffect(b, W, new BlurTiles(b, W, H, blurRadiusFor(9), p), "sharpen"),
    ),
  smudge: (b, p) => new SmudgeStroke(opts(b, p)),
  clone: (b, p, s) =>
    new CoverageStroke(opts(b, p), cloneEffect(s.data, W, H, -45, 23, s.inside, s.prepare)),
  heal: (b, p, s) => new HealStroke(opts(b, p), s.data, -45, 23, s.inside, s.prepare),
};

describe("lazily read strokes", () => {
  const full = picture(1);
  const otherFull = picture(9);
  const insideFull = new Uint8Array(W * H).map((_, i) => (i % W < 250 ? 255 : 0));

  for (const [name, make] of Object.entries(TOOLS)) {
    it(`${name}: same pixels as reading the whole layer first`, () => {
      const eager = runStroke(make(full, undefined, { data: full, inside: null }), full);
      const lazy = lazyCopy(full);
      const result = runStroke(make(lazy.data, lazy.prepare, { ...lazy, inside: null }), full);
      expect(result).toEqual(eager);
      // Only part of the layer was read.
      expect(lazy.tiles.complete).toBe(false);
    });
  }

  for (const name of ["clone", "heal"]) {
    it(`${name} from all layers: same pixels with a lazily read source and canvas area`, () => {
      const make = TOOLS[name];
      const eagerSource = { data: otherFull, inside: insideFull };
      const eager = runStroke(make(full, undefined, eagerSource), full);

      const base = lazyCopy(full);
      const source = new Uint8ClampedArray(otherFull.length);
      const inside = new Uint8Array(insideFull.length);
      const tiles = new LazyTiles(W, H, (r) => {
        for (let y = r.y0; y < r.y1; y++) {
          source.set(
            otherFull.subarray((y * W + r.x0) * 4, (y * W + r.x1) * 4),
            (y * W + r.x0) * 4,
          );
          inside.set(insideFull.subarray(y * W + r.x0, y * W + r.x1), y * W + r.x0);
        }
      });
      const result = runStroke(
        make(base.data, base.prepare, { data: source, inside, prepare: tiles.prepare }),
        full,
      );
      expect(result).toEqual(eager);
    });
  }
});

describe("lazy tiles", () => {
  it("loads each tile once, in one read per request, clipped to the image", () => {
    const reads: PixelRect[] = [];
    const tiles = new LazyTiles(100, 50, (r) => reads.push(r), 32);
    expect(tiles.prepare({ x0: -10, y0: -10, x1: 40, y1: 10 })).toHaveLength(2);
    expect(reads).toEqual([{ x0: 0, y0: 0, x1: 64, y1: 32 }]);
    expect(tiles.prepare({ x0: 5, y0: 5, x1: 20, y1: 20 })).toEqual([]);
    expect(reads).toHaveLength(1);
    expect(tiles.prepare({ x0: 90, y0: 40, x1: 200, y1: 200 })).toEqual([
      { x0: 64, y0: 32, x1: 96, y1: 50 },
      { x0: 96, y0: 32, x1: 100, y1: 50 },
    ]);
    expect(reads.at(-1)).toEqual({ x0: 64, y0: 32, x1: 100, y1: 50 });
    expect(tiles.prepare({ x0: 0, y0: 0, x1: 0, y1: 10 })).toEqual([]);
    expect(tiles.complete).toBe(false);
    tiles.prepare({ x0: 0, y0: 0, x1: 100, y1: 50 });
    expect(tiles.complete).toBe(true);
  });
});
