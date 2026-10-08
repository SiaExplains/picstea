import { describe, expect, it } from "vitest";
import { createDocument } from "../../core/document/factory";
import { estimateTextSizer } from "../../rendering/text/text-layout";
import type { CompositeContext } from "../../rendering/compositing/compositor";
import { drawFlattened, exportFilename } from "./raster-export";

function recorder() {
  const ops: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, prop: string) =>
      prop in target
        ? target[prop]
        : (...args: unknown[]) =>
            ops.push(`${prop}(${args.filter((a) => typeof a !== "object").join(",")})`),
    set: (target, prop: string, value) => {
      target[prop] = value;
      if (prop === "fillStyle") ops.push(`fillStyle=${value}`);
      return true;
    },
  });
  return { ctx: ctx as unknown as CompositeContext, ops };
}

describe("drawFlattened", () => {
  const doc = createDocument({
    name: "x",
    width: 4,
    height: 3,
    background: { kind: "transparent" },
  });
  const assets = { getBitmap: () => undefined };

  it("composites directly for formats with transparency", () => {
    const { ctx, ops } = recorder();
    drawFlattened(ctx, doc, assets, estimateTextSizer, { format: "png", quality: 1 }, () => {
      throw new Error("no extra surface needed");
    });
    expect(ops).toEqual(["clearRect(0,0,4,3)"]);
  });

  it("puts a matte under JPEG exports", () => {
    const main = recorder();
    const layers = recorder();
    const surface = {
      width: 4,
      height: 3,
      getContext: () => layers.ctx,
    } as unknown as OffscreenCanvas;
    drawFlattened(
      main.ctx,
      doc,
      assets,
      estimateTextSizer,
      { format: "jpeg", quality: 0.8 },
      () => surface,
    );
    expect(main.ops).toEqual([
      "clearRect(0,0,4,3)",
      "fillStyle=#ffffff",
      "fillRect(0,0,4,3)",
      "drawImage(0,0)",
    ]);
    expect(surface.width).toBe(0);
  });
});

describe("exportFilename", () => {
  it("sanitises names and adds the extension", () => {
    expect(exportFilename("Poster", "png")).toBe("Poster.png");
    expect(exportFilename("../../etc/pass:wd", "jpeg")).toBe("etcpasswd.jpg");
    expect(exportFilename("   ", "webp")).toBe("image.webp");
    expect(exportFilename("..hidden", "png")).toBe("hidden.png");
  });
});
