# ADR-0043 — Growing pixel layers; masks and strokes through transforms

- Status: Accepted
- Date: 2026-11-11
- Extends: ADR-0007 (memory), ADR-0008 (masks), ADR-0015 (vector masks), ADR-0018 (actions),
  ADR-0020 (multi-layer selection), ADR-0030 (layer styles)

## Context

Four limitations made Picstea feel broken next to Photoshop: painting outside a pixel layer's box
was clipped, masks did not follow a layer's scale or rotation, scaling a shape widened its stroke,
and the Properties panel edited only the active layer of a multi-layer selection.

## Decision

- **Growing pixel layers.** Brush, pencil, Fill, Stroke, Paint Bucket and Gradient may paint over
  the layer's box plus the canvas when the layer is neither scaled, rotated nor flipped
  (`pixels/grow.ts`). On commit the box grows towards the painted area in 64 px steps, never past
  it plus that step; `setRasterContentAndBounds` sets pixels, size and position together, so one
  undo restores the old box, and it sets the position directly so document-space masks stay put.
  The eraser, Clear and Magic Eraser never grow. Scaled or rotated pixel layers keep clipping to
  their box. The live preview draws the larger stroke surface through `CompositePreview.overrideRects`.
  Instead of trimming on save (a full alpha scan on every autosave), growth is limited to what was
  painted; nothing shrinks a layer automatically.
- **Masks follow transforms.** `setLayerTransform` maps a linked vector mask's path through the
  change, and gives a linked raster mask a `pendingTransform` (document-space matrix) that the
  compositor draws it through. A selected group's own linked mask gets the frame change the same
  way. When the transform's history step stops being an open gesture, the controller bakes each
  pending transform into new mask pixels once, from the original pixels (no quality loss over a
  drag), revealing everything outside the old mask rectangle, and folds that into the same undo
  step. `pendingTransform` is never saved. Unlinked masks stay where they are.
- **Shapes keep their stroke.** A shape's size lives in its geometry: after a transform its scale
  is baked into width, height, path and corner radius, keeping only the sign for flips
  (`geometry/shape-scale.ts`). While dragging, the outline is built scaled and stroked with the
  scale undone, so the stroke never jumps. The Move tool option **Scale strokes & effects** (off,
  as in Photoshop) also multiplies the stroke width and effect distances and sizes by √|sx·sy|.
  Image Size keeps scaling strokes (like Photoshop's "Scale Styles" on). **Schema v10** bakes
  scaled shapes in old projects with the stroke widened by the same factor, so they look as before.
- **Several layers at once.** `setLayersOpacity`, `setLayersBlendMode`, `setLayersVisibility` and
  `setLayersLocked` change every selected layer (including a selected child of a selected group)
  in one undo step, skipping layers that refuse (locked; pass-through on non-groups). The
  Properties panel shows "—"/"Mixed" for differing values; the lock button on a selected row and
  Layer → Hide/Show Layers and Lock/Unlock Layers act on the selection. They are action steps
  (`layerOpacity`, `layerBlend`, `layerVisibility`, `layerLock`) applied to the selection at
  playback; consecutive opacity steps replace each other so a slider drag records once.

## Consequences

- Each growing stroke stores a larger asset; the 768 MB undo budget counts real asset sizes and
  adapts on its own.
- A transformed shape's numbers change: width and height grow and the scale returns to 1. Saved
  documents migrate once (v9 → v10).
- Group vector masks do not follow a group transform yet.
