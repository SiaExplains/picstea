import type { CharStyle, ParagraphStyle, TextAlign, TextLayer, TextRun } from "./types";

/**
 * Rich text helpers (ADR-0041): resolving the style of every character and paragraph of a text
 * layer, and editing runs. Pure functions over immutable data.
 */

/**
 * A font family name that is safe in a CSS `font` value and an SVG attribute: no quotes,
 * backslashes, brackets or CSS punctuation (so never `url(…)` or an escape).
 */
export function isFontFamilyName(value: unknown): value is string {
  return (
    typeof value === "string" && /^[^"'\\<>{}()[\];:\n\r\t]{1,128}$/.test(value) && !!value.trim()
  );
}

export const CHAR_STYLE_KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "italic",
  "color",
  "lineHeight",
  "letterSpacing",
  "baselineShift",
  "caps",
  "kerning",
] as const satisfies readonly (keyof CharStyle)[];

export const PARAGRAPH_STYLE_KEYS = [
  "align",
  "indentLeft",
  "indentRight",
  "indentFirst",
  "spaceBefore",
  "spaceAfter",
] as const satisfies readonly (keyof ParagraphStyle)[];

export function baseCharStyle(layer: CharStyle): CharStyle {
  const out: Record<string, unknown> = {};
  for (const key of CHAR_STYLE_KEYS) out[key] = layer[key];
  return out as unknown as CharStyle;
}

export function defaultParagraph(align: TextAlign): ParagraphStyle {
  return { align, indentLeft: 0, indentRight: 0, indentFirst: 0, spaceBefore: 0, spaceAfter: 0 };
}

/** `[start, end)` of every paragraph ("\n" ends a paragraph and belongs to none). */
export function paragraphRanges(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === "\n") {
      out.push({ start, end: i });
      start = i + 1;
    }
  }
  return out;
}

export function paragraphStyleAt(
  layer: Pick<TextLayer, "align" | "paragraphs">,
  index: number,
): ParagraphStyle {
  return layer.paragraphs[index] ?? defaultParagraph(layer.align);
}

/** Index of the paragraph containing character `offset`. */
export function paragraphIndexAt(text: string, offset: number): number {
  let index = 0;
  for (let i = 0; i < Math.min(offset, text.length); i++) if (text[i] === "\n") index++;
  return index;
}

const sameValue = (a: unknown, b: unknown) => a === b;

/** True when `style` sets nothing that differs from `base`. */
function isEmptyOver(style: Partial<CharStyle>, base: CharStyle): boolean {
  return CHAR_STYLE_KEYS.every((k) => style[k] === undefined || sameValue(style[k], base[k]));
}

function sameStyle(a: Partial<CharStyle>, b: Partial<CharStyle>): boolean {
  return CHAR_STYLE_KEYS.every((k) => sameValue(a[k], b[k]));
}

/** Drop keys equal to the base style. */
function trimStyle(style: Partial<CharStyle>, base: CharStyle): Partial<CharStyle> {
  const out: Record<string, unknown> = {};
  for (const k of CHAR_STYLE_KEYS) {
    if (style[k] !== undefined && !sameValue(style[k], base[k])) out[k] = style[k];
  }
  return out as Partial<CharStyle>;
}

/**
 * Sorted, non-overlapping, non-empty runs within `[0, length)`, with no keys equal to the base
 * and adjacent equal runs merged.
 */
export function normalizeRuns(
  runs: readonly TextRun[],
  base: CharStyle,
  length: number,
): TextRun[] {
  const sorted = runs
    .map((r) => ({
      start: Math.max(0, Math.min(length, r.start)),
      end: Math.max(0, Math.min(length, r.end)),
      style: trimStyle(r.style, base),
    }))
    .filter((r) => r.end > r.start && !isEmptyOver(r.style, base))
    .sort((a, b) => a.start - b.start);
  const out: TextRun[] = [];
  for (const run of sorted) {
    const last = out.at(-1);
    if (last && run.start < last.end) {
      // Overlap: the later run wins from its start.
      out[out.length - 1] = { ...last, end: run.start };
      if (out[out.length - 1].end <= last.start) out.pop();
    }
    const prev = out.at(-1);
    if (prev && prev.end === run.start && sameStyle(prev.style, run.style)) {
      out[out.length - 1] = { ...prev, end: run.end };
    } else {
      out.push(run);
    }
  }
  return out;
}

/** The full style of every character range of `layer`, covering the whole text. */
export function styledSegments(
  layer: Pick<TextLayer, "text" | "runs"> & CharStyle,
): { start: number; end: number; style: CharStyle }[] {
  const base = baseCharStyle(layer);
  const out: { start: number; end: number; style: CharStyle }[] = [];
  let at = 0;
  for (const run of layer.runs) {
    if (run.start > at) out.push({ start: at, end: run.start, style: base });
    out.push({ start: run.start, end: run.end, style: { ...base, ...run.style } });
    at = run.end;
  }
  if (at < layer.text.length || out.length === 0) {
    out.push({ start: at, end: layer.text.length, style: base });
  }
  return out;
}

/** The style of the character at `offset` (the one before it at the end of the text). */
export function charStyleAt(
  layer: Pick<TextLayer, "text" | "runs"> & CharStyle,
  offset: number,
): CharStyle {
  const at = Math.max(0, Math.min(offset, layer.text.length - 1));
  const run = layer.runs.find((r) => at >= r.start && at < r.end);
  return { ...baseCharStyle(layer), ...run?.style };
}

/** Apply `patch` to characters `[start, end)`; returns the new runs. */
export function applyCharStyle(
  layer: Pick<TextLayer, "text" | "runs"> & CharStyle,
  start: number,
  end: number,
  patch: Partial<CharStyle>,
): TextRun[] {
  const base = baseCharStyle(layer);
  const pieces: TextRun[] = [];
  for (const seg of styledSegments(layer)) {
    const parts: [number, number, boolean][] = [
      [seg.start, Math.min(seg.end, start), false],
      [Math.max(seg.start, start), Math.min(seg.end, end), true],
      [Math.max(seg.start, end), seg.end, false],
    ];
    for (const [a, b, inside] of parts) {
      if (b <= a) continue;
      pieces.push({ start: a, end: b, style: inside ? { ...seg.style, ...patch } : seg.style });
    }
  }
  return normalizeRuns(pieces, base, layer.text.length);
}

/**
 * Keep runs aligned with an edited text: `[from, to)` of the old text was replaced by
 * `insertedLength` characters, which take the style of the character before them.
 */
export function shiftRuns(
  runs: readonly TextRun[],
  from: number,
  to: number,
  insertedLength: number,
): TextRun[] {
  const delta = insertedLength - (to - from);
  const inserted = from + insertedLength;
  const out: TextRun[] = [];
  for (const run of runs) {
    let { start, end } = run;
    if (end < from || (end === from && to > from)) {
      // Entirely before the edit: unchanged.
    } else if (end === from) {
      // A pure insertion right after this run takes its style.
      end = inserted;
    } else if (start >= to && !(start === to && to === from)) {
      start += delta;
      end += delta;
    } else if (start < from) {
      // Starts before the edit: keeps its head and takes the inserted text.
      end = end > to ? end + delta : inserted;
    } else {
      // Starts inside the replaced range: only its part after the edit is left — unless it starts
      // exactly there (typing over a selection, or at the very start), when the new text takes
      // its style.
      start = start === from && (to > from || from === 0) ? from : inserted;
      end = end > to ? end + delta : inserted;
    }
    if (end > start) out.push({ ...run, start, end });
  }
  return out;
}

/** Remove paragraph styles past the last paragraph, and trailing defaults. */
export function normalizeParagraphs(
  paragraphs: readonly ParagraphStyle[],
  text: string,
  align: TextAlign,
): ParagraphStyle[] {
  const count = paragraphRanges(text).length;
  const out = paragraphs.slice(0, count);
  const def = defaultParagraph(align);
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (!PARAGRAPH_STYLE_KEYS.every((k) => last[k] === def[k])) break;
    out.pop();
  }
  return out;
}

/** Apply `patch` to paragraphs `first…last` (inclusive); returns the new paragraph list. */
export function applyParagraphStyle(
  layer: Pick<TextLayer, "text" | "align" | "paragraphs">,
  first: number,
  last: number,
  patch: Partial<ParagraphStyle>,
): ParagraphStyle[] {
  const count = paragraphRanges(layer.text).length;
  const out: ParagraphStyle[] = [];
  for (let i = 0; i < count; i++) {
    const style = paragraphStyleAt(layer, i);
    out.push(i >= first && i <= last ? { ...style, ...patch } : style);
  }
  return normalizeParagraphs(out, layer.text, layer.align);
}
