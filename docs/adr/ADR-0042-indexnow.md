# ADR-0042 — IndexNow on production deploys

- Status: Accepted
- Date: 2026-11-11
- Extends: docs/10_SEO_AEO.md (sitemap)

## Context

Bing's index feeds ChatGPT search and Copilot, and Bing re-crawls a small site rarely. IndexNow
lets a site tell Bing, Yandex, Seznam, Naver and Yep that a URL changed; the engines share
submissions with each other. Google does not take part and reads the sitemap instead.

## Decision

- **Key.** A random 32-hex key, committed as `public/<key>.txt` (the file contains only the key)
  and as `INDEXNOW_KEY` in `src/lib/seo/indexnow.mjs`. The key is public by design: it only proves
  that whoever submits controls the host. A unit test keeps the file and the constant equal.
- **What changed.** The sitemap is the source: every page with a content date has a `lastmod`
  (docs, posts, landing pages from `src/content/pages/updated.ts`, the editor from `SITE_UPDATED`,
  indexes from their newest entry). No state is kept between runs.
- **When.** `.github/workflows/indexnow.yml` runs on GitHub `deployment_status` events that Vercel
  creates, only for `success` in `Production`. It sends the URLs (with hreflang alternates) whose
  `lastmod` is on or after the date of the previous successful production deploy, read from the
  GitHub Deployments API with the workflow's own token. `workflow_dispatch` with "all" sends every
  page. The script checks the live key file before posting.
- **Privacy.** The only data sent is public URLs from the sitemap, from GitHub's servers. Nothing
  runs in the browser, and no user or document data is involved, so the no-third-party-calls rule
  for user data (docs/15) is unchanged.

## Consequences

- `lastmod` is date-only, so a page changed earlier on the same day as the previous deploy is sent
  again. That is harmless.
- A page whose copy changes without a new date in `updated.ts` is not sent; the release checklist
  (docs/16) covers it.
- If the action fails, the site is unaffected; the next deploy or a manual run catches up.
