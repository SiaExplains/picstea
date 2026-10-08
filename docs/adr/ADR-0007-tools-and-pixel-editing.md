# ADR-0007 — Tool architecture, pixel editing and the pixel-memory budget

- Status: Accepted
- Date: 2026-10-08

## Context

Gate 3 adds interactive tools (move/transform, crop, brush, eraser, shapes, text) and the first
destructive pixel edits. docs/15 rule 2 keeps editor logic out of React, and ADR-0003 relies on
immutable assets for cheap snapshot undo.

## Decision

**Tools are framework-free objects** (`src/editor/tools/*`) implementing `Tool`:
pointer down/move/up, keys, double-click, cancel, plus `preview()` and `overlays()` for the
renderer. `ToolManager` (`src/editor/controller/tool-manager.ts`) routes input from the viewport
to the active tool. Tools change documents only through commands. Hand and Zoom stay viewport
concerns. Tool settings and colours live in the store as UI state, outside history.

**Rendering feedback without committing**: a render scene can carry
- `preview.overrides`: a live surface replacing a raster layer's pixels (stroke in progress)
- `preview.extraLayers`: draft layers (a shape being dragged)
- `preview.hiddenLayerIds`: e.g. the text layer under the on-canvas editor
- `overlays`: transform box and handles, crop box and shading, and the brush outline, drawn in screen space
  so they stay 1 CSS pixel at any zoom.

**Gestures are one undo step**: drags use a unique `mergeKey` plus `mergeUntilSealed`, so slow
drags still merge, and the history is sealed on pointer up.

**Pixel editing**: dabs (radial-gradient tip for hardness, even spacing via
`StrokeInterpolator`) accumulate in a stroke buffer. The preview is `base + buffer` at the tool
opacity (`destination-out` for the eraser). On release the preview surface becomes a **new
immutable asset**, committed with `setRasterContent`. Painted assets are PNG-encoded lazily, on
first save (`AssetStore.getBlob`).

**Text** is edited in a transparent `<textarea>` laid over the canvas with the layer's
font and transform. This gives native caret, selection, IME and screen-reader support. Commit
creates, updates or (when emptied) deletes the text layer.

**Pixel-memory budget**: every stroke keeps a full-layer bitmap for undo. After each pixel commit
the controller estimates the decoded bytes of all assets referenced by open documents and
their history (w×h×4). Above the budget (768 MB by default) it drops the oldest undo steps and
releases unreferenced assets. The current state of every document is always kept.

**Schema v2**: shape and text layers, plus `RasterLayer.assetId: null` for empty layers. v1→v2
is an identity migration (ADR-0005), so older builds refuse v2 projects instead of misreading
them.

## Alternatives

- Tile-based undo deltas (store only changed tiles per stroke): much lower memory, but
  significantly more complex. Deferred to Gate 7, when large-document performance is the focus.
  The `setRasterContent` command boundary stays the same.
- `contenteditable` or canvas-drawn text editing: weaker accessibility and IME support.
- Rasterizing shapes and text on creation: rejected. It is destructive and contradicts docs/01 §5.

## Consequences

- Very long painting sessions on large layers lose their oldest undo steps instead of exhausting
  memory. This is logged at info level, without document data.
- Raster layers have a fixed size (document size for new layers). Painting outside a layer's box
  is clipped. Auto-expanding layers is a later improvement.
- Scaling a shape scales its stroke width too (canvas transform).
