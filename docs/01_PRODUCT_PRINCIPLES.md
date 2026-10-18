# 01 — Product & Engineering Principles

## 1. Browser-first

Picstea is primarily a browser application.

The editor must be able to operate after the application shell loads, without a request to a Picstea editing backend.

## 2. Local-first

User documents should live in:

- browser memory during active editing
- IndexedDB for local persistence
- File System Access API where supported
- downloadable files for explicit export

Do not automatically upload:

- source images
- PSD files
- project documents
- canvas contents
- thumbnails
- edit history
- clipboard contents
- generated exports

## 3. UI is not the document model

React components must never become the source of truth for document state.

Use a dedicated editor/document engine.

Recommended conceptual separation:

```text
React UI
   ↓
Editor Commands
   ↓
Document Store
   ↓
Rendering Engine
   ↓
Canvas / WebGL
```

## 4. Commands instead of direct mutation

Editing operations should be represented as commands.

Examples:

- CreateLayer
- DeleteLayer
- MoveLayer
- ResizeLayer
- RotateLayer
- SetOpacity
- SetBlendMode
- AddMask
- RemoveMask
- AddText
- UpdateText
- ApplyFilter
- CropDocument

This makes undo/redo, history, testing, persistence and collaboration possible later.

## 5. Non-destructive editing

Prefer storing operations/parameters over permanently modifying source pixels.

Example:

```text
Original image
   +
Brightness adjustment
   +
Contrast adjustment
   +
Blur adjustment
```

rather than immediately destroying the original pixels.

## 6. Progressive complexity

Every phase must leave the architecture suitable for later phases.

Do not build throwaway prototypes that require rewriting the document engine.

## 7. Performance is a feature

Large images can easily become expensive.

Avoid:

- unnecessary React rerenders
- copying entire image buffers for small changes
- synchronous heavy computation on the main thread
- storing huge binary data in React state

Use:

- Web Workers
- OffscreenCanvas where supported
- transferable ArrayBuffers
- tiled rendering where necessary
- caching
- incremental rendering
- GPU acceleration where appropriate

## 8. Privacy by architecture

Do not implement analytics that inspect image/document content.

Telemetry, if introduced later, must be explicitly designed around privacy and consent requirements.

## 9. No artificial dependency on cloud infrastructure

The product should remain useful if the backend does not exist.

Cloud services can later be added for:

- accounts
- cloud projects
- synchronization
- collaboration
- AI processing
- server-side conversion

These must be optional architectural extensions.
