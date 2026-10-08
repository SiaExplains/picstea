import { describe, expect, it } from "vitest";
import { colorRange, floodRegion, type RgbaPixels } from "./flood";
import { coverageAt, createSelection, selectAll, type SelectionMask } from "./mask";
import { contractSelection, expandSelection, featherSelection, transformSelection } from "./modify";
import { combineSelections, invertSelection, modeFromModifiers, translateSelection } from "./ops";
import { selectionOutline } from "./outline";
import { ellipseSelection, polygonSelection, rectSelection } from "./shapes";

const W = 20;
const H = 10;
const sum = (m: SelectionMask) => m.data.reduce((a, v) => a + v, 0);

describe("shape rasterisation", () => {
  it("fills whole pixels exactly and anti-aliases fractional edges", () => {
    const m = rectSelection(W, H, { x: 2, y: 3, width: 4, height: 2 });
    expect(m.bounds).toEqual({ x: 2, y: 3, width: 4, height: 2 });
    expect(sum(m)).toBe(8 * 255);
    const half = rectSelection(W, H, { x: 2.5, y: 0, width: 1, height: 1 });
    expect([coverageAt(half, 2, 0), coverageAt(half, 3, 0)]).toEqual([128, 128]);
  });

  it("clips to the canvas and rasterises polygons and ellipses", () => {
    const clipped = rectSelection(W, H, { x: -5, y: -5, width: 8, height: 8 });
    expect(clipped.bounds).toEqual({ x: 0, y: 0, width: 3, height: 3 });
    const tri = polygonSelection(W, H, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ]);
    expect(sum(tri) / 255).toBeCloseTo(50, 0);
    const disc = ellipseSelection(100, 100, { x: 0, y: 0, width: 100, height: 100 });
    expect(sum(disc) / 255).toBeCloseTo(Math.PI * 2500, -1);
    expect(coverageAt(disc, 50, 50)).toBe(255);
    expect(coverageAt(disc, 1, 1)).toBe(0);
  });

  it("without anti-aliasing selects whole pixels by their centres", () => {
    const m = polygonSelection(
      W,
      H,
      [
        { x: 0.6, y: 0 },
        { x: 3.4, y: 0 },
        { x: 3.4, y: 1 },
        { x: 0.6, y: 1 },
      ],
      false,
    );
    expect(Array.from(m.data.slice(0, 5))).toEqual([0, 255, 255, 0, 0]);
  });
});

describe("combining and inverting", () => {
  const a = rectSelection(W, H, { x: 0, y: 0, width: 10, height: 10 });
  const b = rectSelection(W, H, { x: 5, y: 0, width: 10, height: 10 });

  it("adds, subtracts and intersects", () => {
    expect(combineSelections(a, b, "add")!.bounds).toEqual({ x: 0, y: 0, width: 15, height: 10 });
    expect(combineSelections(a, b, "subtract")!.bounds).toEqual({
      x: 0,
      y: 0,
      width: 5,
      height: 10,
    });
    expect(combineSelections(a, b, "intersect")!.bounds).toEqual({
      x: 5,
      y: 0,
      width: 5,
      height: 10,
    });
    expect(combineSelections(a, b, "replace")).toBe(b);
    expect(combineSelections(null, b, "subtract")).toBeNull();
    const disjoint = rectSelection(W, H, { x: 15, y: 0, width: 2, height: 2 });
    expect(combineSelections(a, disjoint, "intersect")).toBeNull();
  });

  it("maps modifier keys to modes", () => {
    expect(modeFromModifiers("replace", true, false)).toBe("add");
    expect(modeFromModifiers("replace", false, true)).toBe("subtract");
    expect(modeFromModifiers("add", true, true)).toBe("intersect");
    expect(modeFromModifiers("intersect", false, false)).toBe("intersect");
  });

  it("inverts, and inverting nothing selects everything", () => {
    expect(invertSelection(a, W, H)!.bounds).toEqual({ x: 10, y: 0, width: 10, height: 10 });
    expect(invertSelection(null, W, H)!.bounds).toEqual({ x: 0, y: 0, width: W, height: H });
    expect(invertSelection(selectAll(W, H), W, H)).toBeNull();
  });

  it("translates by whole pixels and drops what leaves the canvas", () => {
    const moved = translateSelection(a, 15, 2)!;
    expect(moved.bounds).toEqual({ x: 15, y: 2, width: 5, height: 8 });
    expect(translateSelection(a, 0, 0)).toBe(a);
    expect(translateSelection(a, 100, 0)).toBeNull();
  });
});

describe("modify", () => {
  const square = rectSelection(40, 40, { x: 10, y: 10, width: 20, height: 20 });

  it("expands and contracts by the radius", () => {
    expect(expandSelection(square, 3)!.bounds).toEqual({ x: 7, y: 7, width: 26, height: 26 });
    expect(contractSelection(square, 3)!.bounds).toEqual({ x: 13, y: 13, width: 14, height: 14 });
    expect(contractSelection(square, 10)).toBeNull();
    // The canvas edge is not an edge of "select all".
    expect(contractSelection(selectAll(10, 10), 2)!.bounds).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
  });

  it("feathers into a soft edge while keeping the interior and total roughly unchanged", () => {
    const soft = featherSelection(square, 6)!;
    expect(coverageAt(soft, 20, 20)).toBe(255);
    const edge = coverageAt(soft, 10, 20);
    expect(edge).toBeGreaterThan(90);
    expect(edge).toBeLessThan(165);
    expect(coverageAt(soft, 7, 20)).toBeGreaterThan(0);
    expect(sum(soft) / sum(square)).toBeCloseTo(1, 1);
    expect(soft.bounds!.width).toBeGreaterThan(20);
  });

  it("transforms through a matrix", () => {
    const scaled = transformSelection(square, [2, 0, 0, 2, -20, -20])!;
    expect(scaled.bounds).toEqual({ x: 0, y: 0, width: 40, height: 40 });
    const shifted = transformSelection(square, [1, 0, 0, 1, 5, 0])!;
    expect(shifted.bounds).toEqual({ x: 15, y: 10, width: 20, height: 20 });
    expect(transformSelection(square, [0, 0, 0, 0, 0, 0])).toBeNull();
  });
});

function pixels(width: number, height: number, paint: (x: number, y: number) => number[]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * 4);
  }
  return { width, height, data } satisfies RgbaPixels;
}

describe("flood and colour range", () => {
  // Two red squares separated by a white column; a near-red pixel in the left square.
  const img = pixels(9, 4, (x, y) =>
    x === 4 ? [255, 255, 255, 255] : x === 1 && y === 1 ? [240, 10, 0, 255] : [255, 0, 0, 255],
  );

  it("selects the contiguous region within tolerance", () => {
    const strict = floodRegion(img, 0, 0, 0, true);
    expect(strict.bounds).toEqual({ x: 0, y: 0, width: 4, height: 4 });
    expect(coverageAt(strict, 1, 1)).toBe(0);
    expect(coverageAt(floodRegion(img, 0, 0, 20, true), 1, 1)).toBe(255);
  });

  it("selects every matching pixel when not contiguous", () => {
    const all = floodRegion(img, 0, 0, 20, false);
    expect(all.bounds).toEqual({ x: 0, y: 0, width: 9, height: 4 });
    expect(coverageAt(all, 4, 0)).toBe(0);
    expect(floodRegion(img, -1, 0, 0, true).bounds).toBeNull();
  });

  it("treats all fully transparent pixels as one colour", () => {
    const clear = pixels(3, 1, (x) => (x === 1 ? [9, 9, 9, 0] : [0, 0, 0, 0]));
    expect(floodRegion(clear, 0, 0, 0, true).bounds!.width).toBe(3);
  });

  it("colour range falls off softly", () => {
    const ramp = pixels(5, 1, (x) => [x * 20, 0, 0, 255]);
    const m = colorRange(ramp, [0, 0, 0, 255], 60);
    expect(Array.from(m.data)).toEqual([255, 255, 170, 0, 0]);
  });
});

describe("outline", () => {
  it("traces the boundary of a rectangle as four merged runs, cached per mask", () => {
    const m = rectSelection(W, H, { x: 2, y: 3, width: 4, height: 2 });
    const o = selectionOutline(m);
    expect(Array.from(o)).toEqual([2, 3, 6, 3, 2, 5, 6, 5, 2, 3, 2, 5, 6, 3, 6, 5]);
    expect(selectionOutline(m)).toBe(o);
    expect(selectionOutline(createSelection(2, 2, new Uint8Array(4))).length).toBe(0);
  });
});
