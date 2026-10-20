# ADR-0037 — File converters run in the editor (`/?convert=`)

- Status: Accepted
- Date: 2026-10-20
- Extends: ADR-0013 (website, consent and monetization), ADR-0018 (batch)

## Context

Converter searches ("webp to png", "psd to png") are high-volume and the pages attract links, so
Picstea gets one page per conversion. The obvious design puts a drop-a-file converter on each page.
But website pages may load Google AdSense after consent, and ADR-0013 promises that images are
only ever handled where no third-party code runs: the editor, with its strict CSP and
`connect-src 'self'`. Processing images next to ad scripts would break that promise even though
nothing is uploaded.

## Decision

- **Converter pages are ordinary website pages** (`/convert/<pair>` and the `/convert` hub, content
  in `src/content/converters.tsx`) that explain the conversion. Their call to action links to the
  editor at `/?convert=<pair>` with a full page load, like every other editor link.
- **The editor reads `?convert=` once on start** (`convert-link.ts`): a known value opens
  File → Convert… with the output format preset and skips the first-visit welcome; unknown values
  are ignored. The parameter is then removed from the address bar. It only picks a dialog — it is
  not a document link and carries no user data.
- **Conversion never opens a document** (`src/editor/formats/convert.ts`): detect the file from its
  bytes, decode (raster, SVG through `<img>`, PSD's flattened composite in the worker), draw on a
  surface (white matte for JPEG), encode with the export encoder. Nothing goes to IndexedDB or the
  history. Same size limits and messages as File → Open.
- **One file is saved directly; several go into one ZIP** (the batch ZIP writer and limits:
  200 files, 1 GB), because browsers block bursts of separate downloads.

## Consequences

- The conversion costs one extra page load, and the converting itself happens on a page without
  ads. Ad revenue stays on the explanatory pages.
- `?convert=` is the first editor deep link; the general deep-link work (`/?doc=`, `/?tool=`) can
  reuse the same read-once pattern.
- New input formats (HEIC, ADR-0038) only need a decoder; the pages and dialog stay the same.
