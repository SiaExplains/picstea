# 05 — Feature & Tool Roadmap

The target is a serious browser image editor comparable in workflow and breadth to Photopea/Photoshop.

What is built today, phase by phase, is tracked in `FEATURE_STATUS.md` and the ADRs.

## Phase 1 — Editor Foundation

Implement:

- application shell
- menu bar
- toolbar
- canvas
- zoom
- pan
- new document
- open local image
- drag & drop
- clipboard paste
- save/export
- undo/redo
- keyboard shortcuts
- document tabs

### Gate

A user can:

1. Open an image.
2. Move around the canvas.
3. Make a basic edit.
4. Undo/redo it.
5. Export the result.
6. Reload the site without losing explicitly saved local work.

---

## Phase 2 — Layers

Implement:

- create layer
- delete layer
- rename layer
- duplicate layer
- reorder layer
- visibility
- lock
- opacity
- groups
- drag-and-drop ordering
- blend modes

### Gate

Users can build a multi-layer composition and save/reopen it locally.

---

## Phase 3 — Basic Tools

Implement:

- Move
- Brush
- Pencil
- Eraser
- Fill
- Eyedropper
- Crop
- Rectangle
- Ellipse
- Line
- Polygon
- Gradient

### Gate

Basic illustration and image-composition workflows are possible.

---

## Phase 4 — Text & Typography

Implement:

- text layers
- font selection
- size
- weight
- alignment
- line height
- letter spacing
- color
- text transform
- bounding boxes
- editable text

Later:

- rich text ranges
- paragraph styles
- text-on-path

### Gate

A user can create professional social-media/banner compositions.

---

## Phase 5 — Selection System

Implement:

- rectangular marquee
- elliptical marquee
- lasso
- polygonal lasso
- magic wand
- color selection
- inverse selection
- feather
- expand
- contract
- transform selection
- copy/paste selection
- delete selected pixels

Selection must become a reusable subsystem.

---

## Phase 6 — Transform & Crop

Implement:

- scale
- rotate
- skew
- perspective
- flip
- free transform
- numeric transform
- crop
- canvas resize

Status: Image Size, Canvas Size, canvas rotation/flip, Trim and Reveal All are in the Image menu
(ADR-0033).

---

## Phase 7 — Image Adjustments

Implement:

- brightness
- contrast
- exposure
- saturation
- hue
- temperature
- tint
- vibrance
- grayscale
- invert
- posterize
- threshold

Prefer non-destructive adjustment layers where practical.

---

## Phase 8 — Filters

Implement:

- blur
- Gaussian blur
- sharpen
- noise
- pixelate
- motion blur
- emboss
- edge detection

Create a filter framework rather than hardcoding every filter.

```ts
interface Filter {
  id: string
  name: string
  parameters: FilterParameter[]
  apply(context: FilterContext): Promise<void>
}
```

Status: the catalogue is data, one file per menu group (`src/editor/filters/catalogue/`), with
more than 60 filters in Photopea's submenus; `apply` is a pure, synchronous function of the
pixels and settings so it can run in the worker and as a smart filter (ADR-0014, ADR-0036).

---

## Phase 9 — Masks & Advanced Layers

Implement:

- layer masks
- clipping masks
- alpha masks
- vector masks
- adjustment layers
- clipping groups
- layer effects

---

## Phase 10 — Paths & Vector

Implement:

- pen tool
- anchor points
- handles
- paths
- path selection
- vector shapes
- stroke
- fill
- path-to-selection
- selection-to-path

---

## Phase 11 — Professional Editing

Implement:

- rulers
- guides
- smart guides
- grid
- snapping
- alignment
- distribution
- measurements
- history panel
- actions/macros foundation
- color picker
- swatches
- gradients
- patterns

---

## Phase 12 — Advanced Image Processing

Potential features:

- clone stamp
- healing brush
- content-aware-like operations
- dodge
- burn
- smudge
- liquify-like transformations
- advanced color correction
- curves
- levels
- channels
- histograms

Some of these may require sophisticated GPU or worker implementations.

Status: clone stamp, healing, dodge/burn and smudge (ADR-0019), Levels and Curves with
histograms (ADR-0014), Liquify and Vanishing Point (ADR-0036) are built, in workers where heavy.
There is no Channels panel yet; a layer can be limited to R, G or B (ADR-0031).

---

## Phase 13 — File Formats

Minimum:

- PNG
- JPEG
- WebP
- SVG

Then:

- GIF
- PDF
- TIFF where feasible
- PSD

PSD support should be treated as a major subsystem.

### PSD import/export goals

Support progressively:

1. raster layers
2. layer names
3. opacity
4. visibility
5. groups
6. text
7. blend modes
8. masks
9. effects
10. advanced Photoshop-specific constructs where technically feasible

Never claim full Photoshop compatibility unless verified.

---

## Phase 14 — Smart Objects / Advanced Documents

Potential:

- embedded documents
- linked documents
- reusable components
- non-destructive transformations
- editable placed files

---

## Phase 15 — PWA / Desktop-like Experience

Potential:

- installable PWA
- offline app shell
- local file workflows
- keyboard-first operation
- fullscreen editor
- desktop-like menus
- File System Access API integration

---

## Phase 16 — Optional Future Backend

This phase must not be implemented unless the product owner explicitly approves it.

Possible future capabilities:

- user accounts
- cloud documents
- synchronization
- collaboration
- cloud backups
- AI generation
- server-side rendering

These are optional extensions, not assumptions.
