import { describe, expect, it } from "vitest";
import { createDocument, createTextLayer, DEFAULT_TEXT_STYLE } from "./factory";
import {
  applyCharStyle,
  applyParagraphStyle,
  charStyleAt,
  normalizeRuns,
  paragraphRanges,
  shiftRuns,
  styledSegments,
} from "./text";
import { hardWrappedText, layoutText, SMALL_CAPS_SCALE } from "./text-layout";
import type { TextLayer } from "./types";
import { addLayer, updateTextLayer } from "../commands";
import { deserializeProject, serializeDocument } from "../../serialization/serialization";

/** Every character is 10px wide at 20px (0.5 em), tracking added per character. */
const measure = (text: string, style: { letterSpacing: number }, size: number) =>
  [...text].length * (size / 2 + style.letterSpacing);

const layer = (text: string, extra: Partial<TextLayer> = {}): TextLayer => ({
  ...createTextLayer({ text, x: 0, y: 0, style: { ...DEFAULT_TEXT_STYLE, fontSize: 20 } }),
  ...extra,
});

describe("character runs", () => {
  it("styles a range and merges equal neighbours", () => {
    const t = layer("Hello world");
    const runs = applyCharStyle(t, 0, 5, { fontWeight: 700 });
    expect(runs).toEqual([{ start: 0, end: 5, style: { fontWeight: 700 } }]);
    const more = applyCharStyle({ ...t, runs }, 5, 8, { fontWeight: 700 });
    expect(more).toEqual([{ start: 0, end: 8, style: { fontWeight: 700 } }]);
    // Setting a range back to the base style removes the override.
    expect(applyCharStyle({ ...t, runs: more }, 0, 8, { fontWeight: 400 })).toEqual([]);
  });

  it("resolves the style of every character", () => {
    const t = layer("abcdef", { runs: [{ start: 2, end: 4, style: { color: "#ff0000" } }] });
    expect(styledSegments(t).map((s) => [s.start, s.end, s.style.color])).toEqual([
      [0, 2, "#000000"],
      [2, 4, "#ff0000"],
      [4, 6, "#000000"],
    ]);
    expect(charStyleAt(t, 3).color).toBe("#ff0000");
  });

  it("keeps runs on their characters when text is inserted or removed", () => {
    const runs = [{ start: 2, end: 4, style: { italic: true } }];
    // Insert 3 characters before the run.
    expect(shiftRuns(runs, 1, 1, 3)).toEqual([{ start: 5, end: 7, style: { italic: true } }]);
    // Typing inside the run takes its style.
    expect(shiftRuns(runs, 3, 3, 2)).toEqual([{ start: 2, end: 6, style: { italic: true } }]);
    // Typing at the end of the run continues its style.
    expect(shiftRuns(runs, 4, 4, 2)).toEqual([{ start: 2, end: 6, style: { italic: true } }]);
    // Deleting the run's characters removes it.
    expect(shiftRuns(runs, 2, 4, 0)).toEqual([]);
  });

  it("normalises overlapping, empty and redundant runs", () => {
    const base = { ...DEFAULT_TEXT_STYLE };
    expect(
      normalizeRuns(
        [
          { start: 0, end: 3, style: { italic: true } },
          { start: 2, end: 5, style: { italic: true } },
          { start: 5, end: 5, style: { fontSize: 9 } },
          { start: 6, end: 9, style: { fontSize: base.fontSize } },
        ],
        base,
        20,
      ),
    ).toEqual([{ start: 0, end: 5, style: { italic: true } }]);
  });
});

describe("paragraphs", () => {
  it("splits on line breaks, including empty paragraphs", () => {
    expect(paragraphRanges("a\n\nbc")).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 2 },
      { start: 3, end: 5 },
    ]);
  });

  it("styles a range of paragraphs and drops trailing defaults", () => {
    const t = layer("one\ntwo\nthree");
    const p = applyParagraphStyle(t, 1, 1, { align: "center", spaceBefore: 4 });
    expect(p).toHaveLength(2);
    expect(p[1]).toMatchObject({ align: "center", spaceBefore: 4 });
    expect(
      applyParagraphStyle({ ...t, paragraphs: p }, 0, 2, { align: "left", spaceBefore: 0 }),
    ).toEqual([]);
  });
});

describe("layout", () => {
  it("keeps point text on its lines", () => {
    const l = layoutText(layer("aaaa bbbb\ncc"), measure);
    expect(l.lines.map((line) => line.fragments.map((f) => f.text).join(""))).toEqual([
      "aaaa bbbb",
      "cc",
    ]);
    expect(l.width).toBe(90);
    expect(l.height).toBe(48); // 2 × 20 × 1.2
  });

  it("wraps paragraph text at the box and clips what does not fit", () => {
    const t = layer("aaaa bbbb cccc", { box: { width: 100, height: 24 } });
    const l = layoutText(t, measure);
    expect(
      l.lines.map((line) =>
        line.fragments
          .map((f) => f.text)
          .join("")
          .trim(),
      ),
    ).toEqual(["aaaa bbbb", "cccc"]);
    expect(l.width).toBe(100);
    expect(l.height).toBe(24);
    expect(l.overflow).toBe(true);
    expect(hardWrappedText(l, t.text)).toBe("aaaa bbbb\ncccc");
  });

  it("breaks a word longer than the box", () => {
    const l = layoutText(layer("abcdefghij", { box: { width: 45, height: 500 } }), measure);
    expect(l.lines.map((line) => line.fragments.map((f) => f.text).join(""))).toEqual([
      "abcd",
      "efgh",
      "ij",
    ]);
  });

  it("aligns, justifies and indents", () => {
    const box = { width: 200, height: 500 };
    const right = layoutText(layer("ab", { box, align: "right" }), measure);
    expect(right.lines[0].fragments[0].x).toBe(180);
    const center = layoutText(layer("ab", { box, align: "center" }), measure);
    expect(center.lines[0].fragments[0].x).toBe(90);
    const justified = layoutText(
      layer("aa bb cc dd ee ff gg hh ii jj kk", { box, align: "justify" }),
      measure,
    );
    const first = justified.lines[0];
    const last = first.fragments.at(-1)!;
    // Spread to the full width; the paragraph's last line stays left-aligned.
    const trailing = last.text.length - last.text.trimEnd().length;
    expect(last.x + last.width - trailing * 10).toBeCloseTo(200);
    expect(justified.lines.at(-1)!.fragments[0].x).toBe(0);
    const indented = layoutText(
      layer("aaaa", {
        paragraphs: [
          {
            align: "left",
            indentLeft: 10,
            indentRight: 0,
            indentFirst: 5,
            spaceBefore: 0,
            spaceAfter: 0,
          },
        ],
      }),
      measure,
    );
    expect(indented.lines[0].fragments[0].x).toBe(15);
  });

  it("draws capitals and small capitals", () => {
    const caps = layoutText(layer("ab", { caps: "all-caps" }), measure);
    expect(caps.lines[0].fragments[0].text).toBe("AB");
    const small = layoutText(layer("aB", { caps: "small-caps" }), measure);
    const [lower, upper] = small.lines[0].fragments;
    expect(lower).toMatchObject({ text: "A", size: 20 * SMALL_CAPS_SCALE });
    expect(upper).toMatchObject({ text: "B", size: 20 });
  });

  it("uses the tallest style on a line", () => {
    const t = layer("ab", { runs: [{ start: 1, end: 2, style: { fontSize: 40 } }] });
    const l = layoutText(t, measure);
    expect(l.lines[0].height).toBe(48);
  });
});

describe("text commands and projects", () => {
  const doc = () => {
    const base = createDocument({ name: "t", width: 100, height: 100 });
    return addLayer({ ...layer("Hello world"), id: "t" }).apply(base);
  };

  it("applies a whole-layer style over runs and keeps runs while text changes", () => {
    let d = updateTextLayer("t", {
      runs: [{ start: 6, end: 11, style: { color: "#ff0000", fontSize: 30 } }],
    }).apply(doc());
    d = updateTextLayer("t", { fontSize: 50 }).apply(d);
    const t = d.layers.find((l) => l.id === "t") as TextLayer;
    expect(t.runs).toEqual([{ start: 6, end: 11, style: { color: "#ff0000" } }]);
    const typed = updateTextLayer("t", { text: "Oh, Hello world" }).apply(d);
    expect((typed.layers.find((l) => l.id === "t") as TextLayer).runs[0]).toMatchObject({
      start: 10,
      end: 15,
    });
  });

  it("round-trips rich paragraph text and migrates old text layers", () => {
    const d = updateTextLayer("t", {
      box: { width: 80, height: 40 },
      runs: [{ start: 0, end: 5, style: { caps: "small-caps", baselineShift: 2 } }],
      paragraphs: [
        {
          align: "justify",
          indentLeft: 1,
          indentRight: 2,
          indentFirst: 3,
          spaceBefore: 4,
          spaceAfter: 5,
        },
      ],
      fontFamily: "Montserrat",
    }).apply(doc());
    const back = deserializeProject(JSON.parse(JSON.stringify(serializeDocument(d))));
    expect(back.ok && back.document.layers.find((l) => l.id === "t")).toMatchObject({
      box: { width: 80, height: 40 },
      fontFamily: "Montserrat",
      runs: [{ start: 0, end: 5, style: { caps: "small-caps", baselineShift: 2 } }],
    });

    const old = JSON.parse(JSON.stringify(serializeDocument(doc())));
    old.schemaVersion = 8;
    const t = old.document.layers[1];
    for (const k of ["box", "runs", "paragraphs", "caps", "kerning", "baselineShift"]) delete t[k];
    const migrated = deserializeProject(old);
    expect(migrated.ok && migrated.migratedFrom).toBe(8);
    expect(migrated.ok && migrated.document.layers[1]).toMatchObject({
      box: null,
      runs: [],
      paragraphs: [],
      caps: "normal",
      kerning: true,
      baselineShift: 0,
    });
  });

  it("refuses runs outside the text and unsafe font names in stored projects", () => {
    const raw = JSON.parse(JSON.stringify(serializeDocument(doc())));
    raw.document.layers[1].runs = [{ start: 3, end: 99, style: {} }];
    expect(deserializeProject(raw).ok).toBe(false);
    const bad = JSON.parse(JSON.stringify(serializeDocument(doc())));
    bad.document.fonts = [{ family: 'x"; }', weight: 400, italic: false, source: "local" }];
    expect(deserializeProject(bad).ok).toBe(false);
  });
});
