import type { EditorDocument, Layer } from "../core/document/types";
import { context2d, releaseSurface, type PixelEnv, type Surface } from "../pixels/layer-pixels";
import { compositeDocument, type CompositeContext } from "../rendering/compositing/compositor";
import { spaceFor, type DocRect } from "../rendering/render-space";
import { FormatError } from "./binary/bytes";
import { cropToContent } from "./crop";

export { cropToContent };

/**
 * Rendering helpers shared by the exporters (SVG, PDF, PSD): flatten the document or a few layers
 * to RGBA in document space, crop to the visible pixels and encode PNG data URLs.
 */

export const PENDING = "Some layers are still loading. Try exporting again in a moment.";

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

/**
 * Render the document (or some layers in its place) for `region` at 1:1 into an ImageBitmap —
 * GPU work only, so the expensive pixel readback can happen in a worker (ADR-0012).
 */
export async function renderBitmap(
  env: PixelEnv,
  doc: EditorDocument,
  layers: readonly Layer[] = doc.layers,
  region: DocRect = { x: 0, y: 0, width: doc.width, height: doc.height },
): Promise<ImageBitmap> {
  const space = spaceFor(region, 1);
  const surface = env.createSurface(space.width, space.height);
  const ctx = context2d(surface);
  const result = compositeDocument(ctx as CompositeContext, { ...doc, layers }, env.assets, {
    sizer: env.sizer,
    createSurface: env.createSurface,
    space,
  });
  if (result.pendingAssetIds.length > 0) {
    releaseSurface(surface);
    throw new FormatError(PENDING);
  }
  if ("transferToImageBitmap" in surface) return surface.transferToImageBitmap();
  try {
    return await createImageBitmap(surface);
  } finally {
    releaseSurface(surface);
  }
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
