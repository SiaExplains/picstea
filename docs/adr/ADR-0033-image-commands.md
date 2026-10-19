# ADR-0033 — Image Size, Canvas Size, rotation, Trim, Auto adjustments and Duplicate

- Status: Accepted
- Date: 2026-10-19
- Extends: ADR-0020 (multi-layer transforms), ADR-0032 (menus)

## Context

Picstea's Image menu had only Crop. Photoshop and Photopea also offer Image Size, Canvas Size,
Image Rotation, Trim, Reveal All, Auto Tone/Contrast/Color and Duplicate. The user asked for all
of them.

## Decision

- **Whole-image transforms** (`core/geometry/canvas-transform.ts`, `transformCanvas` command).
  Image Size, rotation by 90° or 180°, and Flip Canvas are each a matrix from old to new document
  coordinates, plus a new canvas size.
  - Layers move through the matrix with `transformThrough`, the code behind group
    transforms. Pixel layers are not resampled: they keep their pixels and are drawn transformed,
    so scaling down and up again is lossless and text and shapes stay vector.
  - Raster masks are redrawn through the matrix into a new bitmap. Vector masks, the work path
    and guides are mapped exactly. The selection is dropped.
  - Image Size can also set the resolution (ppi).
- **Canvas Size, Trim and Reveal All are crops** (`cropDocument`, now with a label).
  - Canvas Size anchors on one of nine positions and can add size relative to the current one.
  - Trim measures the visible image: transparent pixels, or the top-left or bottom-right
    colour.
  - Reveal All grows the canvas to the bounds of every transformable layer.
- **Auto Tone, Auto Contrast and Auto Color** (`adjustments/auto.ts`) add a **Levels adjustment
  layer** computed from the visible image's histogram, ignoring the darkest and lightest 0.1%.
  Photoshop changes pixels instead; a layer stays editable and removable.
  - **Tone:** stretches each channel.
  - **Contrast:** stretches all channels together.
  - **Color:** stretches each channel, then sets per-channel gamma so the average colour becomes
    grey.
  - When the image already spans the range, nothing is added and a note says so.
- **Duplicate** opens the document as a new document, with a new id and the name "… copy", in a
  new tab. Bitmaps are immutable assets, so both documents share them safely.
- **Shortcuts:** only Auto Tone (Mod+Shift+L) and Auto Contrast (Mod+Alt+Shift+L) get one.
  Photoshop's Image Size (Mod+Alt+I) and Canvas Size (Mod+Alt+C) shortcuts open the browser's
  developer tools on macOS, and Auto Color's (Mod+Shift+B) toggles Chrome's bookmarks bar, so
  those are not bound.

## Consequences

- Rotating by any angle other than 90° or 180° (Photoshop's "Arbitrary…") is not offered yet.
- After Image Size, pixel layers show their source pixels scaled. Exports and Flatten render
  them at the new size, as Photoshop's resampling would.
