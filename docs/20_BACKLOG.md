# 20 — Future Feature Backlog

This is intentionally not a commitment that every item will be implemented.

Items marked ✅ are built; the ADR records how. Details: `FEATURE_STATUS.md`.

## Editing

- liquify ✅ (ADR-0036)
- perspective warp
- puppet warp
- content-aware operations
- advanced healing ✅ healing brush, spot healing (ADR-0019, ADR-0027); content-aware fill not built
- advanced cloning ✅ clone stamp (ADR-0019), Vanishing Point (ADR-0036)
- dodge/burn ✅ (ADR-0019)
- smudge ✅ (ADR-0019)
- channel mixer ✅ (ADR-0021)
- curves ✅ (ADR-0014)
- levels ✅ (ADR-0014; Auto Tone/Contrast/Color add Levels layers, ADR-0033)
- color balance ✅ (ADR-0021)
- selective color
- HDR-oriented workflows

## Design

- smart guides ✅ (ADR-0014)
- component-like reusable elements
- templates
- artboards
- multiple canvases
- symbols
- reusable styles ✅ saved layer styles (ADR-0030)

## Automation

- action recording ✅ (ADR-0018)
- batch processing ✅ (ADR-0018)
- macros ✅ actions (ADR-0018)
- scripting API

## AI — optional future

AI capabilities could eventually include:

- background removal
- object selection
- generative fill
- image expansion
- object removal
- semantic search

Any AI service that sends user data externally requires an explicit architecture and privacy decision.

## Collaboration — optional future

- multiplayer editing
- comments
- review mode
- sharing
- cloud projects

These features are deliberately outside the initial local-only architecture.
