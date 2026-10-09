# ADR-0014 — Precision tools, filters and tone adjustments (Gate 9a)

- Status: Accepted
- Date: 2026-10-09

## Context

Gate 9 (docs/14, "Professional Parity") is open-ended: paths, advanced colour, filters, smart
objects, advanced PSD, professional shortcuts, guides, snapping and automation. To keep reviews
reasonable it ships in slices; 9a covers rulers/guides/grid/snapping/align (docs/05 Phase 11),
the filter framework (Phase 8) and Levels/Curves (Phase 12, "advanced colour"). Later slices:
9b paths and vector/clipping masks, 9c smart objects and advanced PSD, 9d automation, swatches
and the history panel.

## Decision

### Guides, grid and snapping

- **Guides are document data** (`EditorDocument.guides`, already in schema v3): edited only
  through commands (`addGuide`, `moveGuide`, `removeGuide`, `clearGuides`), so they are
  undoable and saved. A guide drag is drawn as an overlay and changes the document once, on
  release — one history step per drag (New / Move / Delete Guide). Guides and the grid are drawn
  by the renderer in screen space and are never part of a composite, so they can't be exported.
- **View preferences are not document data.** Rulers, guide visibility, lock, grid, grid size and
  snap live in a `ViewSettings` observable on the controller; the UI keeps them in local storage
  (`mylper.view`, listed in the cookie policy). Rulers are off by default (they shrink the canvas).
- **Snapping is pure maths** (`core/geometry/snapping.ts`): targets are collected from the
  document (guides, canvas edges and centre, visible layers' bounds, the grid as a formula rather
  than a list of lines), cached per document state in the tool manager, and matched within
  6 CSS px (converted by zoom). Guides win ties over canvas, layers and grid. Tools get targets
  through `ToolContext.snapTargets` and report the matched lines as a `snap` overlay (smart
  guides). Holding Cmd/Ctrl during a drag disables snapping, as in other editors. Snapping is on
  by default; it can change where a drag ends by up to 6 screen pixels near a target, which is
  the intent.
- **Align** reuses `translateLayer`; distribute waits for multi-layer selection.

### Filters

- **A catalogue, not hard-coded features** (`filters/registry.ts`): each filter is data (id,
  name, menu group, typed parameters) plus one pure function on straight RGBA. Menus, the dialog,
  validation and the worker job all derive from it. The docs/05 interface's `apply` is
  synchronous here because it runs inside a worker job; the asynchronous boundary is the job
  runner.
- **Destructive on pixel layers**, one undo step (`setRasterContent`), within the undo memory
  budget. Non-destructive "smart filters" belong with smart objects (9c).
- **Runs in the worker** (`filter` job) with the main-thread fallback. The preview runs on at most
  2 MP (pixel-sized parameters scale with it) and is shown through a raster-layer override in the
  composite preview; the applied result is full resolution. Noise takes a seed so preview and
  result match.
- **Selections** are honoured by mapping the selection's coverage into the layer's own space
  (through its transform) and mixing filtered and original pixels by that coverage, so feathered
  selections blend.
- **Correctness details**: blurs work on premultiplied colour (no dark fringes at transparent
  edges); Gaussian blur is three box passes (O(n) per pixel, any radius); byte buffers keep peak
  memory near three times the layer.

### Levels and Curves

- Two new `Adjustment` variants with settings for the composite RGB channel and each colour
  channel (`ToneChannels`). Both compile to lookup tables (RGB first, then per channel).
  Curves use monotone cubic (Fritsch–Carlson) interpolation so the curve never overshoots
  between points; 2–16 points with strictly increasing inputs.
- The adjustment registry gains an optional `parse` hook for structured settings; validation of
  stored projects goes through it, so malformed curves are rejected.
- **No schema migration**: schema v3 documents remain valid. A project that uses Levels or Curves
  will not open in an older MYLPER build (the validator there doesn't know the types); that is
  acceptable for a forward-only web app.
- PSD export keeps them in the composite only, like the other adjustments.

## Consequences

- Precise layout is possible without new document concepts; guides are compatible with PSD
  later (Photoshop stores guides in an image resource).
- New filters are one registry entry plus a pure, unit-testable function.
- The Move tool's drags now snap; tests that measure exact drag sizes near a target turn
  snapping off.
