# ADR-0015 — Vector paths, vector masks and clipping masks (Gate 9b)

- Status: Accepted
- Date: 2026-10-09

## Context

Slice 9b of Gate 9 (docs/14) covers docs/05 Phase 10 (pen tool, anchors, handles, paths, path
selection, vector shapes, fill and stroke, path ↔ selection) and the remaining Phase 9 masks
(clipping and vector masks). docs/03 requires these to be model concepts, not pixels.

## Decision

### Path model

- `VectorPath = { subpaths: { closed, anchors: { x, y, in, out }[] }[] }` — cubic Bézier anchors
  with **absolute** control points; a control point equal to its anchor is a corner. Pure code in
  `src/editor/core/path`. One serialisation to SVG path data drives SVG export and tests; the
  canvas traces the same segments directly.
- Fill rule is **even-odd** everywhere (shapes, vector masks, path → selection, SVG
  `fill-rule`), so overlapping subpaths cut holes consistently and traced selections with holes
  round-trip.
- `parsePath` validates untrusted paths (finite coordinates ≤ 1e6, ≤ 64 subpaths, ≤ 4096
  anchors); the project validator also caps anchors per document (100 000). Commands run the same
  parser, so a tool can never create something a project couldn't store. Flattening caps steps
  per segment, so hostile control points cannot explode the point count.

### Where paths live

- **Path shape layers**: `ShapeLayer.shape = "path"` with `path` in layer-local coordinates.
  The layer box is always the path bounds; when an edit moves the outline past the box, the box
  and the transform origin move together (through the layer matrix), so the shape stays put on
  the canvas and every existing shape feature (fill, stroke, transform, effects, Properties
  panel) works unchanged.
- **The work path**: `EditorDocument.workPath` in document space (like Photoshop's work path),
  undoable and saved. One per document; a Paths panel with named paths is future work.
- **Vector masks**: `BaseLayer.vectorMask = { path, enabled, linked }` in document space. Linked
  masks move with the layer (moves, nudges, group moves); crops and canvas resizes shift the work
  path and all masks.
- **Clipping**: `BaseLayer.clipped`. A layer clips to the nearest unclipped layer below it in the
  same list.
- **Schema v4** with an identity migration: older builds now refuse v4 projects with "saved by a
  newer version" instead of failing validation.

### Tools

- **Pen** (Shape / Path modes) keeps the path being drawn as tool state and commits once — one
  undo step — as a shape layer or as an addition to the work path. Path commands (Make
  Selection, Mask, Shape) finish an in-progress path first.
- **Direct Selection** edits whichever path is under the pointer among the active path shape,
  the active layer's vector mask and the work path. Every edit is converted back through a
  `PathTarget` into the right command; a drag is one merged undo step.

### Rendering

- An active vector mask isolates the layer like a raster mask and multiplies with it (filled path
  drawn to a mask surface, `destination-in`). Adjustment layers honour vector masks too.
- **Clipping groups**: the base renders into its own surface (with its masks); each clipped layer
  renders isolated, is multiplied by the base's alpha and is blended onto the base surface with
  its own opacity and blend mode; clipped adjustment layers adjust the base surface only (without
  the composite cache). The base surface is then drawn with the base's opacity, blend mode and
  effects. Documents without clipping take the previous code path unchanged. The gesture prefix
  cache never splits a base from its clipped layers.
- Known difference: on semi-transparent base pixels, clipped content can add a little coverage
  compared with Photoshop. Opaque bases are identical.

### Formats

- **PSD**: the layer-record clipping byte is now read and written (it was ignored with a
  warning). Vector masks and path shapes are exported as pixels with a warning; reading and
  writing Photoshop vector data (`vmsk`, `vogk`) belongs to 9c ("advanced PSD").
- **SVG**: path shapes are `<path>`; documents with clipping are flattened (like adjustments);
  layers with vector masks are embedded as images.

## Consequences

- Paths are a reusable primitive for later work (text on a path, Paths panel, PSD vector import).
- Projects saved with 0.9.0 don't open in 0.8.0; the message says why.
