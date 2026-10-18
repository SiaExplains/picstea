# ADR-0011 — File formats without dependencies

- Status: Accepted
- Date: 2026-10-09

## Context

Gate 6 (docs/14) asks for robust PNG/JPEG/WebP plus SVG, PDF where feasible and a PSD
foundation, so that projects can move between Picstea and other creative tools. docs/12 requires
SVG and PSD to be treated as hostile input, and docs/12/15 discourage adding libraries without a
clear trade-off.

## Decision

- **No new dependencies.** Compression uses the browser's native `CompressionStream` /
  `DecompressionStream`. ZIP, PSD and PDF are written in-house, covering only what Picstea needs,
  so every byte of the hostile-input parsers is ours to validate. `ag-psd` (broader PSD support)
  and `pdf.js` (PDF import) were considered and rejected for now: a large parser surface for
  features we do not represent yet.
- **Detection by content.** `formats/open-file.ts` decides what a file is from its bytes; names
  and declared MIME types are ignored.
- **Shared hardening.** `formats/binary/bytes.ts` is a bounds-checked reader that throws
  `FormatError` instead of reading past the end. Inflation streams stop as soon as the output
  exceeds the declared or allowed size (zip bombs). Dimensions go through `checkDimensions`.
- **Project files (`.picstea`).** A ZIP of `picstea.json` (the same versioned serialization,
  migrations and validator as IndexedDB) plus the image assets. Every image is re-sniffed and
  size-checked; only referenced assets are read; all ids are replaced so an opened file can never
  overwrite local projects or images.
- **PSD.** A plain model (`psd-model.ts`), a writer (8-bit RGB, RLE, Unicode names, section
  dividers for groups, user masks, resolution, merged image) and a reader (raw/RLE/ZIP channels,
  layer count, group depth and a total decode budget enforced before allocation; unknown blocks
  skipped by length). Unsupported content is refused with a clear message or reported as a
  warning, never silently changed. Full Photoshop compatibility is not claimed (docs/05).
- **SVG.** Export writes shapes, text and fills as SVG elements and embeds everything else as
  PNG; documents with adjustment layers are flattened. Import never touches the DOM: the size is
  read with `DOMParser` (an inert XML document) and pixels come from an `<img>` decode, where
  scripts do not run and external resources are not loaded.
- **PDF.** Export only: one page, Flate RGB with an alpha soft mask, at the document resolution.

## Consequences

- PDF import, TIFF, PSB, 16/32-bit and CMYK PSD remain unsupported, each with a clear message.
- PSD export rasterises shapes and text and merges layer effects; adjustment layers are only in
  the merged image. Round-tripping through Photoshop keeps pixels, structure and settings, not
  Picstea's editable shapes/text.
- Parsing runs on the main thread; it can move to a worker in Gate 7 because the parsers are
  pure functions over bytes.
