# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

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
