# Launch-readiness audit — October 2026

- Version: 0.15.1 (after Gate 9h, v0.15.0)
- Date: 2026-10-09
- Scope: accessibility, performance, public site (SEO / AIO / Web Vitals), security hardening, docs consistency
- Method constraint: no new dependencies, so accessibility is checked by an in-house auditor (`e2e/a11y.ts`), not axe-core.

## Summary

| Area | Result |
|---|---|
| Accessibility | 3 issue types found and fixed. The audit is now green on all 18 site URLs, the 404 page, and 43 editor states (menus, dialogs, every tool, layer kinds, panels). |
| Keyboard | The menu bar, dialogs (focus moves in and returns), layer rename and property sliders all work without a mouse, with visible focus. |
| Site | 18/18 sitemap pages pass the metadata, link and draft checks after 6 metadata fixes. No broken internal links, and no drafts leak. |
| Web Vitals (lab) | LCP 16–92 ms, CLS 0.000 on every page. JS: editor 270 KB, site pages 145 KB (now guarded by a budget). |
| Performance | Interactive paths have no long tasks at 24 MP. 2 deferred items (export, retouch stroke start). |
| Security | HSTS added; open documents are saved when the editor crashes; the storage-full path is tested. No vulnerabilities found. |
| Docs | FEATURE_STATUS, README and limitations brought up to date. |

## Accessibility

### Automated coverage (`e2e/a11y.ts`, in CI)

| WCAG 2.1 criterion | Checked automatically |
|---|---|
| 1.1.1 Non-text content | Images have `alt` |
| 1.3.1 Info and relationships | Headings don't skip levels; one `h1` on site pages; ARIA id references resolve; ids are unique; form fields are labelled |
| 1.4.3 Contrast (minimum) | Text vs. nearest opaque background: 4.5:1, or 3:1 for large text. Disabled controls are exempt; text over images and gradients is skipped. |
| 2.4.2 Page titled / 3.1.1 Language | `<title>` and `html[lang]` |
| 2.4.3 Focus order (partial) | No positive `tabindex` |
| 4.1.2 Name, role, value | Every control and ARIA widget has an accessible name; focusable elements have a role; dialogs and tab panels are named |

The auditor tests itself on a page with known violations, so a green run is meaningful.

### Checked by script or by hand (`e2e/keyboard.spec.ts`)

| WCAG 2.1 criterion | What was checked |
|---|---|
| 2.1.1 Keyboard | Menu bar (Tab, Enter, arrows, Escape); dialogs; layer rename (F2); property sliders |
| 2.4.7 Focus visible | Focus ring or highlight on menu items, buttons, layer names and sliders |
| 2.4.3 Focus order / 3.2 Predictable | Dialog focus moves inside and returns to the opener on Escape |

**Not covered (recommend a manual screen-reader pass before launch):** live announcements in VoiceOver/NVDA, reflow at 320 px (the editor is desktop-first), motion, wording of error messages.

### Findings

| # | Severity | Finding | Fix |
|---|---|---|---|
| A1 | High | White text on the blue accent (primary buttons, pressed segmented buttons, highlighted menu items) at 3.2:1. Some primary buttons inherited grey text: 2.57:1, and 1.30:1 on "Apply crop". | New `--ed-accent-strong` (#2f6fd8, 4.8:1) for filled backgrounds that carry text; `.button.primary` always has white text |
| A2 | Medium | Panel tabs (History / Swatches / Actions) pointed `aria-controls` at panels that didn't exist | All panels are rendered; inactive ones are `hidden` |
| A3 | — | Site pages: no violations | — |

## Public site

Production build, desktop profile, consent declined. These are lab numbers on localhost and indicative only.

| Page | LCP | CLS | JS |
|---|---|---|---|
| `/` (editor) | 92 ms | 0.000 | 270 KB |
| `/online-photo-editor`, `/psd-editor` | 20–32 ms | 0.000 | 145 KB |
| `/docs` + 13 docs pages | 16–36 ms | 0.000 | 145 KB |
| `/blog` | 36 ms | 0.000 | 145 KB |

### Findings

| # | Severity | Finding | Fix |
|---|---|---|---|
| S1 | Low | 3 titles over 60 characters (`/psd-editor`, Filters, File formats docs) | Shortened |
| S2 | Low | 3 descriptions over 160 characters (home, Pen tool and Smart objects docs) | Shortened |
| S3 | — | Canonical, Open Graph and JSON-LD on every page; robots.txt points to the sitemap; no broken links; no drafts listed or linked | — |

The legal pages are not in the sitemap by design. Draft blog posts return 404 in production.

## Performance

`scripts/profile-large.mjs`, 6000 × 4000 (24 MP), production build. The harness was extended with the 9-series workload.

| Interaction | Wall | Long tasks (max) | Notes |
|---|---|---|---|
| Open JPEG | 138 ms | none | |
| Adjustment slider, 5 steps | 164 ms | none | ADR-0012 baseline 0.17 s |
| Brush stroke, 40 moves | 706 ms | none | baseline 0.7 s |
| Move drag, 30 moves | 1046 ms | none | baseline 1.0 s |
| Zoom ×10 / pan ×30 | 716 / 548 ms | none | |
| Add Gradient Map / Channel Mixer | 81 / 67 ms | none | |
| Multi-layer drag, 30 moves | 544 ms | none | |
| Smart object drag, 30 moves | 1000 ms | none | |
| Healing stroke, 40 moves | 1500 ms | 2 (240 ms) | **P2 deferred:** reading the full 24 MP layer at stroke start |
| Magic wand click | 398 ms | 2 (287 ms) | Known (FEATURE_STATUS) |
| Save to IndexedDB | 892 ms | 1 (139 ms) | |
| PSD export | 2997 ms | 1 (2382 ms) | **P2 deferred:** full-resolution adjustments on the main thread (baseline 898 ms with one adjustment; this document has three plus 9h styles and a smart object). The busy overlay shows meanwhile. |

**Deferred, recommended next performance work:**
1. Move full-resolution adjustment compositing for export, the wand and Color Range into the worker (already listed in FEATURE_STATUS).
2. Read retouch strokes lazily in tiles around the brush instead of the whole layer.

## Security hardening

| # | Area | Result |
|---|---|---|
| H1 | Headers | Strict CSP (editor: `connect-src 'self'`), nosniff, frame-deny, referrer and permissions policies were already in place. **Added** `Strict-Transport-Security: max-age=63072000` in production (not in development). `preload` / `includeSubDomains` are left to the operator. |
| H2 | Crash safety | The editor error boundary now commits any text being typed and saves all open documents before showing the error (documents are immutable, so this is safe even with a broken UI). The message says "saved" only if every save reached persistent storage; otherwise it says "up to the last autosave". |
| H3 | Storage full | `QuotaExceededError` maps to a clear message; the document stays open and dirty, and closing is refused instead of losing work. **Test added.** |
| H4 | Worker | Unknown job names are rejected (`Object.hasOwn`); every job validates its input. |
| H5 | Untrusted input | PSD, ZIP project, SVG, actions JSON, swatches and adjustments/effects are all validated with limits. Gate 9d–9h reviews found no vulnerabilities. |
| H6 | Storage keys | All 5 `localStorage` keys plus IndexedDB are listed in the cookie policy. |
| — | Not changed | `script-src 'unsafe-inline'` is required by Next.js without nonces (ADR-0006). Nonce-based CSP would cost static rendering, so it is not recommended now. |

## Remaining launch blockers (product owner)

1. Legal pages: fill in the `[TO COMPLETE]` fields and get a legal review.
2. AdSense: set `NEXT_PUBLIC_ADSENSE_CLIENT` / `_SLOT` in Vercel, or launch without ads.
3. Personalised EU ads need a Google-certified CMP (IAB TCF) decision. Without it, ads stay non-personalised.
4. Open an exported PSD (with adjustment layers, vector masks, Vibrance/Color Balance/Channel Mixer) in Photoshop or Photopea.
5. Choose which of the 11 blog drafts to publish (the blog index is currently empty).
6. Vercel deployment (FEATURE_STATUS Gate 0: import the repository).
7. Recommended: one manual screen-reader pass (VoiceOver or NVDA) over the editor's main flows.
