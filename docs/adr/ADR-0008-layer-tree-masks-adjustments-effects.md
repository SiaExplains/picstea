# ADR-0008 — Layer tree, masks, adjustment layers and layer effects

- Status: Accepted
- Date: 2026-10-08

## Context

Gate 4 asks for a non-destructive, multi-layer workflow: groups, masks, blend modes, opacity,
adjustment layers and layer effects (docs/14). Until now the document was a flat list of layers.

## Decision

**Layer tree.** `GroupLayer { children, expanded }` makes `EditorDocument.layers` the root of a
tree. Every list is ordered bottom-most first.
- Pure helpers in `core/document/tree.ts` (find, locate, replace, remove, insert, flatten,
  map) are the only place tree surgery happens.
- `requireLayer`, `replaceLayer` and `requireUnlocked` are tree-aware, so most commands work
  unchanged. A locked group locks its contents.
- Moving: `moveLayerTo`, `moveLayerRelative` (drag and drop) and `shiftLayer`. `shiftLayer`
  enters neighbouring groups and steps out at group edges, like Bring Forward / Send Backward.
- `groupLayer` and `ungroup` create and dissolve groups.
- Expanding or collapsing a group is panel state: it is saved, but it isn't undoable.
- Groups default to **pass-through**, so their children blend straight into the layers below.
  Any other blend mode, opacity below 100%, a mask or effects make a group **isolated**: its
  children are composited on their own surface first.
- Groups can be moved (`translateLayer` moves every descendant) but not scaled or rotated yet.

**Masks.** `BaseLayer.mask` is a raster mask in document space. Its alpha is the reveal amount,
and `assetId: null` reveals everything. Outside the mask's rectangle everything is revealed.
- Linked masks follow pure moves of their layer. Scaling or rotating the layer leaves the mask
  in place (documented limitation).
- Painting targets the mask through the store's `editTarget`. The brush moves alpha towards the
  foreground grey and the eraser towards the background grey, using
  `a' = a·(1−k) + L·k` via `destination-out` and then `lighter`.

**Adjustment layers.** `AdjustmentLayer { adjustment }` applies a pure per-pixel function
(`editor/adjustments/pixel-ops.ts`) to everything composited beneath it within its group. In a
pass-through group, that includes the layers below the group. A registry
(`editor/adjustments/registry.ts`) defines labels, defaults and ranges once, and drives the menus,
the properties panel, the command and the validator. New adjustment layers get a reveal-all mask.
- Normal blending is computed exactly per pixel: `orig + (adjusted − orig) · opacity · mask`.
  Other blend modes use canvas compositing.
- `CompositeCache` keeps each adjustment's output, keyed by the exact layer objects beneath it.
  Edits *above* an adjustment then don't recompute it.

**Layer effects.** These are drop shadow, outer glow, outer stroke and colour overlay. Each one is
built from the layer's rendered silhouette with standard canvas operations:
- shadow and glow use the off-canvas shadow trick
- the stroke dilates the silhouette by stamping it around rings, then applies `source-in` and
  `destination-out`
- the overlay uses `source-atop`

The order is shadow → glow → content → stroke. The layer's opacity and blend mode then apply to
the whole result.

**Compositor.** It is recursive. Leaves without a mask or effects keep the original fast path.
Anything else renders to a document-sized surface, then gets its mask, then its effects, and is
then drawn with the layer's opacity and blend mode.

**Schema v3.** Adds groups (max depth 32, with the total layer count still capped), masks, effects,
adjustment layers and pass-through. The v2→v3 migration is the identity.

## Alternatives

- Flat list with `parentId`: simpler storage but awkward recursion and easy to corrupt. Rejected.
- CSS `ctx.filter` for adjustments: fast on the GPU, but browser support and semantics vary,
  so the screen and exports could disagree. Rejected in favour of exact, testable pixel functions.
- WebGL compositing: deferred to Gate 7, when profiling justifies it (docs/15 rule 7).

## Consequences

- **Speed:** adjustments run on the main thread over the whole document. The cache hides this
  for edits above them; large documents and edits below them can be slow until Gate 7 (workers,
  tiles).
- **Memory:** isolated layers allocate temporary document-sized surfaces per composite.
  Temporary surfaces are released straight away.
- **Group transforms:** scaling or rotating a whole group, clipping masks and vector masks
  remain future work.
