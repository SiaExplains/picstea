# ADR-0020 — Multi-layer selection, group transforms, align and distribute (Gate 9g)

- Status: Accepted
- Date: 2026-10-09

## Context

Until now one layer was active (`doc.activeLayerId`) and every layer operation worked on that one
layer. Distribute, scaling or rotating a group, and moving or grouping several layers at once
were therefore impossible or tedious.

## Decision

### Selection is session state

- `DocumentSession.selectedLayerIds` sits beside the document's `activeLayerId`. It is not saved,
  not in the undo history, and needs no schema change.
- `selectedLayerIds(session)` is the only way to read it. It drops ids that no longer exist,
  always contains the active layer, and collapses to `[active]` whenever the active layer isn't
  part of it. So commands, undo and redo never have to maintain the selection: as soon as one of
  them changes the active layer, a stale multi-selection disappears by itself.
- The active layer stays the "primary" layer: the Properties panel, painting, filters and
  adjustments use it.
- `topLevelSelection` removes layers whose ancestor group is also selected, so nothing is moved
  or deleted twice.

### Commands compose existing ones

`translateLayers`, `translateLayersEach`, `transformLayers`, `deleteLayers`, `duplicateLayers`
and `groupLayers` apply the existing single-layer commands in sequence inside one command (one
undo step). Validation, locking and mask behaviour therefore stay in one place. `groupLayers`
keeps the panel order and puts the group where the top-most selected layer was, even across
parents.

### Transforming several layers through a frame

The selection (or a selected group) gets an axis-aligned frame around its transformable layers.
The existing single-layer maths (`scaleFromHandle`, `rotateAroundCenter`) transforms that
frame, and its change `M = F₁·F₀⁻¹` is applied to each layer:

- **Decomposition**: `transformThrough` splits `M·T` into position, rotation and signed scales.
  It drops shear, because MYLPER layers can't be skewed, but places the content centre exactly.
  It is exact for moves, uniform scales, rotations, flips and axis-aligned stretches.
- **Choosing the form**: of the two equivalent forms it picks the one closest to the layer's old
  rotation, so a flip doesn't appear as a 180° turn.
- **Masks**: they behave as for one layer. Moves carry linked masks; scale and rotate leave masks
  in place.

### Align and distribute

- **Align**: several layers align to the pixel selection or to their shared bounds; one layer
  aligns to the canvas (as before).
- **Distribute**: evenly spaced centres or equal gaps, keeping the outer layers. It needs three
  or more layers and is recordable in actions (9e).

## Consequences

- Everyday layout work (several layers at once) is possible, and groups can be scaled and
  rotated.
- Edits in the Properties panel still apply to the active layer only. Batch property editing is
  planned.
- Non-uniform stretches of rotated layers approximate (no skew), as documented.
