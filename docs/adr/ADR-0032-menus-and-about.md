# ADR-0032 — Menu bar with submenus, more menu items and an About page

- Status: Accepted
- Date: 2026-10-19
- Extends: ADR-0026 (layers panel workflow), ADR-0028 (SEO/AEO round)

## Context

The menu bar was a set of flat lists. Layer had 40 entries and scrolled; Filter and Adjustments
were long too. Photopea and Photoshop group related commands in submenus. Some features had no
menu entry at all (Layer via Copy, colour labels, the panels), a few common commands were missing
(Copy Merged, Stroke, Grow, Similar), and "About" only reopened the welcome dialog.

## Decision

- **Submenus.** A menu entry is an action, a separator or a submenu (`{ label, items }`), nested
  to any depth.
  - Submenus open to the side, with `position: fixed`, so a scrolling parent never clips them.
    They flip left or move up to stay on screen.
  - Keyboard follows the WAI-ARIA menu pattern: Arrow Right or Enter opens a submenu and focuses
    its first item. Arrow Left or Escape goes back to the trigger. Arrow Right on a plain item
    moves to the next top-level menu.
  - Pointing at a submenu trigger opens it without moving focus.
  - A submenu is disabled when nothing in it is enabled.
- **Layout, close to Photoshop's:**
  - File gets Place and Automate.
  - Edit gets Copy Merged, Stroke…, Transform (flip) and Keyboard Shortcuts.
  - Image gets Adjustments.
  - Layer gets New, Layer Style, New Adjustment Layer, Raster/Vector Mask, Smart Object, Arrange,
    Align, Distribute and Colour Label.
  - Select gets Layers, Select Pixels, Modify, Grow and Similar.
  - Filter is grouped by kind.
  - View gets Show and Guides.
  - Window is new; Help gets About Picstea.
  - The top-level Adjustments menu is gone: adjustment layers are in Layer → New Adjustment
    Layer and Image → Adjustments.
- **New commands** (pure helpers in `selection/derive.ts`):
  - **Copy Merged:** the visible image inside the selection.
  - **Stroke…:** inside, center or outside, any width up to 250 px, in any colour.
  - **Grow / Similar:** colours within the Magic Wand tolerance. Colours are compared on a
    32-level RGB grid, so tolerance works in steps of 8. Grow adds only pixels connected to the
    selection.
- **Window menu:** brings a panel into view and focuses it. History, Swatches and Actions switch
  the shared tab strip.
- **About page:** `/about` describes the product, the privacy model, funding, how it is made, the
  current version and where to find contact details (the imprint). It is listed in the sitemap,
  footer and `llms.txt`, and opened by Help → About Picstea and the menu bar's About link.

## Consequences

- Menu paths in the docs and guides changed; they were updated, for example
  Layer → New Adjustment Layer → Curves.
- E2E tests choose menu items through `pickMenu`, which opens submenus as needed.
- The highlighted menu row shows shortcuts at full opacity, keeping text contrast at or above
  4.5:1.
