# 06 — UI/UX Requirements

## Goal

The editor should feel immediately familiar to Photopea/Photoshop users without copying protected branding or assets.

## Desktop layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Picstea  File Edit Image Layer Select Filter View Window Help      │
├────────────────────────────────────────────────────────────────────┤
│ Tool Options                                                       │
├───────┬─────────────────────────────────┬────────────┬─────────────┤
│       │                                 │ Properties │ Sponsorship │
│ Tools │             Canvas              │ Layers     │ slots (3)   │
│       │                                 │ History …  │ Privacy     │
│       │                                 │            │ (≥ 1280 px) │
├───────┴─────────────────────────────────┴────────────┴─────────────┤
│ Status / Zoom / Document information                               │
└────────────────────────────────────────────────────────────────────┘
```

Menus open submenus to the side and follow the WAI-ARIA menu keyboard pattern; adjustment layers
live under Layer → New Adjustment Layer and Image → Adjustments, and Window brings a panel forward
(ADR-0032). The side column appears only on screens 1280 px and wider (ADR-0025, ADR-0034); its
sponsorship tiles never cover the canvas.

## Responsive behavior

Desktop is the primary professional editing experience.

Mobile/tablet should not simply shrink the desktop UI.

Create adaptive controls:

- collapsible panels
- bottom toolbars
- touch-friendly handles
- gesture zoom
- two-finger pan
- contextual controls

Advanced professional editing may remain optimized for desktop.

## Interaction principles

- keyboard-first
- predictable shortcuts
- visible selection state
- non-destructive defaults
- confirmation only when necessary
- clear active tool
- clear active layer
- context-aware property panels

## Dark mode

The editor should default to a neutral professional dark interface.

Avoid excessive gradients, colorful UI chrome, or game-like styling.

The image itself must remain visually dominant.

The website (About, Blog, Docs, legal pages) uses the same dark palette at all times, whatever the
system setting, with text contrast of at least 4.5:1 (ADR-0035).

## Accessibility

Support:

- keyboard navigation
- visible focus
- screen-reader labels for controls
- sufficient contrast
- reduced motion
- tooltips
- accessible menus/dialogs

Canvas interactions are inherently visual, but the surrounding application must remain accessible.
