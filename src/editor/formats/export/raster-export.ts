import type { EditorDocument } from "../../core/document/types";
import type { ContentSizer } from "../../core/geometry/layer-geometry";
import type { SurfaceFactory } from "../../rendering/canvas/canvas2d-renderer";
import {
  compositeDocument,
  type AssetResolver,
  type CompositeContext,
} from "../../rendering/compositing/compositor";

/**
 * Flatten a document to PNG, JPEG or WebP entirely in the browser (docs/05 Phase 1 "export").
 * Nothing is uploaded: the bytes go straight to a local download / save dialog.
 */

export type ExportFormat = "png" | "jpeg" | "webp";

export const EXPORT_FORMATS: Record<
  ExportFormat,
  { label: string; mime: string; extension: string; lossy: boolean; alpha: boolean }
> = {
  png: { label: "PNG", mime: "image/png", extension: "png", lossy: false, alpha: true },
  jpeg: { label: "JPEG", mime: "image/jpeg", extension: "jpg", lossy: true, alpha: false },
  webp: { label: "WebP", mime: "image/webp", extension: "webp", lossy: true, alpha: true },
};

export interface ExportOptions {
  readonly format: ExportFormat;
  /** 0..1, lossy formats only. */
  readonly quality: number;
  /** Colour behind transparent pixels for formats without alpha. */
  readonly matte?: string;
}

export class ExportError extends Error {
  override name = "ExportError";
}

type Surface = HTMLCanvasElement | OffscreenCanvas;

function encode(surface: Surface, mime: string, quality: number): Promise<Blob> {
  if ("convertToBlob" in surface) return surface.convertToBlob({ type: mime, quality });
  return new Promise((resolve, reject) =>
    surface.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new ExportError("The browser could not encode the image.")),
      mime,
      quality,
    ),
  );
}

/**
 * Draw the flattened document onto `ctx`: matte first for formats without transparency, then the
 * composited layers. Split out so it can be tested with a recording context.
 */
export function drawFlattened(
  ctx: CompositeContext,
  doc: EditorDocument,
  assets: AssetResolver,
  sizer: ContentSizer,
  options: ExportOptions,
  createSurface: SurfaceFactory,
): { pendingAssetIds: readonly string[] } {
  const format = EXPORT_FORMATS[options.format];
  if (format.alpha) return compositeDocument(ctx, doc, assets, { sizer, createSurface });

  // Composite separately so blend modes act on the layers, not on the matte.
  const layers = createSurface(doc.width, doc.height);
  const lctx = layers.getContext("2d") as CompositeContext | null;
  if (!lctx) throw new ExportError("2D canvas is not available.");
  const result = compositeDocument(lctx, doc, assets, { sizer, createSurface });
  ctx.clearRect(0, 0, doc.width, doc.height);
  ctx.fillStyle = options.matte ?? "#ffffff";
  ctx.fillRect(0, 0, doc.width, doc.height);
  ctx.drawImage(layers, 0, 0);
  layers.width = 0;
  layers.height = 0;
  return result;
}

export async function exportDocument(
  doc: EditorDocument,
  assets: AssetResolver,
  sizer: ContentSizer,
  options: ExportOptions,
  createSurface: SurfaceFactory,
): Promise<Blob> {
  const format = EXPORT_FORMATS[options.format];
  const surface = createSurface(doc.width, doc.height);
  try {
    const ctx = surface.getContext("2d") as CompositeContext | null;
    if (!ctx) throw new ExportError("2D canvas is not available.");
    const { pendingAssetIds } = drawFlattened(ctx, doc, assets, sizer, options, createSurface);
    if (pendingAssetIds.length > 0) {
      throw new ExportError("Some layers are still loading. Try exporting again in a moment.");
    }
    const quality = Math.min(1, Math.max(0, options.quality));
    const blob = await encode(surface, format.mime, quality);
    // Browsers silently fall back to PNG for types they cannot encode (e.g. older Safari + WebP).
    if (blob.type !== format.mime) {
      throw new ExportError(`This browser cannot export ${format.label} images. Try PNG instead.`);
    }
    return blob;
  } finally {
    surface.width = 0;
    surface.height = 0;
  }
}

/** A safe download filename: strips path separators and characters invalid on common systems. */
export function exportFilename(name: string, format: ExportFormat): string {
  const base =
    name
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\.+/, "")
      .slice(0, 120) || "image";
  return `${base}.${EXPORT_FORMATS[format].extension}`;
}
