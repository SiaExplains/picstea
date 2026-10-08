import { describe, expect, it } from "vitest";
import { createDocument, createFillLayer, createRasterLayer } from "../../core/document/factory";
import type { EditorDocument } from "../../core/document/types";
import { estimateTextSizer } from "../text/text-layout";
import { compositeDocument, compositeOperation, type CompositeContext } from "./compositor";

/** Records draw calls along with the state they were made under. */
function recorder() {
  const calls: { op: string; alpha: number; composite: string; fill: unknown; args: unknown[] }[] =
    [];
  const state = {
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#000" as unknown,
  };
  const stack: (typeof state)[] = [];
  const record =
    (op: string) =>
    (...args: unknown[]) =>
      calls.push({
        op,
        alpha: state.globalAlpha,
        composite: state.globalCompositeOperation,
        fill: state.fillStyle,
        args,
      });
  const ctx = {
    save: () => stack.push({ ...state }),
    restore: () => Object.assign(state, stack.pop()),
    clearRect: record("clearRect"),
    fillRect: record("fillRect"),
    drawImage: record("drawImage"),
    translate: record("translate"),
    rotate: record("rotate"),
    scale: record("scale"),
  };
  Object.defineProperties(ctx, {
    globalAlpha: { get: () => state.globalAlpha, set: (v) => (state.globalAlpha = v) },
    globalCompositeOperation: {
      get: () => state.globalCompositeOperation,
      set: (v) => (state.globalCompositeOperation = v),
    },
    fillStyle: { get: () => state.fillStyle, set: (v) => (state.fillStyle = v) },
  });
  return { ctx: ctx as unknown as CompositeContext, calls };
}

function doc(): EditorDocument {
  const base = createDocument({ name: "x", width: 100, height: 80 });
  const red = {
    ...createFillLayer("#ff0000", "Red"),
    opacity: 0.5,
    blendMode: "multiply" as const,
  };
  const hidden = { ...createFillLayer("#00ff00", "Hidden"), visible: false };
  const photo = createRasterLayer({
    assetId: "img",
    width: 20,
    height: 10,
    name: "Photo",
    x: 5,
    y: 6,
  });
  return { ...base, layers: [...base.layers, red, hidden, photo] };
}

describe("compositeDocument", () => {
  it("draws visible layers bottom to top with opacity and blend mode", () => {
    const { ctx, calls } = recorder();
    const bitmap = {} as CanvasImageSource;
    const result = compositeDocument(
      ctx,
      doc(),
      { getBitmap: () => bitmap },
      { sizer: estimateTextSizer },
    );

    expect(result.pendingAssetIds).toEqual([]);
    const draws = calls.filter((c) => c.op === "fillRect" || c.op === "drawImage");
    expect(draws).toEqual([
      expect.objectContaining({
        op: "fillRect",
        fill: "#ffffff",
        alpha: 1,
        composite: "source-over",
      }),
      expect.objectContaining({
        op: "fillRect",
        fill: "#ff0000",
        alpha: 0.5,
        composite: "multiply",
      }),
      expect.objectContaining({ op: "drawImage", args: [bitmap, 0, 0, 20, 10] }),
    ]);
    expect(calls.find((c) => c.op === "translate")?.args).toEqual([5, 6]);
    expect(calls[0].op).toBe("clearRect");
  });

  it("reports raster layers whose bitmaps are not decoded yet", () => {
    const { ctx, calls } = recorder();
    const result = compositeDocument(
      ctx,
      doc(),
      { getBitmap: () => undefined },
      { sizer: estimateTextSizer },
    );
    expect(result.pendingAssetIds).toEqual(["img"]);
    expect(calls.some((c) => c.op === "drawImage")).toBe(false);
  });

  it("skips fully transparent layers", () => {
    const { ctx, calls } = recorder();
    const d = doc();
    const transparent = { ...d, layers: d.layers.map((l) => ({ ...l, opacity: 0 })) };
    compositeDocument(
      ctx,
      transparent,
      { getBitmap: () => undefined },
      { sizer: estimateTextSizer },
    );
    expect(calls.map((c) => c.op)).toEqual(["clearRect"]);
  });

  it("maps every blend mode to a canvas composite operation", () => {
    expect(compositeOperation("normal")).toBe("source-over");
    expect(compositeOperation("color-dodge")).toBe("color-dodge");
  });
});
