import type { EditorDocument, Layer } from "../core/document/types";
import { context2d, releaseSurface, type PixelEnv, type Surface } from "../pixels/layer-pixels";
import { compositeDocument, type CompositeContext } from "../rendering/compositing/compositor";
import { FormatError } from "./binary/bytes";

/**
 * Rendering helpers shared by the exporters (SVG, PDF, PSD): flatten the document or a few layers
 * to RGBA in document space, crop to the visible pixels and encode PNG data URLs.
 */

export interface RenderedPixels {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** RGBA for the cropped box. */
  readonly rgba: Uint8ClampedArray;
}

const PENDING = "Some layers are still loading. Try exporting again in a moment.";

/** The document (or the given layers in its place) flattened to RGBA, full canvas size. */
export function renderRgba(
  env: PixelEnv,
  doc: EditorDocument,
  layers: readonly Layer[] = doc.layers,
): Uint8ClampedArray {
  const surface = env.createSurface(doc.width, doc.height);
  try {
    const ctx = context2d(surface, true);
    const result = compositeDocument(ctx as CompositeContext, { ...doc, layers }, env.assets, {
      sizer: env.sizer,
      createSurface: env.createSurface,
    });
    if (result.pendingAssetIds.length > 0) throw new FormatError(PENDING);
    return ctx.getImageData(0, 0, doc.width, doc.height).data;
  } finally {
    releaseSurface(surface);
  }
}

/** Crop full-canvas RGBA to its non-transparent pixels; null when nothing is visible. */
export function cropToContent(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): RenderedPixels | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((minY + y) * width + minX) * 4;
    out.set(rgba.subarray(from, from + w * 4), y * w * 4);
  }
  return { x: minX, y: minY, width: w, height: h, rgba: out };
}

export function rgbaToSurface(
  env: PixelEnv,
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Surface {
  const surface = env.createSurface(width, height);
  const ctx = context2d(surface);
  const image = ctx.createImageData(width, height);
  image.data.set(rgba);
  ctx.putImageData(image, 0, 0);
  return surface;
}

export async function encodePng(surface: Surface): Promise<Blob> {
  if ("convertToBlob" in surface) return surface.convertToBlob({ type: "image/png" });
  return new Promise((resolve, reject) =>
    surface.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new FormatError("The browser could not encode the image.")),
      "image/png",
    ),
  );
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

/** Render layers and return a cropped PNG data URL (for SVG export). */
export async function rasterizeToDataUrl(
  env: PixelEnv,
  doc: EditorDocument,
  layers: readonly Layer[],
): Promise<{ href: string; x: number; y: number; width: number; height: number } | null> {
  const cropped = cropToContent(renderRgba(env, doc, layers), doc.width, doc.height);
  if (!cropped) return null;
  const surface = rgbaToSurface(env, cropped.rgba, cropped.width, cropped.height);
  try {
    const href = await blobToDataUrl(await encodePng(surface));
    return { href, x: cropped.x, y: cropped.y, width: cropped.width, height: cropped.height };
  } finally {
    releaseSurface(surface);
  }
}
