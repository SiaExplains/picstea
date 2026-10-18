# 06 — UI/UX Requirements

## Goal

The editor should feel immediately familiar to Photopea/Photoshop users without copying protected branding or assets.

## Desktop layout

```text
┌─────────────────────────────────────────────────────────┐
│ Picstea / File Edit Image Layer Type Select Filter View │
├─────────────────────────────────────────────────────────┤
│ Tool Options                                            │
├───────┬───────────────────────────────────────┬─────────┤
│       │                                       │         │
│ Tools │             Canvas                    │ Layers  │
│       │                                       │         │
│       │                                       │         │
├───────┴───────────────────────────────────────┴─────────┤
│ Status / Zoom / Document information                    │
└─────────────────────────────────────────────────────────┘
```

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
