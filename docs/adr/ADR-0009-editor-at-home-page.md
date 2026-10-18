# ADR-0009 — The editor is the home page

- Status: Accepted
- Date: 2026-10-08

## Context

Until v0.3.0 the home page was a text-only landing page that linked to the editor at `/editor`.
The product owner asked for visitors to land in the tool directly, with a short dialog that
explains it, instead of a page of text in front of the editor.

## Decision

- `/` renders the editor. `/editor` answers with a permanent (308) redirect to `/`, configured in
  `next.config.ts`, so old links and bookmarks keep working.
- `WelcomeDialog` (`src/components/welcome`) opens on the first visit. Dismissing it stores
  `picstea.welcomeSeen` in `localStorage`; storage errors are ignored, so the dialog simply shows
  again. The menu-bar logo and Help → Welcome to Picstea reopen it.
- The dialog is part of the server-rendered HTML (a closed `<dialog>`). It holds the page's only
  `<h1>`, the feature highlights and a short FAQ, so search engines and AI assistants still get a
  real description of the app. JSON-LD (`WebSite`, `Organization`, `SoftwareApplication`) stays
  on `/`. The home page is indexable; `robots.txt` no longer disallows anything.
- Every claim in the dialog describes a feature that exists today (docs/10).

## Consequences

- The editor's client bundle now loads on the home page. Gate 7 (performance) owns its size.
- Longer marketing content (feature pages, blog) belongs on separate routes in Gate 8, not in
  front of the editor.
- E2E tests open the editor through `openEditor()` (`e2e/helpers.ts`), which marks the welcome
  dialog as seen; `e2e/site.spec.ts` covers the dialog, the redirect and the SEO surface.
