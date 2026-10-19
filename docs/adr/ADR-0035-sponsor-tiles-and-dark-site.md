# ADR-0035 — Media-only sponsor tiles and a dark website

- Status: Accepted
- Date: 2026-10-19
- Extends: ADR-0034 (three sponsorship slots), ADR-0028 (website)

## Context

The editor's sponsorship slots showed a bordered card with a title and description under each
image or video. The product owner asked for:

- no card;
- no title or description;
- less space;
- a smaller "Sponsored" label laid over the ad, on a dark background at 75% opacity.

The website (About, Blog, Docs, legal pages) followed the system's light or dark setting. The
owner asked for it to use the editor's dark theme instead.

## Decision

- **`SponsorTile`** shows a sponsorship as one link: its image or video, with a 9 px uppercase
  "Sponsored" label at the top left on `rgba(0, 0, 0, 0.75)`.
  - The link's accessible name is "Sponsored: title". The title is not shown.
  - Empty slots are 88 px dashed "Your ad here / Sponsor Picstea" tiles that link to the
    sponsorship page. They replace the separate "Advertise here" link.
  - The side column and the start screen use the tile. The website's sidebar keeps its text card
    for house ads.
- **The service worker skips `/sponsors/`.** Sponsorship media is not part of the app. Caching
  it cache-first made the poster fail with `ERR_FAILED` while the network came back. Video range
  requests can't be cached safely anyway.
- **Dark website.** The global tokens in `globals.css` use the editor's palette:
  - background `#1e1f22`, surface `#26272b`, border `#3a3b40`;
  - text `#e6e6e8`, muted text `#a4a5ab`;
  - links `#5cc0b2`, filled buttons `#007a7a` with white text;
  - `color-scheme: dark`, and theme colour `#1e1f22` for the browser toolbar.

  All of these keep text contrast at or above 4.5:1.

## Consequences

- The website no longer has a light appearance, even on a light-mode system.
- The sponsor's message must be in its media; Picstea shows no sponsor text.
