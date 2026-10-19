# ADR-0030 — Full Layer Style: every effect, copies, contours, Fill and saved styles

- Status: Accepted
- Date: 2026-10-19
- Extends: ADR-0008 (layer effects), ADR-0021 (inner shadow, bevel, gradient overlay), ADR-0022
  (off-thread rendering), ADR-0026 (Layer Style dialog)

## Context

The Layer Style dialog had seven effects with one to three settings each and one copy of each.
Photoshop and Photopea offer ten effects with their full option sets, several copies of shadows,
strokes and overlays (the "+" button), contours, Fill opacity, a document-wide light and saved
styles. Channels and Blend If are planned as a follow-up (E2).

## Decision

- **Model (`src/editor/core/effects/`, schema v7):**
  - `LayerEffects` stores every kind as a list.
    - Drop Shadow, Inner Shadow, Stroke, Color Overlay and Gradient Overlay allow 10 copies.
    - The other kinds allow 1.
    - The first copy in the list is drawn on top.
  - Effect kinds:
    - Inner Glow, Satin and Pattern Overlay are new.
    - Every effect gains Photoshop's options: blend mode, noise, spread/choke, contour (preset or 2–16 points) with anti-aliasing, range, jitter and technique.
    - Gradient Overlay gains style, method, scale, alignment, offset and dither.
    - Stroke gains position and a gradient fill.
    - Bevel & Emboss gains style, technique, depth, soften, altitude, gloss contour, highlight and shadow modes, and the Contour and Texture sub-pages.
  - Layer `fillOpacity` and document `globalLight { angle, altitude }`; effects with "Use Global Light" follow the document light.
  - Migration 6 → 7 wraps old effects in one-item lists. New settings are chosen so they look as before (normal blend, no knockout, `size` = old blur, global light off). The migration walks groups and smart object contents.
  - `parse.ts` validates every effect strictly from projects, commands, PSD import and saved styles: own properties only, ranges, enums, sorted contour points.
- **Renderer (`effects.ts`, `effect-paint.ts`), still plain 2D canvas:**
  - Order, bottom to top: Drop Shadow, Outer Glow, content at Fill, Pattern, Gradient and Color Overlay, Satin, Inner Glow, Inner Shadow, Stroke, Bevel. This is Photoshop's list read upwards.
  - Interior effects are built on a solid copy of the shape, then cut to its coverage, so Fill does not fade them.
  - At full layer opacity, shadows and glows are drawn straight onto what is below, with their own blend modes.
  - A faded layer is flattened first: it fades as one image, as in Photoshop.
  - Contours, noise, range and jitter remap alpha through 256-entry tables with repeatable hashed noise, so nothing flickers. They read pixels only when not at their defaults.
  - Patterns are ten tiles generated in code (no image files).
  - Gradients use canvas linear, radial and conic gradients. Diamond is four clipped linear gradients. Perceptual (OKLab) and linear-light methods subdivide the stops.
- **Dialog:**
  - **Layout:** Photopea's arrangement: a Styles page and Blending Options, the effect list with "+" and ▲ ▼ 🗑, and pages grouped as Structure, Quality and Shading.
  - **Controls:** slider + number fields, an angle dial, a contour editor, a pattern picker, and a live preview swatch.
  - **Undo:** still one undo step on OK; Cancel restores the layer.
  - **Properties panel:** keeps simple on/off switches and a "Layer Style…" button.
  - **Groups:** can now be styled.
- **Saved styles:**
  - Seven built-in styles, plus New Style… stored in this browser under `picstea.layerStyles` (listed in the cookie policy).
  - Each saved style holds settings only, no images, and is validated on load.
- **PSD import:** reads every option above, including every copy in the `…Multi` lists, `IrGl`, `ChFX` and `patternFill`, plus `iOpa` (Fill) and image resources 1037 and 1049 (global light).
  - Photoshop pattern pixels are not imported. The closest built-in pattern is used, with a note.
  - Unknown blend modes become Normal, with a note.
  - PSD export still merges effects into pixels.

## Consequences

- Saved projects now use schema v7; older builds refuse them. v1–v6 projects open, and their effects look the same.
- **Intentional change:** Bevel highlights now face the light. Before, they were on the opposite side.
- Combinations of interior effects now stack in Photoshop's order: overlays sit below inner shadows.
- **Fidelity:** bevel, satin, contours and texture are close to Photoshop's, not pixel-identical. Satin and gradient glows need pixel access, which every browser canvas provides.
- **Performance:** effects allocate render-space surfaces as before. Options that read pixels run only when they are set.
- Channels and Blend If (E2) need a per-pixel mix with the layers below, and get their own change.
