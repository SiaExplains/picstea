import { describe, expect, it } from "vitest";
import { isConvexQuad } from "../../core/geometry/homography";
import { dragQuad } from "./distort-tool";

const box = [0, 0, 100, 0, 100, 50, 0, 50];

describe("Skew, Distort and Perspective handles (ADR-0044)", () => {
  it("Distort moves one corner freely", () => {
    expect(dragQuad("distort", box, 2, 10, 20)).toEqual([0, 0, 100, 0, 110, 70, 0, 50]);
  });

  it("Skew slides an edge along itself", () => {
    // Top edge midpoint dragged right: both top corners move, the bottom stays.
    expect(dragQuad("skew", box, 4, 15, 99)).toEqual([15, 0, 115, 0, 100, 50, 0, 50]);
    // A corner dragged mostly down moves its column.
    expect(dragQuad("skew", box, 1, 2, 10)).toEqual([0, 0, 100, 10, 100, 60, 0, 50]);
  });

  it("Perspective mirrors the corner on the same edge", () => {
    const q = dragQuad("perspective", box, 1, 20, 3);
    expect(q).toEqual([-20, 0, 120, 0, 100, 50, 0, 50]);
    expect(isConvexQuad(q)).toBe(true);
    expect(dragQuad("perspective", box, 3, 0, 10)).toEqual([0, -10, 100, 0, 100, 50, 0, 60]);
  });
});
