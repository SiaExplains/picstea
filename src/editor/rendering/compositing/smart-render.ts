import type { EditorDocument, SmartObjectLayer } from "../../core/document/types";
import { filterById, runFilter, scaleFilterValues } from "../../filters/registry";
import type { RgbaPixels } from "../../selection/flood";
import type { AssetResolver, CompositeContext, CompositeOptions } from "./compositor";

/**
 * Smart object rendering (ADR-0016). The embedded document is composited at a power-of-two
 * level of the scale it appears at, so a smart object scaled down and back up is redrawn from
 * its source and stays sharp. Smart filters run on that render, with pixel-sized settings scaled
 * to the level. Renders are cached per (immutable) content, filters, level and asset version.
 */

type Surface = HTMLCanvasElement | OffscreenCanvas;

/** Rendered pixels per content pixel are capped so huge magnifications stay affordable. */
const MAX_LEVEL = 4;
const MAX_RENDER_PIXELS = 16_000_000;
/** Renders kept per content (different zoom levels, filter settings). */
const ENTRIES_PER_CONTENT = 3;

interface Entry {
  readonly key: string;
  readonly version: number;
  readonly surface: Surface;
}

const cache = new WeakMap<EditorDocument, Entry[]>();

/** The render level for a smart object drawn at `scale` (screen or export pixels per content pixel). */
export function smartLevel(content: EditorDocument, scale: number): number {
  let level = 2 ** Math.ceil(Math.log2(Math.max(scale, 1 / 64)));
  level = Math.min(level, MAX_LEVEL);
  while (level > 1 / 64 && content.width * content.height * level * level > MAX_RENDER_PIXELS) {
    level /= 2;
  }
  return level;
}

/**
 * A surface showing the smart object's contents (with its filters) at `level`, or null while an
 * image inside is still decoding (its asset ids are added to `pending`).
 */
export function renderSmartObject(
  layer: SmartObjectLayer,
  level: number,
  assets: AssetResolver,
  options: CompositeOptions,
  pending: string[],
  composite: (
    ctx: CompositeContext,
    doc: EditorDocument,
    assets: AssetResolver,
    options: CompositeOptions,
  ) => { pendingAssetIds: readonly string[] },
): Surface | null {
  const { createSurface } = options;
  if (!createSurface) return null;
  const filters = (layer.filters ?? []).filter((f) => f.enabled && filterById(f.filterId));
  const key = `${level}|${JSON.stringify(filters.map((f) => [f.filterId, f.values, f.seed]))}`;
  const version = options.assetVersion ?? 0;
  const entries = cache.get(layer.content) ?? [];
  const hit = entries.find((e) => e.key === key && e.version === version);
  if (hit) return hit.surface;

  const content = layer.content;
  const width = Math.max(1, Math.round(content.width * level));
  const height = Math.max(1, Math.round(content.height * level));
  const surface = createSurface(width, height);
  const ctx = surface.getContext("2d", { willReadFrequently: filters.length > 0 }) as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return null;
  const result = composite(ctx as CompositeContext, content, assets, {
    sizer: options.sizer,
    createSurface,
    assetVersion: version,
    space: { x: 0, y: 0, width, height, scale: level },
  });
  if (filters.length > 0) {
    let pixels: RgbaPixels = { width, height, data: ctx.getImageData(0, 0, width, height).data };
    for (const f of filters) {
      const filter = filterById(f.filterId)!;
      pixels = runFilter(f.filterId, pixels, scaleFilterValues(filter, f.values, level), {
        seed: f.seed,
      });
    }
    const image = ctx.createImageData(width, height);
    image.data.set(pixels.data);
    ctx.putImageData(image, 0, 0);
  }
  if (result.pendingAssetIds.length > 0) {
    pending.push(...result.pendingAssetIds);
    return surface;
  }
  const next = [{ key, version, surface }, ...entries.filter((e) => e.version === version)];
  for (const old of next.splice(ENTRIES_PER_CONTENT)) {
    old.surface.width = 0;
    old.surface.height = 0;
  }
  cache.set(content, next);
  return surface;
}
