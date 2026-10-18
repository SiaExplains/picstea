# ADR-0016 — Smart objects and smart filters (Gate 9c)

- Status: Accepted
- Date: 2026-10-09

## Context

docs/05 Phase 14 asks for embedded documents, non-destructive transformations and editable placed
files; ADR-0014 deferred non-destructive ("smart") filters to smart objects. Gate 9 was re-sliced
so that 9c covers smart objects and 9d the advanced PSD work (a Photoshop descriptor parser is
needed there, including for importing PSD smart objects).

## Decision

### Model

- `SmartObjectLayer { kind: "smart", content: EditorDocument, filters?: SmartFilter[] }`. The
  embedded document is a full document (size, layers, guides, work path), so every existing tool
  and the renderer work on it unchanged. Its layer box is the content size; it is transformable.
- `SmartFilter { id, filterId, values, enabled, seed }` reuses the 9a filter catalogue and its
  validation; the seed keeps random filters identical across renders.
- Tree utilities that need the whole picture descend into contents: `referencedAssetIds`
  (persistence, memory retention, garbage collection), `mapLayersDeep` (project import asset
  remapping). Layer lookups (`findLayer`, selection, commands) deliberately do not — the contents
  are only edited through an Edit Contents tab.
- The validator validates contents recursively with the same layer and path budgets and a
  nesting limit of 4. **Schema v5** (identity migration).

### Rendering

- The compositor draws a smart object by compositing its contents at a power-of-two *level* of
  the scale it appears at (render-space scale × layer scale), capped at 4× and 16 MP, and
  drawing that through the layer transform. Scaling down and up again therefore re-renders from
  the source and stays sharp.
- Renders are cached per immutable content object (`WeakMap`), keyed by level, enabled filters
  and asset version, with at most three entries per content; panning or editing other layers
  doesn't re-render them. Renders with images still decoding aren't cached.
- Smart filters run in order on that render on a cache miss (main thread, at render scale, with
  pixel-sized parameters scaled like the 9a preview). Export renders at level 1.

### Editing contents

- Edit Contents opens a copy of the contents as an ordinary tab with a fresh id, linked in the
  controller (not in the document) to its parent layer. Saving that tab — Cmd/Ctrl+S, autosave,
  closing it, or `saveAllDirty` before unload — applies it to the parent with
  `replaceSmartContent`, never to project storage. All applies of one editing session share a
  merge key, so the parent gets a single "Edit Contents" undo step. Closing a parent applies
  and closes its child tabs first. If the parent layer is gone, the apply fails with a message
  and the tab stays open (Save Project As still works).

### Smart filters in the UI

- On a smart object, the Filter menu adds a smart filter. The dialog previews by updating the
  filter list (one merged history entry); Cancel undoes that entry, OK seals it. Edit, hide,
  reorder and delete are separate undoable commands in the Properties panel.

### Other

- Convert keeps the layer's look inside (its opacity, blend mode, masks, effects); the smart
  object takes the clipping flag. Rasterize (smart objects, shapes, text) renders the layer
  without its opacity, blend, masks and effects and keeps those on the new pixel layer.
- Place Embedded wraps an image, SVG, PSD (layers kept, via the existing PSD import) or a
  `.picstea` project in a smart object; Place still creates pixel layers.
- PSD export rasterises smart objects with a warning; SVG embeds them as images.

## Consequences

- Placed and converted content stays editable and lossless at any scale.
- Documents can grow large through nesting; budgets and the nesting limit bound validation, and
  the render cache bounds per-content memory.
- 0.10.0 projects don't open in older builds (clear message).
