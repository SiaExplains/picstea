# 10 — SEO & AEO

SEO and AEO are first-class product requirements.

## SEO goals

Picstea should be discoverable for queries around:

- online image editor
- free Photoshop alternative
- browser image editor
- PSD editor online
- edit images online
- photo editor online
- PNG editor
- JPEG editor
- WebP editor
- online design editor
- image editing tools

Do not keyword-stuff.

## Marketing architecture

Create indexable pages for meaningful search intent:

```text
/
 /online-photo-editor
 /psd-editor
 /png-editor
 /jpeg-editor
 /webp-editor
 /image-resizer
 /image-compressor
 /background-remover
 /photo-filters
 /learn/
 /blog/
 /docs/
```

Built: `/online-photo-editor`, `/psd-editor`, `/png-editor`, `/jpeg-editor`, `/webp-editor`,
`/image-resizer`, `/image-compressor`, `/photo-filters` (each lists the others through
`RelatedTools`). Converters: `/convert` and one page per pair (`/convert/webp-to-png`, …) in
`src/content/converters.tsx`. Their button opens the editor at `/?convert=<pair>`; the converting
itself never happens on a website page, which may run ad code (ADR-0037). How-to pages (one edit each, `HOW_TO_PAGES` in `RelatedTools.tsx`): `/blur-background`,
`/make-background-transparent`, `/add-text-to-photo`, `/black-and-white-photo`, `/sharpen-image`,
`/liquify`. Don't add a how-to page for a topic that already has a blog post (curves, masks,
blemishes, batch): two pages for one search compete. Not built: `/background-remover` (needs the feature first), `/learn/`.

Only create pages when they contain genuinely useful content/functionality.

## AEO

Answer Engine Optimization should focus on clear, structured answers.

Pages should contain:

- concise definitions
- direct answers
- step-by-step instructions
- feature explanations
- comparison information
- FAQs
- examples
- limitations

The home page is the editor (fixed to the viewport), so its crawlable text lives in the welcome
dialog: the short intro plus a collapsed "About Picstea" section (`WelcomeAbout`, a server
component passed in as children, so it adds no editor JavaScript). Never put text under or behind
the editor where users can't see it. Keep its claims in line with `src/lib/seo/llms.ts`.

Machine-readable entry points for AI assistants (ADR-0028):

- `/llms.txt` — what Picstea is, verified facts, current limits, every page, doc and guide.
- `/llms-full.txt` — every docs page as Markdown.
- Both are generated from the site content (`src/lib/seo/llms.ts`); update the facts and limits
  there when features change, and never list something the editor can't do.
- Comparison pages (`/photoshop-alternative`, `/photopea-alternative`) and `/faq` state only
  general, verifiable facts about other products and say where they are the better choice.
- `/about` (ADR-0032) describes the product, the privacy model, funding and the current version;
  it is in the sitemap, the footer and `llms.txt`, and opened from Help → About Picstea.

## Structured data

Where applicable implement:

- WebSite
- SoftwareApplication
- Organization
- Article
- BreadcrumbList
- FAQPage only where appropriate and compliant with current search-engine guidance

Do not fabricate reviews or ratings.

## Metadata

Every important page needs:

- title
- meta description
- canonical URL
- Open Graph
- Twitter/X metadata where useful
- robots directives
- one social preview image (`public/og-image.png`), set through `pageOpenGraph()` on every page
  that defines its own Open Graph data (Next replaces the parent's `openGraph` entirely)

All absolute URLs come from the canonical origin (`NEXT_PUBLIC_SITE_URL`, docs/11).

## Sitemap

Generate sitemap automatically from known public routes.

Do not index private/local editor documents.

## Robots

Prevent indexing of:

- temporary document routes
- local project identifiers
- internal/debug pages
- private user content

Everything public is allowed, and the documented AI search and training crawlers are named
explicitly (`src/app/robots.ts`).

## Performance

SEO performance depends heavily on:

- Core Web Vitals
- fast HTML
- optimized images
- minimal JavaScript on marketing pages
- good caching
- stable layout

Do not load the entire editor bundle on ordinary blog pages.

## Content strategy

Create useful educational content:

- How to edit a PSD online
- How to remove a background
- How to resize an image
- PNG vs WebP
- How layers work
- Photoshop alternatives
- Image editing tutorials

Content must be genuinely useful, not generated SEO filler.
