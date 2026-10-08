# 02 — System Architecture

## High-level architecture

```text
                         MYLPER.COM
                             |
                         Vercel
                             |
                    Next.js Application
                             |
              +--------------+--------------+
              |                             |
          Marketing Site               Editor App
              |                             |
          SEO/AEO pages                 React UI
                                            |
                                     Editor Controller
                                            |
                                      Document Engine
                                            |
                         +------------------+------------------+
                         |                  |                  |
                    History Engine     Command System     Selection System
                         |                  |                  |
                         +------------------+------------------+
                                            |
                                     Rendering Engine
                                            |
                             +--------------+--------------+
                             |                             |
                           Canvas                        WebGL
                             |                             |
                         Browser APIs                 GPU acceleration
                                            |
                                  Local Persistence
                                            |
                              IndexedDB / File System
```

## Next.js responsibility

Next.js should handle:

- landing pages
- documentation
- blog
- SEO
- AEO content
- legal pages
- pricing/sponsorship information
- editor route
- application shell
- metadata
- sitemap
- robots.txt
- structured data
- static/server-rendered marketing content

The actual editor should be heavily client-side.

## Suggested route structure

```text
/
 /editor
 /editor/new
 /editor/[documentId]
 /templates
 /learn
 /blog
 /docs
 /about
 /contact
 /privacy
 /terms
 /cookie-policy
 /advertising
```

Document IDs in local-only mode should not imply server persistence.

## Suggested source structure

```text
src/
  app/
    (marketing)/
    editor/
    blog/
    docs/
    privacy/
    terms/

  components/
    ui/
    marketing/
    editor/
      chrome/
      toolbar/
      panels/
      dialogs/
      canvas/

  editor/
    core/
      document/
      commands/
      history/
      selection/
      transforms/
      clipboard/
      shortcuts/

    rendering/
      canvas/
      webgl/
      compositing/
      tiles/

    tools/
      move/
      brush/
      eraser/
      crop/
      selection/
      eyedropper/
      fill/
      text/
      shape/
      gradient/
      clone/
      healing/

    layers/
    filters/
    adjustments/
    masks/
    typography/
    paths/

    formats/
      png/
      jpeg/
      webp/
      svg/
      pdf/
      psd/

    persistence/
      indexeddb/
      filesystem/

  workers/
    image-processing.worker.ts
    export.worker.ts
    filter.worker.ts

  lib/
    seo/
    ads/
    consent/
    analytics/

  types/
```

## Dependency rule

The editor core must not depend on Next.js-specific APIs.

Bad:

```text
editor/core → next/server
```

Good:

```text
editor/core → browser-independent TypeScript
app/editor → editor/core
```

This keeps the engine portable.
