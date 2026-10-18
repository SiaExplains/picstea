# ADR-0025 — Editor side column: first-party sponsorship, privacy settings, website links

- Status: Accepted
- Date: 2026-10-19
- Extends: ADR-0013 (website consent and monetization)

## Context

Comparable browser editors keep an advertising column beside the workspace. Picstea's editor had
one sponsorship space on its start screen only, no way to reach the privacy settings, and no
links to the website apart from the Help menu.

## Decision

- On screens at least 1280 px wide the editor grid gets a fourth, 300 px column (`SideColumn`):
  a fixed 280 × 250 sponsorship box (new placement `editor-side`), an "Advertise here" link and a
  "Privacy settings" button. Below that width the column is hidden and the start-screen
  sponsorship shows instead; the start screen doesn't repeat it while the column is visible.
- The column shows **Picstea's own sponsorships only**: static, self-hosted, no scripts. The editor
  still runs no third-party code and keeps its strict CSP (ADR-0013 unchanged). Showing Google ads
  there would need a new ADR: it puts ad code on the page that holds the user's images, and
  AdSense policy restricts ads on pages without publisher content.
- "Privacy settings" (also Help → Privacy Settings…) opens `/cookies#privacy-settings` in a new
  tab, where the consent manager opens its preferences. The editor has no consent vendors of its
  own, so nothing is loaded into it.
- The right end of the menu bar links About (welcome dialog), Learn, Shortcuts and Blog; website
  links open in a new tab so the editor's work stays put. Hidden below 1024 px.

## Consequences

- At 1280 px the canvas area is 300 px narrower; panels and tools are unchanged.
