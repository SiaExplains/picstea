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
