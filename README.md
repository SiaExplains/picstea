# MYLPER

A local-first, browser-native image editor. Images and projects never leave the user's device.
The full engineering handbook is in [`docs/`](docs/INDEX.md). Start with
[`docs/17_INITIAL_CLAUDE_PROMPT.md`](docs/17_INITIAL_CLAUDE_PROMPT.md).

- Feature status: [`docs/FEATURE_STATUS.md`](docs/FEATURE_STATUS.md)
- Architecture decisions: [`docs/adr/`](docs/adr)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)

## Requirements

- Node.js 22
- pnpm 11 (`corepack enable`)

## Commands

| Command                             | What it does                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                      | Install dependencies                                                                                                      |
| `pnpm dev`                          | Dev server on http://localhost:3000 (`/editor` for the editor)                                                            |
| `pnpm lint`                         | ESLint, zero warnings allowed                                                                                             |
| `pnpm format` / `pnpm format:check` | Prettier                                                                                                                  |
| `pnpm typecheck`                    | TypeScript                                                                                                                |
| `pnpm test`                         | Unit tests (Vitest)                                                                                                       |
| `pnpm build`                        | Production build                                                                                                          |
| `pnpm test:e2e`                     | Playwright E2E against the production build (run `pnpm build` first; first time: `pnpm exec playwright install chromium`) |

## Layout

```text
src/app/          Next.js routes: landing page, /editor, robots, sitemap, error pages
src/components/   React UI (editor chrome, panels, dialogs; marketing)
src/editor/       Framework-independent engine — no React/Next imports (lint-enforced)
  core/           document model, commands, history, store, viewport, shortcuts
  controller/     use cases: open, import, save, restore, autosave
  rendering/      Renderer interface, Canvas 2D renderer, compositor
  assets/         immutable binary assets
  formats/        untrusted-input parsing (raster headers)
  persistence/    ProjectStorage: IndexedDB + memory
  serialization/  versioned format, migrations, validation
src/lib/          logging, SEO helpers
e2e/              Playwright tests
```

## Environment

See [`.env.example`](.env.example). Only public values belong in `NEXT_PUBLIC_*` variables.

## Deployment

Vercel (Next.js preset, pnpm). Set `NEXT_PUBLIC_SITE_URL` to the canonical origin
(`https://mylper.com` in production). The deployment does not depend on the DNS provider.
