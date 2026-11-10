# ADR-0040 — Fonts beyond the system fonts

- Status: Accepted
- Date: 2026-11-08
- Extends: ADR-0006 (security headers), ADR-0011 (formats), ADR-0017 (advanced PSD), ADR-0022 (workers)

## Context

Text could only use nine fonts every computer has, so PSDs with brand fonts rendered wrong and
designs looked generic: the biggest gap against Photopea and Photoshop after paragraph text. Picstea
must not send user data to third parties or fetch from other sites (docs/15 rule 13), and the CSP
allows `font-src 'self'` only.

## Decision

- **Four sources.** System fonts (as before); 27 curated Google Fonts **bundled** with Picstea;
  fonts **installed on this computer** through the Local Font Access API (Chromium, behind the
  browser's own permission prompt); and **uploaded** font files (TTF, OTF, WOFF, WOFF2, ≤ 10 MB).
- **Bundled fonts are self-hosted.** `scripts/copy-fonts.mjs` copies the latin subset at 400/700,
  upright and italic, from `@fontsource/*` dev dependencies into `public/fonts/` (≈ 2 MB, OFL 1.1
  only — the script refuses anything else) with their licences, and writes a compact manifest
  (`src/editor/fonts/bundled-fonts.ts`). Faces load on demand; the service worker caches woff2.
  No request ever leaves picstea.com, so the CSP is unchanged.
- **Loading.** `FontLibrary` (framework-free, the Font Loading API injected) registers `FontFace`s:
  bundled faces by URL, local fonts by `local("<PostScript name>")` (nothing is copied into the
  project), uploaded fonts from their bytes. When a face loads, text layouts are recomputed and
  the canvas redraws. Worker exports load the same fonts into the worker's `FontFaceSet`; uploaded
  font bytes travel with the job.
- **Document model (schema v9).** `TextLayer.fontFamily` is any safe family name (no quotes,
  brackets or CSS punctuation, ≤ 128 characters). `EditorDocument.fonts` lists local and uploaded
  faces (family, weight, italic, source, PostScript name, asset id). Bundled and system fonts are
  recognised by name and need no entry.
- **Uploaded fonts are project assets.** The asset store accepts font MIME types; files are
  identified by their first bytes, checked by the browser loading them, saved in IndexedDB with the
  project and written into `.picstea` files (`assets/<id>.<ext>`, sniffed again on open).
- **Missing fonts.** A family that is neither system, bundled nor listed in the document keeps its
  name and draws with a fallback; the editor says which fonts are missing once per document.
  Re-adding the font (upload or local) fixes the text without editing it.
- **PSD.** PostScript names are matched against system fonts, bundled fonts, then local and
  document fonts; export writes PostScript names Photoshop recognises (known names for system and
  bundled fonts).

## Consequences

- About 2 MB of font files in the repository and on the CDN, fetched only when used.
- Local fonts work in Chrome and Edge only; other browsers use upload.
- A project using a local font shows the fallback on a computer without that font, by design:
  installed fonts are licensed to that computer and are never copied.
