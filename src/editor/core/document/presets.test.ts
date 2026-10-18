import { describe, expect, it } from "vitest";
import { checkDimensions } from "./limits";
import {
  addRecentSize,
  ALL_PRESETS,
  fromPixels,
  MAX_RECENT_SIZES,
  parseRecentSizes,
  PRESET_CATEGORIES,
  presetPixels,
  searchPresets,
  toPixels,
} from "./presets";

describe("size presets", () => {
  it("every preset fits the document limits at its own resolution", () => {
    for (const preset of ALL_PRESETS) {
      const px = presetPixels(preset);
      expect(checkDimensions(px.width, px.height), preset.id).toEqual({ ok: true });
    }
  });

  it("ids are unique and every category has presets", () => {
    const ids = ALL_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const category of PRESET_CATEGORIES) expect(category.presets.length).toBeGreaterThan(0);
  });

  it("converts print sizes to the pixels Photoshop uses", () => {
    const a4 = ALL_PRESETS.find((p) => p.id === "print-a4")!;
    expect(presetPixels(a4)).toEqual({ width: 2480, height: 3508 });
    const letter = ALL_PRESETS.find((p) => p.id === "print-letter")!;
    expect(presetPixels(letter)).toEqual({ width: 2550, height: 3300 });
    expect(toPixels(1, "in", 72)).toBe(72);
    expect(toPixels(2.54, "cm", 100)).toBe(100);
    expect(toPixels(1920.4, "px", 300)).toBe(1920);
  });

  it("round-trips between units without changing the pixel size", () => {
    for (const unit of ["in", "cm", "mm"] as const) {
      for (const [px, ppi] of [
        [2480, 300],
        [1080, 72],
        [37, 96],
        [9999, 10_000],
      ]) {
        expect(toPixels(fromPixels(px, unit, ppi), unit, ppi), `${px}px ${unit} ${ppi}`).toBe(px);
      }
    }
    expect(fromPixels(2480, "mm", 300)).toBe(209.97);
    expect(fromPixels(2480, "in", 300)).toBe(8.267);
    expect(fromPixels(72, "in", 72)).toBe(1);
  });

  it("searches by name, category and size", () => {
    expect(searchPresets("story").map((p) => p.name)).toContain("Instagram story");
    expect(searchPresets("a4").map((p) => p.id)).toContain("print-a4");
    expect(searchPresets("print a4").map((p) => p.id)).toEqual(["print-a4"]);
    expect(searchPresets("1080x1920").length).toBeGreaterThanOrEqual(2);
    expect(searchPresets("   ")).toEqual([]);
    expect(searchPresets("no such size")).toEqual([]);
  });
});

describe("recent sizes", () => {
  const size = (width: number) => ({ width, height: 100, unit: "px" as const, ppi: 72 });

  it("keeps the most recent first, without duplicates, up to the limit", () => {
    let list = addRecentSize([], size(10));
    list = addRecentSize(list, size(20));
    list = addRecentSize(list, size(10));
    expect(list.map((s) => s.width)).toEqual([10, 20]);
    for (let i = 0; i < 10; i++) list = addRecentSize(list, size(100 + i));
    expect(list).toHaveLength(MAX_RECENT_SIZES);
    expect(list[0].width).toBe(109);
  });

  it("drops malformed or oversized stored entries", () => {
    expect(parseRecentSizes("nope")).toEqual([]);
    expect(
      parseRecentSizes([
        size(10),
        { width: 10, height: 10, unit: "furlong", ppi: 72 },
        { width: "10", height: 10, unit: "px", ppi: 72 },
        { width: 10, height: 10, unit: "px", ppi: 0 },
        { width: 10, height: 10, unit: "px", ppi: Number.NaN },
        { width: 100, height: 100, unit: "in", ppi: 300 },
        { width: -5, height: 10, unit: "px", ppi: 72 },
        null,
        Object.create({ width: 10, height: 10, unit: "px", ppi: 72 }),
      ]),
    ).toEqual([size(10)]);
  });
});
