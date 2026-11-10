import { paragraphRanges, paragraphStyleAt, styledSegments } from "./text";
import type { CharStyle, ParagraphStyle, TextLayer } from "./types";

/**
 * Text layout (ADR-0041): breaks a text layer into positioned fragments. The single source of
 * truth for drawing (compositor, workers), measuring (layer bounds, hit testing), SVG and PSD
 * export. Pure: the caller supplies a measure function (a canvas, or an estimate in tests).
 */

/** Width in px of `text` drawn in `style` at `size` px (small caps draw at a smaller size). */
export type MeasureText = (text: string, style: CharStyle, size: number) => number;

export interface TextFragment {
  readonly text: string;
  readonly style: CharStyle;
  /** Font size actually drawn (smaller than `style.fontSize` for small-caps letters). */
  readonly size: number;
  /** Left edge, layer units. */
  readonly x: number;
  /** Vertical middle of the em box, layer units (canvas `textBaseline = "middle"`). */
  readonly y: number;
  readonly width: number;
}

export interface TextLine {
  readonly top: number;
  readonly height: number;
  /** First character of the line in the layer's text. */
  readonly start: number;
  /** One past the last character (trailing spaces included, the "\n" excluded). */
  readonly end: number;
  readonly fragments: readonly TextFragment[];
}

export interface TextLayout {
  readonly width: number;
  readonly height: number;
  readonly lines: readonly TextLine[];
  /** True when paragraph text did not fit its box (the rest is clipped). */
  readonly overflow: boolean;
}

/** Small capitals are drawn as capitals at this fraction of the size. */
export const SMALL_CAPS_SCALE = 0.75;
/** Offset of the em-box middle above the baseline, per px of font size (for mixed sizes). */
const MIDDLE_ABOVE_BASELINE = 0.35;

interface Piece {
  readonly text: string;
  readonly style: CharStyle;
  readonly size: number;
  readonly width: number;
}

/** A word plus its trailing spaces, possibly in several styles. */
interface Token {
  readonly start: number;
  readonly end: number;
  readonly pieces: readonly Piece[];
  /** Width without trailing spaces. */
  readonly inkWidth: number;
  readonly width: number;
  readonly endsWithSpace: boolean;
}

/** What is drawn for a source string in a style: capitals and small capitals applied. */
function displayPieces(text: string, style: CharStyle, measure: MeasureText): Piece[] {
  if (style.caps === "all-caps") {
    const shown = text.toUpperCase();
    return [
      { text: shown, style, size: style.fontSize, width: measure(shown, style, style.fontSize) },
    ];
  }
  if (style.caps !== "small-caps") {
    return [{ text, style, size: style.fontSize, width: measure(text, style, style.fontSize) }];
  }
  const out: Piece[] = [];
  for (const match of text.matchAll(/(\p{Ll}+)|([^\p{Ll}]+)/gu)) {
    const lower = match[1] !== undefined;
    const shown = lower ? match[0].toUpperCase() : match[0];
    const size = lower ? style.fontSize * SMALL_CAPS_SCALE : style.fontSize;
    out.push({ text: shown, style, size, width: measure(shown, style, size) });
  }
  return out;
}

function piecesWidth(pieces: readonly Piece[]): number {
  return pieces.reduce((sum, p) => sum + p.width, 0);
}

/** Split a paragraph into tokens (word + trailing spaces) carrying their styled pieces. */
function tokenize(
  text: string,
  from: number,
  to: number,
  segments: readonly { start: number; end: number; style: CharStyle }[],
  measure: MeasureText,
): Token[] {
  const tokens: Token[] = [];
  const source = text.slice(from, to);
  for (const match of source.matchAll(/\S+\s*|\s+/g)) {
    const start = from + match.index;
    const end = start + match[0].length;
    const pieces: Piece[] = [];
    let ink = 0;
    for (const seg of segments) {
      const a = Math.max(seg.start, start);
      const b = Math.min(seg.end, end);
      if (b <= a) continue;
      pieces.push(...displayPieces(text.slice(a, b), seg.style, measure));
    }
    const trailing = /\s*$/.exec(match[0])![0].length;
    if (trailing > 0 && trailing < match[0].length) {
      const inkPieces: Piece[] = [];
      for (const seg of segments) {
        const a = Math.max(seg.start, start);
        const b = Math.min(seg.end, end - trailing);
        if (b <= a) continue;
        inkPieces.push(...displayPieces(text.slice(a, b), seg.style, measure));
      }
      ink = piecesWidth(inkPieces);
    } else {
      ink = trailing === match[0].length ? 0 : piecesWidth(pieces);
    }
    tokens.push({
      start,
      end,
      pieces,
      inkWidth: ink,
      width: piecesWidth(pieces),
      endsWithSpace: trailing > 0,
    });
  }
  return tokens;
}

/** Break one token that is wider than a whole line into tokens of single characters. */
function splitToken(
  token: Token,
  text: string,
  segments: readonly { start: number; end: number; style: CharStyle }[],
  measure: MeasureText,
): Token[] {
  const out: Token[] = [];
  for (let i = token.start; i < token.end;) {
    const cp = text.codePointAt(i)!;
    const next = i + (cp > 0xffff ? 2 : 1);
    const seg = segments.find((s) => i >= s.start && i < s.end) ?? segments[0];
    const pieces = displayPieces(text.slice(i, next), seg.style, measure);
    const width = piecesWidth(pieces);
    const space = /\s/.test(text[i]);
    out.push({
      start: i,
      end: next,
      pieces,
      inkWidth: space ? 0 : width,
      width,
      endsWithSpace: space,
    });
    i = next;
  }
  return out;
}

interface DraftLine {
  tokens: Token[];
  start: number;
  end: number;
  first: boolean;
  last: boolean;
  paragraph: ParagraphStyle;
  paragraphIndex: number;
}

/** Lay out `layer`. Point text never wraps; paragraph text wraps at its box width. */
export function layoutText(
  layer: Pick<TextLayer, "text" | "runs" | "paragraphs" | "align" | "box"> & CharStyle,
  measure: MeasureText,
): TextLayout {
  const { text, box } = layer;
  const segments = styledSegments(layer);
  const draft: DraftLine[] = [];

  paragraphRanges(text).forEach((range, paragraphIndex) => {
    const paragraph = paragraphStyleAt(layer, paragraphIndex);
    const available = (first: boolean) =>
      box
        ? Math.max(
            1,
            box.width -
              paragraph.indentLeft -
              paragraph.indentRight -
              (first ? paragraph.indentFirst : 0),
          )
        : Infinity;
    const tokens = tokenize(text, range.start, range.end, segments, measure);
    const lines: DraftLine[] = [];
    let current: DraftLine = {
      tokens: [],
      start: range.start,
      end: range.start,
      first: true,
      last: false,
      paragraph,
      paragraphIndex,
    };
    let width = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].inkWidth > available(false) && tokens[i].end - tokens[i].start > 1) {
        // A word longer than a whole line: break it between characters.
        tokens.splice(i, 1, ...splitToken(tokens[i], text, segments, measure));
      }
      const token = tokens[i];
      if (current.tokens.length > 0 && width + token.inkWidth > available(current.first)) {
        lines.push(current);
        current = { ...current, tokens: [], start: token.start, end: token.start, first: false };
        width = 0;
      }
      current.tokens.push(token);
      current.end = token.end;
      width += token.width;
    }
    current.last = true;
    current.end = Math.max(current.end, range.end);
    lines.push(current);
    draft.push(...lines);
  });

  // Vertical metrics, then horizontal placement.
  const contentWidth = (line: DraftLine) => {
    let w = 0;
    line.tokens.forEach((t, i) => {
      w += i === line.tokens.length - 1 ? t.inkWidth : t.width;
    });
    return w;
  };
  const indentOf = (line: DraftLine) =>
    line.paragraph.indentLeft + (line.first ? line.paragraph.indentFirst : 0);
  const blockWidth = box
    ? box.width
    : Math.max(
        layer.fontSize * 0.5,
        ...draft.map((l) => indentOf(l) + contentWidth(l) + l.paragraph.indentRight),
      );

  const lines: TextLine[] = [];
  let top = 0;
  draft.forEach((line, lineIndex) => {
    if (line.first && lineIndex > 0) top += line.paragraph.spaceBefore;
    const pieces = line.tokens.flatMap((t) => t.pieces);
    const styleHere =
      segments.find((s) => line.start >= s.start && line.start < s.end)?.style ??
      segments.at(-1)!.style;
    const sizes = pieces.length > 0 ? pieces.map((p) => p.style) : [styleHere];
    const height = Math.max(...sizes.map((s) => s.fontSize * s.lineHeight));
    const maxSize = Math.max(...sizes.map((s) => s.fontSize));
    const ink = contentWidth(line);
    const indent = indentOf(line);
    const room = blockWidth - indent - line.paragraph.indentRight;
    let x = indent;
    let gapExtra = 0;
    const align = line.paragraph.align;
    if (align === "right") x = indent + room - ink;
    else if (align === "center") x = indent + (room - ink) / 2;
    else if (align === "justify" && box && !line.last) {
      const gaps = line.tokens.slice(0, -1).filter((t) => t.endsWithSpace).length;
      if (gaps > 0 && room > ink) gapExtra = (room - ink) / gaps;
    }
    const middle = top + height / 2;
    const fragments: TextFragment[] = [];
    line.tokens.forEach((token, tokenIndex) => {
      for (const piece of token.pieces) {
        const y =
          middle +
          (maxSize - piece.style.fontSize) * MIDDLE_ABOVE_BASELINE -
          piece.style.baselineShift;
        const prev = fragments.at(-1);
        if (
          prev &&
          gapExtra === 0 &&
          prev.style === piece.style &&
          prev.size === piece.size &&
          prev.y === y
        ) {
          fragments[fragments.length - 1] = {
            ...prev,
            text: prev.text + piece.text,
            width: prev.width + piece.width,
          };
        } else {
          fragments.push({
            text: piece.text,
            style: piece.style,
            size: piece.size,
            x,
            y,
            width: piece.width,
          });
        }
        x += piece.width;
      }
      if (gapExtra > 0 && tokenIndex < line.tokens.length - 1 && token.endsWithSpace) x += gapExtra;
    });
    lines.push({ top, height, start: line.start, end: line.end, fragments });
    top += height;
    if (line.last) top += line.paragraph.spaceAfter;
  });

  const contentHeight = lines.length > 0 ? lines.at(-1)!.top + lines.at(-1)!.height : 0;
  return {
    width: box ? box.width : Math.ceil(blockWidth),
    height: box ? box.height : Math.ceil(contentHeight),
    lines,
    overflow: !!box && contentHeight > box.height + 0.5,
  };
}

/** Text of `layer` with a "\n" wherever paragraph text wrapped (Convert to Point Text). */
export function hardWrappedText(layout: TextLayout, text: string): string {
  let out = "";
  layout.lines.forEach((line, i) => {
    let chunk = text.slice(line.start, line.end);
    const next = layout.lines[i + 1];
    if (next && text[line.end] !== "\n") chunk = chunk.replace(/\s+$/, "");
    out += chunk;
    if (next) out += "\n";
  });
  return out;
}
