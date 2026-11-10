import { describe, expect, it } from "vitest";
import { createTextLayer, DEFAULT_TEXT_STYLE } from "../../core/document/factory";
import type { TextLayer } from "../../core/document/types";
import { BUNDLED_FONTS, postscriptNameFor } from "../../fonts/font-catalog";
import { familyFromFileName, readFontNames, sniffFont, styleFromName } from "../../fonts/font-file";
import { parseEngineData, enginePath } from "./engine-data";
import { encodeTextBlock, writeEngineData } from "./engine-data-write";
import { decodeExtras } from "./psd-extras";

const ctx = { width: 400, height: 300, globalAngle: 30 };

const rich = (): TextLayer => ({
  ...createTextLayer({
    text: "Big (title)\nSecond paragraph",
    x: 40,
    y: 30,
    style: { ...DEFAULT_TEXT_STYLE, fontFamily: "Montserrat", fontSize: 24, color: "#112233" },
    box: { width: 200, height: 120 },
    runs: [
      { start: 0, end: 3, style: { fontSize: 48, fontWeight: 700, caps: "all-caps" } },
      { start: 12, end: 18, style: { color: "#ff0000", letterSpacing: 2.4, baselineShift: 3 } },
    ],
    paragraphs: [
      {
        align: "center",
        indentLeft: 0,
        indentRight: 0,
        indentFirst: 0,
        spaceBefore: 0,
        spaceAfter: 6,
      },
      {
        align: "justify",
        indentLeft: 10,
        indentRight: 5,
        indentFirst: 8,
        spaceBefore: 2,
        spaceAfter: 0,
      },
    ],
  }),
  lineHeight: 1.5,
});

const postscript = (s: { fontFamily: string; fontWeight: 400 | 700; italic: boolean }) =>
  postscriptNameFor(s.fontFamily, s.fontWeight, s.italic, BUNDLED_FONTS);

describe("EngineData writing", () => {
  it("writes what the parser reads: names, strings with escapes, integers and decimals", () => {
    const bytes = writeEngineData({
      A: { int: 3 },
      B: { float: 2 },
      C: { str: "a (b) \\ c é" },
      D: [true, false, { name: "Hrzn" }],
      E: { F: { float: 0.25 } },
    });
    const root = parseEngineData(bytes);
    expect(enginePath(root, "A")).toBe(3);
    expect(enginePath(root, "B")).toBe(2);
    expect(enginePath(root, "C")).toBe("a (b) \\ c é");
    expect(enginePath(root, "D", 0)).toBe(true);
    expect(enginePath(root, "E", "F")).toBe(0.25);
    expect(new TextDecoder("latin1").decode(bytes)).toContain("/B 2.0");
  });
});

describe("PSD text round trip", () => {
  it("keeps text, runs, paragraphs and the box editable", () => {
    const layer = rich();
    const block = encodeTextBlock(layer, postscript, 20);
    const warnings = new Set<string>();
    const text = decodeExtras(new Map([["TySh", block]]), ctx, warnings).text!;
    expect(text.text).toBe(layer.text);
    expect(text.box).toEqual({ left: 0, top: 0, width: 200, height: 120 });
    expect(text.origin).toEqual({ x: 40, y: 30 });

    const at = (i: number) => text.runs.find((r) => i >= r.start && i < r.end)!.style;
    expect(at(0)).toMatchObject({
      font: "Montserrat-Bold",
      fontSize: 48,
      fontWeight: 700,
      caps: "all-caps",
      lineHeight: 1.5,
    });
    expect(at(5)).toMatchObject({ font: "Montserrat-Regular", fontSize: 24, color: "#112233" });
    expect(at(13)).toMatchObject({ color: "#ff0000", baselineShift: 3 });
    expect(at(13).letterSpacing).toBeCloseTo(2.4, 0);

    expect(text.paragraphs).toEqual([
      {
        align: "center",
        indentLeft: 0,
        indentRight: 0,
        indentFirst: 0,
        spaceBefore: 0,
        spaceAfter: 6,
      },
      {
        align: "justify",
        indentLeft: 10,
        indentRight: 5,
        indentFirst: 8,
        spaceBefore: 2,
        spaceAfter: 0,
      },
    ]);
    expect([...warnings]).toEqual([
      "Text layers were imported as editable text. Check fonts and line spacing.",
    ]);
  });

  it("anchors point text on its first baseline", () => {
    const layer = { ...rich(), box: null };
    const block = encodeTextBlock(layer, postscript, 20);
    const text = decodeExtras(new Map([["TySh", block]]), ctx, new Set()).text!;
    expect(text.box).toBeUndefined();
    expect(text.origin).toEqual({ x: 40, y: 50 });
  });
});

describe("fonts", () => {
  it("identifies font files by their first bytes", () => {
    const head = (tag: number[]) => Uint8Array.from([...tag, ...new Array(20).fill(0)]);
    expect(sniffFont(head([0x77, 0x4f, 0x46, 0x32]))).toBe("font/woff2");
    expect(sniffFont(head([0x77, 0x4f, 0x46, 0x46]))).toBe("font/woff");
    expect(sniffFont(head([0x4f, 0x54, 0x54, 0x4f]))).toBe("font/otf");
    expect(sniffFont(head([0, 1, 0, 0]))).toBe("font/ttf");
    expect(sniffFont(head([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it("reads family names from a TrueType name table", () => {
    // A minimal sfnt with one `name` table holding family "Brand Sans", style "Bold".
    const names = [
      [1, "Brand Sans"],
      [2, "Bold"],
      [6, "BrandSans-Bold"],
    ] as const;
    const strings = names.map(([, s]) => [...s].flatMap((c) => [0, c.charCodeAt(0)]));
    const nameTable: number[] = [0, 0, 0, names.length, 0, 6 + names.length * 12];
    let offset = 0;
    names.forEach(([id], i) => {
      nameTable.push(
        0,
        3,
        0,
        1,
        0x04,
        0x09,
        0,
        id,
        0,
        strings[i].length,
        offset >> 8,
        offset & 255,
      );
      offset += strings[i].length;
    });
    for (const s of strings) nameTable.push(...s);
    const header = [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0];
    const tableOffset = header.length + 16;
    const record = [..."name"].map((c) => c.charCodeAt(0));
    record.push(0, 0, 0, 0, 0, 0, 0, tableOffset, 0, 0, 0, nameTable.length);
    const bytes = Uint8Array.from([...header, ...record, ...nameTable]);
    expect(readFontNames(bytes)).toEqual({
      family: "Brand Sans",
      subfamily: "Bold",
      postscriptName: "BrandSans-Bold",
    });
  });

  it("derives families and styles from names", () => {
    expect(familyFromFileName("Brand-Sans_Bold.woff2")).toBe("Brand Sans");
    expect(styleFromName("SemiBold Italic")).toEqual({ weight: 700, italic: true });
    expect(postscriptNameFor("Arial", 700, true, BUNDLED_FONTS)).toBe("Arial-BoldItalicMT");
    expect(postscriptNameFor("Lora", 400, false, BUNDLED_FONTS)).toBe("Lora-Regular");
  });
});
