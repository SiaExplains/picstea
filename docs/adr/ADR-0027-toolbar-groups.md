# ADR-0027 — Toolbar groups and the tools that fill them

- Status: Accepted
- Date: 2026-10-19

## Context

Photoshop and Photopea group related tools in one toolbar slot with a flyout. Picstea had a flat
list of 21 tools, with variants (dodge/burn/sponge, blur/sharpen/smudge, freehand/polygonal
lasso) hidden in the options bar, and no reset-colours button.

## Decision

- **Groups** (`src/editor/core/tool-groups.ts`): each slot is a list of members; a member is a
  `ToolId`, optionally with a settings preset (Burn = the tone tool in burn mode, Rounded
  Rectangle = a rectangle with a radius). No tool was split or renamed, so projects, settings and
  shortcuts keep working.
- **Behaviour:** the slot shows the last member used; right-click, a long press (450 ms),
  → or the context-menu key opens the flyout (the Layers `ContextMenu`); the group's key returns
  to its last tool without changing settings; Shift + key cycles and applies the preset (Shift+G
  reaches the bucket from the gradient, as before). `toolMemory` in the editor store remembers the
  last tool per group; each group's default is the tool its key selected before.
- **New tools**, all local and pure where the pixels are concerned:
  - Spot Healing Brush: the healing stroke with an automatic source — the best of eight nearby
    patches by average colour against the ring around the spot (`retouch/spot.ts`).
  - Red Eye, Background Eraser, Color Replacement: coverage strokes with new effects
    (`retouch/effects.ts`), sampling the colour under the first dab.
  - Magic Eraser: the bucket's flood fill, cut out with `destination-out`.
  - Color Sampler (four points) and Ruler: UI state (`measure` in the store), never saved.
  - Path Selection, Add / Delete Anchor Point, Convert Point: modes of Direct Selection; adding
    a point splits the curve exactly (de Casteljau, `insertAnchor`).
  - Polygon shapes (3–64 sides) are created as editable path shapes.
- **Not in this round:** Perspective Crop (needs projective resampling of every layer) and
  Vertical Type (needs a vertical text layout and PSD support); also Quick/Object Selection,
  Magnetic Lasso, Content-Aware Move, Patch, Artboards, Slices.

## Consequences

- Pressing a group key may select a different tool than before if the user last used another
  member of that group — Photoshop's behaviour.
