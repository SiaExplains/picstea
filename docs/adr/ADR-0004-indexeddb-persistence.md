# ADR-0004 — IndexedDB persistence with immutable assets

- Status: Accepted
- Date: 2026-10-08

## Context

Projects must survive reloads without a backend (docs/07), handle quota and eviction errors, and
avoid rewriting large binaries on every autosave.

## Decision

- Database `picstea` v1 has two stores:
  - `projects` (key `id`): serialized document, schema version and a list summary.
  - `assets` (key `[projectId, assetId]`, index `byProject`): `ArrayBuffer` plus metadata. We store
    ArrayBuffer rather than Blob to avoid long-standing Blob-in-IDB engine bugs.
- Assets are immutable, so a save writes only assets not yet stored for the project and
  deletes those no longer referenced, in a single transaction alongside the project record.
- Autosave runs 1.5 s after the last edit. Closing a tab saves first. `beforeunload` warns while
  changes are unsaved.
- Errors map to `StorageError` codes (`unavailable`, `quota`, `not-found`, `corrupt`, `unknown`).
  If IndexedDB is unavailable (some private modes), the controller falls back to
  `MemoryProjectStorage` and tells the user that work will not persist.
- No raw IndexedDB wrapper library. The ~250-line implementation does not justify a dependency.

## Alternatives

- `idb` library: small and good, but unnecessary for the current surface.
- OPFS: attractive for very large assets. We will revisit in Gate 7 (performance).

## Consequences

- Browser storage is never promised to be permanent. Export (Gate 3) and File System Access
  save (Gate 6) provide durable copies.
- Thumbnails for the recent list are not stored yet. They are a future additive change to the summary.
