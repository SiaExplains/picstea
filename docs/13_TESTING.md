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

E2E tests run with Playwright (`pnpm build:e2e && pnpm test:e2e`) on port 3100, or on `E2E_PORT`
when set; network checks compare requests against the configured base URL, not a fixed port.
Choose menu items through `pickMenu` (`e2e/helpers.ts`), which opens submenus as needed
(ADR-0032).

`pnpm typecheck` runs `next typegen && tsc --noEmit`, so the route types Next.js generates exist
on a fresh checkout. CI runs lint, format check, typecheck, unit tests, the E2E build and tests,
and a production dependency audit.

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
