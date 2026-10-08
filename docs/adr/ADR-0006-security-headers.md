# ADR-0006 — Baseline security headers and CSP

- Status: Accepted
- Date: 2026-10-08

## Context

docs/12 asks for a restrictive Content-Security-Policy, with every third-party domain documented.
Advertising and consent vendors (Gate 8) are not chosen yet.

## Decision

`next.config.ts` sends on every route:

- `Content-Security-Policy`: `default-src 'self'; connect-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' blob: data:;
  worker-src 'self' blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
  font-src 'self'`. `'unsafe-eval'` is added in development only, for React's dev tooling.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and no
  `X-Powered-By`.

`connect-src 'self'` is the important line: the browser itself blocks any attempt to send data to
another origin.

**Third-party domains currently allowed: none.**

## Alternatives

- Nonce-based `script-src` without `'unsafe-inline'`: preferable, but it makes every page dynamic under
  Next.js. We will revisit when the vendor list is known in Gate 8.

## Consequences

- Adding Google Ads, analytics or a consent tool requires extending the CSP per vendor, behind
  consent (docs/09). Each domain must be documented here.
