# ADR-0023 — Rebrand MYLPER → Picstea

- Status: Accepted
- Date: 2026-10-18

## Context

The product was renamed from MYLPER to **Picstea** (tagline "Edit Boldly. Create Freely."), with
`picstea.com` as the new domain. The repository was renamed on GitHub and the domain added to
Vercel outside the codebase.

## Decision

- **One source of brand truth:** `src/lib/seo/site.ts` holds the name, slogan, tagline,
  description and the canonical origin. The fallback origin is `https://picstea.com`;
  `NEXT_PUBLIC_SITE_URL` still overrides it, so local and preview builds are unchanged.
- **Approved artwork only:** favicons, touch and Android icons are the supplied files. The header
  wordmark is the supplied logo (white "picstea" on the brand blue) converted to PNG. It is a
  solid badge, so one image serves light and dark pages; the old light/dark logo pair is gone.
- **Colour:** the accent follows the logo blue (`#0d99e6`). Fills that carry white text use the
  darker `#0a72b5` to keep WCAG 1.4.3 contrast. Document defaults (shape fill, etc.) are not
  brand chrome and are unchanged.
- **Identifiers renamed without a migration:** the product had no real users yet, so the project
  format (`.picstea`, `application/x-picstea`, `picstea.json`, `picstea-project`), actions files
  (`picstea-actions`), local-storage keys (`picstea.*`), the IndexedDB database (`picstea`),
  custom DOM events and the log prefix were renamed outright. Old `.mylper` files and any data
  stored under the old keys are not read.
- **URLs unchanged:** no route was renamed, so the rebrand needs no in-app redirects. Moving
  traffic from `mylper.com` is a hosting-level 301, configured outside the repo.

## Consequences

- Anyone who used the editor on `mylper.com` starts with empty local storage on `picstea.com`
  (storage is per origin anyway, so a domain change alone would have had the same effect).
- `CHANGELOG.md` entries before 0.17.0 keep the old name; they are history.

## Update — teal identity (v0.20.0)

The approved artwork changed from blue to teal (icon background `#4da297`, wordmark background
`#008080`). Icons, wordmark and the menu-bar icon were replaced with the new supplied files, and
the accent followed: `#4da297` for lines and highlights, `#007a7a` for fills and text that need
WCAG 1.4.3 contrast on white, `#5cc0b2` for links on dark pages.
