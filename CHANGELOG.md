# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [0.7.0] — 2026-10-09

### Added

- **Website**: documentation (getting started, layers and masks, selections, painting, file
  formats, keyboard shortcuts, privacy), guides for online photo editing and PSD editing, and a
  blog. Help → Documentation and Help → Blog open them from the editor.
- **Privacy choices**: on website pages, Google ads are only loaded if you agree. Accept, reject
  or choose per category, and change it any time with "Privacy settings" at the bottom of every
  page. The editor never loads advertising or third-party code.
- **Sponsorships**: MYLPER's own sponsorships, clearly labelled and without tracking, on the
  website and on the editor's start screen.
- Legal pages (privacy, cookies, terms, imprint, advertising) as drafts.

## [0.6.0] — 2026-10-09

### Changed

- **Much faster with large images.** On a 6000 × 4000 image with an adjustment layer, a brush
  stroke went from 36 seconds to under a second and dragging a layer from 28 seconds to about
  one. The canvas now draws only what you see, at screen resolution, and reuses the layers you
  aren't changing.
- While you paint or drag on a very large image, the view may briefly show a softer preview;
  it sharpens as soon as you pause ("Rendering…" in the status bar).
- Opening PSDs, exporting PSD and PDF, the magic wand and the paint bucket do their heavy work
  in the background, so the page stays responsive.
- Very large images show a short note when opened, and the memory set aside for undo follows
  how much memory your device has.
- Long operations show a "Working" overlay.

### Fixed

- The welcome dialog could reappear after a quick reload.

## [0.5.0] — 2026-10-09

### Added

- **Photoshop (PSD) files**: open layered PSDs with their layers, groups, names, opacity,
  visibility, blend modes and layer masks, and export your work as a layered PSD. Text and smart
  objects from Photoshop open as pixels, and anything MYLPER can't keep is listed when you open
  the file. 8-bit RGB and greyscale files are supported.
- **Project files**: File → Save Project As… (Cmd/Ctrl+Shift+S) saves a `.mylper` file with
  everything in it, to keep a backup or move a project to another computer or browser. Open it
  with File → Open.
- **SVG**: export keeps shapes and text as vectors (other layers are embedded as images); SVG
  files open as images.
- **PDF export**: a one-page PDF at the document's resolution.
- **GIF** images open (first frame).
- The export dialog says what each format keeps.

### Changed

- File → Open, drag and drop and Place Image accept all these formats. Files are recognised by
  their contents, not their names. TIFF and PDF files explain that they can't be opened yet.

## [0.4.0] — 2026-10-09

### Added

- **Selections**: Marquee (rectangle or ellipse, M), Lasso (freehand or polygonal, L) and Magic
  Wand (W). Hold Shift to add, Alt to subtract, or both to keep only the overlap. Drag inside a
  selection or use the arrow keys to move it.
- **Select menu**: All, Deselect, Reselect, Inverse, Color Range…, Feather…, Expand…, Contract…
  and Transform Selection (scale and rotate the selection with handles).
- **Working with a selection**: painting, fills and gradients stay inside it. Delete clears the
  selected pixels, Edit → Fill (Shift+F5) fills them, Cut, Copy and Paste work with them, and
  Cmd/Ctrl+J puts them on a new layer. Add Layer Mask with a selection makes a mask from it, and
  Image → Crop to Selection crops to it.
- **New tools**: Pencil (hard-edged pixels, N), Paint Bucket (Shift+G), Gradient (linear or
  radial, G) and Eyedropper (I). Alt-click with the brush or pencil also picks a colour.
- Selections can be undone like any other change. They are not saved with the project.

### Fixed

- The MYLPER logo in the menu bar could appear on a light box and be hard to read in some
  browsers.

## [0.3.0] — 2026-10-08

### Added

- **Layer groups**: group a layer with Cmd/Ctrl+G and ungroup with Cmd/Ctrl+Shift+G. You can also
  make a new empty group, nest groups inside groups, and collapse them in the Layers panel.
  Groups pass blending through by default. Give a group opacity, a blend mode, a mask or effects
  to treat it as one unit. Moving a group moves everything in it.
- **Drag and drop in the Layers panel**: drag a layer above or below another, or into a group.
  Bring Forward / Send Backward also move layers into and out of groups.
- **Layer masks**: Layer → Add Layer Mask. Click the mask thumbnail and paint black to hide or
  white to reveal (greys give partial transparency). Shift-click the thumbnail to turn the mask
  off for a moment. A mask follows its layer when you move it.
- **Adjustment layers** (Adjustments menu): Brightness/Contrast, Hue/Saturation, Exposure,
  Temperature/Tint, Black & White, Invert, Posterize and Threshold. They change the look of
  everything below them without touching the pixels, and each comes with a mask.
- **Layer effects**: drop shadow, outer glow, outer stroke and colour overlay, with live
  controls in the Properties panel. Layers with effects show an "fx" badge.

- The MYLPER logo in the menu bar, plus a favicon and app icons.
- A short welcome dialog on your first visit that explains MYLPER. Open it again from the logo or
  Help → Welcome to MYLPER.

### Changed

- The editor now opens straight away at the home page. The old text-heavy landing page is gone,
  and old `/editor` links forward to the home page.
- The project format moved to version 3. Projects saved with earlier versions open automatically.
- Alt+↑ / Alt+↓ select the layer above or below.

## [0.2.0] — 2026-10-08

### Added

- **Brush and eraser** with adjustable size, hardness and opacity. Paint on new transparent
  layers (Layer → New Layer). Every stroke can be undone. Use `[` and `]` to resize the brush.
- **Shapes**: rectangles (with rounded corners), ellipses and lines. They stay editable: change
  fill, stroke and corner radius at any time.
- **Text**: click with the Text tool and type straight on the canvas. Choose font, size, bold,
  italic, colour, alignment, line height and letter spacing. Click a text layer to edit it again.
- **Move and free transform**: drag layers, scale with handles (Shift keeps proportions, Alt
  scales from the centre), rotate by dragging outside a corner, flip horizontally or vertically,
  or type exact position, size and angle. Arrow keys nudge.
- **Crop**: drag the crop box and press Enter. Pixels outside the canvas are kept, so
  you can move them back in later.
- **Export** as PNG, JPEG or WebP (File → Export As…). The image is created on your device and
  saved directly. Nothing is uploaded.
- Foreground and background colours in the toolbar (X swaps them, D resets them).

### Changed

- Layer → New Layer now adds an empty pixel layer. Solid colour layers are under Layer → New Fill Layer.
- The Move tool is now the default tool.
- The project format moved to version 2. Projects saved with 0.1.0 open automatically.

### Fixed

- A dialog reopened quickly could close itself straight away.

## [0.1.0] — 2026-10-08

### Added

- First version of the MYLPER editor at `/editor`. Create documents, open PNG, JPEG and WebP images
  (file picker, drag and drop or paste), and work with layers: add, rename, duplicate, reorder,
  hide, lock, change opacity, blend mode and fill colour.
- Undo and redo for every edit, with keyboard shortcuts.
- Zoom and pan: zoom tool, hand tool, Space-drag, mouse wheel, trackpad pinch, fit to screen and 100%.
- Automatic saving in your browser, a list of recent projects, and restore after reload. Nothing is
  uploaded: images never leave your device.
- Landing page with structured data, sitemap and robots rules.
- Engineering foundation: TypeScript, lint, unit and end-to-end tests, CI, security headers, and
  architecture decision records.
