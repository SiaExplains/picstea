# ADR-0031 — Blend If and channel restrictions

- Status: Accepted
- Date: 2026-10-19
- Extends: ADR-0030 (full Layer Style), ADR-0022 (off-thread rendering)

## Context

Photoshop's Blending Options include **Blend If** and **Channels**.

- **Blend If:** split sliders hide a layer's pixels by their own brightness ("This Layer") or the brightness of what is beneath ("Underlying Layer"), per grey, red, green or blue channel.
- **Channels:** R, G and B checkboxes limit which colour channels the layer changes.

Blending, keying and texture-merging tutorials rely on both.

## Decision

- **Model (`core/document/blending.ts`, schema v8):** layers gain two optional fields.
  - `blendIf`: per channel, a `current` and a `below` range of four ordered values, 0–255 (black low, black high, white low, white high).
  - `channels`: `{ r, g, b }`.
  - Values that change nothing are not stored.
  - Strict validation applies to projects, commands and PSD import.
  - v7 → v8 is an identity migration, so older builds refuse projects that use the new fields instead of losing them.
- **Rendering (`compositing/blend-if.ts`):**
  - A layer with Blend If or channel limits is drawn normally, then each pixel is mixed back towards the backdrop read before drawing.
  - The weight is the product of every active range. Split sliders ramp linearly.
  - Mixing uses premultiplied alpha. Channels the layer may not change keep the backdrop's value.
  - "This Layer" is the layer's own pixels. Where the layer has none (for example a shadow), it doesn't limit.
  - Only layers using these options read pixels, in the main thread or the render worker alike.
- **UI:**
  - The Blending Options page gets the R, G and B checkboxes, a Blend If channel menu and two sliders.
  - **Mouse:** Alt-drag splits a slider, and double-clicking a split half joins it again.
  - **Keyboard:** each thumb is a keyboard slider; arrows move it, Shift moves it 10 levels and Alt splits it.
- **PSD files:**
  - The layer record's blending ranges (grey plus R, G, B) are read and written. Unordered values are sorted.
  - Restricted channels are read and written as `brst`.
  - Greyscale files keep only the grey range.

## Consequences

- Projects saved with these options use schema v8.
- The dialog option "Blend Interior Effects as Group" is not offered: interior effects are always blended with the layer's own content, as before.
- Blend If reads the backdrop at the render scale. At zoom levels below 100% the edge of a hidden area follows the scaled pixels, as in Photoshop's preview.
