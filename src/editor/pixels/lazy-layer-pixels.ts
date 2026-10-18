import type { EditorDocument, RasterLayer } from "../core/document/types";
import { fromTransform, invertMatrix } from "../core/geometry/matrix";
import { compositeDocument, type CompositeContext } from "../rendering/compositing/compositor";
import { LazyTiles } from "../retouch/lazy-tiles";
import type { PixelPrepare, PixelRect } from "../retouch/stroke";
import type { RgbaPixels } from "../selection/flood";
import {
  context2d,
  readLayerPixels,
  releaseSurface,
  type PixelEnv,
  type Surface,
} from "./layer-pixels";

/**
 * Layer-space pixels read on demand (ADR-0022): the source stays on the GPU and only the tiles a
 * retouch stroke touches are read back, so starting a stroke on a large layer doesn't stall.
 */
export interface LazyLayerPixels {
  /** Filled as `prepare` is called; complete when `prepare` is undefined. */
  readonly pixels: RgbaPixels;
  readonly prepare: PixelPrepare | undefined;
  /** For the composite: which layer pixels fall on the canvas (0…255), filled with `pixels`. */
  readonly inside: Uint8Array | null;
  release(): void;
}

/** Reads rectangles of `source` 1:1 through a small canvas set up for reading. */
function tileReader(env: PixelEnv, source: CanvasImageSource) {
  let scratch: Surface | null = null;
  return {
    read(r: PixelRect): Uint8ClampedArray {
      const w = r.x1 - r.x0;
      const h = r.y1 - r.y0;
      if (!scratch || scratch.width < w || scratch.height < h) {
        releaseSurface(scratch);
        scratch = env.createSurface(
          Math.max(w, scratch?.width ?? 0),
          Math.max(h, scratch?.height ?? 0),
        );
      }
      const ctx = context2d(scratch, true);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(source, r.x0, r.y0, w, h, 0, 0, w, h);
      return ctx.getImageData(0, 0, w, h).data;
    },
    release() {
      releaseSurface(scratch);
      scratch = null;
    },
  };
}

function copyRect(from: Uint8ClampedArray, r: PixelRect, to: Uint8ClampedArray, width: number) {
  const w = (r.x1 - r.x0) * 4;
  for (let y = r.y0; y < r.y1; y++) {
    const row = (y - r.y0) * w;
    to.set(from.subarray(row, row + w), (y * width + r.x0) * 4);
  }
}

/** The layer's own pixels, read on demand. Null while its bitmap is still decoding. */
export function lazyLayerPixels(env: PixelEnv, layer: RasterLayer): LazyLayerPixels | null {
  const { width, height } = layer;
  const bitmap = layer.assetId ? env.assets.getBitmap(layer.assetId) : undefined;
  if (layer.assetId && !bitmap) return null;
  const size = bitmap as { width?: number; height?: number } | undefined;
  if (bitmap && (size?.width !== width || size?.height !== height)) {
    // A bitmap that doesn't match the layer is resampled: read it the usual way.
    const pixels = readLayerPixels(env, layer);
    return pixels && { pixels, prepare: undefined, inside: null, release() {} };
  }
  const data = new Uint8ClampedArray(width * height * 4);
  if (!bitmap) {
    return { pixels: { width, height, data }, prepare: undefined, inside: null, release() {} };
  }
  const reader = tileReader(env, bitmap);
  const tiles = new LazyTiles(width, height, (r) => copyRect(reader.read(r), r, data, width));
  return {
    pixels: { width, height, data },
    prepare: tiles.prepare,
    inside: null,
    release: reader.release,
  };
}

/**
 * The visible document resampled into the layer's space, read on demand, with `inside` saying
 * which layer pixels fall on the canvas. Null while a bitmap is still decoding.
 */
export function lazyCompositeInLayerSpace(
  env: PixelEnv,
  doc: EditorDocument,
  layer: RasterLayer,
): LazyLayerPixels | null {
  const toLocal = invertMatrix(fromTransform(layer.transform));
  if (!toLocal) return null;
  const { width, height } = layer;
  const composite = env.createSurface(doc.width, doc.height);
  let local: Surface | null = null;
  let area: Surface | null = null;
  try {
    const result = compositeDocument(context2d(composite) as CompositeContext, doc, env.assets, {
      sizer: env.sizer,
      createSurface: env.createSurface,
    });
    if (result.pendingAssetIds.length > 0) return null;
    // Both stay on the GPU; tiles are read from them as the stroke needs them.
    local = env.createSurface(width, height);
    const lctx = context2d(local);
    lctx.setTransform(...toLocal);
    lctx.drawImage(composite, 0, 0);
    area = env.createSurface(width, height);
    const actx = context2d(area);
    actx.setTransform(...toLocal);
    actx.fillStyle = "#000";
    actx.fillRect(0, 0, doc.width, doc.height);
  } finally {
    releaseSurface(composite);
  }
  if (!local || !area) return null;
  const data = new Uint8ClampedArray(width * height * 4);
  const inside = new Uint8Array(width * height);
  const pixelReader = tileReader(env, local);
  const areaReader = tileReader(env, area);
  const tiles = new LazyTiles(width, height, (r) => {
    copyRect(pixelReader.read(r), r, data, width);
    const alpha = areaReader.read(r);
    const w = r.x1 - r.x0;
    for (let y = r.y0; y < r.y1; y++) {
      for (let x = r.x0; x < r.x1; x++) {
        inside[y * width + x] = alpha[((y - r.y0) * w + (x - r.x0)) * 4 + 3];
      }
    }
  });
  return {
    pixels: { width, height, data },
    prepare: tiles.prepare,
    inside,
    release() {
      pixelReader.release();
      areaReader.release();
      releaseSurface(local);
      releaseSurface(area);
    },
  };
}
