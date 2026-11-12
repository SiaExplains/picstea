# ADR-0044 — Skew, distort, perspective, warp; crop presets and Perspective Crop

- Status: Accepted
- Date: 2026-11-11
- Extends: ADR-0033 (image commands), ADR-0036 (Vanishing Point), ADR-0043 (transforms)

## Context

Layers only had an affine transform (move, scale, rotate, flip). Photoshop and Photopea also skew,
distort, put in perspective and warp; PSD smart objects with perspective or a warp were imported
as pixels. The crop tool had no ratio presets, no straighten and no Perspective Crop, and the
shape tools had no custom shapes or stars.

## Decision

- **Maps.** A picture's normalised coordinates (u, v ∈ 0…1) go through either a homography to a
  quad (`core/geometry/homography.ts`, moved from Vanishing Point) or a bicubic Bézier patch with
  4 × 4 control points (`core/geometry/mesh.ts`, Photoshop's warp model). Presets (Arc … Twist,
  `warp-presets.ts`) produce control meshes from Bend and H/V distortion; their shapes approximate
  Photoshop's.
- **Rendering.** `drawMapped` splits the picture into cells and draws each as two triangles, each an
  affine `drawImage` clipped to the triangle, grown by half a pixel against seams. It runs on the
  GPU through Canvas 2D, with no WebGL or worker; 16–24 cells per side while dragging, 48 to apply.
- **Edit → Transform → Skew/Distort/Perspective/Warp** (`tools/move/distort-tool.ts`, loaded on
  first use). Selected pixels are lifted and drawn back through the map (`moveSelectedPixels`); a
  whole pixel layer is redrawn into a new, unscaled box; a smart object keeps an editable
  `distortion` (corners or a mesh, layer coordinates; schema v11) that the compositor draws
  through. Text and shapes are converted to smart objects first. Linked masks are redrawn through
  the same change (exact for perspective; a warp's mask follows its corners). One undo step each.
  Free Transform's modifier-drags (Cmd/Ctrl-drag a corner) are not added yet; the menu commands
  cover the same edits.
- **PSD import.** Perspective `nonAffineTransform` corners and warp descriptors (presets with their
  amounts, and custom meshes) become smart-object distortions instead of pixels. PSD export still
  rasterises distorted smart objects.
- **Crop.** Ratio presets (Free, Original, 1:1, 4:5, 5:4, 3:2, 2:3, 16:9, 9:16, custom) constrain
  drawing and resizing; Shift keeps the current ratio. "Delete cropped pixels" trims unscaled pixel
  layers to the canvas in the same undo step. Straighten rotates the canvas by the angle of a drawn
  line (a new arbitrary-angle canvas op, also Image → Image Rotation → Arbitrary…; guides are
  removed by non-right-angle rotations) and fits the crop box inside.
- **Perspective Crop** (Shift+C with Crop, loaded on first use): the quad becomes the new canvas;
  pixel layers are resampled, smart objects get a perspective distortion, text and shapes become
  smart objects first, masks and vector masks follow, guides are removed.
- **Shapes.** A Custom Shape tool with 17 built-in shapes drawn as editable paths, and a Star
  amount for polygons. `.csh` import is not included.

## Consequences

- A distorted smart object's Move-tool frame and hit area are still its undistorted box.
- Warp presets look close to, not identical to, Photoshop's; PSD warps import with our curves.
- New tools are lazy so the editor's first download stays within its budget. To make room, the
  main thread's job runner now loads the job code (PSD, filters, export) on demand instead of
  bundling it for its fallback path, and tool options and Image dialogs load when first used:
  the editor page went from about 360 KB to 347 KB of JavaScript.
