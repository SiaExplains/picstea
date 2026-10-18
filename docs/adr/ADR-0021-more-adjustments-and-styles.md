# ADR-0021 — Vibrance, Color Balance, Photo Filter, Channel Mixer, Gradient Map; inner shadow, bevel, gradient overlay (Gate 9h)

- Status: Accepted
- Date: 2026-10-09

## Context

Picstea had ten adjustment types and four layer effects. PSDs that use other common adjustments
or styles lost those settings on import (kept only as pixels), and users had no equivalents in
the editor.

## Decision

### Adjustments

The five new adjustments are pure functions on straight RGBA bytes (`adjustments/color-ops.ts`),
in the same style as ADR-0008: simple, documented formulas that give identical results in every
browser and export. None of them changes alpha.

| Adjustment | Formula |
|---|---|
| Vibrance | scales each pixel's distance from its luma by `s · (1 + v · (1 − sat))`, so muted colours gain more |
| Color Balance | per-channel lookup tables: shift = Σ range weight × amount × 0.3·255, with the dodge/burn range weights; optional luma restore |
| Photo Filter | `c · (1 − d + d · filter)`, a density-weighted multiply; optional luma restore |
| Channel Mixer | a 3×4 matrix in percent (−200…200); monochrome uses the first row for every output |
| Gradient Map | luma → a 256-entry lookup table built from 2–16 stops (`adjustments/gradient.ts`) |

- **Settings and validation:** non-numeric settings (booleans, colours, rows, stops) are
  validated by registry `parse` functions that read own properties only, like Levels and Curves.
- **Everything else is automatic:** menus, actions (9e), the compositor and the worker pick the
  new types up from the registry.

### Effects

The new effects are drawn with canvas operations, like the existing ones:

- **Inner shadow:** the shadow of the inverted silhouette (with a margin), kept inside the layer.
- **Bevel:** two opposite inner shadows, a highlight (screen) towards the light and a shadow
  (multiply) away from it, with a blur of the bevel size. This is a deliberate, cheap
  approximation of Photoshop's inner bevel; no height map is computed.
- **Gradient overlay:** a linear canvas gradient across the layer's box (passed from the
  compositor in render space), drawn `source-atop`.

All effects go through one `normalizeEffect` (known fields only, lower-case colours, sorted
stops), used by both `setLayerEffect` and the project validator.

### Format and PSD

- **Schema:** v6 with an identity migration, so older builds refuse new projects instead of
  misreading them.
- **PSD import:** `vibA`, `blnc`, `phfl` (v2 RGB, v3 Lab), `mixr`, `grdm`, `IrSh`, `ebbl` and
  `GrFl`, through the existing clamps, validators and per-block isolation.
- **PSD export:** `vibA`, `blnc` and `mixr` are written as adjustment layers. Photo Filter and
  Gradient Map stay in the flattened image, as Temperature/Tint does.

## Consequences

- More PSD structure survives import, and the most-used colour tools are available.
- The bevel and gradient overlay look differ somewhat from Photoshop's; the docs say so.
- Exported `vibA`/`blnc`/`mixr` blocks still need the manual Photoshop/Photopea check.
