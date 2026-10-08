# ADR-0010 — Selection subsystem

- Status: Accepted
- Date: 2026-10-09

## Context

Gate 5 (docs/14) asks for selections and advanced tools; docs/05 Phase 5 lists the selection
features and says selection "must become a reusable subsystem". Selections must work with every
pixel operation (painting, fill, gradient, clear, copy, masks) and with undo, and must stay
local-first and framework-free.

## Decision

- **Model.** A selection is an immutable `SelectionMask`: one byte of coverage per document pixel
  (0 = not selected, 255 = fully selected) plus its bounds. Soft values carry anti-aliased edges
  and feathering. "Nothing selected" is always `undefined`, never an empty mask.
- **Pure core.** `src/editor/selection/` holds all selection maths with no canvas: shape
  rasterisation (rectangle, ellipse, polygon with 4× vertical supersampling and exact horizontal
  coverage), combine (replace/add/subtract/intersect), invert, translate, feather (three box
  blurs), expand/contract (O(n) sliding max), affine transform (bilinear), flood fill / colour
  range, and the marching-ants outline. It is unit-tested and can move to a worker unchanged.
- **In the document, not in the file.** `EditorDocument.selection` is set only through selection
  commands, so selection changes are undoable like any edit. `serializeDocument` drops it: a
  selection is session state and is never written to IndexedDB. Commands that change the canvas
  size (crop, canvas size) drop the selection.
- **Memory.** Each distinct mask in a document and its undo history counts toward the existing
  pixel budget (`enforcePixelBudget`), one byte per pixel.
- **Pixels.** `src/editor/pixels/layer-pixels.ts` is the single bridge between masks and canvas:
  reading composite or single-layer pixels, turning a mask into an alpha surface (cached per
  mask), and producing the new immutable asset for an edit through the layer transform. The
  brush clips each refresh through a copy of the stroke buffer, so soft edges are applied once.
- **Tools.** Marquee, lasso and magic wand share one base (mode from options or modifiers, drag
  inside to move, arrow nudges). Transform Selection is a modal tool that reuses the Free
  Transform handle maths. Paint bucket, gradient and eyedropper reuse the flood fill and pixel
  helpers.
- **Clipboard.** Copy keeps the pixels in memory (pasted at their original position) and offers
  them to the system clipboard as PNG via `navigator.clipboard.write`, which stays on the device.
  Paste uses the browser's paste event, so images copied in other apps still arrive; when the
  pasted image is our own copy (same size) the in-app copy is used.

## Consequences

- Selection, flood fill and colour range run on the main thread; Gate 7 can move the pure core
  into workers.
- Moving selected pixels with the Move tool (floating selections), quick mask, refine edge and
  saved selections are not implemented yet; Cut/Paste and Layer via Copy cover the common cases.
- Expand/contract use a square radius; a circular structuring element can replace it later
  without changing callers.
