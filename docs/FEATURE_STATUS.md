# Feature status

Last updated: 2026-10-20 · version 0.41.0 · live at https://www.picstea.com · see `CHANGELOG.md` for each release and `docs/adr/` (ADR-0001 to ADR-0039) for decisions

Legend: ✅ complete · 🚧 in progress · 📋 planned · ⛔ blocked · ⏸ deferred

## Gate 0 — Repository foundation

| Feature | Status | Notes |
|---|---|---|
| Next.js 16 + React 19 + TypeScript (strict) | ✅ | App Router, Cache Components |
| ESLint (0 warnings) + Prettier | ✅ | Editor-core import boundary enforced by lint |
| Unit tests (Vitest) | ✅ | `pnpm test` |
| E2E tests (Playwright, Chromium) | ✅ | `pnpm build:e2e && pnpm test:e2e`; includes the accessibility, keyboard and site audits |
| CI (GitHub Actions) | ✅ | lint · format · typecheck · unit · build · e2e · prod audit |
| Error boundaries | ✅ | `error.tsx`, `global-error.tsx`, editor boundary |
| Logging strategy | ✅ | `src/lib/logging` — primitives only, no document data |
| Security headers / CSP | ✅ | ADR-0006 |
| Vercel deployment | ✅ | Production at https://www.picstea.com; previews for every PR |

## Gate 1 — Editor shell

| Feature | Status | Notes |
|---|---|---|
| Editor at `/` with first-visit welcome dialog (`/editor` → 308 to `/`) | ✅ | ADR-0009; a collapsed "About Picstea" section gives `/` ~680 server-rendered words (0.35.0) |
| Menu bar (File, Edit, Image, Layer, Select, Filter, View, Window, Help) | ✅ | WAI-ARIA menubar, keyboard navigable; submenus since ADR-0032 (adjustment layers moved to Layer → New Adjustment Layer and Image → Adjustments) |
| Toolbar | ✅ | 24 tools (selection, crop, painting, retouching, shapes, pen, text, navigation) + colour picker |
| Tool options bar | ✅ | |
| Canvas viewport | ✅ | Canvas 2D, checkerboard, crisp pixels above 200% |
| Zoom (steps, wheel, pinch, fit, 100%) / pan (hand, Space, middle button, wheel) | ✅ | |
| Document tabs | ✅ | Unsaved indicator; closing saves first |
| Right panels (Properties, Layers) | ✅ | |
| Status bar (zoom, size, cursor, save state) | ✅ | |
| Keyboard shortcuts | ✅ | `src/editor/core/shortcuts` |
| Mobile/tablet layout | 🚧 | Panels stack under the canvas. A dedicated touch UI is planned |
| Deep links to a document (e.g. `/?doc=…`) | 📋 | `/?convert=<pair>` opens File → Convert… (ADR-0037) |
| File → Convert… (PNG/JPEG/WebP/GIF/SVG/PSD → PNG/JPEG/WebP, batch to ZIP, nothing stored) and `/convert/*` pages | ✅ | ADR-0037; HEIC ✅ (ADR-0038) |
| Open, place and convert HEIC/HEIF photos (libheif WebAssembly, vendored, loaded on first use, cached offline) | ✅ | ADR-0038; primary image only (no Live Photo video, depth or bursts) |

## Gate 2 — Document engine

| Feature | Status | Notes |
|---|---|---|
| Document & layer model | ✅ | Raster, fill, shape, text, group, adjustment and smart object layers; schema v8 (v7 layer styles ADR-0030, v8 Blend If ADR-0031) |
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
| Foreground/background colours | ✅ | Eyedropper ✅ (Gate 5), colour picker and swatches ✅ (9e) |

## Gate 4 — Professional layer workflow

| Feature | Status | Notes |
|---|---|---|
| Groups (nesting, pass-through/isolated, collapse, move, scale/rotate) | ✅ | Group scale/rotate ✅ (9g) |
| Drag-and-drop in Layers panel; Bring Forward/Send Backward enter/leave groups | ✅ | |
| Blend modes & opacity (layers and groups) | ✅ | |
| Raster layer masks (paint grey levels, enable/disable, linked) | ✅ | Vector & clipping masks ✅ (Gate 9b); masks don't follow scale/rotate |
| Adjustment layers: Brightness/Contrast, Hue/Saturation, Exposure, Temperature/Tint, Black & White, Invert, Posterize, Threshold | ✅ | Levels/Curves ✅ (Gate 9a) |
| Layer effects: drop shadow, outer glow, outer stroke, colour overlay | ✅ | Inner shadow, bevel, gradient overlay ✅ (9h); all ten Photoshop effects with full options ✅ (ADR-0030) |

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
| `.picstea` project files (save / open) | ✅ | ZIP + versioned JSON; same validator as local storage |
| PSD import: 8-bit RGB/greyscale, layers, groups, names, opacity, visibility, blend modes, masks | ✅ | Text, adjustments, styles, vector masks, shapes, smart objects ✅ (9d); clipping ✅ (9b) |
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
| Exports, wand, bucket and Color Range draw the document in the worker | ✅ | 9j, ADR-0022; page fallback |
| Device-aware memory budget, large-document note, busy overlay | ✅ | |
| Profiling harness (`pnpm profile`) | ✅ | `scripts/profile-large.mjs` |
| Live canvas: layers under adjustment layers/styles redraw those on the main thread | 📋 | ~130 ms on the first frame of an edit under three adjustments at 24 MP (9j) |
| Tiled rendering beyond 36 MP, tile-based undo | 📋 | Limits unchanged |

## Gate 8 — Website, SEO/AEO & monetization

| Feature | Status | Notes |
|---|---|---|
| Website (separate layout, static pages, no editor bundle) | ✅ | Links to the editor don't prefetch it |
| Landing pages: /online-photo-editor, /psd-editor | ✅ | Direct answers, how-to, limitations, FAQ |
| Landing pages: /png-editor, /jpeg-editor, /webp-editor, /image-resizer, /image-compressor, /photo-filters | ✅ | 0.36.0; linked from a Tools row in the footer, the home page and each other (`RelatedTools`). Editor deep links 📋 |
| How-to pages: /blur-background, /make-background-transparent, /add-text-to-photo, /black-and-white-photo, /sharpen-image, /liquify | ✅ | 0.39.0; footer "How-to guides" row; topics with a blog post (curves, masks, blemishes, batch) left to the blog |
| Comparison pages: /gimp-alternative, /pixlr-alternative, /canva-alternative, /photoshop-express-alternative (+ Photoshop, Photopea) | ✅ | 0.40.0; `ComparisonTable` with a "facts checked" month; footer "Comparisons" row. Re-check the other products' facts every few months |
| Languages: Spanish (/es), Portuguese (Brazil) (/pt-br), German (/de) — editor UI, guide, how-to, converter and comparison pages, FAQ, About | ✅ | ADR-0039; machine-drafted, not yet reviewed by native speakers; docs, blog and legal stay English; action-step and some history labels built from values stay partly English; size-preset search matches English names |
| Docs (7 pages incl. generated shortcut table) | ✅ | |
| Blog (index, posts, Article data) | ✅ | 11 posts published (2026-10-18) |
| Structured data: WebSite, Organization, SoftwareApplication, BreadcrumbList, Article, FAQPage | ✅ | No ratings/reviews |
| Sitemap from one routes registry; real 404s for unknown docs/blog URLs | ✅ | Drafts and unfinished legal pages excluded |
| Consent system: banner, preferences, vendor registry, versioned storage | ✅ | Only shown when an optional vendor is configured |
| Google AdSense (website only, after consent, non-personalised) | ✅ | Off until `NEXT_PUBLIC_ADSENSE_CLIENT`/`_SLOT` are set |
| Custom sponsorships (no tracking), editor start-screen slot | ✅ | House ad until sponsors are booked |
| Per-route CSP: strict editor, ad origins only on website pages | ✅ | ADR-0013 |
| Legal pages: Privacy, Cookies, Terms, Imprint, Sponsorship | 🟡 | Drafts with [TO COMPLETE] fields; need operator details and legal review |
| Google-certified CMP (IAB TCF) for personalised EU ads | ✅ | `NEXT_PUBLIC_ADSENSE_CMP=google` (ADR-0024); default stays own banner |
| Editor side column: own sponsorship, Privacy settings, website links (≥ 1280 px) | ✅ | ADR-0025; Google ads in the editor 📋 (needs a new ADR) |
| Layers right-click menu (styles, select pixels, merge, flatten, rasterize style, colour labels) | ✅ | ADR-0026; Duplicate Into, Convert to Shape/Point Text 📋 |
| Menu bar with submenus (keyboard and pointer), Window menu | ✅ | ADR-0032 |
| Copy Merged, Edit → Stroke…, Select → Grow / Similar, Layer → Colour Label | ✅ | ADR-0032 |
| About page (`/about`) | ✅ | ADR-0032 |
| Three sponsorship slots in the editor column; silent looping video sponsorships (FocusCrew, Emojar, WikiDigit; rotating daily) | ✅ | ADR-0034; reduced motion shows the still frame |
| Media-only sponsor tiles with an overlaid "Sponsored" label; compact empty slots | ✅ | ADR-0035 |
| Website in the editor's dark theme | ✅ | ADR-0035 |
| Image Size…, Canvas Size… (9 anchors, relative), Image Rotation (90°/180°, flip canvas) | ✅ | ADR-0033; layers transformed, not resampled; arbitrary angle 📋 |
| Trim…, Reveal All, Duplicate document | ✅ | ADR-0033 |
| Auto Tone, Auto Contrast, Auto Color (as a Levels adjustment layer) | ✅ | ADR-0033 |
| Layer Style dialog (double-click a layer / Blending Options…) | ✅ | Live, one undo step; full Photoshop options (ADR-0030) |
| Layer Style: inner glow, satin, pattern overlay; every option (contours, noise, spread/choke, blend modes, gradient styles and methods, stroke position and gradient, bevel styles, contour and texture) | ✅ | ADR-0030; schema v7. Bevel, satin and texture approximate Photoshop |
| Several copies of shadows, strokes and overlays (+, ▲ ▼, delete) | ✅ | Up to 10 each |
| Fill opacity, global light | ✅ | |
| Saved layer styles (New Style…, built-ins, apply, delete, clear) | ✅ | `picstea.layerStyles`, this browser only |
| Layer Style: Channels and Blend If (split sliders, per channel) | ✅ | ADR-0031; schema v8; PSD blending ranges and `brst` read and written |
| Drag layers onto trash / New Layer; resizable, remembered panels | ✅ | `picstea.panelSizes` |
| Toolbar groups with flyouts (right-click / hold), Shift+key cycling, reset colours (D) button | ✅ | ADR-0027 |
| Spot Healing, Red Eye, Background / Magic Eraser, Color Replacement | ✅ | ADR-0027 |
| Color Sampler (4 points), Ruler | ✅ | UI state, not saved |
| Path Selection, Add / Delete Anchor Point, Convert Point; Rounded Rectangle and Polygon shapes | ✅ | ADR-0027 |
| Perspective Crop, Vertical Type, Quick/Object Selection, Magnetic Lasso, Content-Aware Move, Patch | 📋 | Later rounds |
| AI crawlers named in robots.txt; /llms.txt and /llms-full.txt | ✅ | ADR-0028 |
| Social preview image on every page; consistent Open Graph (site name, type, locale) | ✅ | `public/og-image.png`, `pageOpenGraph()` |
| Photoshop / Photopea alternative pages, FAQ page; related guides, docs prev/next | ✅ | ADR-0028 |
| Installable app (PWA) and offline editor after the first visit | ✅ | ADR-0029; Install button in Chromium, instructions elsewhere |
| ads.txt + AdSense verification meta tag | ✅ | Generated from `NEXT_PUBLIC_ADSENSE_CLIENT`; off without it |
| Analytics | ⏸ | None by decision; category ready |

## Gate 9 — Professional parity (open-ended, shipped in slices)

| Slice | Contents | Status |
|---|---|---|
| 9a | Rulers, guides, grid, snapping, align; filters; Levels and Curves | ✅ |
| 9b | Pen tool, paths, path ↔ selection, vector masks, clipping masks | ✅ |
| 9c | Smart objects (embedded documents), smart filters, rasterize, place embedded | ✅ |
| 9d | Advanced PSD: descriptor parser; text, adjustment layers, effects, vector masks, shapes and smart objects | ✅ |
| 9e | Automation (record/play actions, batch), swatches and colour picker, history panel | ✅ |
| 9f | Retouching: clone stamp, healing brush, dodge/burn/sponge, blur/sharpen/smudge | ✅ |
| 9g | Multi-layer selection: move/scale/rotate together, group transforms, align/distribute, group/duplicate/delete | ✅ |
| 9h | Vibrance, Color Balance, Photo Filter, Channel Mixer, Gradient Map; inner shadow, bevel, gradient overlay | ✅ |
| 9i | New-document size presets: Social, Print, Photo, Screen, Mobile, Ads, Icons; units and resolution; search; recent sizes | ✅ |
| 9j | Performance: exports, wand, bucket and Color Range draw in the worker; retouch strokes read pixels on demand | ✅ |

### 9a

| Feature | Status | Notes |
|---|---|---|
| Rulers (zoom-aware ticks, pointer marker) | ✅ | View → Rulers, Mod+R; off by default |
| Guides: drag from ruler, move, drag off to delete, New Guide…, Lock, Clear | ✅ | Saved with the project, undoable, never exported (ADR-0014) |
| Grid with adjustable spacing | ✅ | Thins out when zoomed far out |
| Snapping + smart guides: guides, grid, canvas edges/centre, other layers | ✅ | Move, scale handles, marquee, shapes, crop, guides; Mod while dragging disables |
| Layer → Align to canvas or selection | ✅ | Several layers and Distribute ✅ (9g) |
| Filter framework (catalogue, dialog, live preview, worker job, selection blending) | ✅ | Destructive on pixel layers; smart filters come with 9c |
| Filters: Gaussian, Box and Motion Blur, Unsharp Mask, Add Noise, Pixelate, Emboss, Find Edges | ✅ | Last Filter (Mod+Alt+F) |
| Full Filter menu (Photopea parity): Filter Gallery, Lens Correction, Camera Raw, 3D, Blur, Blur Gallery, Distort, Noise, Pixelate, Render, Sharpen, Stylize, Other, Fourier | ✅ | ADR-0036; `choice` parameters; Blur Gallery pins set by sliders |
| Liquify (Forward Warp, Reconstruct, Smooth, Twirl, Pucker, Bloat) | ✅ | ADR-0036; pixel layers; worker render at full size |
| Vanishing Point (perspective plane + clone stamp) | ✅ | ADR-0036; one plane; no paste/marquee into the plane yet |
| Levels and Curves adjustment layers (RGB + per channel, histogram) | ✅ | Composite only in PSD export |
| View preferences remembered per browser | ✅ | `picstea.view` in local storage |

### 9b

| Feature | Status | Notes |
|---|---|---|
| Vector path model (cubic Bézier subpaths), schema v4 | ✅ | ADR-0015; validated like all project data |
| Pen tool: corners, smooth points, close, Shape / Path modes | ✅ | Anchors snap (9a) |
| Path shape layers (fill, stroke, transform, effects; SVG `<path>`) | ✅ | Rasterised in PSD export |
| Direct Selection: anchors, handles, corner/smooth, delete, nudge | ✅ | Edits the active path shape, its vector mask and the work path |
| Work path ↔ selection (even-odd, holes; trace with tolerance) | ✅ | One work path per document; Paths panel 📋 |
| Vector masks (linked, enable/disable, edit) | ✅ | Exported to PSD as `vmsk` (9d) |
| Clipping masks (incl. clipped adjustments), PSD clipping flag read/write | ✅ | Semi-transparent bases differ slightly from Photoshop |

### 9c

| Feature | Status | Notes |
|---|---|---|
| Smart object layers (embedded documents, nested ≤ 4), schema v5 | ✅ | ADR-0016 |
| Re-rendered from source at the displayed scale (power-of-two levels, cached) | ✅ | Quality kept through any scale/rotate |
| Convert to Smart Object, Edit Contents tab (applies on save/autosave/close, one undo step) | ✅ | Edit tabs are never stored as separate projects |
| Smart filters (any filter; hide, edit, reorder, delete) | ✅ | Run on the main thread at render scale, cached |
| Place Embedded (image, SVG, PSD with layers, .picstea) | ✅ | Place keeps creating pixel layers |
| Rasterize Layer (smart objects, shapes, text) | ✅ | Keeps opacity, blend, masks, effects, clipping |
| Linked smart objects, PSD smart object import/export | 🟡 | PSD import ✅ (9d); linked files and PSD export 📋 |

### 9d

| Feature | Status | Notes |
|---|---|---|
| Hardened descriptor and EngineData parsers | ✅ | Bounded, null-prototype; ADR-0017 |
| Import: adjustment layers (9 kinds) | ✅ | Vibrance, Color Balance, Photo Filter, Channel Mixer, Gradient Map ✅ (9h); Selective Color, Color Lookup 📋 |
| Import: layer styles → drop shadow, outer glow, stroke, colour overlay | ✅ | Bevel, inner shadow, gradient overlay ✅ (9h); every effect, copy and option, Fill and global light ✅ (ADR-0030); Photoshop pattern pixels replaced by the closest built-in pattern |
| Import: vector masks, shape layers (fill + stroke), solid fills | ✅ | Inverted vector masks lose inversion |
| Import: editable text (first style run, mapped fonts) | ✅ | Mixed styles, warps, paragraph boxes simplified |
| Import: smart objects with embedded PNG/JPEG/WebP/GIF/PSD | ✅ | Warped, perspective, smart-filtered and linked ones open as pixels |
| Export: adjustment layers (8 kinds) and vector masks | ✅ | Temperature/Tint, Black & White in the flattened image only |
| Export: text, shapes, smart objects, effects as editable Photoshop data | 📋 | Rasterised with a notice |

### 9e

| Feature | Status | Notes |
|---|---|---|
| History panel (jump to any step, keyboard listbox) | ✅ | Snapshots 📋 |
| Actions: record, play (one undo step), rename, delete steps | ✅ | ADR-0018; brush strokes, transforms, text not recordable 📋 |
| Actions export/import (`picstea-actions.json`, validated) | ✅ | Stored in `picstea.actions` |
| Batch: action over up to 200 files → one ZIP (PNG/JPEG/WebP) | ✅ | Transient documents, never stored; 1 GB output limit |
| Colour picker (HSB field, hue, Hex/RGB/HSB) for foreground/background | ✅ | Properties-panel colour fields stay native |
| Swatches panel (default palette, add, delete, reset) | ✅ | `picstea.swatches`; ASE/GPL import 📋 |

### 9f

| Feature | Status | Notes |
|---|---|---|
| Retouch engine (pure pixel strokes, dirty-rect preview, one undo step per stroke) | ✅ | ADR-0019 |
| Clone Stamp (Alt-click source, aligned, opacity, current/all layers) | ✅ | Clone onto an empty layer with "All layers" |
| Healing Brush (source texture, destination tone via push–pull fill) | ✅ | Spot Healing / content-aware 📋 |
| Dodge, Burn (shadows/midtones/highlights, exposure), Sponge (saturate/desaturate, flow) | ✅ | |
| Blur, Sharpen (strength), Smudge (strength) | ✅ | Finger painting 📋 |
| Retouching masks or non-pixel layers | 📋 | Pixel layers only (as filters) |

### 9g

| Feature | Status | Notes |
|---|---|---|
| Multi-layer selection: Cmd/Ctrl-click, Shift-click range, All Layers, Shift-click on canvas | ✅ | Session state, not saved; ADR-0020 |
| Move / scale / rotate / nudge several layers or a group through one frame | ✅ | One undo step; no skew (rotated layers stay rectangular) |
| Flip, Group, Duplicate, Delete on the selection | ✅ | |
| Align to each other or the selection; Distribute centres or spacing (3+) | ✅ | Recordable in actions |
| Opacity/blend/visibility for several layers at once | 📋 | Properties panel edits the active layer |

### 9h

| Feature | Status | Notes |
|---|---|---|
| Vibrance, Color Balance, Photo Filter, Channel Mixer, Gradient Map adjustment layers | ✅ | ADR-0021; schema v6 |
| Inner shadow, bevel (inner), gradient overlay effects | ✅ | Bevel is an approximation; overlay spans the layer box |
| PSD import of the above (`vibA`, `blnc`, `phfl`, `mixr`, `grdm`, `IrSh`, `ebbl`, `GrFl`) | ✅ | Noise gradients, other bevel styles noted |
| PSD export of Vibrance, Color Balance, Channel Mixer | ✅ | Photo Filter, Gradient Map flattened; Photoshop check pending |
| Selective Color, Color Lookup | 📋 | Inner glow, satin, pattern overlay ✅ (ADR-0030) |

### 9i

| Feature | Status | Notes |
|---|---|---|
| About 80 size presets in 7 categories, with proportional previews | ✅ | Print/photo carry their ppi; large posters at 150 ppi to stay under 36 MP |
| Units px / in / cm / mm, resolution (ppi), swap orientation, custom background colour | ✅ | Unit changes keep the pixel size; the document stores the ppi |
| Search across all sizes; Recent sizes (`picstea.recentSizes`) | ✅ | |
| Starter design templates (text/shape/photo layouts) | 📋 | Needs content and image licensing |
| Colour modes other than RGB 8-bit, artboards | 📋 | Not in the engine |

### 9j

| Feature | Status | Notes |
|---|---|---|
| Export (all formats), magic wand, paint bucket and Color Range draw the document in the worker | ✅ | ADR-0022; identical pixels to the page path (E2E); page fallback |
| Color Range draws once per dialog; slider steps only re-test colours | ✅ | |
| Retouch strokes read the layer (and the "all layers" source) tile by tile | ✅ | Byte-identical to reading everything first (unit tests) |
| Selection under a layer moved by whole pixels copied, not drawn | ✅ | |
| Live canvas redraw of adjustment layers/styles above an edited layer | 📋 | Next candidate |

## Launch readiness (2026-10)

| Check | Status | Notes |
|---|---|---|
| Accessibility audit (in-house, WCAG 2.1 AA subset) on every site page and the editor's main states | ✅ | `e2e/a11y.ts`, runs in CI; manual checks listed in the report |
| Keyboard walkthrough (menus, dialogs, layers, properties) | ✅ | `e2e/keyboard.spec.ts` |
| Site audit: metadata, canonical, Open Graph, JSON-LD, links, drafts, lab Web Vitals | ✅ | `e2e/site-audit.spec.ts` |
| Large-document profile incl. 9-series features | ✅ | Two deferred items in the report |
| Security hardening review | ✅ | HSTS; crash-time save; storage-full test |

## Later gates (summary)

| Area | Status |
|---|---|
| Gate 10: cloud | ⏸ requires explicit product-owner approval |

## Known limitations

- Pixel layers have a fixed size. Painting outside a layer's box is clipped.
- Each brush stroke keeps a full-layer copy for undo. Above ~768 MB the oldest undo steps are dropped (ADR-0007).
- Scaling a shape also scales its stroke width.
- Text is point text (manual line breaks, no wrapping). Fonts are limited to common system fonts.
- Masks follow moves but not scale/rotate of their layer.
- Editing a layer that has several adjustment layers or layer styles above it can pause briefly (about 0.1 s on a 24 MP image) when the edit starts, while the canvas redraws them.
- Starting a retouching stroke on a very large layer (20+ MP) takes a noticeable moment while the layer is read.
- Fill, gradient and the paint bucket edit inside a pixel layer's own box; they do not grow the layer.
- Documents are capped at 12,000 px per side and 36 MP (full-resolution export and pixel tools still need one canvas of the whole image).
