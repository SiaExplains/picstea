# ADR-0036 — The full Filter menu, Liquify and Vanishing Point

- Status: Accepted
- Date: 2026-10-19
- Extends: ADR-0014 (filters), ADR-0016 (smart filters), ADR-0032 (menus)

## Context

Picstea had eight filters in five submenus. Photopea (and Photoshop) offer around sixty, plus
Filter Gallery, Lens Correction, Camera Raw, Liquify and Vanishing Point above the submenus. The
user asked for every item in Photopea's Filter menu.

## Decision

- **The catalogue stays data.** Every slider filter is still one entry (id, name, group,
  parameters, pure `apply`). Entries now live in one file per menu group
  (`filters/catalogue/*.ts`); `registry.ts` gathers them and keeps its exports, so the menu,
  dialog, validation, worker job, smart filters, Last Filter and actions are unchanged.
  - Groups and their order follow Photopea: Top, 3D, Blur, Blur Gallery, Distort, Noise,
    Pixelate, Render, Sharpen, Stylize, Other, Fourier (`FILTER_GROUPS`).
  - **New parameter kind `choice`** (a few named options; the value is the option's index). Values
    stay `number | boolean`, so saved smart filters and the project schema don't change.
  - Existing ids are kept. `pixelate` is now labelled **Mosaic**, Photoshop's name for it.
- **Shared building blocks** (`filters/sampling.ts`): bilinear sampling with clamp, wrap or
  transparent edges, an inverse-mapped `warp` used by every geometric filter, a square-kernel
  convolution, fractal value noise and HSV/HSL conversions.
- **Sizes relative to the layer** where Photoshop uses pins on the canvas (Blur Gallery, Lens
  Flare, Radial Blur centre) or a radius tied to the image (Camera Raw clarity). Sliders give the
  centre in percent; px values still shrink for the reduced preview.
- **No files and no colours from outside the filter.** Displace offers the layer's brightness,
  clouds or waves as its map instead of asking for a PSD; Clouds and Fibers use black and white
  instead of the foreground/background colours. A filter therefore stays a pure function of its
  settings and seed, which smart filters, Last Filter and recorded actions depend on.
- **Fourier** uses the Hartley transform: real-valued, its own inverse, with each frequency in the
  same place as in a Fourier spectrum. Coefficients are stored per channel with a signed
  logarithmic curve, centred. Inverse brings the image back closely, not exactly (8 bits per
  coefficient). Lengths that aren't powers of two use Bluestein's algorithm.
- **Liquify and Vanishing Point are editors, not catalogue entries**: their settings are brush
  strokes. Each has a dialog with its own preview of a reduced copy of the layer
  (`PixelEditorDialogs.tsx`), and a pure, resolution-independent edit:
  - Liquify: a displacement field (backward map, normalised coordinates, 256 samples on the long
    side) changed by Forward Warp, Reconstruct, Smooth, Twirl, Pucker and Bloat dabs.
  - Vanishing Point: a convex plane (4 corners, normalised) and clone-stamp dabs in plane
    coordinates. Dabs of one stroke don't build up: each pixel takes the strongest coverage in the
    stroke, sampled from the layer as it was when the stroke began.
  - OK renders the edit at full size in new worker jobs (`liquify`, `vanishingPoint`) and commits
    it through the same path as filters (`applyPixelJob`): one undo step, selection respected.
  - They work on pixel layers only and aren't repeated by Last Filter.
- **Path Blur** follows a straight-to-curved path set by angle, length and bend, not a path drawn
  on the canvas.

## Consequences

- One menu entry per filter as before; adding one is still one catalogue entry.
- The heavier filters (Lens Blur, Surface Blur, Oil Paint, Median, Fourier) are slower on large
  layers; they run in the worker and preview at reduced size, as before.
- Smart filters can use any new catalogue filter; Liquify and Vanishing Point are destructive.
