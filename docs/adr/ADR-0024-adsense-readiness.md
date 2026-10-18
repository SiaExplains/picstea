# ADR-0024 — AdSense readiness: ads.txt, site verification, Google's certified CMP

- Status: Accepted
- Date: 2026-10-18
- Extends: ADR-0013 (website consent and monetization)

## Context

ADR-0013 loads AdSense only after consent from Picstea's own banner and requests non-personalised
ads. Three things were missing for approval and revenue:

- no `/ads.txt`;
- no way for Google to verify the site, because no ad code loads before consent;
- since 2024 Google serves **personalised** ads in the EEA, UK and Switzerland only through a
  Google-certified consent platform using the IAB TCF. Traffic from any other banner is at best
  eligible for non-personalised or limited ads (AdSense help, "CMP requirements").

## Decision

- **`/ads.txt`** is generated from `NEXT_PUBLIC_ADSENSE_CLIENT` (`src/app/ads.txt/route.ts`) and is
  404 without it.
- **Verification** uses the `google-adsense-account` meta tag in both root layouts, so the editor
  home page is verifiable without loading ad code.
- **`NEXT_PUBLIC_ADSENSE_CMP`** chooses who asks for ad consent:
  - `own` (default): unchanged ADR-0013 behaviour.
  - `google`: Google's free "Privacy & messaging" CMP. It is delivered by the AdSense code, so on
    website pages that code loads immediately and enforces the visitor's TCF choice; Picstea's
    banner is not shown (ads are its only optional vendor), and "Privacy settings" reopens
    Google's message (`googlefc.showRevocationMessage`), falling back to the cookie policy.
- The editor is unchanged: no ad code, strict CSP. No CSP change was needed (`*.google.com`
  already covers `fundingchoicesmessages.google.com`).

## Consequences

- `google` mode is only lawful once the European regulations message is **published** in AdSense;
  until then keep `own`. `.env.example` says so.
- In `google` mode, consent and its records are Google's; the privacy and cookie pages describe it.
