# ADR-0022 — Drawing the document in the worker; retouch strokes read pixels on demand (Gate 9j)

- Status: Accepted
- Date: 2026-10-18
- Extends: ADR-0012 (viewport rendering and workers), ADR-0019 (retouching)

## Context

The launch-readiness audit (docs/audits/2026-10-launch-readiness.md) left these long main-thread
stalls on a 6000 × 4000 document:

| Action | Stall | Cause |
|---|---|---|
| Export PSD | 1 × 2.1 s | The whole document was flattened on the page: full-size canvas copies plus the adjustment pixel loops |
| Color Range (open + 3 slider steps) | 6 stalls, 2.4 s in total, worst 1.0 s | Full-size read on the page, then `colorRange` on 24 MP for every slider step |
| Magic wand | 2 × up to 230 ms | The flatten for the flood fill ran on the page; only the fill ran in the worker |
| Healing stroke start | 2 × up to 150 ms | The whole layer was read, copied and uploaded at the start, and the selection was redrawn at full size |

ADR-0012 already moved PSD reading, encoding and flood fills into a worker. What was still on
the page was drawing the document.

## Decision

### 1. Draw the document in the worker

The compositor is framework-free and draws through an injected `PixelEnv` (surfaces, assets, text
sizer), so it runs unchanged in the worker on `OffscreenCanvas`
(`workers/render-env.ts`).

**New jobs** (`workers/jobs.ts`):

| Job | What it does |
|---|---|
| `exportDocument` | Runs the normal `exportAs`, for every format |
| `floodDocument` | Draws the sampled layers, then flood fills (wand, bucket) |
| `colorRangeDocument` | Draws once per document state and keeps that drawing under a key, so slider steps send only the colour and fuzziness |
| `colorRangeRelease` | Frees the kept drawing when the dialog closes |

**Assets:** the page sends a copy of each bitmap the document uses (`referencedAssetIds`,
including smart objects and masks). Copies are made with `createImageBitmap`, which is
asynchronous GPU work, and transferred (moved, not copied again). The worker closes them after
the job. The selection is removed from the document before sending, because drawing doesn't
use it.

**Text:** the editor only offers system fonts (`FONT_FAMILIES`), which `OffscreenCanvas` in a
worker renders the same way. An E2E test exports a document with pixels, a shape with a drop
shadow, text and a Gradient Map both ways (worker and page) and requires identical pixels.

**Fallbacks:** `offthread.ts` sends a job only while `JobRunner.offThread` is true. If the worker
can't draw (`OffThreadUnavailableError`, e.g. a browser without OffscreenCanvas 2D in workers)
or fails for any reason other than a user error, the page does the work as before. Format and
export errors still reach the user unchanged (`fromJobError` now also keeps `ExportError`).

### 2. Retouch strokes read pixels on demand

**Engine:** `StrokeOptions.prepare(rect)` and `PixelEffect.prepare(rect)` let a stroke ask for
an area before it reads it (`retouch/stroke.ts`). `LazyTiles` (`retouch/lazy-tiles.ts`) loads
missing 128 px tiles with one read covering their bounding box. The engine stays pure and is
tested with plain arrays: every tool gives byte-identical results lazily and eagerly
(`retouch/lazy.test.ts`).

**What each tool asks for:**
- **All tools:** the area being drawn.
- **Blur/Sharpen:** the blur reach around each blurred tile (`BlurTiles`).
- **Clone/Heal:** the source area at its offset. Heal also asks for its margin before the
  healing pass.
- **Smudge:** the dab bounds, copied into its output as they load, because smudge reads what it
  has already written.

**Pixel sources** (`pixels/lazy-layer-pixels.ts`):
- **The layer:** read 1:1 from its bitmap through a small scratch canvas set up for reading.
- **"All layers":** the composite, drawn into the layer's space on a GPU surface, with the canvas
  area beside it for `inside`, both read tile by tile.
- **The preview surface:** starts as a GPU copy of the layer instead of a full-size upload.
- **The selection under a layer moved by whole pixels:** copied row by row
  (`translatedCoverage`) instead of drawn and read back. Other transforms still draw it.

## Results

Same machine and script (`scripts/profile-large.mjs`), `main` before and this branch after:

| Action | Before | After |
|---|---|---|
| Export PSD | 1 × 2,118 ms | none |
| Color Range (open + 3 steps) | 6 stalls, 2,426 ms in total, worst 1,006 ms | 1 × 71 ms |
| Magic wand | 2 stalls, worst 227 ms | none |
| Healing stroke | 2 stalls, worst 146 ms | 1 × 127 ms |

**The healing stall that remains** is not the stroke. It is the canvas redrawing the three
adjustment layers and layer styles above the healed layer on the stroke's first frame. Any edit
under adjustment layers pays it (live rendering, ADR-0012). It is the next candidate (cache
adjustment results across frames of one stroke).

## Consequences

- **Memory:** during a job the worker briefly holds copies of the document's bitmaps.
- **One more thing to keep the same in both places:** drawing must behave the same in the worker
  as on the page. The compositor is shared code, and an E2E test compares the two pixel by pixel.
- **Retouch memory per stroke stays about the same:** buffers are still full-size, but they are
  allocated empty and filled only where the stroke goes.
