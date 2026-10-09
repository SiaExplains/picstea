# ADR-0019 — Retouching tools: clone, heal, dodge/burn/sponge, blur/sharpen/smudge (Gate 9f)

- Status: Accepted
- Date: 2026-10-09

## Context

docs/05 Phase 12 lists clone stamp, healing brush, dodge, burn and smudge. The brush (ADR-0007)
paints with canvas compositing: dabs go into a stroke buffer that is drawn over the layer. Retouching
needs to *read* the pixels under the brush and transform them, which compositing cannot express.

## Decision

### A pure pixel engine

`src/editor/retouch/` works on straight RGBA bytes in the layer's own space, with no canvas:

- **Coverage strokes** (clone, heal, dodge, burn, sponge, blur, sharpen). Dabs accumulate a
  coverage mask the way brush paint accumulates (source-over, Uint16). Each pixel shows
  `mix(base, effect(base), coverage · strength · selection)`, mixed in premultiplied space. So the
  effect never builds past the tool strength within one stroke, and only the dirty rectangle is
  recomputed per pointer move.
- **Effects** are per-pixel targets:
  - Dodge and burn move a pixel towards white or black, weighted by range (`(1−L)²`, `4L(1−L)`,
    `L²`); alpha is kept.
  - Sponge doubles the distance from grey, or removes it.
  - Blur and sharpen use a blurred copy computed lazily per 64 px tile (three box passes,
    premultiplied). Sharpen is an unsharp mask on colour only.
  - Clone reads a source image at a fixed integer offset and skips pixels whose source lies
    outside the layer.
- **Healing**: while dragging it is a clone. On release, the premultiplied difference
  `destination − source` is measured outside the stroke, within its bounds plus 3 px, and spread
  inside it with a push–pull pyramid (a fast approximation of a membrane / Laplace fill). The
  result keeps the source's texture with the destination's tone. There is no Poisson solve and no
  content-aware search; Spot Healing remains planned.
- **Smudge** is sequential: the tip carries a premultiplied patch picked up where the stroke
  starts, deposits it with the tip weight × strength, and picks up what it passes over at
  `1 − strength`.

### The tool

One `RetouchTool` class (4 toolbar tools: S, J, O, R) does the following:

1. Reads the layer once (`readLayerPixels`); for "Sample: All layers" it also reads the composite
   drawn into layer space (`readCompositeInLayerSpace`), snapshotted at stroke start so there is
   no feedback.
2. Converts the selection to layer coverage (`layerSelectionCoverage`).
3. Feeds dabs in layer space with the existing `StrokeInterpolator`.
4. Uploads only the changed rectangle with `putImageData` into a preview surface shown through
   the compositor's `overrides`.
5. On release, commits one asset and one `setRasterContent` step.

Clone and heal sources are set with Alt-click per document. "Aligned" keeps the offset between
strokes.

Memory per stroke is about 10 bytes per layer pixel (base, output, coverage) plus the preview
surface, comparable to the brush's three layer-size surfaces. Layers are capped at 36 MP.

## Consequences

- The retouching maths is deterministic and unit-tested in Node.
- New brush-based pixel effects need one `PixelEffect` and an options entry.
- The tools work on pixel layers only (not masks, smart objects, text or shapes), and strokes are
  not recorded in actions, like the brush.
