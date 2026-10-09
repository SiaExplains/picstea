import { describe, expect, it } from "vitest";
import { hexToRgb, hsvToRgb, parseHexColor, rgbToHex, rgbToHsv } from "./color";
import { addSwatch, DEFAULT_SWATCHES, MAX_SWATCHES, parseSwatches } from "./swatches";

describe("colour conversion", () => {
  it("parses hex in its common forms", () => {
    expect(parseHexColor("#ABC")).toBe("#aabbcc");
    expect(parseHexColor("12aB9f")).toBe("#12ab9f");
    expect(parseHexColor(" #000000 ")).toBe("#000000");
    for (const bad of ["", "#12", "#1234", "#ggg", "red", "#1234567"]) {
      expect(parseHexColor(bad)).toBeNull();
    }
  });

  it("round-trips RGB through HSV for every 17th value", () => {
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          expect(hsvToRgb(rgbToHsv(r, g, b))).toEqual([r, g, b]);
        }
      }
    }
  });

  it("knows the primaries", () => {
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 1, v: 1 });
    expect(rgbToHsv(0, 0, 255).h).toBe(240);
    expect(hsvToRgb({ h: 120, s: 1, v: 1 })).toEqual([0, 255, 0]);
    expect(hsvToRgb({ h: 480, s: 1, v: 1 })).toEqual([0, 255, 0]);
    expect(rgbToHex(...hexToRgb("#4c8dff"))).toBe("#4c8dff");
    expect(rgbToHex(300, -4, 15.6)).toBe("#ff0010");
  });
});

describe("swatches", () => {
  it("keeps valid entries and drops the rest", () => {
    const parsed = parseSwatches([
      { color: "#FF0000", name: "  Red " },
      { color: "nope" },
      null,
      "#00ff00",
      { color: "0f0", name: 4 },
      JSON.parse('{"__proto__": {"color": "#123456"}, "color": "#111111"}'),
    ]);
    expect(parsed).toEqual([
      { color: "#ff0000", name: "Red" },
      { color: "#00ff00" },
      { color: "#111111" },
    ]);
    expect(parseSwatches({})).toBeNull();
  });

  it("limits count and name length", () => {
    const many = Array.from({ length: MAX_SWATCHES + 10 }, () => ({
      color: "#000000",
      name: "x".repeat(500),
    }));
    const parsed = parseSwatches(many)!;
    expect(parsed).toHaveLength(MAX_SWATCHES);
    expect(parsed[0].name).toHaveLength(64);
  });

  it("adds without duplicates", () => {
    const next = addSwatch(DEFAULT_SWATCHES, "#123456");
    expect(next.at(-1)).toEqual({ color: "#123456" });
    expect(addSwatch(next, "#123456")).toBe(next);
    expect(addSwatch(next, "nope")).toBe(next);
  });
});
