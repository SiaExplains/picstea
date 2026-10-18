# ADR-0026 — Layers panel workflow: context menu, Layer Style dialog, merge, labels, resizable panels

- Status: Accepted
- Date: 2026-10-19

## Context

Users coming from Photoshop or Photopea expect to right-click a layer, double-click it for its
styles, drag it onto the trash, merge layers and size the panels themselves.

## Decision

- **Right-click menu** (`ContextMenu`, reusable): Blending Options, Select Pixels, Duplicate,
  Delete, smart-object actions, Rasterize, Rasterize Layer Style, clipping, Merge Down, Flatten
  Image and a Color submenu. Right-clicking outside the selection selects that layer first.
  Keyboard: arrows, Home/End, → / ← for the submenu, Esc closes.
- **New commands** (`merge-commands.ts`), pure like every command; the controller renders the
  pixels first with the compositor and passes the asset in (as Rasterize does):
  - Merge Down: the lower layer keeps its name, opacity, blend mode, clipping and label; its
    pixels are the two layers drawn together (masks and effects applied). Groups and adjustment
    layers below can't take a merge.
  - Flatten Image: every visible layer becomes one pixel layer, "Background"; transparency is
    kept (unlike Photoshop, which fills it white).
  - Rasterize Layer Style: effects and masks baked in.
  - Select Pixels: a selection from the layer's own alpha (without effects).
- **Colour labels**: optional `label` on every layer (`red … gray`), validated in projects and
  round-tripped through PSD `lclr` (Photoshop's numbering, 1 = red … 7 = grey). No effect on
  rendering.
- **Layer Style dialog**: blending options plus every existing effect, reusing the panel's effect
  controls. Edits apply live; OK folds them into one history step, Cancel jumps back and drops
  the redo steps. Only effects Picstea has are listed.
- **Drag and drop**: rows dropped on the trash are deleted, on New Layer duplicated (a dragged
  row outside the selection becomes the selection first).
- **Resizable panels**: the column width and the Properties and tabbed-panel heights are
  CSS variables set by keyboard-accessible separators, remembered in `picstea.panelSizes`
  (listed in the cookie policy). Layers always keeps at least 140 px.

## Consequences

- Older builds open projects with labels and simply drop them (the validator ignores fields it
  doesn't know).
