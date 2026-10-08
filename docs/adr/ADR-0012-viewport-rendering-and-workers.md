# ADR-0012 — Viewport rendering, gesture caches and workers

- Status: Accepted
- Date: 2026-10-09

## Context

Gate 7 (docs/14) asks that large realistic documents stay usable without freezing. Profiling a
6000 × 4000 composition (photo, shapes, a drop shadow, a Hue/Saturation adjustment) in a
production build showed every preview frame recompositing all 24 MP at full resolution: a
40-move brush stroke took 36 s (≈920 ms per move), a 30-move drag 28 s, PSD export blocked the
page for 2.2 s. Pan and zoom were already cheap because they re-presented a cached composite.

## Decision

- **Render space.** The compositor renders into a `RenderSpace` — a document region at a scale.
  Every intermediate surface (groups, masks, effects, adjustments) uses the same space; effect
  sizes scale with it. The identity space (whole document at 1:1) keeps export, PSD and pixel
  tools exactly as before.
- **Viewport rendering.** The canvas renders only the visible region plus a 25% margin, at a
  power-of-two mip level of `zoom × devicePixelRatio` (never above 1:1), and reuses that render
  while the view stays inside it at the same level. Adjustments therefore cost screen-size work,
  not document-size work.
- **Prefix cache.** The bottom root layers that did not change since the previous render (and that
  no preview touches) are kept as one image; a brush stroke or drag re-composites only the edited
  layer and those above it.
- **Progressive rendering.** If an interactive frame exceeds 24 ms, later frames of that
  interaction render at half (down to 1/8) resolution; 150 ms after input settles, a sharp render
  replaces it ("Rendering…" in the status bar).
- **Dirty rectangles.** Brush, pencil and eraser previews recompose only the area new dabs touched.
- **Workers.** A typed job runner sends pure byte work to one module worker (`src/workers/`):
  PSD read and encode, PDF encode, flood fill. The main thread only draws (GPU) and hands over an
  `ImageBitmap` (transferred, not copied); the worker reads pixels back with `OffscreenCanvas`.
  If the worker cannot start or crashes, jobs run inline, so behaviour never depends on it.
- **Memory.** The pixel budget follows `navigator.deviceMemory` (¼ of it, 256 MB–1.5 GB);
  documents over 16 MP get a short note; long operations show a busy overlay.
- **Measurement.** `scripts/profile-large.mjs` (`pnpm profile`) reproduces the numbers.

## Consequences

Measured with the harness (headless Chromium, software rendering, DPR 1):

| Interaction | Before | After |
|---|---|---|
| Brush stroke, 40 moves | 36.0 s, max task 923 ms | 0.7 s, no long tasks |
| Move-tool drag, 30 moves | 28.2 s, 994 ms | 1.0 s, no long tasks |
| Adjustment slider, 5 steps | 4.4 s, 874 ms | 0.17 s, no long tasks |
| PSD export | 2.3 s, 2230 ms | 1.8 s, 898 ms |

At DPR 2 every interaction stays under ~65 ms per input. Remaining main-thread work is the
full-resolution composite for export, the magic wand and Color Range (one-off actions; under a
second at 24 MP with an adjustment). Moving adjustment pixel work itself into workers, and tiled
rendering beyond the 36 MP limit, are left for later.
