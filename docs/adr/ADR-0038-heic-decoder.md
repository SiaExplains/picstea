# ADR-0038 — HEIC/HEIF decoding with vendored libheif (WebAssembly)

- Status: Accepted
- Date: 2026-10-20
- Extends: ADR-0006 (security headers), ADR-0029 (offline), ADR-0037 (converters)

## Context

iPhones save photos as HEIC. Safari can decode them; Chrome and Firefox can't. "HEIC to JPG" is
one of the most searched conversions, and iPhone users could not open their own photos in
Picstea. Decoding must stay on the device (docs/07), and the editor must not load third-party
code from other origins (ADR-0013).

## Decision

- **Library:** `libheif-js` 1.23.5 (libheif compiled to WebAssembly with Emscripten), the
  self-contained ES module `libheif-bundle.mjs` (about 2 MB, WebAssembly embedded). Chosen over
  `heic2any` (unmaintained since 2023) and `heic-to` (larger); `heic-decode` only wraps it.
- **Shipped unmodified from Picstea's own origin** at `/vendor/libheif/<version>/`, copied from the
  npm package (a devDependency) by `scripts/copy-libheif.mjs`, with both licence texts beside it.
  It is excluded from Prettier and ESLint so it stays byte-identical.
- **Loaded only when a HEIC file is opened**, inside the editor worker (`heicDecode` job), with
  `import(/* turbopackIgnore */ url)` so the bundler neither rewrites nor bundles it. Nothing is
  added to the editor's JavaScript bundle.
- **Detection by content:** an ISO-BMFF `ftyp` box with a HEVC HEIF brand (`heic`, `heix`, …), or
  `mif1`/`msf1` with such a compatible brand, so AVIF (also `mif1`) isn't mistaken for HEIC.
- **One image:** the primary image, with the file's rotation/mirroring applied; size limits are
  checked before pixels are allocated. Live Photo video, depth maps and bursts are ignored.
- **CSP:** `script-src` gains `'wasm-unsafe-eval'` on every route. It permits compiling
  WebAssembly only — not `eval()` or `new Function` — and `connect-src 'self'` is unchanged, so
  document data still can't leave the device.
- **Offline:** the service worker treats `.mjs` like other static files (cache-first); the path is
  versioned, so a cached copy is always the right one.
- **LGPL-3.0:** the library is a separate, unmodified, replaceable file; the About page names it,
  links its source and licence texts.

## Consequences

- HEIC opens, places (also as a smart object), converts and batches like other images.
- Upgrading: bump `libheif-js`, run the copy script, update `HEIC_MODULE_URL` and the About page.
- Any future WebAssembly code is allowed by the policy too; it must still come from the own
  origin (`script-src 'self'`).
