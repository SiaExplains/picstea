import { describe, expect, it } from "vitest";
import { maskedPixels, similarSelection, strokeArea } from "./derive";
import { createSelection } from "./mask";
import { rectSelection } from "./shapes";

const W = 20;
const H = 10;

/** Left half red, right half blue, with a green pixel at (15, 5). */
function pixels() {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (x < 10) data.set([250, 10, 10, 255], i);
      else data.set([10, 10, 250, 255], i);
    }
  }
  data.set([10, 250, 10, 255], (5 * W + 15) * 4);
  return { width: W, height: H, data };
}

const count = (data: Uint8Array) => data.filter((v) => v === 255).length;

describe("Edit → Stroke", () => {
  const box = rectSelection(W, H, { x: 5, y: 2, width: 10, height: 6 });

  it("paints inside, across or outside the edge", () => {
    const inside = strokeArea(box, 1, "inside")!;
    expect(inside.data[2 * W + 5]).toBe(255);
    expect(inside.data[1 * W + 5]).toBe(0);
    expect(inside.data[4 * W + 8]).toBe(0);
    const outside = strokeArea(box, 1, "outside")!;
    expect(outside.data[1 * W + 5]).toBe(255);
    expect(outside.data[2 * W + 5]).toBe(0);
    const center = strokeArea(box, 2, "center")!;
    expect(center.data[1 * W + 5]).toBe(255);
    expect(center.data[2 * W + 5]).toBe(255);
    expect(center.data[4 * W + 8]).toBe(0);
  });

  it("returns nothing for an empty selection", () => {
    expect(strokeArea(createSelection(W, H, new Uint8Array(W * H)), 3, "center")).toBeNull();
  });
});

describe("Select → Grow and Similar", () => {
  const seed = rectSelection(W, H, { x: 0, y: 0, width: 2, height: 2 });

  it("grows through connected matching colours only", () => {
    const grown = similarSelection(pixels(), seed, 32, true)!;
    expect(count(grown.data)).toBe(10 * H);
    expect(grown.data[5 * W + 12]).toBe(0);
  });

  it("finds similar colours anywhere, within tolerance", () => {
    const blueSeed = rectSelection(W, H, { x: 18, y: 0, width: 2, height: 2 });
    const similar = similarSelection(pixels(), blueSeed, 32, false)!;
    expect(similar.data[5 * W + 15]).toBe(0); // the green pixel
    expect(count(similar.data)).toBe(10 * H - 1);
    const loose = similarSelection(pixels(), blueSeed, 255, false)!;
    expect(count(loose.data)).toBe(W * H);
  });
});

describe("Edit → Copy Merged", () => {
  it("crops to the selection and fades by its coverage", () => {
    const data = new Uint8Array(W * H);
    data[3 * W + 4] = 255;
    data[3 * W + 5] = 128;
    const clip = maskedPixels(pixels(), createSelection(W, H, data))!;
    expect(clip).toMatchObject({ x: 4, y: 3, width: 2, height: 1 });
    expect([...clip.data]).toEqual([250, 10, 10, 255, 250, 10, 10, 128]);
  });
});
