# Initial Claude Code Prompt

You are the lead engineer implementing **MYLPER**, a browser-based professional image editor.

Read this entire `docs/` handbook before making architectural decisions.

## Product

MYLPER is intended to become a serious browser-based image editor inspired by Photopea and Photoshop.

The application must eventually support a broad professional feature set including:

- documents
- layers
- groups
- masks
- selections
- transforms
- brushes
- eraser
- shapes
- text
- paths
- filters
- adjustments
- blend modes
- layer effects
- history
- rulers
- guides
- snapping
- PSD
- PNG
- JPEG
- WebP
- SVG
- PDF
- local persistence
- keyboard shortcuts
- professional editing workflows

## Critical architecture

The application is:

> **local-first and browser-native.**

User image/document data must not be uploaded to a server.

The initial system must not require:

- database
- backend API
- cloud storage
- server-side image processing

The deployment platform is Vercel and the application framework is Next.js.

Vercel hosts the application. It is not the user's image-processing backend.

## Domain

The product domain is:

`mylper.com`

The domain is currently registered outside Route 53 and is expected to be moved to Squarespace around/after the current registration period ending in February 2027.

Do not make Route 53 a dependency.

## Monetization

Revenue comes from:

- Google Ads
- MYLPER custom sponsorship advertisements

Ads must never obstruct editing or access document contents.

## Privacy and consent

Implement a proper consent architecture before enabling non-essential analytics/advertising technologies.

Support:

- necessary
- analytics
- advertising
- custom advertising

with:

- accept all
- reject non-essential
- manage preferences
- change preferences later

Consult qualified legal/privacy professionals for final legal compliance.

## SEO/AEO

SEO and AEO are first-class requirements.

The marketing/documentation/blog architecture must support:

- metadata
- canonical URLs
- structured data
- sitemap
- robots
- fast pages
- search-intent landing pages
- useful FAQ/tutorial content
- answer-oriented content

Do not send the editor bundle to every marketing page.

## Implementation strategy

Implement the project through the gates in:

`docs/14_PHASE_GATES.md`

Do not jump to advanced Photoshop-like features before the document engine is stable.

## First task

Before writing significant code:

1. inspect the repository
2. create/confirm the Next.js + TypeScript foundation
3. create the editor route
4. establish the domain-independent editor core
5. establish the document model
6. establish command/history interfaces
7. establish the rendering abstraction
8. establish local persistence interfaces
9. establish tests and CI
10. document important architectural decisions

Then stop at the appropriate phase gate and verify it before proceeding.

Do not implement a fake Photoshop UI with no real underlying document architecture.

The goal is a real editor engine that can progressively grow into a Photopea-class application.
