import { describe, expect, it } from "vitest";
import { adjustmentDefinition, parseAdjustment } from "../../adjustments/registry";
import type { Adjustment } from "../../core/document/types";
import { corner, type VectorPath } from "../../core/path/path";
import {
  dropShadowBlock,
  linkedFilesBlock,
  placedBlock,
  solidColorBlock,
  textBlock,
} from "../../test-utils/psd-fixtures";
import { ByteReader, ByteWriter, FormatError } from "../binary/bytes";
import {
  getColor,
  getDescriptor,
  getNumber,
  readVersionedDescriptor,
  writeVersionedDescriptor,
} from "./descriptor";
import { enginePath, parseEngineData } from "./engine-data";
import { decodeAdjustment, encodeAdjustment } from "./psd-adjustments";
import { transformFromCorners } from "./psd-convert";
import { decodeExtras, matchFont } from "./psd-extras";
import type { PsdFile, PsdPixelLayer } from "./psd-model";
import { decodeVectorMask, encodeVectorMask } from "./psd-paths";
import { readPsd } from "./psd-read";
import { writePsd } from "./psd-write";

const ctx = { width: 200, height: 100, globalAngle: 30 };

function solid(w: number, h: number, rgba: number[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) out.set(rgba, i * 4);
  return out;
}

function layer(
  name: string,
  blocks: { key: string; data: Uint8Array }[],
  rgba = true,
): PsdPixelLayer {
  return {
    kind: "pixels",
    name,
    opacity: 255,
    visible: true,
    blendKey: "norm",
    rect: rgba
      ? { top: 10, left: 20, bottom: 30, right: 60 }
      : { top: 0, left: 0, bottom: 0, right: 0 },
    rgba: rgba ? solid(40, 20, [0, 0, 0, 255]) : null,
    blocks,
  };
}

function file(
  layers: PsdPixelLayer[],
  globalBlocks?: { key: string; data: Uint8Array }[],
): PsdFile {
  return {
    width: 200,
    height: 100,
    layers,
    composite: solid(200, 100, [255, 255, 255, 255]),
    globalBlocks,
  };
}

describe("descriptors", () => {
  it("round-trips the written value types and reads colours", () => {
    const w = new ByteWriter();
    writeVersionedDescriptor(w, {
      classId: "null",
      items: [
        ["Nm  ", { type: "TEXT", value: "Été" }],
        ["Opct", { type: "UntF", unit: "#Prc", value: 50 }],
        ["long", { type: "long", value: -7 }],
        ["on  ", { type: "bool", value: true }],
        [
          "Clr ",
          {
            type: "Objc",
            descriptor: {
              classId: "RGBC",
              items: [
                ["Rd  ", { type: "doub", value: 255 }],
                ["Grn ", { type: "doub", value: 0 }],
                ["Bl  ", { type: "doub", value: 16 }],
              ],
            },
          },
        ],
        [
          "list",
          {
            type: "VlLs",
            values: [
              { type: "doub", value: 1 },
              { type: "doub", value: 2 },
            ],
          },
        ],
      ],
    });
    const d = readVersionedDescriptor(new ByteReader(w.toBytes()));
    expect(d["Nm  "]).toBe("Été");
    expect(getNumber(d, "Opct")).toBe(50);
    expect(d.long).toBe(-7);
    expect(d["on  "]).toBe(true);
    expect(getColor(d)).toBe("#ff0010");
    expect(d.list).toEqual([1, 2]);
    expect(Object.getPrototypeOf(d)).toBeNull();
  });

  it("keeps hostile keys as plain data", () => {
    const w = new ByteWriter();
    writeVersionedDescriptor(w, {
      classId: "null",
      items: [
        [
          "__proto__",
          {
            type: "Objc",
            descriptor: { classId: "x", items: [["polluted", { type: "bool", value: true }]] },
          },
        ],
        ["unit", { type: "TEXT", value: "fake" }],
      ],
    });
    const d = readVersionedDescriptor(new ByteReader(w.toBytes()));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(getDescriptor(d, "__proto__")?.polluted).toBe(true);
    // A key named like a unit field doesn't turn the object into a number.
    expect(getNumber({ ...d, x: d } as never, "x")).toBeUndefined();
  });

  it("refuses deep nesting, huge counts and unknown types", () => {
    let inner: Parameters<typeof writeVersionedDescriptor>[1] = { classId: "x", items: [] };
    for (let i = 0; i < 40; i++)
      inner = { classId: "x", items: [["next", { type: "Objc", descriptor: inner }]] };
    const deep = new ByteWriter();
    writeVersionedDescriptor(deep, inner);
    expect(() => readVersionedDescriptor(new ByteReader(deep.toBytes()))).toThrow(FormatError);

    const huge = new ByteWriter();
    huge.u32(16).u32(1).u16(0).u32(0).ascii("null").u32(0xffffffff);
    expect(() => readVersionedDescriptor(new ByteReader(huge.toBytes()))).toThrow(FormatError);

    const odd = new ByteWriter();
    odd.u32(16).u32(1).u16(0).u32(0).ascii("null").u32(1).u32(0).ascii("key ").ascii("????");
    expect(() => readVersionedDescriptor(new ByteReader(odd.toBytes()))).toThrow(FormatError);
  });
});

describe("EngineData", () => {
  it("parses dictionaries, arrays, names, numbers and UTF-16 strings", () => {
    const text = new TextEncoder().encode("<< /A 1.5 /B [ true /Name ( ) ] /C << /D -2 >> >>");
    const root = parseEngineData(text);
    expect(enginePath(root, "A")).toBe(1.5);
    expect(enginePath(root, "B", 1)).toBe("Name");
    expect(enginePath(root, "C", "D")).toBe(-2);
    expect(enginePath(root, "C", "missing")).toBeUndefined();
    const enc = new TextEncoder();
    const utf16 = Uint8Array.from([
      ...enc.encode("<< /T ("),
      ...[0xfe, 0xff, 0x00, 0x48, 0x00, 0xe9, 0x00, 0x5c, 0x29],
      ...enc.encode(") >>"),
    ]);
    // "H", "é" and an escaped ")" (0x5c 0x29 → 0x29; the pair 0x00 0x29 is ")").
    expect(enginePath(parseEngineData(utf16), "T")).toBe("Hé)");
  });

  it("rejects malformed and hostile input", () => {
    expect(() => parseEngineData(new TextEncoder().encode("<< /A "))).toThrow(FormatError);
    expect(() => parseEngineData(new TextEncoder().encode("[ 1 2"))).toThrow(FormatError);
    const deep = "<< /A ".repeat(100) + ">> ".repeat(100);
    expect(() => parseEngineData(new TextEncoder().encode(deep))).toThrow(FormatError);
    const proto = parseEngineData(new TextEncoder().encode("<< /__proto__ << /x 1 >> >>"));
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(enginePath(proto, "__proto__", "x")).toBe(1);
  });
});

describe("adjustment blocks", () => {
  const samples: Adjustment[] = [
    { type: "brightness-contrast", brightness: 20, contrast: -30 },
    { type: "hue-saturation", hue: 45, saturation: -20, lightness: 10 },
    { type: "exposure", exposure: 1.5, gamma: 0.8 },
    {
      ...(adjustmentDefinition("levels").defaults as Extract<Adjustment, { type: "levels" }>),
      rgb: { inBlack: 20, inWhite: 230, gamma: 1.3, outBlack: 5, outWhite: 250 },
      blue: { inBlack: 0, inWhite: 200, gamma: 1, outBlack: 0, outWhite: 255 },
    },
    {
      ...(adjustmentDefinition("curves").defaults as Extract<Adjustment, { type: "curves" }>),
      rgb: [
        [0, 0],
        [64, 90],
        [255, 255],
      ],
      red: [
        [0, 20],
        [255, 235],
      ],
    },
    { type: "invert" },
    { type: "posterize", levels: 6 },
    { type: "threshold", level: 100 },
  ];

  for (const a of samples) {
    it(`round-trips ${a.type}`, () => {
      const block = encodeAdjustment(a)!;
      const decoded = decodeAdjustment(block.key, block.data, new Map([[block.key, block.data]]));
      const expected = parseAdjustment(a);
      if (a.type === "exposure" && decoded?.adjustment.type === "exposure") {
        expect(decoded.adjustment.exposure).toBeCloseTo(1.5, 5);
        expect(decoded.adjustment.gamma).toBeCloseTo(0.8, 5);
      } else {
        expect(decoded?.adjustment).toEqual(expected);
      }
    });
  }

  it("has no Photoshop block for Temperature/Tint and Black & White", () => {
    expect(encodeAdjustment({ type: "temperature-tint", temperature: 10, tint: 0 })).toBeNull();
    expect(encodeAdjustment({ type: "black-white" })).toBeNull();
  });

  it("clamps out-of-range values from files", () => {
    const w = new ByteWriter();
    w.i16(150).i16(-50).i16(127).u8(0);
    const decoded = decodeAdjustment("brit", w.toBytes(), new Map());
    expect(decoded?.adjustment).toEqual({
      type: "brightness-contrast",
      brightness: 100,
      contrast: -50,
    });
    expect(decoded?.notes.length).toBeGreaterThan(0);
  });
});

describe("vector paths", () => {
  it("round-trips through 8.24 fixed point", () => {
    const path: VectorPath = {
      subpaths: [
        {
          closed: true,
          anchors: [
            corner(10, 10),
            { x: 150, y: 20, in: { x: 120, y: 5 }, out: { x: 180, y: 35 } },
            corner(60, 90),
          ],
        },
        { closed: false, anchors: [corner(5, 5), corner(25, 50)] },
      ],
    };
    const data = encodeVectorMask({ path, enabled: false, linked: true }, 200, 100);
    const back = decodeVectorMask(data, 200, 100)!;
    expect(back.enabled).toBe(false);
    expect(back.linked).toBe(true);
    expect(back.path.subpaths.map((s) => s.closed)).toEqual([true, false]);
    const a = back.path.subpaths[0].anchors[1];
    expect(a.x).toBeCloseTo(150, 3);
    expect(a.out.y).toBeCloseTo(35, 3);
  });
});

describe("layer extras", () => {
  it("decodes drop shadows, fills, text and placements", () => {
    const warnings = new Set<string>();
    const extras = decodeExtras(
      new Map([
        ["lfx2", dropShadowBlock({ color: "#336699", distance: 8, blur: 4, angle: 120 })],
        ["SoCo", solidColorBlock("#ff8800")],
        [
          "TySh",
          textBlock({
            text: "Hello\rworld",
            fontSize: 24,
            color: [255, 0, 0],
            font: "Arial-BoldMT",
            x: 10,
            y: 40,
          }),
        ],
        ["SoLd", placedBlock("abc", [10, 20, 110, 20, 110, 70, 10, 70])],
      ]),
      ctx,
      warnings,
    );
    expect(extras.effects?.dropShadow?.[0]).toMatchObject({
      enabled: true,
      color: "#336699",
      opacity: 0.75,
      angle: 120,
      distance: 8,
      size: 4,
    });
    expect(extras.fill).toBe("#ff8800");
    expect(extras.text).toMatchObject({
      text: "Hello\nworld",
      fontSize: 24,
      color: "#ff0000",
      fontFamily: "Arial",
      bold: true,
    });
    expect(extras.placed).toEqual({ id: "abc", corners: [10, 20, 110, 20, 110, 70, 10, 70] });
    expect([...warnings].join(" ")).toMatch(/editable text/);
  });

  it("keeps text sizes finite when the transform is damaged", () => {
    const block = textBlock({
      text: "x",
      fontSize: 12,
      color: [0, 0, 0],
      font: "Arial",
      x: 0,
      y: 0,
    });
    const view = new DataView(block.buffer);
    view.setFloat64(2 + 16, Number.POSITIVE_INFINITY); // yx
    const text = decodeExtras(new Map([["TySh", block]]), ctx, new Set()).text!;
    expect(Number.isFinite(text.fontSize)).toBe(true);
    expect(Number.isFinite(text.letterSpacing)).toBe(true);
  });

  it("falls back with a warning when a block is damaged", () => {
    const warnings = new Set<string>();
    const extras = decodeExtras(
      new Map([["lfx2", Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 16, 1])]]),
      ctx,
      warnings,
    );
    expect(extras.effects).toBeUndefined();
    expect([...warnings].join(" ")).toMatch(/layer styles/);
  });

  it("maps fonts and placement transforms", () => {
    expect(matchFont("TimesNewRomanPSMT")).toBe("Times New Roman");
    expect(matchFont("SomethingElse")).toBe("system-ui");
    expect(transformFromCorners([10, 20, 110, 20, 110, 70, 10, 70], 50, 25)).toMatchObject({
      x: 10,
      y: 20,
      scaleX: 2,
      scaleY: 2,
      rotation: 0,
    });
    const flipped = transformFromCorners([10, 70, 110, 70, 110, 20, 10, 20], 100, 50);
    expect(flipped.scaleY).toBe(-1);
  });
});

describe("PSD files with extras", () => {
  it("reads adjustment layers, vector masks and embedded smart object files", async () => {
    const levels = encodeAdjustment({ type: "invert" })!;
    const mask = encodeVectorMask(
      {
        path: {
          subpaths: [{ closed: true, anchors: [corner(20, 10), corner(60, 10), corner(40, 30)] }],
        },
        enabled: true,
        linked: true,
      },
      200,
      100,
    );
    const inner = writePsd({
      width: 30,
      height: 20,
      layers: [layer("Inner", [])],
      composite: solid(30, 20, [1, 2, 3, 255]),
    });
    const psd = writePsd(
      file(
        [
          layer("Masked", [{ key: "vmsk", data: mask }]),
          layer("Invert", [levels], false),
          layer("Smart", [
            { key: "SoLd", data: placedBlock("inner-1", [0, 0, 60, 0, 60, 40, 0, 40]) },
          ]),
        ],
        [{ key: "lnk2", data: linkedFilesBlock("inner-1", "inner.psd", "8BPS", inner) }],
      ),
    );
    const { file: read } = await readPsd(psd);
    const [masked, invert, smart] = read.layers as PsdPixelLayer[];
    expect(masked.extras?.vectorMask?.path.subpaths[0].anchors).toHaveLength(3);
    expect(invert.extras?.adjustment).toEqual({ type: "invert" });
    expect(smart.extras?.placed?.id).toBe("inner-1");
    expect(read.linked?.[0]).toMatchObject({ id: "inner-1", kind: "psd" });
    const embedded = read.linked?.[0];
    if (embedded?.kind !== "psd") throw new Error("expected an embedded PSD");
    expect(embedded.file.width).toBe(30);
  });
});

describe("Blend If in PSD records (ADR-0031)", () => {
  it("writes and reads blending ranges and channel restrictions", async () => {
    const blending = {
      ranges: [
        [
          [0, 0, 255, 255],
          [0, 20, 180, 230],
        ],
        [
          [0, 0, 255, 255],
          [0, 0, 255, 255],
        ],
        [
          [40, 40, 255, 255],
          [0, 0, 255, 255],
        ],
        [
          [0, 0, 255, 255],
          [0, 0, 255, 255],
        ],
      ],
      restricted: [2],
    } as const;
    const { file: read } = await readPsd(
      writePsd(file([{ ...layer("Blended", []), blending }, layer("Plain", [])])),
    );
    const [blended, plain] = read.layers as PsdPixelLayer[];
    expect(blended.blending).toEqual(blending);
    expect(plain.blending).toBeUndefined();
  });
});
