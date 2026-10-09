import type { AssetStore } from "../assets/asset-store";
import type { EditorDocument, Layer, RasterLayer } from "../core/document/types";
import type { ContentSizer } from "../core/geometry/layer-geometry";
import { fromTransform, invertMatrix } from "../core/geometry/matrix";
import type { SurfaceFactory } from "../rendering/canvas/canvas2d-renderer";
import { compositeDocument, type CompositeContext } from "../rendering/compositing/compositor";
import type { RgbaPixels } from "../selection/flood";
import type { PixelBounds, SelectionMask } from "../selection/mask";

/**
 * Pixel access shared by the selection-aware tools and Edit commands (ADR-0010): reading
 * document or layer pixels, turning a selection into a drawable alpha mask, and producing the new
 * immutable asset for a pixel edit. Canvas-based but framework-free.
 */

export type Surface = HTMLCanvasElement | OffscreenCanvas;
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface PixelEnv {
  readonly assets: AssetStore;
  readonly sizer: ContentSizer;
  readonly createSurface: SurfaceFactory;
}

export class PixelError extends Error {
  override name = "PixelError";
}

export function context2d(surface: Surface, willReadFrequently = false): Ctx2D {
  const ctx = surface.getContext("2d", { willReadFrequently }) as Ctx2D | null;
  if (!ctx) throw new PixelError("2D canvas is not available.");
  return ctx;
}

export function releaseSurface(surface: Surface | null | undefined): void {
  if (surface) {
    surface.width = 0;
    surface.height = 0;
  }
}

/**
 * Flattened pixels of the whole document, or of one layer as it appears on the canvas, in
 * document space. Returns null while a layer bitmap is still decoding.
 */
export function readPixels(env: PixelEnv, doc: EditorDocument, layer?: Layer): RgbaPixels | null {
  const surface = env.createSurface(doc.width, doc.height);
  try {
    const ctx = context2d(surface, true);
    const source = layer ? { ...doc, layers: [{ ...layer, visible: true }] } : doc;
    const result = compositeDocument(ctx as CompositeContext, source, env.assets, {
      sizer: env.sizer,
      createSurface: env.createSurface,
    });
    if (result.pendingAssetIds.length > 0) return null;
    const image = ctx.getImageData(0, 0, doc.width, doc.height);
    return { width: doc.width, height: doc.height, data: image.data };
  } finally {
    releaseSurface(surface);
  }
}

/**
 * The colour of one document pixel as it appears (or of one layer), rendering just that pixel
 * rather than the whole document. Null while a bitmap is still decoding or outside the canvas.
 */
export function samplePixel(
  env: PixelEnv,
  doc: EditorDocument,
  x: number,
  y: number,
  layer?: Layer,
): readonly [number, number, number, number] | null {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= doc.width || py >= doc.height) return null;
  const surface = env.createSurface(1, 1);
  try {
    const ctx = context2d(surface, true);
    const source = layer ? { ...doc, layers: [{ ...layer, visible: true }] } : doc;
    const result = compositeDocument(ctx as CompositeContext, source, env.assets, {
      sizer: env.sizer,
      createSurface: env.createSurface,
      space: { x: px, y: py, width: 1, height: 1, scale: 1 },
    });
    if (result.pendingAssetIds.length > 0) return null;
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  } finally {
    releaseSurface(surface);
  }
}

const maskSurfaces = new WeakMap<SelectionMask, Surface>();

/** The selection as white pixels whose alpha is the coverage, cached per mask. */
export function selectionSurface(env: PixelEnv, mask: SelectionMask): Surface {
  const cached = maskSurfaces.get(mask);
  if (cached && cached.width === mask.width) return cached;
  const surface = env.createSurface(mask.width, mask.height);
  const ctx = context2d(surface);
  const image = ctx.createImageData(mask.width, mask.height);
  const out = image.data;
  for (let i = 0; i < mask.data.length; i++) {
    const a = mask.data[i];
    if (a === 0) continue;
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = a;
  }
  ctx.putImageData(image, 0, 0);
  maskSurfaces.set(mask, surface);
  return surface;
}

/** Keep only the selected part of a document-sized surface (no-op without a selection). */
export function clipToSelection(
  env: PixelEnv,
  surface: Surface,
  selection: SelectionMask | undefined,
): void {
  if (!selection) return;
  const ctx = context2d(surface);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(selectionSurface(env, selection), 0, 0);
  ctx.restore();
}

/**
 * Apply document-space paint to a pixel layer: `paint` is a document-sized surface that is drawn
 * over the layer's pixels (or cut out of them, for `destination-out`) through the layer transform.
 * Returns the new asset id, or null if the layer is still loading.
 */
export function paintRasterLayer(
  env: PixelEnv,
  layer: RasterLayer,
  paint: Surface,
  operation: "source-over" | "destination-out" = "source-over",
): string | null {
  let existing: CanvasImageSource | undefined;
  if (layer.assetId) {
    existing = env.assets.getBitmap(layer.assetId);
    if (!existing) return null;
  }
  const toLocal = invertMatrix(fromTransform(layer.transform));
  if (!toLocal) throw new PixelError("This layer is scaled to nothing and cannot be edited.");
  const out = env.createSurface(layer.width, layer.height);
  const ctx = context2d(out);
  if (existing) ctx.drawImage(existing, 0, 0, layer.width, layer.height);
  ctx.setTransform(...toLocal);
  ctx.globalCompositeOperation = operation;
  ctx.drawImage(paint, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  return env.assets.addBitmap(out, layer.width, layer.height).id;
}

/** A document-sized surface filled with a colour inside the selection (everywhere without one). */
export function selectionFill(
  env: PixelEnv,
  doc: EditorDocument,
  color: string,
  selection = doc.selection,
): Surface {
  const surface = env.createSurface(doc.width, doc.height);
  const ctx = context2d(surface);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, doc.width, doc.height);
  clipToSelection(env, surface, selection);
  return surface;
}

export interface PixelClip {
  readonly surface: Surface;
  /** Document position of the clip's top-left corner. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The selected pixels of a layer, cropped to the selection bounds. Pixel layers are copied
 * without their opacity, blend mode or effects; other layers are copied as they look.
 */
export function copySelectedPixels(
  env: PixelEnv,
  doc: EditorDocument,
  layer: Layer,
  selection: SelectionMask,
): PixelClip | null {
  const bounds: PixelBounds | null = selection.bounds;
  if (!bounds) return null;
  const full = env.createSurface(doc.width, doc.height);
  try {
    const ctx = context2d(full);
    if (layer.kind === "raster") {
      if (layer.assetId) {
        const bitmap = env.assets.getBitmap(layer.assetId);
        if (!bitmap) return null;
        ctx.setTransform(...fromTransform(layer.transform));
        ctx.drawImage(bitmap, 0, 0, layer.width, layer.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    } else {
      const result = compositeDocument(
        ctx as CompositeContext,
        { ...doc, layers: [{ ...layer, visible: true }] },
        env.assets,
        { sizer: env.sizer, createSurface: env.createSurface },
      );
      if (result.pendingAssetIds.length > 0) return null;
    }
    clipToSelection(env, full, selection);
    const clip = env.createSurface(bounds.width, bounds.height);
    context2d(clip).drawImage(full, -bounds.x, -bounds.y);
    return { surface: clip, ...bounds };
  } finally {
    releaseSurface(full);
  }
}

/**
 * A pixel layer's own pixels (layer space, `layer.width × layer.height`), optionally resampled
 * by `scale` for a quick preview. Null while the layer is still loading.
 */
export function readLayerPixels(env: PixelEnv, layer: RasterLayer, scale = 1): RgbaPixels | null {
  const width = Math.max(1, Math.round(layer.width * scale));
  const height = Math.max(1, Math.round(layer.height * scale));
  const surface = env.createSurface(width, height);
  try {
    const ctx = context2d(surface, true);
    if (layer.assetId) {
      const bitmap = env.assets.getBitmap(layer.assetId);
      if (!bitmap) return null;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);
    }
    return { width, height, data: ctx.getImageData(0, 0, width, height).data };
  } finally {
    releaseSurface(surface);
  }
}

/**
 * How much of each layer pixel the document selection covers (0…255, layer space, resampled by
 * `scale`), so a filter can be limited to the selection on moved or transformed layers.
 */
export function layerSelectionCoverage(
  env: PixelEnv,
  layer: RasterLayer,
  selection: SelectionMask,
  scale = 1,
): Uint8Array {
  const width = Math.max(1, Math.round(layer.width * scale));
  const height = Math.max(1, Math.round(layer.height * scale));
  const toLocal = invertMatrix(fromTransform(layer.transform));
  const coverage = new Uint8Array(width * height);
  if (!toLocal) return coverage;
  const surface = env.createSurface(width, height);
  try {
    const ctx = context2d(surface, true);
    ctx.scale(width / layer.width, height / layer.height);
    ctx.transform(...toLocal);
    ctx.drawImage(selectionSurface(env, selection), 0, 0);
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let i = 0; i < coverage.length; i++) coverage[i] = data[i * 4 + 3];
    return coverage;
  } finally {
    releaseSurface(surface);
  }
}

/**
 * The document as it looks beneath one layer (that layer and everything above it hidden),
 * reduced to at most `maxPixels` — what an adjustment layer receives, for its histogram.
 * Null while a bitmap is still decoding.
 */
export function readPixelsBelow(
  env: PixelEnv,
  doc: EditorDocument,
  layerId: string,
  maxPixels = 1_000_000,
): RgbaPixels | null {
  const below = (layers: readonly Layer[]): { layers: Layer[]; found: boolean } => {
    const out: Layer[] = [];
    for (const layer of layers) {
      if (layer.id === layerId) return { layers: out, found: true };
      if (layer.kind === "group") {
        const inner = below(layer.children);
        if (inner.found) {
          out.push({ ...layer, children: inner.layers });
          return { layers: out, found: true };
        }
      }
      out.push(layer);
    }
    return { layers: out, found: false };
  };
  const scale = Math.min(1, Math.sqrt(maxPixels / (doc.width * doc.height)));
  const width = Math.max(1, Math.round(doc.width * scale));
  const height = Math.max(1, Math.round(doc.height * scale));
  const surface = env.createSurface(width, height);
  try {
    const ctx = context2d(surface, true);
    const result = compositeDocument(
      ctx as CompositeContext,
      { ...doc, layers: below(doc.layers).layers },
      env.assets,
      {
        sizer: env.sizer,
        createSurface: env.createSurface,
        space: { x: 0, y: 0, width, height, scale: width / doc.width },
      },
    );
    if (result.pendingAssetIds.length > 0) return null;
    return { width, height, data: ctx.getImageData(0, 0, width, height).data };
  } finally {
    releaseSurface(surface);
  }
}

/**
 * The visible document resampled into a pixel layer's own space (`layer.width × layer.height`),
 * so tools working on the layer can sample "all layers", with `inside` (0…255) saying which
 * layer pixels fall on the canvas at all. Null while a bitmap is still decoding.
 */
export function readCompositeInLayerSpace(
  env: PixelEnv,
  doc: EditorDocument,
  layer: RasterLayer,
): { pixels: RgbaPixels; inside: Uint8Array } | null {
  const toLocal = invertMatrix(fromTransform(layer.transform));
  if (!toLocal) return null;
  const composite = env.createSurface(doc.width, doc.height);
  const local = env.createSurface(layer.width, layer.height);
  try {
    const result = compositeDocument(context2d(composite) as CompositeContext, doc, env.assets, {
      sizer: env.sizer,
      createSurface: env.createSurface,
    });
    if (result.pendingAssetIds.length > 0) return null;
    const ctx = context2d(local, true);
    ctx.setTransform(...toLocal);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, doc.width, doc.height);
    const canvasArea = ctx.getImageData(0, 0, layer.width, layer.height).data;
    const inside = new Uint8Array(layer.width * layer.height);
    for (let i = 0; i < inside.length; i++) inside[i] = canvasArea[i * 4 + 3];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, layer.width, layer.height);
    ctx.restore();
    ctx.drawImage(composite, 0, 0);
    const image = ctx.getImageData(0, 0, layer.width, layer.height);
    return { pixels: { width: layer.width, height: layer.height, data: image.data }, inside };
  } finally {
    releaseSurface(composite);
    releaseSurface(local);
  }
}
