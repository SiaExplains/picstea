# 08 — Monetization & Advertising

## Revenue model

Primary revenue:

1. Google Ads
2. Picstea custom sponsorship ads

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

Today the editor shows only Picstea's own sponsorships, never Google ads or other third-party
code (ADR-0013, ADR-0025): one slot on the start screen, and three slots in the side column on
screens 1280 px and wider (ADR-0034). Google AdSense runs on website pages only (ADR-0024).

## Custom sponsorship system

Build a simple abstraction (`src/lib/sponsorship/sponsorship.ts`; bookings in
`src/content/sponsorships.ts`):

```ts
interface Advertisement {
  id: string
  sponsor: string
  title: string
  description?: string
  image?: string // self-hosted under /public; the video's still frame
  video?: string // self-hosted MP4 or WebM under /public
  targetUrl: string // https, or a local path
  placement: Placement | Placement[]
  active: boolean
}
```

Placements: `site-sidebar`, `blog-inline`, `editor-start`, `editor-side`. A template gallery
placement can be added when templates exist.

Custom ads should be clearly identified as sponsored content.

### Current sponsorship model

- **Slots.** `pickSponsorships(ads, placement, day, count)` fills the editor column's three slots:
  booked sponsorships first, rotated by one each day (the same for everyone, no user data), then
  house ads for empty slots (ADR-0034). Booked today: FocusCrew, Emojar and WikiDigit, in that
  order, rotated by one each day, so every slot is booked and no house ad shows in the column.
- **Formats.** An image, or a short, silent, muted, looping video with no controls. With "reduce
  motion" the video stays on its still frame; it is rendered only while online and loads with
  `preload="metadata"` (ADR-0034).
- **Tiles.** In the editor a sponsorship is media only: one link with a small "Sponsored" label
  laid over it, and the title as the link's accessible name. Empty slots are compact "Your ad here
  / Sponsor Picstea" tiles linking to the sponsorship page. The website sidebar keeps a text card
  for house ads (ADR-0035).
- **Links** to sponsors use `rel="sponsored noopener noreferrer"`. All media and links are
  validated before rendering.
- **Privacy.** No third-party requests, no cookies, no impression or click tracking. The service
  worker does not cache `/sponsors/` (ADR-0035).

## Ad blockers

The editor must remain usable if advertisements are blocked.

Never make editing dependent on ad loading.
