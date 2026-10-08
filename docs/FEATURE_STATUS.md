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

## Later gates (summary)

| Area | Status |
|---|---|
| Gate 6: formats (SVG, PDF, PSD; open/save project files) | 📋 |
| Gate 7: workers, tiling, tile-based undo, large documents | 📋 |
| Gate 8: marketing pages, blog, consent, ads, sponsorships | 📋 |
| Gate 10: cloud | ⏸ requires explicit product-owner approval |

## Known limitations

- Pixel layers have a fixed size. Painting outside a layer's box is clipped.
- Each brush stroke keeps a full-layer copy for undo. Above ~768 MB the oldest undo steps are dropped (ADR-0007).
- Scaling a shape also scales its stroke width.
- Text is point text (manual line breaks, no wrapping). Fonts are limited to common system fonts.
- Adjustments run on the main thread over the whole document. Edits above an adjustment are cached; very large documents can feel slow until Gate 7.
- Masks follow moves but not scale/rotate of their layer.
- Selection tools, the paint bucket and Color Range read pixels on the main thread; very large documents can pause briefly until Gate 7.
- Fill, gradient and the paint bucket edit inside a pixel layer's own box; they do not grow the layer.
- Documents are capped at 12,000 px per side and 36 MP until tiled rendering (Gate 7).
