# 19 — Browser Support

## Primary

Optimize first for current:

- Chrome
- Edge
- Firefox
- Safari

## Feature detection

Never assume an API exists.

Use capability detection for:

- File System Access API
- OffscreenCanvas
- WebGL
- Web Workers
- IndexedDB
- clipboard APIs
- WebGPU if eventually used

## Progressive enhancement

Example:

```text
File System Access available
    → native Open/Save experience

Not available
    → upload/download workflow
```

The core editor should continue working when optional APIs are unavailable.
