# ADR-0034 — Three sponsorship slots and video sponsorships

- Status: Accepted
- Date: 2026-10-19
- Extends: ADR-0013 (website consent and monetization), ADR-0025 (editor side column)

## Context

The editor's side column, shown on screens 1280 px and wider, had one sponsorship space. The
first sponsor, FocusCrew, supplied a 12-second, silent, 256 × 256 H.264 video (185 KB). The
product owner asked for this video in the first slot, and for three slots in total.

## Decision

- **Three slots.** `pickSponsorships(ads, placement, day, count)` returns the booked
  sponsorships for the placement first, then distinct house ads ("Sponsor Picstea", "Your
  product here", "Advertise to creators") for the empty slots. With several bookings the order
  rotates by one each day, the same for everyone, so each sponsor gets the first slot in turn.
- **Videos.** An `Advertisement` can have a `video`: a self-hosted MP4 or WebM under `/public`,
  validated like images. `image` doubles as its still frame. The video plays muted, looped and
  inline, with no controls, no sound and no picture-in-picture.
  - With "reduce motion" it pauses on the still frame.
  - It is `aria-hidden`; the card's title and description carry the message.
- **Layout.** The first slot is as tall as its content (a 200 px square video plus text). The
  other two shrink to a minimum of 112 px, and the slots scroll inside the column on very short
  screens, so the canvas never moves.
- **FocusCrew** links to `https://focus-crew.com` with `rel="sponsored noopener noreferrer"`. It
  is booked for the side column and for the start screen, so smaller screens see it too.
- Nothing changes for privacy: no third-party requests, no cookies, no impression or click
  tracking. The editor's Content-Security-Policy (`default-src 'self'`) already allows
  self-hosted media.

## Consequences

- The privacy, sponsorship, FAQ, About and Photoshop-alternative pages now say that
  sponsorships may be short silent videos and appear beside the canvas.
- The video adds about 185 KB, loaded only on wide screens (`preload="metadata"`) where the
  column shows. The service worker does not cache it.

## Addendum — 2026-10-19: second sponsor

WikiDigit is booked for the same placements as FocusCrew, with a 9.6-second, silent,
256 × 256 H.264 video (242 KB) linking to `https://wikidigit.com`. The two take turns in the
first slot by day, as decided above; the third slot stays a house ad. No logic changed.

## Addendum — 2026-10-20: new FocusCrew creative

FocusCrew replaced its video with a new 12-second, silent, 256 × 256 H.264 cut (154 KB) that
opens with "Too many tabs?". It is served as `/sponsors/focuscrew-tabs.mp4` with the still frame
`/sponsors/focuscrew-tabs-poster.png` (its end card). The old `focuscrew.mp4` and its poster were
removed. New file names, rather than the same names, mean no browser or CDN cache can keep
showing the old video. The link, placements and rotation are unchanged.

## Addendum — 2026-10-20: third sponsor

Emojar is booked for the same placements, second in the list (FocusCrew, Emojar, WikiDigit). It
has a 10-second, silent, 256 × 256 H.264 video (316 KB, `/sponsors/emojar.mp4`) whose end card
is its still frame (`/sponsors/emojar-poster.png`), and links to `https://emojar.com`. The product
owner chose to keep the daily rotation, so with three bookings every slot is booked:

- Emojar is second on the first day of the cycle.
- Each sponsor takes every slot in turn over three days.
- The editor column shows no house ad while all three are booked.

No logic changed.

With three booked videos the side column could no longer fit three full-width squares on
screens below about 900 px tall. Each slot now takes a third of the free height. Its tile is the
largest square that fits (`min(100cqw, 100cqh)` in a size container), so all three show in full:
185 px squares at 720 px tall, up to the column width (279 px) on tall screens.

## Update (v0.42.0): random per view, GoAll.ai

A fourth sponsor, GoAll.ai (256 × 256 H.264, 334 KB, linking to `https://goall.ai`), means there are
more bookings than slots. The daily rotation is replaced: every page view shows three of the
booked sponsors, chosen and placed at random (a seeded Fisher–Yates shuffle, seed drawn once per
page load with `crypto.getRandomValues`). Each sponsor appears in about ¾ of views and equally
often in each slot. Seed 0 — while prerendering — is the listed order, so server and browser
render the same first frame. Single-slot placements use the same seed.
