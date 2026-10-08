# Feature status

Last updated: 2026-10-08 · version 0.1.0 · current gate: **2 (Document Engine) — awaiting review**

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
| Toolbar | ✅ | Hand, Zoom — only real tools are shown |
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
| Document & layer model | ✅ | Raster + fill layers. Group/text/shape/adjustment kinds are extension points |
| Command system | ✅ | ADR-0003 |
| Undo/redo history with merging | ✅ | |
| Versioned serialization + migrations + validation | ✅ | ADR-0005 |
| IndexedDB persistence + autosave + recent projects | ✅ | ADR-0004 |
| Memory fallback when storage is unavailable | ✅ | User is warned |
| Open PNG/JPEG/WebP (picker, drag & drop, paste) | ✅ | Header-validated before decode |
| Place image as layer | ✅ | |
| Layer ops: add fill, delete, rename, duplicate, reorder, visibility, lock, opacity, blend, fill colour | ✅ | Drag-and-drop reordering 📋 |
| Canvas size command | ✅ | Engine only, no UI yet |

## Later gates (summary)

| Area | Status |
|---|---|
| Gate 3: move, crop, transform, brush, eraser, shapes, text, export | 📋 |
| Gate 4: groups, masks, adjustment layers, effects | 📋 |
| Gate 5: selections | 📋 |
| Gate 6: formats (export PNG/JPEG/WebP, SVG, PDF, PSD) | 📋 |
| Gate 7: workers, tiling, large documents | 📋 |
| Gate 8: marketing pages, blog, consent, ads, sponsorships | 📋 |
| Gate 10: cloud | ⏸ requires explicit product-owner approval |

## Known limitations

- "New Layer" creates a solid-colour fill layer. Empty pixel layers arrive with the brush tool (Gate 3).
- No export yet: work lives in browser storage until Gate 3 adds PNG/JPEG/WebP export.
- Documents are capped at 12,000 px per side and 36 MP until tiled rendering (Gate 7).
