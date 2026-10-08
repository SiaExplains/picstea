# 13 — Testing & Quality Gates

## Unit tests

Test:

- document model
- transforms
- coordinate conversions
- layer ordering
- blend calculations
- selection geometry
- command execution
- undo/redo
- serialization
- migrations

## Integration tests

Test:

- opening files
- importing images
- editing
- exporting
- local persistence
- recovery
- keyboard shortcuts

## End-to-end

Use browser E2E tests for:

- new document
- open image
- create layer
- draw
- transform
- undo
- save
- reopen
- export

## Visual regression

The editor UI should have visual regression tests for:

- toolbar
- panels
- layers
- canvas viewport
- dialogs
- responsive states

## Performance benchmarks

Track:

- startup time
- first usable editor time
- canvas FPS
- filter latency
- export latency
- memory usage
- document open time

Test multiple document sizes.

## Gate rule

No phase is complete because the feature "works once".

A phase is complete only when:

- implementation exists
- tests exist
- UX is usable
- performance is acceptable
- no known architecture violation exists
- previous phases still work
