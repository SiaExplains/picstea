# ADR-0045 — Editable PSD export; TIFF, PDF and PSB import

- Status: Accepted
- Date: 2026-11-12
- Supersedes: the "no pdf.js" part of ADR-0011
- Extends: ADR-0011 (file formats), ADR-0017 (advanced PSD), ADR-0038 (vendored libheif),
  ADR-0044 (smart-object distortion)

## Context

PSD export flattened shapes, layer styles, smart objects and four adjustment layers into pixels,
so a PSD from Picstea was much less editable in Photoshop than the document it came from. TIFF,
PDF and PSB files were refused on open.

## Decision

- **Editable PSD export**, each written as the inverse of an existing importer so our own reader
  checks every block:
  - shapes: the outline as vector data (`vsms`, rectangles, rounded rectangles, ellipses and lines
    turned into Bézier paths), the fill as `SoCo` and the stroke as `vstk`; fill layers as `SoCo`;
  - layer styles: `lfx2` (all kinds and several copies, global light in resources 1037/1049);
    the layer's pixels are written without the styles so Photoshop doesn't apply them twice.
    Styles with a pattern stay merged: the patterns are built into Picstea and a PSD could only
    reference them. Group styles and group vector masks are written too;
  - smart objects: `SoLd` (placement, `nonAffineTransform` for perspective, a custom `warp` mesh
    for warps) and the contents as an embedded PSD in the global `lnk2`, written recursively.
    Smart objects with smart filters are still rasterised;
  - Photo Filter (`phfl`), Gradient Map (`grdm`) and Black & White (`blwh`, Photoshop's default
    mix). Temperature/Tint has no Photoshop adjustment layer and stays flattened.
  - Real Photoshop and Photopea checks are manual: an exported file must be opened in both before
    a release that changes this code.
- **TIFF**: our own decoder in the worker — strips and tiles; none, PackBits, LZW, Deflate and JPEG
  (the browser's decoder per strip); 1/8/16-bit grey, RGB, palette, alpha; predictor 2. Photoshop's
  layered TIFFs (tag 37724) are wrapped into a minimal PSD and opened by the PSD reader. CMYK,
  floating point, separate planes and BigTIFF are refused clearly. Camera RAW files share TIFF's
  header and are told apart (DNGVersion tag, "CR" at byte 8, maker plus sub-IFDs); they are refused
  until a RAW decoder is chosen.
- **PDF**: PDF.js (Apache 2.0) is the one new dependency. It is copied unmodified into
  `/vendor/pdfjs/<version>/` by `scripts/copy-pdfjs.mjs` (worker, character maps, standard fonts,
  WebAssembly decoders, ICC profiles, licence), loaded only when a PDF is opened, cached offline by
  the service worker, run with eval off and no network fetches. A page opens as a picture at a
  chosen resolution (72–300 ppi); several pages ask which page. Place and Convert use page 1 at
  150 ppi. Writing PDF stays our own code.
- **PSB**: the PSD reader accepts version 2 with its 64-bit lengths (layer section, layer info,
  channel lengths, the `LMsk/Lr16/…/lnk2/PxSD` blocks) and 32-bit RLE row counts. The usual size
  limits still apply. Export stays PSD.

## Consequences

- PSD export files are larger (embedded smart-object contents).
- The repository carries 6.5 MB of vendored PDF.js; only the files a PDF needs are downloaded.
- Camera RAW, CMYK and 16/32-bit images remain open items.
