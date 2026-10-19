# ADR-0029 — Installable app and offline editor (service worker)

- Status: Accepted
- Date: 2026-10-19
- Extends: ADR-0001 (local-first), ADR-0013 (website consent and monetization)

## Context

Projects already live in the browser (IndexedDB), but the editor needed a connection to load,
and browsers didn't offer to install it. Comparable editors offer an Install button.

## Decision

- **`public/sw.js`**, plain JavaScript with no build step or dependency, served with
  `Cache-Control: no-cache` and a strict CSP (`next.config.ts`). Registered by `PwaStart` in both
  root layouts, in production builds only.
- **Same-origin GET requests only.** Cross-origin requests (ads, Google) and anything with a body
  are left to the browser. The worker never sees user images or projects.
  - `/_next/static/*`, icons, fonts and the manifest: cache-first (`picstea-static-v1`, trimmed to
    400 entries). Names are content-hashed, so a cached file is always correct and tabs on an
    older version keep finding their files.
  - Pages: network-first with the cached copy as fallback (`picstea-pages-v1`); a never-visited
    page offline gets a small built-in "You're offline" page.
  - RSC payloads (`?_rsc=`), `/sw.js` itself and other files are not handled.
- **Warm-up:** after registering, the page sends the URLs of the app files it already loaded and
  its own address, so the second visit works offline even for files loaded before the worker
  took control.
- **Updates:** `skipWaiting` and `clients.claim`. Safe because HTML is network-first and old static
  files remain cached; no "reload to update" prompt is needed.
- **Install:** Chromium's `beforeinstallprompt` is kept (`src/lib/pwa/pwa.ts`) so the start screen
  can show "Install Picstea"; Help → Install Picstea… prompts or explains how to install in other
  browsers. The manifest gains `id`, `scope`, `orientation`, `categories`; icons stay `any` (the
  artwork reaches the edges, so a maskable crop would cut it).
- The caches are listed in the cookie policy (strictly necessary for the service requested).

## Consequences

- E2E tests block service workers except `e2e/pwa.spec.ts`, so other tests' network assertions
  are unaffected.
- **Kill switch:** if the worker ever misbehaves, replace `public/sw.js` with a version whose
  `activate` handler deletes the `picstea-*` caches and calls `self.registration.unregister()`;
  browsers fetch the new script on the next visit because it is never cached.
