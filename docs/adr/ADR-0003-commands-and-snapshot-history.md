# ADR-0003 — Commands with snapshot-based undo history

- Status: Accepted
- Date: 2026-10-08

## Context

All edits must be commands (docs/01 §4) so that undo/redo, history, testing, persistence and later
collaboration work. Commands could carry their own inverse, or history could store snapshots.

## Decision

- A `Command` is `{ type, label, mergeKey?, apply(doc) → doc }`. `apply` is pure. Returning the same
  instance means "no change", and nothing is recorded. Invalid operations throw `CommandError`
  with a user-facing message.
- History records `{ before, after }` document references. Undo restores `before`. Because documents
  are immutable with structural sharing, and pixels live in immutable assets referenced by id,
  an entry costs roughly the changed path, not a copy of the image.
- Consecutive commands with the same `mergeKey` within 1 s merge into one step, for example a slider
  drag. UI code calls `sealHistory()` at the end of a gesture.
- History is capped at 200 entries. Layer selection is not an edit and is not recorded.
- Assets referenced by any history entry are kept alive. They are released when the document closes.

## Alternatives

- Per-command inverse operations: more code per command and easy to get subtly wrong. They may still
  be needed for collaboration (operational transforms), and the `Command` shape leaves room for an
  optional `invert`.

## Consequences

- Pixel-editing tools (brush, eraser — Gate 3) must produce new immutable assets, or tile-level
  deltas behind an asset id, rather than mutating bitmaps in place. That keeps snapshot undo cheap.
