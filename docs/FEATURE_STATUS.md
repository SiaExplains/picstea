# Feature status

Last updated: 2026-10-08 · version 0.2.0 · current gate: **3 (Core Editing) — awaiting review**

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
| `/editor` route (noindex) | ✅ | |
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
| Routes `/editor/new`, `/editor/[documentId]` | 📋 | |

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
| Layer ops: add fill, delete, rename, duplicate, reorder, visibility, lock, opacity, blend, fill colour | ✅ | Drag-and-drop reordering 📋 |
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
| Foreground/background colours | ✅ | Eyedropper, swatches 📋 |

## Later gates (summary)

| Area | Status |
|---|---|
| Gate 4: groups, masks, adjustment layers, effects | 📋 |
| Gate 5: selections | 📋 |
| Gate 6: formats (SVG, PDF, PSD; open/save project files) | 📋 |
| Gate 7: workers, tiling, tile-based undo, large documents | 📋 |
| Gate 8: marketing pages, blog, consent, ads, sponsorships | 📋 |
| Gate 10: cloud | ⏸ requires explicit product-owner approval |

## Known limitations

- Pixel layers have a fixed size. Painting outside a layer's box is clipped.
- Each brush stroke keeps a full-layer copy for undo. Above ~768 MB the oldest undo steps are dropped (ADR-0007).
- Scaling a shape also scales its stroke width.
- Text is point text (manual line breaks, no wrapping). Fonts are limited to common system fonts.
- Documents are capped at 12,000 px per side and 36 MP until tiled rendering (Gate 7).
