import { describe, expect, it } from "vitest";
import { createShapeLayer } from "../../core/document/factory";
import { DEFAULT_EFFECTS, type LayerEffects } from "../../core/effects/model";
import { encodeEffects, exportableEffects } from "./effects-write";
import { encodeVectorMask } from "./psd-paths";
import { decodeExtras } from "./psd-extras";
import { encodeShapeStroke, encodeSolidColor, shapeOutline } from "./shape-write";

const ctx = { width: 400, height: 300, globalAngle: 120 };
const extras = (blocks: { key: string; data: Uint8Array }[]) =>
  decodeExtras(new Map(blocks.map((b) => [b.key, b.data])), ctx, new Set());

describe("editable PSD export (ADR-0045)", () => {
  it("round-trips every layer style through lfx2, including several copies", () => {
    const effects: LayerEffects = {
      dropShadow: [
        { ...DEFAULT_EFFECTS.dropShadow, color: "#112233", distance: 12, size: 7 },
        { ...DEFAULT_EFFECTS.dropShadow, blendMode: "screen", angle: 45, useGlobalLight: false },
      ],
      innerShadow: [DEFAULT_EFFECTS.innerShadow],
      outerGlow: [DEFAULT_EFFECTS.outerGlow],
      innerGlow: [{ ...DEFAULT_EFFECTS.innerGlow, source: "center" }],
      satin: [DEFAULT_EFFECTS.satin],
      colorOverlay: [{ ...DEFAULT_EFFECTS.colorOverlay, color: "#00ff00", opacity: 0.5 }],
      gradientOverlay: [DEFAULT_EFFECTS.gradientOverlay],
      stroke: [{ ...DEFAULT_EFFECTS.stroke, size: 4, position: "inside" }],
      bevel: [DEFAULT_EFFECTS.bevel],
    };
    expect(exportableEffects(effects)).toBe(true);
    const decoded = extras([encodeEffects(effects)]).effects!;
    expect(decoded.dropShadow).toHaveLength(2);
    expect(decoded.dropShadow![0]).toMatchObject({ color: "#112233", distance: 12, size: 7 });
    expect(decoded.dropShadow![1]).toMatchObject({ blendMode: "screen", angle: 45 });
    expect(decoded.innerGlow![0].source).toBe("center");
    expect(decoded.colorOverlay![0]).toMatchObject({ color: "#00ff00", opacity: 0.5 });
    expect(decoded.stroke![0]).toMatchObject({ size: 4, position: "inside" });
    for (const kind of Object.keys(effects) as (keyof LayerEffects)[]) {
      expect(decoded[kind], kind).toBeDefined();
    }
    // Each default effect comes back exactly as it went in.
    expect(decoded.satin![0]).toEqual(DEFAULT_EFFECTS.satin);
    expect(decoded.bevel![0]).toEqual(DEFAULT_EFFECTS.bevel);
    expect(decoded.gradientOverlay![0]).toEqual(DEFAULT_EFFECTS.gradientOverlay);
  });

  it("keeps pattern styles merged (the PSD could not include the patterns)", () => {
    expect(exportableEffects({ patternOverlay: [DEFAULT_EFFECTS.patternOverlay] })).toBe(false);
    expect(
      exportableEffects({
        bevel: [
          {
            ...DEFAULT_EFFECTS.bevel,
            texture: { ...DEFAULT_EFFECTS.bevel.texture, enabled: true },
          },
        ],
      }),
    ).toBe(false);
  });

  it("writes shapes as vector data with fill and stroke the importer reads back", () => {
    const shape = createShapeLayer({
      shape: "rect",
      x: 20,
      y: 30,
      width: 100,
      height: 60,
      fill: "#4c8dff",
      stroke: { color: "#123456", width: 3 },
      name: "Box",
      cornerRadius: 10,
    });
    const outline = shapeOutline(shape);
    expect(outline.subpaths[0].anchors).toHaveLength(8);
    expect(outline.subpaths[0].anchors[0]).toMatchObject({ x: 30, y: 30 });
    const read = extras([
      {
        key: "vsms",
        data: encodeVectorMask({ path: outline, enabled: true, linked: true }, 400, 300),
      },
      encodeSolidColor(shape.fill!),
      encodeShapeStroke(shape),
    ]);
    expect(read.fill).toBe("#4c8dff");
    expect(read.stroke).toEqual({ color: "#123456", width: 3 });
    expect(read.fillDisabled).toBeUndefined();
    expect(read.vectorMask?.path.subpaths[0].anchors).toHaveLength(8);
    const line = createShapeLayer({
      shape: "line",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      fill: null,
      stroke: { color: "#000000", width: 2 },
      name: "Line",
    });
    expect(extras([encodeShapeStroke(line)]).fillDisabled).toBe(true);
    const ellipse = shapeOutline({ ...shape, shape: "ellipse", cornerRadius: 0 });
    expect(ellipse.subpaths[0].anchors.map((a) => [a.x, a.y])).toEqual([
      [70, 30],
      [120, 60],
      [70, 90],
      [20, 60],
    ]);
  });
});

describe("smart objects in PSD export (ADR-0045)", () => {
  it("writes SoLd and an embedded lnk2 file the importer reads back", async () => {
    const { encodeLinkedFiles, encodePlaced } = await import("./smart-write");
    const { writePsd } = await import("./psd-write");
    const { readPsd } = await import("./psd-read");
    const inner = writePsd({
      width: 40,
      height: 20,
      layers: [],
      composite: new Uint8ClampedArray(40 * 20 * 4),
    });
    const corners = [10, 10, 90, 10, 90, 50, 10, 50];
    const mesh: number[] = [];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        mesh.push((40 * j) / 3, (20 * i) / 3 + (i === 0 && j === 1 ? -5 : 0));
    const placed = extras([encodePlaced("abc", 40, 20, corners, { kind: "warp", mesh })]).placed;
    expect(placed).toMatchObject({ id: "abc", corners });
    expect(placed?.warp?.style).toBe("custom");
    expect(placed?.warp?.mesh?.[3]).toBeCloseTo(-5 / 20);
    const perspective = extras([
      encodePlaced("p", 40, 20, corners, {
        kind: "perspective",
        quad: [0, 0, 100, 10, 90, 50, 10, 50],
      }),
    ]).placed;
    expect(perspective?.perspective).toEqual([0, 0, 100, 10, 90, 50, 10, 50]);

    const outer = writePsd({
      width: 100,
      height: 60,
      layers: [],
      composite: new Uint8ClampedArray(100 * 60 * 4),
      globalBlocks: [encodeLinkedFiles([{ id: "abc", name: "Inner.psd", data: inner }])],
    });
    const read = await readPsd(outer);
    expect(read.file.linked?.[0]).toMatchObject({ id: "abc", kind: "psd" });
  });
});
