# ADR-0005 — Versioned project format with migrations and strict validation

- Status: Accepted
- Date: 2026-10-08

## Context

The document schema will change (docs/03, "Serialization"). Stored or imported records may be
corrupt, come from a newer version, or be hostile (docs/12).

## Decision

- Stored shape: `{ schemaVersion: 1, document }`.
- `MIGRATIONS[n]` upgrades version `n` to `n+1`. Loading runs every step from the stored version to
  current. A newer-than-current version is refused with a clear message.
- After migration, `validateDocument` checks every field (types, finite ranges, size limits, known
  layer kinds, hex colours, unique ids). It builds output objects field by field, so unknown keys
  (including `__proto__`) are dropped. A dangling `activeLayerId` is repaired rather than rejected.

## Consequences

- Changing the document shape requires a version bump, a migration, validator updates and tests.
  Released migrations are never edited.
- Validation is hand-written. A schema library (e.g. zod) can replace it if the model grows enough to
  justify the dependency.
