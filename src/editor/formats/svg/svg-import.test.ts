// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { looksLikeSvg, svgPixelSize } from "./svg-import";

const enc = (s: string) => new TextEncoder().encode(s);

describe("SVG import", () => {
  it("recognises SVG text with prologs and comments", () => {
    expect(looksLikeSvg(enc('<?xml version="1.0"?>\n<!-- hi --><svg xmlns="x"/>'))).toBe(true);
    expect(looksLikeSvg(enc("  <svg>"))).toBe(true);
    expect(looksLikeSvg(enc("<html><svg></svg></html>"))).toBe(false);
  });

  it("reads width/height with units, or the viewBox, or the default", () => {
    expect(
      svgPixelSize('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"/>'),
    ).toEqual({ width: 200, height: 100 });
    expect(
      svgPixelSize('<svg xmlns="http://www.w3.org/2000/svg" width="1in" height="72pt"/>'),
    ).toEqual({ width: 96, height: 96 });
    expect(
      svgPixelSize('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20" width="100%"/>'),
    ).toEqual({ width: 40, height: 20 });
    expect(svgPixelSize('<svg xmlns="http://www.w3.org/2000/svg"/>')).toEqual({
      width: 300,
      height: 150,
    });
  });

  it("scales enormous SVGs down to the limits and rejects non-SVG XML", () => {
    const huge = svgPixelSize(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100000" height="50000"/>',
    )!;
    expect(huge.width).toBeLessThanOrEqual(12_000);
    expect(huge.width * huge.height).toBeLessThanOrEqual(36_000_000);
    expect(svgPixelSize("<html/>")).toBeNull();
    expect(svgPixelSize("<svg><unclosed></svg>")).toBeNull();
  });
});
