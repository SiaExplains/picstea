# ADR-0001 — Local-first, no application backend

- Status: Accepted
- Date: 2026-10-08

## Context

Picstea's core promise is that user images and projects stay on the user's device
(docs/01_PRODUCT_PRINCIPLES.md, docs/07_STORAGE_PRIVACY.md). Vercel hosts the Next.js app, but must
not become an image-processing or storage backend.

## Decision

- No database, document API, upload service, cloud storage or server-side image processing.
- All editing, decoding, compositing and persistence run in the browser.
- Persistence goes through the `ProjectStorage` interface (`src/editor/persistence/project-storage.ts`).
  Implementations today: `IndexedDbProjectStorage` and `MemoryProjectStorage`.
- The browser enforces the boundary: the Content-Security-Policy sets `connect-src 'self'`
  (ADR-0006), and an E2E test asserts that opening, editing and saving an image issues no
  non-GET or cross-origin requests (`e2e/editor.spec.ts`).

## Alternatives

- Server-side persistence/rendering: rejected. It contradicts the product principle and adds cost and privacy risk.
- Optional cloud sync now: deferred to Gate 10, and only with explicit product-owner approval.

## Consequences

- Browser storage limits, eviction and private-mode restrictions are product concerns: the UI
  surfaces them, and export (Gate 3) is required for durable copies.
- A future `CloudProjectStorage` can implement the same interface without editor changes.
