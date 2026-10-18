# 11 — Deployment, Domain & Infrastructure

## Deployment

Primary platform:

- Vercel
- Next.js

## Domain

Primary domain:

```text
picstea.com
```

The canonical origin is `https://picstea.com` (`src/lib/seo/site.ts`, overridable with
`NEXT_PUBLIC_SITE_URL`). Whichever of `picstea.com` / `www.picstea.com` Vercel serves as the
primary domain must match that origin, otherwise every canonical URL points at a redirect.

The former domain `mylper.com` (registered outside Route 53, registration running until
February 2027) should permanently redirect (301/308) to the same path on `picstea.com`. That
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
localhost
<vercel-preview-url>
picstea.com
```

Potential later:

```text
www.picstea.com
```

Redirect one canonical hostname to the other.

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
NEXT_PUBLIC_ADSENSE_CLIENT_ID
NEXT_PUBLIC_ANALYTICS_ID
```

Only public values belong in NEXT_PUBLIC variables.

Never place private secrets into browser bundles.
