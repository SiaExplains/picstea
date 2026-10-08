# 11 — Deployment, Domain & Infrastructure

## Deployment

Primary platform:

- Vercel
- Next.js

## Domain

Primary domain:

```text
mylper.com
```

The domain is currently registered outside Route 53.

The current registration is expected to run until February 2027 and is planned to be moved to Squarespace.

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
mylper.com
```

Potential later:

```text
www.mylper.com
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
