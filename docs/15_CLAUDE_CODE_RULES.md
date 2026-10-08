# 15 — Claude Code Implementation Rules

You are implementing MYLPER.

## Rule 1 — Read before coding

Before implementing a feature:

1. inspect repository structure
2. inspect existing architecture
3. identify affected modules
4. understand current document model
5. understand current rendering pipeline
6. identify tests

Do not blindly create parallel abstractions.

## Rule 2 — Preserve architecture

Never put editor business logic directly into React components.

## Rule 3 — No premature backend

Do not create:

- database
- API for documents
- upload service
- cloud image storage
- server image processing

unless explicitly requested.

## Rule 4 — No accidental uploads

Do not use external image-processing APIs.

Do not upload user images for convenience.

## Rule 5 — Small increments

Implement one coherent feature at a time.

After each feature:

- run tests
- run typecheck
- run lint
- manually verify
- update documentation

## Rule 6 — Never silently weaken functionality

If a requested professional feature cannot be implemented fully:

1. explain the technical limitation
2. implement the strongest safe version
3. document the limitation
4. leave an extension point

Do not pretend a placeholder is a finished Photoshop feature.

## Rule 7 — Avoid overengineering

Do not introduce WebGL, WebGPU, workers, WASM or complex libraries simply because they sound advanced.

Introduce complexity when:

- profiling justifies it
- a feature requires it
- it provides a measurable architectural advantage

## Rule 8 — Use adapters

External systems should sit behind interfaces.

Examples:

```text
StorageAdapter
ExportAdapter
FormatParser
AdvertisementProvider
ConsentProvider
AnalyticsProvider
```

## Rule 9 — Keep local-first behavior testable

A test should be able to prove:

> editing a local image does not trigger a network upload.

## Rule 10 — Security first

All imported files are untrusted.

Validate everything.

## Rule 11 — Don't copy protected assets

MYLPER can be inspired by the workflow and concepts of professional editors.

Do not copy:

- Photoshop branding
- Adobe assets
- Photopea branding
- proprietary icons
- proprietary source code
- copyrighted UI assets

Create MYLPER's own visual identity.

## Rule 12 — Definition of done

A feature is done only when:

- implementation is complete
- edge cases handled
- tests exist
- UX works
- accessibility considered
- performance considered
- documentation updated

## Rule 13 — Ask before architectural pivots

If implementation requires:

- backend
- external database
- cloud file storage
- server-side image processing
- major rendering rewrite

stop and request product-owner approval.

## Rule 14 — Maintain an architecture decision record

For important decisions create:

```text
docs/adr/ADR-NNNN-title.md
```

Include:

- context
- decision
- alternatives
- consequences

## Rule 15 — Keep a feature status document

Maintain:

```text
docs/FEATURE_STATUS.md
```

with:

- planned
- in progress
- complete
- blocked
- deferred
