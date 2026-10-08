# Feature status

Last updated: 2026-10-08 · version 0.3.0 · current gate: **4 (Professional Layer Workflow) — awaiting review**

Legend: ✅ complete · 🚧 in progress · 📋 planned · ⛔ blocked · ⏸ deferred

## Gate 0 — Repository foundation

| Feature | Status | Notes |
|---|---|---|
| Next.js 16 + React 19 + TypeScript (strict) | ✅ | App Router, Cache Components |
| ESLint (0 warnings) + Prettier | ✅ | Editor-core import boundary enforced by lint |
| Unit tests (Vitest) | ✅ | `pnpm test` |
| E2E tests (Playwright, Chromium) | ✅ | `pnpm build && pnpm test:e2e` |
| CI (GitHub Actions) | ✅ | lint · format · typecheck · unit · build · e2e · prod audit |
| Error boundaries | ✅ | `error.tsx`, `global-error.tsx`, editor boundary |
| Logging strategy | ✅ | `src/lib/logging` — primitives only, no document data |
| Security headers / CSP | ✅ | ADR-0006 |
| Vercel deployment | ⛔ | Needs the product owner to import the GitHub repo in Vercel |

## Gate 1 — Editor shell

| Feature | Status | Notes |
|---|---|---|
| Editor at `/` with first-visit welcome dialog (`/editor` → 308 to `/`) | ✅ | ADR-0009 |
| Menu bar (File / Edit / Layer / View) | ✅ | WAI-ARIA menubar, keyboard navigable |
| Toolbar | ✅ | Move, Crop, Brush, Eraser, Shape, Text, Hand, Zoom + colour swatches |
| Tool options bar | ✅ | |
| Canvas viewport | ✅ | Canvas 2D, checkerboard, crisp pixels above 200% |
| Zoom (steps, wheel, pinch, fit, 100%) / pan (hand, Space, middle button, wheel) | ✅ | |
| Document tabs | ✅ | Unsaved indicator; closing saves first |
| Right panels (Properties, Layers) | ✅ | |
| Status bar (zoom, size, cursor, save state) | ✅ | |
| Keyboard shortcuts | ✅ | `src/editor/core/shortcuts` |
| Mobile/tablet layout | 🚧 | Panels stack under the canvas. A dedicated touch UI is planned |
| Deep links to a document (e.g. `/?doc=…`) | 📋 | |

## Gate 2 — Document engine

| Feature | Status | Notes |
|---|---|---|
| Document & layer model | ✅ | Raster, fill, shape and text layers (schema v2). Group/adjustment kinds are extension points |
| Command system | ✅ | ADR-0003 |
| Undo/redo history with merging | ✅ | |
| Versioned serialization + migrations + validation | ✅ | ADR-0005 |
| IndexedDB persistence + autosave + recent projects | ✅ | ADR-0004 |
| Memory fallback when storage is unavailable | ✅ | User is warned |
| Open PNG/JPEG/WebP (picker, drag & drop, paste) | ✅ | Header-validated before decode |
| Place image as layer | ✅ | |
| Layer ops: add fill, delete, rename, duplicate, reorder, visibility, lock, opacity, blend, fill colour | ✅ | Drag-and-drop reordering ✅ (Gate 4) |
| Canvas size command | ✅ | Engine only, no UI yet |

## Gate 3 — Core editing

| Feature | Status | Notes |
|---|---|---|
| Move tool (drag, auto-select, nudge) | ✅ | |
| Free transform (scale, rotate, flip, numeric X/Y/W/H/angle) | ✅ | Skew/perspective 📋 |
| Crop (non-destructive) | ✅ | Aspect-ratio presets 📋 |
| Brush (size, hardness, opacity) | ✅ | Pen pressure 📋 |
| Eraser | ✅ | |
| Shapes: rectangle (rounded), ellipse, line | ✅ | Polygon 📋 |
| Text: on-canvas editing, font, size, bold/italic, colour, align, line height, spacing | ✅ | Wrapping/rich text 📋 |
| Export PNG / JPEG / WebP | ✅ | File System Access save dialog where supported |
| Foreground/background colours | ✅ | Eyedropper ✅ (Gate 5), swatches 📋 |

## Gate 4 — Professional layer workflow

| Feature | Status | Notes |
|---|---|---|
| Groups (nesting, pass-through/isolated, collapse, move) | ✅ | Group scale/rotate 📋 |
| Drag-and-drop in Layers panel; Bring Forward/Send Backward enter/leave groups | ✅ | |
| Blend modes & opacity (layers and groups) | ✅ | |
| Raster layer masks (paint grey levels, enable/disable, linked) | ✅ | Vector & clipping masks 📋; masks don't follow scale/rotate |
| Adjustment layers: Brightness/Contrast, Hue/Saturation, Exposure, Temperature/Tint, Black & White, Invert, Posterize, Threshold | ✅ | Curves/Levels 📋 |
| Layer effects: drop shadow, outer glow, outer stroke, colour overlay | ✅ | Inner shadow, bevel 📋 |

## Gate 5 — Selection & advanced tools

| Feature | Status | Notes |
|---|---|---|
| Selection subsystem (coverage mask, undoable, not saved in projects) | ✅ | ADR-0010 |
| Rectangular & elliptical marquee, freehand & polygonal lasso, magic wand | ✅ | New/add/subtract/intersect; Shift/Alt modifiers |
| Select All / Deselect / Reselect / Inverse, Color Range | ✅ | |
| Feather, expand, contract, transform selection, move outline | ✅ | Expand/contract use a square radius |
| Painting, fill and gradient limited to the selection | ✅ | |
| Clear, Fill, Cut/Copy/Paste, Layer via Copy, Mask from Selection, Crop to Selection | ✅ | Copy also goes to the system clipboard where allowed |
| Pencil, Paint Bucket, Gradient (linear/radial), Eyedropper | ✅ | Gradient presets/editor 📋 |
| Moving selected pixels with the Move tool | 📋 | Use Cut/Paste or Layer via Copy |
| Quick mask, refine edge, saving selections, clipping masks, polygon shape | 📋 | |

## Gate 6 — Formats

| Feature | Status | Notes |
|---|---|---|
| Open PNG, JPEG, WebP, GIF (first frame) | ✅ | Sniffed by content, header-validated |
| `.mylper` project files (save / open) | ✅ | ZIP + versioned JSON; same validator as local storage |
| PSD import: 8-bit RGB/greyscale, layers, groups, names, opacity, visibility, blend modes, masks | ✅ | Text/smart objects as pixels; adjustments, styles, vector masks, clipping not imported |
| PSD export: layers, groups, names, opacity, visibility, blend modes, masks, composite | ✅ | Shapes/text rasterised; effects merged; adjustments in composite only |
| SVG export (vector shapes/text, images for the rest) | ✅ | Flattened when adjustment layers are present |
| SVG import (rasterised safely via `<img>`) | ✅ | |
| PDF export (one page, lossless with alpha) | ✅ | |
| PDF import, TIFF, PSB, 16/32-bit and CMYK PSD | 📋 | Clear error messages today |

## Gate 7 — Performance

| Feature | Status | Notes |
|---|---|---|
| Viewport rendering: visible region at screen resolution (mip levels), reused while inside | ✅ | ADR-0012 |
| Prefix cache for gestures; adjustment cache per render space | ✅ | |
| Progressive rendering (lower resolution while interacting, sharp when idle) | ✅ | |
| Brush/pencil/eraser dirty-rectangle previews | ✅ | |
| Web Worker jobs: PSD read/encode, PDF encode, flood fill (wand, bucket) | ✅ | Main-thread fallback |
| Device-aware memory budget, large-document note, busy overlay | ✅ | |
| Profiling harness (`pnpm profile`) | ✅ | `scripts/profile-large.mjs` |
| Full-resolution adjustments in export/wand composites still on the main thread | 📋 | One-off actions |
| Tiled rendering beyond 36 MP, tile-based undo | 📋 | Limits unchanged |

## Later gates (summary)

| Area | Status |
|---|---|
| Gate 8: marketing pages, blog, consent, ads, sponsorships | 📋 |
| Gate 10: cloud | ⏸ requires explicit product-owner approval |

## Known limitations

- Pixel layers have a fixed size. Painting outside a layer's box is clipped.
- Each brush stroke keeps a full-layer copy for undo. Above ~768 MB the oldest undo steps are dropped (ADR-0007).
- Scaling a shape also scales its stroke width.
- Text is point text (manual line breaks, no wrapping). Fonts are limited to common system fonts.
- Masks follow moves but not scale/rotate of their layer.
- Exporting, the magic wand and Color Range still draw the full-resolution image on the main thread, so very large documents with adjustment layers can pause for under a second.
- Fill, gradient and the paint bucket edit inside a pixel layer's own box; they do not grow the layer.
- Documents are capped at 12,000 px per side and 36 MP (full-resolution export and pixel tools still need one canvas of the whole image).
