import { describe, expect, it } from "vitest";
import { autoLevels, clippedRange, histograms } from "../../adjustments/auto";
import { NEUTRAL_LEVELS } from "../../adjustments/tone";
import { trimBounds } from "../../selection/derive";
import { cropDocument } from "../commands/content-commands";
import { transformCanvas } from "../commands/document-commands";
import { createDocument, createShapeLayer } from "../document/factory";
import { selectAll } from "../../selection/mask";
import { canvasTransform, transformGuide, transformRect, type CanvasOp } from "./canvas-transform";
import { applyMatrix } from "./matrix";

const W = 600;
const H = 400;

describe("canvas transforms", () => {
  const corner = (op: CanvasOp, p: { x: number; y: number }) =>
    applyMatrix(canvasTransform(op, W, H).matrix, p);

  it("rotates and flips the canvas onto itself", () => {
    expect(canvasTransform({ kind: "rotate", turns: 1 }, W, H)).toMatchObject({
      width: H,
      height: W,
    });
    // Clockwise: the top-left corner goes to the top-right.
    expect(corner({ kind: "rotate", turns: 1 }, { x: 0, y: 0 })).toEqual({ x: H, y: 0 });
    expect(corner({ kind: "rotate", turns: 3 }, { x: 0, y: 0 })).toEqual({ x: 0, y: W });
    expect(corner({ kind: "rotate", turns: 2 }, { x: 0, y: 0 })).toEqual({ x: W, y: H });
    expect(corner({ kind: "flip", axis: "horizontal" }, { x: 10, y: 20 })).toEqual({
      x: W - 10,
      y: 20,
    });
    expect(corner({ kind: "scale", width: 300, height: 100 }, { x: W, y: H })).toEqual({
      x: 300,
      y: 100,
    });
  });

  it("keeps guides axis-aligned, swapping orientation on quarter turns", () => {
    const { matrix } = canvasTransform({ kind: "rotate", turns: 1 }, W, H);
    expect(transformGuide({ id: "g", orientation: "vertical", position: 100 }, matrix)).toEqual({
      id: "g",
      orientation: "horizontal",
      position: 100,
    });
    expect(
      transformGuide({ id: "g", orientation: "horizontal", position: 50 }, matrix),
    ).toMatchObject({ orientation: "vertical", position: H - 50 });
    expect(transformRect({ x: 10, y: 20, width: 30, height: 40 }, matrix)).toEqual({
      x: H - 60,
      y: 10,
      width: 40,
      height: 30,
    });
  });

  it("applies a plan to the document: size, layers, paths, guides; drops the selection", () => {
    const base = createDocument({ name: "D", width: W, height: H });
    const shape = {
      ...createShapeLayer({
        shape: "rect",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        fill: "#000000",
        stroke: null,
        name: "S",
      }),
      id: "s",
      vectorMask: {
        enabled: true,
        linked: true,
        path: {
          subpaths: [
            {
              closed: true,
              anchors: [
                { x: 0, y: 0, in: { x: 0, y: 0 }, out: { x: 0, y: 0 }, smooth: false },
                { x: 10, y: 0, in: { x: 10, y: 0 }, out: { x: 10, y: 0 }, smooth: false },
              ],
            },
          ],
        },
      },
    };
    const doc = {
      ...base,
      layers: [...base.layers, shape],
      guides: [{ id: "g", orientation: "vertical" as const, position: 100 }],
      selection: selectAll(W, H),
    };
    const { matrix, width, height } = canvasTransform({ kind: "rotate", turns: 1 }, W, H);
    const next = transformCanvas({
      label: "Rotate",
      width,
      height,
      matrix,
      transforms: { s: { x: H, y: 0, scaleX: 1, scaleY: 1, rotation: 90 } },
      masks: {},
    }).apply(doc as never);
    expect(next).toMatchObject({ width: H, height: W });
    expect(next.selection).toBeUndefined();
    expect(next.guides[0]).toMatchObject({ orientation: "horizontal", position: 100 });
    const moved = next.layers.find((l) => l.id === "s")!;
    expect(moved.transform.rotation).toBe(90);
    expect(moved.vectorMask?.path.subpaths[0].anchors[1]).toMatchObject({ x: H, y: 10 });
    expect(() =>
      transformCanvas({
        label: "Big",
        width: 99_999,
        height: 10,
        matrix,
        transforms: {},
        masks: {},
      }).apply(doc as never),
    ).toThrow();
    expect(cropDocument({ x: 0, y: 0, width: 10, height: 10 }, "Trim").label).toBe("Trim");
  });
});

/** RGBA pixels from [r, g, b] colours. */
const image = (...colors: [number, number, number][]) =>
  new Uint8ClampedArray(colors.flatMap(([r, g, b]) => [r, g, b, 255]));

describe("auto adjustments", () => {
  it("finds the clipped range of a histogram", () => {
    const h = histograms(image([10, 10, 10], [200, 200, 200]));
    expect(clippedRange(h.red, h.total)).toEqual([10, 200]);
  });

  it("Auto Tone stretches each channel; Auto Contrast all together", () => {
    const pixels = image([20, 40, 60], [200, 180, 160]);
    const tone = autoLevels("tone", pixels);
    expect(tone).toMatchObject({
      type: "levels",
      rgb: NEUTRAL_LEVELS,
      red: { inBlack: 20, inWhite: 200 },
      green: { inBlack: 40, inWhite: 180 },
      blue: { inBlack: 60, inWhite: 160 },
    });
    const contrast = autoLevels("contrast", pixels);
    expect(contrast).toMatchObject({
      rgb: { inBlack: 20, inWhite: 200 },
      red: NEUTRAL_LEVELS,
    });
  });

  it("Auto Color also neutralises a colour cast", () => {
    // Bluish image: blue is lighter on average than red.
    const pixels = image([0, 0, 50], [100, 100, 255], [50, 50, 200], [255, 255, 255]);
    const color = autoLevels("color", pixels);
    if (color?.type !== "levels") throw new Error("expected levels");
    expect(color.blue.gamma).toBeLessThan(color.red.gamma);
  });

  it("does nothing when the image already spans the range or is empty", () => {
    expect(autoLevels("tone", image([0, 0, 0], [255, 255, 255]))).toBeNull();
    expect(autoLevels("tone", new Uint8ClampedArray(8))).toBeNull();
  });
});

describe("Trim", () => {
  it("finds the box of pixels that differ from the background", () => {
    const w = 4;
    const data = new Uint8ClampedArray(w * 3 * 4);
    data.set([255, 0, 0, 255], (1 * w + 2) * 4);
    const pixels = { width: w, height: 3, data };
    expect(trimBounds(pixels, "transparent")).toEqual({ x: 2, y: 1, width: 1, height: 1 });
    expect(trimBounds(pixels, "top-left")).toEqual({ x: 2, y: 1, width: 1, height: 1 });
    expect(
      trimBounds({ width: w, height: 3, data: new Uint8ClampedArray(48) }, "transparent"),
    ).toBeNull();
  });
});
