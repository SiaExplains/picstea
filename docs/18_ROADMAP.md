# 18 — Long-Term Roadmap

✅ marks an item that is built, with the ADR that records it. Unmarked items are not built yet.
Details: `FEATURE_STATUS.md`.

## Milestone A — Foundation

- Next.js ✅ (ADR-0002)
- TypeScript ✅
- Vercel ✅ (docs/11)
- editor shell ✅ (ADR-0009)
- document model ✅ (ADR-0002, ADR-0008)
- command system ✅ (ADR-0003)
- history ✅ (ADR-0003)
- IndexedDB ✅ (ADR-0004)

## Milestone B — Useful Editor

- image import ✅ (ADR-0011)
- canvas ✅ (ADR-0012)
- layers ✅ (ADR-0008)
- move ✅ (ADR-0007)
- crop ✅ (ADR-0007, ADR-0033)
- transform ✅ (ADR-0020, ADR-0033)
- text ✅ (ADR-0007)
- brush ✅ (ADR-0007)
- eraser ✅ (ADR-0007)
- shapes ✅ (ADR-0007)
- export ✅ (ADR-0011)

## Milestone C — Serious Editor

- selection ✅ (ADR-0010, ADR-0032)
- masks ✅ (ADR-0008, ADR-0015)
- blend modes ✅ (ADR-0008, ADR-0031)
- adjustments ✅ (ADR-0008, ADR-0014, ADR-0021, ADR-0033)
- filters ✅ (ADR-0014, ADR-0036)
- typography — point text only; wrapping and rich text are not built
- guides ✅ (ADR-0014)
- snapping ✅ (ADR-0014)
- paths ✅ (ADR-0015)

## Milestone D — Professional Interoperability

- PSD ✅ (ADR-0011, ADR-0017, ADR-0030, ADR-0031)
- PDF — export ✅ (ADR-0011); import not built
- SVG ✅ (ADR-0011)
- advanced color — RGB 8-bit only
- advanced layers ✅ (ADR-0021, ADR-0030, ADR-0031)
- smart objects ✅ (ADR-0016)

## Milestone E — Scale

- workers ✅ (ADR-0012, ADR-0022)
- tiled rendering
- caching ✅ (ADR-0012)
- GPU acceleration
- large documents ✅ (ADR-0007, ADR-0012)
- memory management ✅ (ADR-0007)

## Milestone F — Discovery & Revenue

- SEO ✅ (ADR-0013, ADR-0028)
- AEO ✅ (ADR-0028, ADR-0032)
- documentation ✅ (ADR-0013)
- blog ✅ (ADR-0013)
- templates
- Google Ads — website integration built (ADR-0013, ADR-0024); account pending (`LAUNCH_CHECKLIST.md`)
- custom sponsorships ✅ (ADR-0013, ADR-0025, ADR-0034, ADR-0035)
- consent management ✅ (ADR-0013, ADR-0024)

## Milestone G — Optional Cloud

Only after explicit product decision:

- authentication
- cloud documents
- synchronization
- collaboration
- AI services
