# 03 — Document Model

The document model is the foundation of Picstea.

## Conceptual model

```ts
interface Document {
  id: string
  name: string
  width: number
  height: number
  resolution?: number
  colorSpace: ColorSpace
  background?: Background
  layers: Layer[]
  activeLayerId?: string
  history: HistoryMetadata
  guides: Guide[]
  rulers: RulerSettings
  metadata: DocumentMetadata
}
```

## Layer model

```ts
type Layer =
  | RasterLayer
  | TextLayer
  | ShapeLayer
  | GroupLayer
  | AdjustmentLayer
  | SmartObjectLayer
```

Every layer should have:

```ts
interface BaseLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  transform: Transform
}
```

## Layer hierarchy

Support:

```text
Document
 ├── Group
 │    ├── Layer
 │    ├── Layer
 │    └── Group
 │         └── Layer
 ├── Layer
 └── Adjustment Layer
```

## Future-proof requirements

The model must eventually support:

- masks
- clipping masks
- vector masks
- layer effects
- adjustment layers
- smart objects
- linked assets
- embedded assets
- text styles
- vector paths
- blend modes
- metadata

Do not flatten these concepts into raster pixels prematurely.

## Serialization

Define a versioned internal format.

```json
{
  "schemaVersion": 1,
  "document": {}
}
```

Future schema migrations must be possible.

The current version is **8** (`CURRENT_SCHEMA_VERSION` in
`src/editor/serialization/serialization.ts`, ADR-0005). v7 stores every layer effect as a list
and adds Fill opacity and the document's global light (ADR-0030); v8 adds Blend If and channel
restrictions (ADR-0031). Older projects are migrated on open; older builds refuse newer projects
instead of losing data.

Never assume the current document schema will remain unchanged.
