# ADR-0017 — Advanced PSD: descriptors, text, adjustments, styles, vectors, smart objects (Gate 9d)

- Status: Accepted
- Date: 2026-10-09

## Context

ADR-0011 imported PSDs as pixel layers, groups and masks, and exported everything else as pixels.
Since then Picstea gained adjustment layers, effects, vector and clipping masks, path shapes, text
and smart objects. docs/05 Phase 13 asks PSD support to progress through text, masks, effects and
"advanced Photoshop-specific constructs where technically feasible" — without ever claiming full
Photoshop compatibility.

## Decision

### Parsing (in the worker, hardened)

- **Descriptors** (`descriptor.ts`): a reader for Photoshop's version-16 action descriptors with
  limits on depth (32), items per container (10 000), values per descriptor (500 000) and string
  length. Objects are created with a null prototype; unit and enum values are class instances,
  so file-supplied keys can never imitate them. Typed getters check every value. A small writer
  covers what export and the test fixtures need.
- **EngineData** (`engine-data.ts`): a bounded tokenizer/parser for the text engine's
  PostScript-like data (depth 64, 200 000 items, 8 MB), null-prototype dictionaries, own-property
  lookups only.
- The reader keeps the bodies of the layer blocks Picstea understands and decodes them into typed
  "extras" (`psd-extras.ts`). Each part is decoded independently inside a try: a damaged block
  costs only that part, which falls back to the layer's pixels with a warning. Every decoded value
  is clamped to Picstea's ranges and passed through Picstea's own validators (`parseAdjustment`,
  `parsePath`, effect limits).
- Global blocks `lnk2`/`lnkD`/`lnk3` give smart objects' embedded files: images are passed to the
  main thread (decoded lazily by the asset store); embedded PSDs are read recursively (two levels,
  sharing the decode budget).

### Import mapping

| Photoshop | Picstea |
|---|---|
| `brit` / `CgEd`, `hue2`, `expA`, `levl`, `curv`, `nvrt`, `post`, `thrs`, `blwh` | adjustment layers (values clamped; colorize, exposure offset, B&W mix noted) |
| `lfx2` drop shadow / outer glow / stroke / colour overlay (incl. `…Multi`) | effects (global light angle from resource 1037) |
| `vmsk` / `vsms` | vector mask (raster mask rendered from it is dropped) |
| `SoCo` + vector path (+ `vstk`) | path shape layer with fill and stroke |
| `SoCo` alone | fill layer |
| `TySh` + EngineData | text layer from the first style run; fonts mapped to Picstea's families; position from the layer's pixel bounds |
| `SoLd` / `PlLd` + embedded file | smart object; transform from the placement corners |

Unsupported adjustments are named in the warning and left out (their effect on the composite is
not reproduced). Warped or perspective smart objects, smart objects with Photoshop smart filters,
linked files and unparseable text fall back to pixels.

### Export

- Adjustment layers with an exact Photoshop counterpart (`brit`, `hue2`, `expA`, `levl`, `curv`,
  `nvrt`, `post`, `thrs`) are written as adjustment-layer records (empty pixels, plus mask and
  clipping); Temperature/Tint and Black & White stay in the flattened image.
- Vector masks are written as `vmsk` instead of being merged into the pixels.
- Text, shapes, smart objects and effects remain rasterised: writing text-engine data, live shape
  data and smart-object links correctly needs validation against Photoshop that the project can't
  do automatically. Notices say so.

## Verification

Every exported block is read back by the reader in unit tests; parsers are tested against
malformed and hostile input. Test PSDs with text, styles, shapes and smart objects are generated
by `src/editor/test-utils/psd-fixtures.ts` (no binary fixtures). Opening an exported file in
Photoshop or Photopea remains a manual check.

## Consequences

- Round-tripping a PSD through Picstea keeps far more structure.
- Fidelity limits are explicit (fonts, mixed text styles, unsupported adjustments and styles),
  surfaced per file.
