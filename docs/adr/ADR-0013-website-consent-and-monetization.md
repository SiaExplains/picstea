# ADR-0013 — Website, consent and monetization

- Status: Accepted
- Date: 2026-10-09

## Context

Gate 8 (docs/14) asks for an indexable, fast and monetizable public website without
compromising privacy: marketing pages, docs, blog, structured data, Google Ads, Picstea's own
sponsorships and a consent system (docs/08–12). Picstea's core promise is that images never
leave the device; the editor's `connect-src 'self'` CSP enforces it.

Product decisions (Sia): AdSense account exists, ID supplied later via environment variables;
no analytics for now; legal pages as drafts with placeholders; ads on the website, plus one
sponsorship space on the editor's start screen.

## Decision

- **Separate website, separate root layouts.** `src/app/(editor)` and `src/app/(site)` are two
  root layouts, so moving from a website page to the editor is always a full page load: the
  editor gets its own strict CSP and never shares a JavaScript context with ad code a website
  page loaded (a client-side navigation would keep both). As a backstop the editor reloads
  itself if it finds vendor scripts on start. Unmatched URLs use `app/global-not-found.tsx`.
  Website pages are static server components whose content lives in typed TSX modules
  (`src/content`) — no Markdown/MDX dependency. Links to the editor don't prefetch it.
- **One routes registry** (`src/lib/seo/routes.ts`) feeds the sitemap. Draft blog posts and
  unfinished legal pages are excluded; a small proxy (`src/proxy.ts`) returns real 404s for
  unknown docs/blog URLs and unpublished drafts, because streamed pages always start with 200.
- **Structured data** builders emit only what is on the page (BreadcrumbList, Article,
  SoftwareApplication, FAQPage for visible FAQs); never ratings or reviews.
- **Consent** (`src/lib/consent`): categories necessary / analytics / advertising, a versioned
  decision in localStorage, a banner with equal-weight Accept all / Reject non-essential /
  Manage preferences, a preferences dialog reachable from every page, and a vendor registry —
  third-party code loads only through `VendorLoader`, only after consent; withdrawing consent
  for a loaded vendor reloads the page. With no optional vendor configured, nothing is asked.
- **AdSense** is a vendor in the advertising category, enabled only when
  `NEXT_PUBLIC_ADSENSE_CLIENT` (and `NEXT_PUBLIC_ADSENSE_SLOT` for the ad unit) are valid. Ads
  are requested as non-personalised. Ad spaces reserve fixed space (no layout shift) and show
  Picstea's sponsorship until consent is given.
- **Per-route CSP.** Every route, including the editor, gets the strict policy. Website routes
  additionally allow Google's ad origins (scripts, frames, connections, images) — and only when
  an AdSense ID is configured. Third-party domains allowed: `*.googlesyndication.com`,
  `*.google.com`, `*.gstatic.com`, `*.doubleclick.net`, `*.adtrafficquality.google`.
- **Sponsorships** (`src/lib/sponsorship`) are static, self-hosted, validated (https or local
  links only, local images only), labelled "Sponsored", `rel="sponsored"`, with no cookies or
  tracking — so they need no consent. The editor's start screen shows one; the editor never runs
  third-party code.

## Consequences

- Personalised AdSense ads in the EEA/UK require a Google-certified consent platform (IAB TCF).
  With this in-house banner, Google serves limited/non-personalised ads there. Switching to
  Google's certified CMP (AdSense → Privacy & messaging) or another certified CMP is a separate
  product decision.
- Legal pages are engineering drafts: operator details are placeholders, they are `noindex`
  until finalized, and they need review by a qualified lawyer before ads go live.
- E2E builds with a fake AdSense ID (`pnpm build:e2e`) and intercept Google's requests to prove
  nothing loads before consent and that the editor stays first-party only.
