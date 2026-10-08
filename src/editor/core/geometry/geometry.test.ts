import { describe, expect, it } from "vitest";
import { createDocument, createRasterLayer, createShapeLayer } from "../document/factory";
import type { Transform } from "../document/types";
import { estimateTextSizer } from "../../rendering/text/text-layout";
import {
  boundsOf,
  documentToLayer,
  hitTestLayer,
  layerCorners,
  topLayerAt,
} from "./layer-geometry";
import { applyMatrix, fromTransform, invertMatrix, normalizeDegrees } from "./matrix";
import { constrainDrag, rectFromPoints, resizeRect, roundRect } from "./rect";
import {
  flipAboutCenter,
  framePoint,
  rotateAroundCenter,
  scaleFromHandle,
  setRotationAboutCenter,
  setScaleAboutCenter,
} from "./transform-handles";

const T = (t: Partial<Transform>): Transform => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  ...t,
});
const close = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
};

describe("matrix", () => {
  it("maps local to document as translate · rotate · scale and inverts", () => {
    const m = fromTransform(T({ x: 10, y: 20, scaleX: 2, scaleY: 3, rotation: 90 }));
    close(applyMatrix(m, { x: 1, y: 0 }), { x: 10, y: 22 });
    close(applyMatrix(m, { x: 0, y: 1 }), { x: 7, y: 20 });
    const inv = invertMatrix(m)!;
    close(applyMatrix(inv, applyMatrix(m, { x: 5, y: 7 })), { x: 5, y: 7 });
  });

  it("returns null for singular matrices and normalises angles", () => {
    expect(invertMatrix([0, 0, 0, 0, 1, 1])).toBeNull();
    expect(normalizeDegrees(190)).toBe(-170);
    expect(normalizeDegrees(-180)).toBe(180);
  });
});

describe("layer geometry", () => {
  const doc = createDocument({ name: "x", width: 200, height: 100 });
  const raster = {
    ...createRasterLayer({ assetId: "a", width: 20, height: 10, name: "r" }),
    transform: T({ x: 50, y: 40 }),
  };

  it("computes corners and bounds of rotated layers", () => {
    const rotated = { ...raster, transform: T({ x: 0, y: 0, rotation: 90 }) };
    const corners = layerCorners(rotated, doc, estimateTextSizer);
    close(corners[2], { x: -10, y: 20 });
    const b = boundsOf(corners);
    expect(b.x).toBeCloseTo(-10);
    expect(b.width).toBeCloseTo(10);
    expect(b.height).toBeCloseTo(20);
  });

  it("hit-tests in layer space with tolerance", () => {
    expect(hitTestLayer(raster, { x: 55, y: 45 }, doc, estimateTextSizer)).toBe(true);
    expect(hitTestLayer(raster, { x: 71, y: 45 }, doc, estimateTextSizer)).toBe(false);
    expect(hitTestLayer(raster, { x: 71, y: 45 }, doc, estimateTextSizer, 2)).toBe(true);
    expect(
      hitTestLayer({ ...raster, visible: false }, { x: 55, y: 45 }, doc, estimateTextSizer),
    ).toBe(false);
    close(documentToLayer(raster, { x: 55, y: 45 })!, { x: 5, y: 5 });
  });

  it("finds the top-most transformable layer, skipping fill layers", () => {
    const shape = createShapeLayer({
      shape: "rect",
      x: 45,
      y: 35,
      width: 30,
      height: 30,
      fill: "#000000",
      stroke: null,
      name: "s",
    });
    const stacked = { ...doc, layers: [...doc.layers, raster, shape] };
    expect(topLayerAt(stacked, { x: 55, y: 45 }, estimateTextSizer)?.id).toBe(shape.id);
    expect(topLayerAt(stacked, { x: 5, y: 5 }, estimateTextSizer)).toBeUndefined();
  });
});

describe("transform handles", () => {
  const size = { width: 100, height: 50 };

  it("scales from a corner keeping the opposite corner fixed", () => {
    const start = T({ x: 10, y: 10 });
    const next = scaleFromHandle(start, size, "se", { x: 210, y: 110 });
    expect(next.scaleX).toBeCloseTo(2);
    expect(next.scaleY).toBeCloseTo(2);
    close(framePoint(next, size, { x: 0, y: 0 }), { x: 10, y: 10 });
  });

  it("keeps aspect ratio with Shift and works for rotated layers", () => {
    const start = T({ x: 0, y: 0, rotation: 30 });
    const target = framePoint(T({ rotation: 30, scaleX: 3, scaleY: 1.2 }), size, { x: 1, y: 1 });
    const next = scaleFromHandle(start, size, "se", target, { keepAspect: true });
    expect(next.scaleX).toBeCloseTo(next.scaleY);
    close(framePoint(next, size, { x: 0, y: 0 }), { x: 0, y: 0 });
  });

  it("edge handles scale one axis; dragging past the anchor flips", () => {
    const start = T({ x: 0, y: 0 });
    const east = scaleFromHandle(start, size, "e", { x: 150, y: 999 });
    expect(east.scaleX).toBeCloseTo(1.5);
    expect(east.scaleY).toBe(1);
    const flipped = scaleFromHandle(start, size, "e", { x: -50, y: 0 });
    expect(flipped.scaleX).toBeCloseTo(-0.5);
  });

  it("scales from the centre with Alt", () => {
    const start = T({ x: 0, y: 0 });
    const next = scaleFromHandle(start, size, "se", { x: 150, y: 75 }, { fromCenter: true });
    close(framePoint(next, size, { x: 0.5, y: 0.5 }), { x: 50, y: 25 });
    expect(next.scaleX).toBeCloseTo(2);
  });

  it("never collapses to zero size", () => {
    const next = scaleFromHandle(T({}), size, "se", { x: 0, y: 0 });
    expect(Math.abs(next.scaleX * size.width)).toBeGreaterThanOrEqual(1);
  });

  it("rotates about the centre and snaps to 15° with Shift", () => {
    const start = T({ x: 0, y: 0 });
    const center = framePoint(start, size, { x: 0.5, y: 0.5 });
    const next = rotateAroundCenter(
      start,
      size,
      { x: center.x + 10, y: center.y },
      { x: center.x, y: center.y + 10 },
    );
    expect(next.rotation).toBeCloseTo(90);
    close(framePoint(next, size, { x: 0.5, y: 0.5 }), center);
    const snapped = rotateAroundCenter(
      start,
      size,
      { x: center.x + 10, y: center.y },
      { x: center.x + 10, y: center.y + 2 },
      true,
    );
    expect(snapped.rotation).toBe(15);
  });

  it("numeric rotate/scale and flips keep the centre", () => {
    const start = T({ x: 20, y: 30 });
    const center = framePoint(start, size, { x: 0.5, y: 0.5 });
    close(framePoint(setRotationAboutCenter(start, size, 45), size, { x: 0.5, y: 0.5 }), center);
    close(framePoint(setScaleAboutCenter(start, size, 2, 0.5), size, { x: 0.5, y: 0.5 }), center);
    const flipped = flipAboutCenter(start, size, "horizontal");
    expect(flipped.scaleX).toBe(-1);
    close(framePoint(flipped, size, { x: 0.5, y: 0.5 }), center);
  });
});

describe("rect helpers", () => {
  it("normalises, resizes and rounds", () => {
    expect(rectFromPoints({ x: 10, y: 10 }, { x: 0, y: 5 })).toEqual({
      x: 0,
      y: 5,
      width: 10,
      height: 5,
    });
    expect(resizeRect({ x: 0, y: 0, width: 10, height: 10 }, "nw", { x: 20, y: 5 })).toEqual({
      x: 10,
      y: 5,
      width: 10,
      height: 5,
    });
    expect(roundRect({ x: 0.4, y: 0.6, width: 0.2, height: 10 })).toEqual({
      x: 0,
      y: 1,
      width: 1,
      height: 10,
    });
  });

  it("constrains drags to squares and 45° lines", () => {
    expect(constrainDrag({ x: 0, y: 0 }, { x: 10, y: -4 }, "square")).toEqual({ x: 10, y: -10 });
    const p = constrainDrag({ x: 0, y: 0 }, { x: 10, y: 1 }, "angle45");
    expect(p.y).toBeCloseTo(0);
    expect(p.x).toBeCloseTo(Math.hypot(10, 1));
  });
});
