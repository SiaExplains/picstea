# ADR-0041 — Paragraph text, character and paragraph styles

- Status: Accepted
- Date: 2026-11-08
- Extends: ADR-0005 (serialization), ADR-0017 (advanced PSD), ADR-0040 (fonts)

## Context

Text was point text with one style per layer: no wrapping, no mixed styles, and PSD import kept only
the first style. It was the largest gap against Photopea and Photoshop.

## Decision

- **Model (schema v9, migration 8 → 9).** A text layer keeps its fields as the *base* style and
  gains `box` (null = point text), `runs` (sorted, non-overlapping `[start, end)` ranges with a
  partial character style) and `paragraphs` (one style per "\n"-separated paragraph). Character
  style adds baseline shift, capitals (all / small) and kerning; alignment adds justify; paragraphs
  have left, right and first-line indents and space before and after. Old layers migrate to point
  text with no runs.
- **One layout.** `core/document/text-layout.ts` turns a layer into positioned fragments with an
  injected measure function: greedy word wrapping at the box width (over-long words break between
  characters), indents, justify (not on a paragraph's last line), the tallest style sets each line's
  height, small caps are drawn as capitals at 75 %. The compositor, the sizer (bounds, hit tests),
  SVG export and PSD export all use it; paragraph text is clipped to its box.
- **Editing.** The on-canvas editor is a `contenteditable` element (plain text only) with one block
  per paragraph and one span per run, so styles show while typing; the DOM is read back after each
  input and re-rendered only when styles change from outside. The Type tool clicks for point text
  and drags for a box; the box has resize handles. The whole session stays one undo step.
- **Panels.** Character and Paragraph join the History/Swatches/Actions tabs. While typing they act
  on the selected characters (or the paragraphs under the selection); otherwise on whole layers.
  Layer → Type converts point ↔ paragraph text (paragraph → point keeps the lines as wrapped).
- **PSD round trip.** Import reads every style run, every paragraph run and `BoxBounds` for boxes.
  Export writes a `TySh` block with EngineData built by `engine-data-write.ts` (the inverse of the
  existing parser), so text stays editable; the layer keeps a pixel preview. Text with layer
  effects is still rasterised (effects are merged into pixels). Units follow the importer: EngineData
  sizes are treated as document pixels.

## Consequences

- Wrapping in the editor (browser layout) and on the canvas (our layout) can differ by a word in
  rare cases while typing; the committed layer always uses our layout.
- PSD export of text has been verified with Picstea's own reader; a check in Photoshop is part of
  the release notes for this change.
- Not covered: text on a path, vertical text, warps, OpenType features beyond kerning, hyphenation.
