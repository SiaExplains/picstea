@AGENTS.md

# MYLPER — working rules

- Read `docs/` (start at `docs/17_INITIAL_CLAUDE_PROMPT.md`) and `docs/FEATURE_STATUS.md` before changing architecture.
- `src/editor/**` must stay framework-independent; edits go through commands (`src/editor/core/commands`).
- No backend, uploads, or third-party network calls for user data. Ask the product owner before any architectural pivot (docs/15 rule 13).
- Record significant decisions as `docs/adr/ADR-NNNN-*.md`; keep `docs/FEATURE_STATUS.md` and `CHANGELOG.md` current.
- Verify with `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`.
