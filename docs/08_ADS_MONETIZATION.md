# 08 — Monetization & Advertising

## Revenue model

Primary revenue:

1. Google Ads
2. MYLPER custom sponsorship ads

## Advertising principle

Ads must never interfere with editing.

Never place ads:

- over the canvas
- over a selected object
- inside modal dialogs
- in the toolbar
- inside layer controls
- where they can be mistaken for editor controls

## Marketing website

Ads can appear naturally on:

- blog pages
- educational articles
- tutorials
- template pages
- public informational pages

## Editor

If ads are shown inside the editor:

- reserve fixed space
- avoid layout shifts
- do not obstruct canvas
- do not interrupt active editing
- never inspect document content for ad targeting

## Custom sponsorship system

Build a simple abstraction:

```ts
interface Advertisement {
  id: string
  sponsor: string
  title: string
  description?: string
  image?: string
  targetUrl: string
  placement: string
  active: boolean
}
```

Possible placements:

- website sidebar
- editor side panel
- start screen
- template gallery

Custom ads should be clearly identified as sponsored content.

## Ad blockers

The editor must remain usable if advertisements are blocked.

Never make editing dependent on ad loading.
