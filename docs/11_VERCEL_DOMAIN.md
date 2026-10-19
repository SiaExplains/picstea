# 11 — Deployment, Domain & Infrastructure

## Deployment

Primary platform:

- Vercel
- Next.js

## Domain

Primary domain and canonical origin:

```text
https://www.picstea.com      ← served by Vercel (production)
https://picstea.com          → 308 to www
https://mylper.com           → should 308 to www (former domain, see the launch checklist)
```

The canonical origin comes from `NEXT_PUBLIC_SITE_URL` (fallback in `src/lib/seo/site.ts`:
`https://www.picstea.com`). It must be **exactly the host Vercel serves**; otherwise every
canonical URL, the sitemap, robots.txt and llms.txt point at a redirect (or at another domain),
and Search Console rejects the sitemap. `NEXT_PUBLIC_*` values are baked in at build time:
redeploy after changing them.

Lesson from the rebrand (2026-10-19): Vercel still had `NEXT_PUBLIC_SITE_URL=https://mylper.com`,
so the live site declared mylper.com canonical. Check this variable whenever domains change.

The former domain `mylper.com` (registered outside Route 53, registration running until
February 2027) should permanently redirect (301/308) to the same path on `www.picstea.com`. That
redirect lives in the hosting configuration, not in the app (ADR-0023).

Do not make Route 53 an architectural dependency.

## DNS

Keep the application deployment independent from the registrar.

The architecture should work whether DNS is managed by:

- current registrar
- Squarespace
- another DNS provider

## Environments

Use:

```text
Local
Preview
Production
```

Suggested domains:

```text
localhost                 (NEXT_PUBLIC_SITE_URL=http://localhost:3000)
<vercel-preview-url>      (leave unset: canonicals point at production; Vercel marks previews noindex)
www.picstea.com           (production)
```

`picstea.com` redirects to `www.picstea.com` (Vercel → Domains); keep one canonical host.

## Vercel responsibilities

Vercel can provide:

- Next.js hosting
- CDN
- static assets
- server-rendered marketing pages
- route handling
- preview deployments

Do not use Vercel server functions for image editing unless a future architectural decision explicitly requires server processing.

## Environment variables

Keep secrets out of source control.

Examples:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_ADSENSE_CLIENT
NEXT_PUBLIC_ADSENSE_SLOT
NEXT_PUBLIC_ADSENSE_CMP
```

These are the variables the code reads today (ADR-0024). There is no analytics variable: Picstea
uses no analytics.

Only public values belong in NEXT_PUBLIC variables.

Never place private secrets into browser bundles.
