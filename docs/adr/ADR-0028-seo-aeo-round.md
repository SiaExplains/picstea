# ADR-0028 — SEO and AEO: AI crawlers, llms.txt, social image, comparison and FAQ pages

- Status: Accepted
- Date: 2026-10-19
- Extends: docs/10_SEO_AEO.md

## Context

People increasingly find tools through AI assistants (ChatGPT, Claude, Gemini, Grok, Perplexity)
as well as search engines. The site had no social preview image, no machine-readable summary, no
comparison or FAQ pages, and pages that set their own Open Graph data silently lost the site
name, locale and type.

## Decision

- **robots.txt** keeps `Allow: /` for everyone and names the documented AI search and training
  crawlers explicitly (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot,
  Claude-User, PerplexityBot, Google-Extended, Applebot-Extended). Crawlers without a documented
  user agent (e.g. Grok's) are covered by `*`.
- **/llms.txt** (llmstxt.org) summarises what Picstea is, verified key facts, current limits and
  links to every page, doc and guide; **/llms-full.txt** holds every docs page as Markdown. Both
  are generated from the site's own content (`src/lib/seo/llms.ts`); the docs JSX is turned into
  text by walking the element tree (Next forbids `react-dom/server` in app code).
- **Social image:** `public/og-image.png` (1200 × 630, generated once from the app icon with
  `next/og`), used for Open Graph and `summary_large_image` cards. Every page sets its Open Graph
  data through `pageOpenGraph()`, which adds the image, site name, locale and type — Next replaces
  a parent's `openGraph` entirely when a page sets its own, and a file-based image was dropped too.
- **New pages** (in the sitemap, footer and site CSP list): `/photoshop-alternative`,
  `/photopea-alternative` and `/faq`, each with FAQ structured data. Comparisons only state
  general, verifiable facts about other products and list where they are the better choice.
- **Internal links:** "More guides" on every blog post, previous/next on docs pages, and website
  links in the editor's welcome dialog (the home page is the editor, rendered client-side, so the
  dialog's server-rendered text and links are what crawlers see there).

## Consequences

- The social image is static: regenerate it when the brand changes.
