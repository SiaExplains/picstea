# 16 — Global Definition of Done

Every major feature must satisfy the following checklist.

## Product

- [ ] User workflow is clear
- [ ] Feature works on supported browsers
- [ ] Errors have understandable messages
- [ ] Empty/loading states exist

## Architecture

- [ ] Domain logic is separated from UI
- [ ] No unnecessary coupling
- [ ] Future extension point exists where required
- [ ] No backend dependency unless approved

## Privacy

- [ ] No accidental upload
- [ ] No sensitive document data in logs
- [ ] Consent requirements considered

## Performance

- [ ] No unnecessary rerenders
- [ ] No obvious main-thread blocking
- [ ] Memory behavior considered

## Accessibility

- [ ] Keyboard support where applicable
- [ ] Focus management
- [ ] Labels/tooltips
- [ ] Contrast

## Testing

- [ ] Unit tests
- [ ] Integration tests where applicable
- [ ] E2E coverage for critical workflows
- [ ] Regression check

## Documentation

- [ ] Feature status updated
- [ ] Technical documentation updated
- [ ] ADR created if architectural decision was made

## Release checklist (every version)

- [ ] `package.json` version bumped and a `CHANGELOG.md` entry written for people, not developers
- [ ] AI-assistant facts current: `src/lib/seo/llms.ts` (served as `/llms.txt` and `/llms-full.txt`) describes what changed — features added, limits removed, new pages
- [ ] Changed landing pages have a new date in `src/content/pages/updated.ts` (shown as "Last updated" and used as `dateModified`); a release that changes the editor sets `SITE_UPDATED` there too
- [ ] After the production deploy, the **IndexNow** action ran green (GitHub → Actions → IndexNow) and listed the pages you changed; it reads their sitemap dates (ADR-0042)
- [ ] Comparison tables re-checked on the other product's official site when touched; the `checked` month on `ComparisonTable` updated
- [ ] New public pages appear in the sitemap and have their own social preview (`src/lib/seo/og-pages.ts`; a unit test checks both)
- [ ] `docs/FEATURE_STATUS.md` header shows the new version
