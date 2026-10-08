# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

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
