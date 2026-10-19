# 07 — Local Storage, Privacy & Data Boundaries

## Core rule

Picstea editing is local-first.

### Data that stays local

By default:

- images
- PSD files
- project documents
- layer data
- edit history
- selections
- masks
- generated previews
- exports
- clipboard-derived images

## Persistence hierarchy

```text
Active document
    ↓
In-memory document store
    ↓
IndexedDB autosave
    ↓
Optional File System Access API
    ↓
Explicit user download/export
```

## IndexedDB

Use IndexedDB for:

- local projects
- thumbnails
- document metadata
- recovery snapshots

Do not store huge transient rendering buffers unnecessarily.

## Browser storage in use

The cookie policy (`src/content/legal.tsx`) lists every entry and must change with them:

- IndexedDB `picstea`: projects and images.
- Local storage: `picstea.consent`, `picstea.welcomeSeen`, `picstea.view`, `picstea.swatches`,
  `picstea.actions`, `picstea.recentSizes`, `picstea.layerStyles` (saved layer styles, settings
  only, validated on load, ADR-0030) and `picstea.panelSizes`.
- Cache storage `picstea-static-v1` and `picstea-pages-v1` (service worker, ADR-0029): Picstea's
  own code, styles, icons and pages, never user images. Files that were still loading when the
  worker took control on the first visit are cached too (`src/lib/pwa/pwa.ts`). Sponsorship media
  under `/sponsors/` is never cached (ADR-0035).

## Browser storage limits

The application must gracefully handle:

- quota errors
- private browsing limitations
- unavailable IndexedDB
- storage eviction
- corrupted records

Never promise permanent browser storage.

Provide explicit export/download options.

## File System Access API

Where supported, allow:

- Open
- Save
- Save As

This creates a desktop-like workflow while preserving local-only behavior.

## Privacy boundary

No document data should be included in:

- Google Analytics events
- advertising requests
- custom ad targeting payloads
- error reporting
- logs

Do not send image pixels to an analytics vendor.

## Future backend boundary

If cloud functionality is ever added, it must be introduced behind an explicit service interface:

```ts
interface ProjectStorage {
  save(project: Project): Promise<void>
  load(id: string): Promise<Project>
  delete(id: string): Promise<void>
}
```

Local implementation:

```text
IndexedDbProjectStorage
```

Future implementation:

```text
CloudProjectStorage
```

The editor must not know which implementation it is using.
