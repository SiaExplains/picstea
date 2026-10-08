# 07 — Local Storage, Privacy & Data Boundaries

## Core rule

MYLPER editing is local-first.

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
