import { describe, expect, it } from "vitest";
import {
  actualPixels,
  clampZoom,
  documentToScreen,
  fitToScreen,
  MAX_ZOOM,
  MIN_ZOOM,
  nextZoomStep,
  panBy,
  screenToDocument,
  zoomAt,
  zoomFactorFromWheel,
} from "./viewport";

describe("viewport", () => {
  const vp = { zoom: 2, panX: 100, panY: 50 };

  it("round-trips document and screen coordinates", () => {
    const screen = documentToScreen(vp, { x: 10, y: 20 });
    expect(screen).toEqual({ x: 120, y: 90 });
    expect(screenToDocument(vp, screen)).toEqual({ x: 10, y: 20 });
  });

  it("zooms about an anchor without moving the point under it", () => {
    const anchor = { x: 300, y: 200 };
    const before = screenToDocument(vp, anchor);
    const next = zoomAt(vp, 5, anchor);
    expect(next.zoom).toBe(5);
    const after = screenToDocument(next, anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("clamps zoom", () => {
    expect(clampZoom(1000)).toBe(MAX_ZOOM);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it("steps through preset zoom levels", () => {
    expect(nextZoomStep(1, 1)).toBe(1.5);
    expect(nextZoomStep(1, -1)).toBe(0.6667);
    expect(nextZoomStep(0.7, -1)).toBe(0.6667);
    expect(nextZoomStep(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(nextZoomStep(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
  });

  it("fits large documents and never upscales small ones", () => {
    const screen = { width: 1064, height: 864 };
    const big = fitToScreen({ width: 4000, height: 2000 }, screen, 32);
    expect(big.zoom).toBeCloseTo(0.25);
    expect(big.panX).toBe(32);
    const small = fitToScreen({ width: 100, height: 100 }, screen, 32);
    expect(small).toEqual({ zoom: 1, panX: 482, panY: 382 });
  });

  it("centres at 100% for actual pixels", () => {
    expect(actualPixels({ width: 200, height: 100 }, { width: 400, height: 300 })).toEqual({
      zoom: 1,
      panX: 100,
      panY: 100,
    });
  });

  it("pans and converts wheel deltas to zoom factors", () => {
    expect(panBy(vp, 5, -5)).toEqual({ zoom: 2, panX: 105, panY: 45 });
    expect(zoomFactorFromWheel(-100)).toBeGreaterThan(1);
    expect(zoomFactorFromWheel(100)).toBeLessThan(1);
  });
});
