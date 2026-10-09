import { describe, expect, it } from "vitest";
import type { RgbaPixels } from "../selection/flood";
import {
  addNoise,
  boxBlur,
  emboss,
  findEdges,
  gaussianBlur,
  motionBlur,
  pixelate,
  unsharpMask,
} from "./filters";
import { blendByCoverage, gaussBoxRadii, premultiply, unpremultiply } from "./kernels";
import { defaultFilterValues, FILTERS, parseFilterValues, runFilter } from "./registry";

/** w×h pixels from a per-pixel function. */
function image(w: number, h: number, fn: (x: number, y: number) => number[]): RgbaPixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(fn(x, y), (y * w + x) * 4);
  return { width: w, height: h, data };
}

const at = (p: RgbaPixels, x: number, y: number) => {
  const i = (y * p.width + x) * 4;
  return [...p.data.slice(i, i + 4)];
};

const sumRed = (p: RgbaPixels) => {
  let s = 0;
  for (let i = 0; i < p.data.length; i += 4) s += p.data[i];
  return s;
};

const dot = image(21, 21, (x, y) => (x === 10 && y === 10 ? [255, 255, 255, 255] : [0, 0, 0, 255]));
const halves = image(20, 10, (x) => (x < 10 ? [0, 0, 0, 255] : [255, 255, 255, 255]));

describe("kernels", () => {
  it("premultiply and unpremultiply round-trip opaque and transparent pixels", () => {
    const src = new Uint8ClampedArray([200, 100, 50, 255, 9, 9, 9, 0, 200, 100, 50, 128]);
    const back = unpremultiply(premultiply(src));
    expect([...back.slice(0, 4)]).toEqual([200, 100, 50, 255]);
    expect(back[7]).toBe(0);
    expect(Math.abs(back[8] - 200)).toBeLessThanOrEqual(2);
  });

  it("gaussian box radii grow with sigma", () => {
    expect(gaussBoxRadii(1).every((r) => r >= 0)).toBe(true);
    const small = gaussBoxRadii(2).reduce((a, b) => a + b);
    const large = gaussBoxRadii(20).reduce((a, b) => a + b);
    expect(large).toBeGreaterThan(small);
  });

  it("blends by coverage: 0 keeps, 255 replaces, 128 mixes", () => {
    const a = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
    const b = new Uint8ClampedArray([200, 200, 200, 255, 200, 200, 200, 255, 200, 200, 200, 255]);
    const out = blendByCoverage(a, b, new Uint8Array([0, 255, 128]));
    expect([out[0], out[4], out[8]]).toEqual([0, 200, 100]);
  });
});

describe("filters", () => {
  it("gaussian blur spreads a dot and roughly keeps its energy", () => {
    const out = gaussianBlur(dot, 2);
    expect(at(out, 10, 10)[0]).toBeLessThan(255);
    expect(at(out, 12, 10)[0]).toBeGreaterThan(0);
    expect(Math.abs(sumRed(out) - 255)).toBeLessThan(80);
    expect(at(out, 0, 0)[3]).toBe(255);
    // Input is untouched.
    expect(at(dot, 10, 10)[0]).toBe(255);
  });

  it("blur does not darken edges of transparent areas (premultiplied)", () => {
    const img = image(10, 1, (x) => (x < 5 ? [255, 0, 0, 255] : [0, 0, 0, 0]));
    const out = gaussianBlur(img, 2);
    const edge = at(out, 5, 0);
    expect(edge[3]).toBeGreaterThan(0);
    expect(edge[0]).toBeGreaterThan(240);
  });

  it("box blur averages neighbours", () => {
    const out = boxBlur(halves, 1);
    expect(at(out, 9, 5)[0]).toBe(85);
    expect(at(out, 0, 5)[0]).toBe(0);
  });

  it("motion blur at 0° smears horizontally only", () => {
    const out = motionBlur(dot, 0, 4);
    expect(at(out, 12, 10)[0]).toBeGreaterThan(0);
    expect(at(out, 10, 12)[0]).toBe(0);
  });

  it("unsharp mask increases contrast across an edge and respects the threshold", () => {
    const soft = gaussianBlur(halves, 2);
    const sharp = unsharpMask(soft, 200, 3, 0);
    expect(at(sharp, 8, 5)[0]).toBeLessThan(at(soft, 8, 5)[0]);
    expect(at(sharp, 11, 5)[0]).toBeGreaterThan(at(soft, 11, 5)[0]);
    const untouched = unsharpMask(soft, 200, 3, 255);
    expect([...untouched.data]).toEqual([...soft.data]);
  });

  it("noise is deterministic per seed and skips transparent pixels", () => {
    const grey = image(8, 8, (x) => (x === 0 ? [0, 0, 0, 0] : [128, 128, 128, 255]));
    const a = addNoise(grey, 20, false, false, 7);
    const b = addNoise(grey, 20, false, false, 7);
    const c = addNoise(grey, 20, false, false, 8);
    expect([...a.data]).toEqual([...b.data]);
    expect([...a.data]).not.toEqual([...c.data]);
    expect(at(a, 0, 0)).toEqual([0, 0, 0, 0]);
    const mono = addNoise(grey, 20, true, true, 3);
    const p = at(mono, 3, 3);
    expect(p[0]).toBe(p[1]);
    expect(p[1]).toBe(p[2]);
  });

  it("pixelate makes uniform cells", () => {
    const gradient = image(8, 4, (x) => [x * 30, 0, 0, 255]);
    const out = pixelate(gradient, 4);
    expect(at(out, 0, 0)).toEqual(at(out, 3, 3));
    expect(at(out, 4, 0)).toEqual(at(out, 7, 3));
    expect(at(out, 0, 0)[0]).toBe(45);
  });

  it("emboss is mid-grey on flat areas and relief on edges", () => {
    const out = emboss(halves, 0, 1, 100);
    expect(at(out, 2, 5)).toEqual([128, 128, 128, 255]);
    expect(at(out, 9, 5)[0]).toBeGreaterThan(128);
  });

  it("find edges draws dark lines on a white background", () => {
    const out = findEdges(halves);
    expect(at(out, 2, 5)[0]).toBe(255);
    expect(at(out, 9, 5)[0]).toBeLessThan(100);
    expect(at(out, 9, 5)[3]).toBe(255);
  });
});

describe("filter registry", () => {
  it("every filter runs on its defaults and keeps the size", () => {
    for (const filter of FILTERS) {
      const out = runFilter(filter.id, halves, defaultFilterValues(filter), { seed: 1 });
      expect(out.width).toBe(halves.width);
      expect(out.data.length).toBe(halves.data.length);
    }
  });

  it("rejects unknown filters, out-of-range and wrongly typed values", () => {
    const blur = FILTERS[0];
    expect(() => runFilter("nope", halves, {}, { seed: 1 })).toThrow();
    expect(parseFilterValues(blur, { radius: 1000 })).toBeNull();
    expect(parseFilterValues(blur, { radius: "4" })).toBeNull();
    expect(parseFilterValues(blur, null)).toBeNull();
    const noise = FILTERS.find((f) => f.id === "add-noise")!;
    expect(parseFilterValues(noise, { amount: 5, gaussian: 1, monochromatic: false })).toBeNull();
    expect(() =>
      runFilter(
        "gaussian-blur",
        { width: 5, height: 5, data: new Uint8ClampedArray(4) },
        { radius: 1 },
        { seed: 1 },
      ),
    ).toThrow();
  });
});
