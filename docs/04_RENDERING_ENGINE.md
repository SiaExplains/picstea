# 04 — Rendering Engine

## Rendering strategy

Start with Canvas 2D for the simplest implementation.

Introduce WebGL/WebGPU-oriented acceleration only when profiling demonstrates a need.

Do not prematurely create a GPU abstraction that is impossible to debug.

## Rendering pipeline

```text
Document
   ↓
Layer tree
   ↓
Visibility filtering
   ↓
Transforms
   ↓
Masks
   ↓
Effects / adjustments
   ↓
Compositing
   ↓
Viewport transform
   ↓
Canvas
```

## Viewport

The viewport must support:

- zoom
- pan
- fit to screen
- actual pixels / 100%
- zoom to selection
- centered canvas
- checkerboard transparency

Keep document coordinates separate from screen coordinates.

```text
Document Space
       ↓
Viewport Transform
       ↓
Screen Space
```

## Large documents

Plan for:

- tiled rendering
- dirty rectangles
- render caching
- mipmaps/downsampling
- background rendering
- progressive previews

Do not allocate multiple full-size copies of a 10,000 × 10,000 image unnecessarily.

## Workers

Move expensive operations away from the UI thread.

Potential worker jobs:

- filters
- image decoding
- image encoding
- thumbnail generation
- histogram calculation
- large transformations
- PSD parsing

## Rendering quality

The renderer must preserve:

- transparency
- alpha compositing
- transform accuracy
- color values
- layer ordering
- blend modes
