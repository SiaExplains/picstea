import { describe, expect, it } from "vitest";
import { createSelection } from "../selection/mask";
import { translatedCoverage } from "./layer-pixels";

describe("selection coverage of a moved layer", () => {
  // A 6 × 4 document selection with a distinct value per pixel.
  const data = new Uint8Array(24).map((_, i) => i + 1);
  const selection = createSelection(6, 4, data);

  /** Reference: look each layer pixel up in the document. */
  const expected = (w: number, h: number, x: number, y: number) =>
    Array.from({ length: w * h }, (_, i) => {
      const dx = (i % w) + x;
      const dy = Math.floor(i / w) + y;
      return dx >= 0 && dy >= 0 && dx < 6 && dy < 4 ? data[dy * 6 + dx] : 0;
    });

  for (const [w, h, x, y] of [
    [6, 4, 0, 0],
    [3, 2, 2, 1],
    [4, 3, -2, -1],
    [5, 5, 4, 3],
    [2, 2, 10, 0],
    [2, 2, 0, -5],
  ]) {
    it(`matches the document at ${w}×${h} offset (${x}, ${y})`, () => {
      expect([...translatedCoverage(selection, w, h, x, y)]).toEqual(expected(w, h, x, y));
    });
  }
});
