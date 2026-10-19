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
