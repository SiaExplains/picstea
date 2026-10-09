import { describe, expect, it } from "vitest";
import { adjustmentDefinition } from "../../adjustments/registry";
import type { Adjustment } from "../../core/document/types";
import {
  gradientMapBlock,
  innerStylesBlock,
  photoFilterBlock,
} from "../../test-utils/psd-fixtures";
import { ByteWriter } from "../binary/bytes";
import { decodeAdjustment, encodeAdjustment, labToHex } from "./psd-adjustments";
import { decodeExtras } from "./psd-extras";

const ctx = { width: 200, height: 100, globalAngle: 120 };

describe("Gate 9h PSD adjustments", () => {
  it("round-trips Vibrance, Color Balance and Channel Mixer", () => {
    const cases: Adjustment[] = [
      { type: "vibrance", vibrance: 40, saturation: -15 },
      {
        type: "color-balance",
        shadows: { cyanRed: 10, magentaGreen: -20, yellowBlue: 30 },
        midtones: { cyanRed: -5, magentaGreen: 0, yellowBlue: 100 },
        highlights: { cyanRed: -100, magentaGreen: 50, yellowBlue: 0 },
        preserveLuminosity: false,
      },
      {
        type: "channel-mixer",
        red: { red: 50, green: 30, blue: 20, constant: -10 },
        green: { red: 0, green: 120, blue: 0, constant: 0 },
        blue: { red: 0, green: 0, blue: 80, constant: 200 },
        monochrome: false,
      },
      {
        ...adjustmentDefinition("channel-mixer").defaults,
        red: { red: 40, green: 40, blue: 20, constant: 0 },
        monochrome: true,
      } as Adjustment,
    ];
    for (const a of cases) {
      const block = encodeAdjustment(a)!;
      expect(block).not.toBeNull();
      const decoded = decodeAdjustment(block.key, block.data, new Map([[block.key, block.data]]));
      expect(decoded?.adjustment).toEqual(a);
    }
  });

  it("keeps Photo Filter and Gradient Map in the flattened image on export", () => {
    expect(encodeAdjustment(adjustmentDefinition("photo-filter").defaults)).toBeNull();
    expect(encodeAdjustment(adjustmentDefinition("gradient-map").defaults)).toBeNull();
  });

  it("reads Photo Filter (RGB and Lab) and Gradient Map blocks", () => {
    const filter = decodeAdjustment("phfl", photoFilterBlock("#3366ff", 40, false), new Map());
    expect(filter?.adjustment).toEqual({
      type: "photo-filter",
      color: "#3366ff",
      density: 40,
      preserveLuminosity: false,
    });
    const lab = new ByteWriter();
    lab.u16(3).i32(5000).i32(0).i32(0).u32(25).u8(1);
    const grey = decodeAdjustment("phfl", lab.toBytes(), new Map())!.adjustment;
    expect(grey).toMatchObject({ type: "photo-filter", density: 25, preserveLuminosity: true });
    // L 50 is a mid grey.
    expect((grey as { color: string }).color).toMatch(/^#7[4-9a-f]7[4-9a-f]7[4-9a-f]$/);

    const map = decodeAdjustment(
      "grdm",
      gradientMapBlock(
        [
          { position: 0, color: "#ff0000" },
          { position: 0.5, color: "#00ff00" },
          { position: 1, color: "#0000ff" },
        ],
        true,
      ),
      new Map(),
    );
    expect(map?.adjustment).toEqual({
      type: "gradient-map",
      stops: [
        { position: 0, color: "#ff0000" },
        { position: 0.5, color: "#00ff00" },
        { position: 1, color: "#0000ff" },
      ],
      reverse: true,
    });
  });

  it("clamps or refuses damaged blocks", () => {
    const w = new ByteWriter();
    for (let i = 0; i < 9; i++) w.i16(30_000);
    w.u8(1);
    const balance = decodeAdjustment("blnc", w.toBytes(), new Map())!.adjustment;
    expect(balance).toMatchObject({
      shadows: { cyanRed: 100, magentaGreen: 100, yellowBlue: 100 },
    });
    const badVersion = new ByteWriter().u16(9).toBytes();
    expect(decodeAdjustment("phfl", badVersion, new Map())).toBeNull();
    expect(() => decodeAdjustment("mixr", new Uint8Array(3), new Map())).toThrow();
    // Through decodeExtras a damaged block only costs that layer's adjustment.
    const warnings = new Set<string>();
    const extras = decodeExtras(new Map([["mixr", new Uint8Array(3)]]), ctx, warnings);
    expect(extras.adjustment).toBeUndefined();
    expect([...warnings].join(" ")).toMatch(/could not be read/);
  });

  it("converts Lab colours", () => {
    expect(labToHex(100, 0, 0)).toBe("#ffffff");
    expect(labToHex(0, 0, 0)).toBe("#000000");
  });
});

describe("Gate 9h PSD layer styles", () => {
  it("imports inner shadow, inner bevel and linear gradient overlays", () => {
    const warnings = new Set<string>();
    const extras = decodeExtras(
      new Map([
        [
          "lfx2",
          innerStylesBlock({
            shadow: "#112233",
            bevelHighlight: "#ffeedd",
            gradient: [
              { position: 1, color: "#0000ff" },
              { position: 0, color: "#ff0000" },
            ],
          }),
        ],
      ]),
      ctx,
      warnings,
    );
    expect(extras.effects?.innerShadow).toEqual({
      enabled: true,
      color: "#112233",
      opacity: 0.5,
      angle: 90,
      distance: 4,
      blur: 6,
    });
    expect(extras.effects?.bevel).toEqual({
      enabled: true,
      color: "#ffeedd",
      opacity: 0.8,
      shadowColor: "#000000",
      shadowOpacity: 0.6,
      angle: 135,
      size: 7,
      direction: "up",
    });
    expect(extras.effects?.gradientOverlay).toEqual({
      enabled: true,
      opacity: 1,
      angle: 0,
      stops: [
        { position: 0, color: "#ff0000" },
        { position: 1, color: "#0000ff" },
      ],
      reverse: false,
    });
    expect([...warnings].join(" ")).not.toMatch(/bevel|inner shadow|gradient/i);
  });
});

describe("Gate 9h PSD robustness", () => {
  it("drops gradient overlays with unreadable colours instead of breaking rendering", () => {
    const block = innerStylesBlock({
      shadow: "#000000",
      bevelHighlight: "#ffffff",
      gradient: [
        { position: 0, color: "#ff0000" },
        { position: 1, color: "#0000ff" },
      ],
    });
    // Replace the first stop's red value (a double) with NaN.
    const bytes = new Uint8Array(block);
    const view = new DataView(bytes.buffer);
    const tag = [...new TextEncoder().encode("Clrt")];
    const at = bytes.findIndex((_, i) => tag.every((c, j) => bytes[i + j] === c));
    const rd = bytes.findIndex(
      (_, i) => i > at && [..."Rd  doub"].every((c, j) => bytes[i + j] === c.charCodeAt(0)),
    );
    view.setFloat64(rd + 8, Number.NaN);
    const warnings = new Set<string>();
    const extras = decodeExtras(new Map([["lfx2", bytes]]), ctx, warnings);
    // The colour falls back to black: a valid stop.
    expect(extras.effects?.gradientOverlay?.stops[0].color).toBe("#000000");
    expect(extras.effects?.innerShadow).toBeDefined();
  });

  it("keeps both ends when trimming long gradients", () => {
    const stops = Array.from({ length: 20 }, (_, i) => ({
      position: i / 19,
      color: i === 19 ? "#0000ff" : "#ff0000",
    }));
    const decoded = decodeAdjustment("grdm", gradientMapBlock(stops, false), new Map())!;
    const adjustment = decoded.adjustment;
    if (adjustment.type !== "gradient-map") throw new Error("expected a gradient map");
    const kept = adjustment.stops;
    expect(kept).toHaveLength(16);
    expect(kept[0].position).toBe(0);
    expect(kept.at(-1)).toEqual({ position: 1, color: "#0000ff" });
    expect(decoded.notes.join(" ")).toMatch(/16 colours/);
  });

  it("warns when an adjustment block can't be read", () => {
    const warnings = new Set<string>();
    decodeExtras(new Map([["phfl", new ByteWriter().u16(9).toBytes()]]), ctx, warnings);
    expect([...warnings].join(" ")).toMatch(/adjustment layers could not be read/);
  });
});
