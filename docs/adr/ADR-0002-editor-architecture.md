# ADR-0002 — Framework-independent editor engine with an external store

- Status: Accepted
- Date: 2026-10-08

## Context

React components must never be the source of truth for documents (docs/01 §3), and the engine
must not depend on Next.js (docs/02, "Dependency rule").

## Decision

```text
src/app, src/components (React/Next UI)
        │  useSyncExternalStore / method calls
        ▼
src/editor/controller   EditorController — use cases: open, import, save, restore, autosave
src/editor/core         EditorStore, document model, commands, history, viewport, shortcuts
src/editor/rendering    Renderer interface → Canvas2DRenderer → compositor
src/editor/assets       immutable binary assets (decoded lazily)
src/editor/formats      untrusted-input parsing/validation
src/editor/persistence  ProjectStorage + implementations
src/editor/serialization versioned format, migrations, validation
```

- `src/editor/**` is plain TypeScript. An ESLint `no-restricted-imports` rule forbids React, Next.js
  and UI imports there.
- `EditorStore` holds immutable state and notifies subscribers. React reads it through
  `useSyncExternalStore`. Components keep only ephemeral UI state, such as an open menu or a rename field.
- External effects (image decoding, storage, logging, the clock) are injected, which makes the
  engine testable in Node.

## Alternatives

- Redux/Zustand: they would work, but add a dependency for what a ~200-line store already does. We can revisit if
  middleware or devtools become valuable.
- State in React context/hooks: rejected. It ties the engine to React and causes broad re-renders.

## Consequences

- The engine is unit-testable without a browser (108 tests at the time of writing).
- Selectors must return stable references. Since state is immutable, returning sub-objects is safe.
