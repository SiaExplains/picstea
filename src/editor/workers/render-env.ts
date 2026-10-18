import { AssetStore } from "../assets/asset-store";
import { checkDimensions } from "../core/document/limits";
import type { EditorDocument } from "../core/document/types";
import type { PixelEnv } from "../pixels/layer-pixels";
import { createCanvasTextSizer } from "../rendering/text/text-layout";

/**
 * Rendering inside the worker (ADR-0022): the same compositor as the page, drawing on
 * OffscreenCanvas with the bitmaps the job brought along. The editor only uses system fonts, so
 * text measures and draws the same here as on the page.
 */

/** Raised when this worker can't draw (no OffscreenCanvas 2D); the page then renders itself. */
export class OffThreadUnavailableError extends Error {
  override name = "OffThreadUnavailableError";
}

/** Bitmaps a render job draws, by asset id. Transferred to the worker, closed after the job. */
export type JobBitmaps = Readonly<Record<string, ImageBitmap>>;

let canDraw: boolean | null = null;

export function canRenderHere(): boolean {
  if (canDraw === null) {
    try {
      canDraw =
        typeof OffscreenCanvas !== "undefined" && !!new OffscreenCanvas(1, 1).getContext("2d");
    } catch {
      canDraw = false;
    }
  }
  return canDraw;
}

export interface WorkerPixelEnv extends PixelEnv {
  /** Close the job's bitmaps. */
  dispose(): void;
}

const noDecoder = () => Promise.reject(new Error("Assets arrive decoded."));

/** A pixel environment over the job's bitmaps. Checks the document's size and the bitmaps. */
export function workerPixelEnv(doc: EditorDocument, bitmaps: JobBitmaps): WorkerPixelEnv {
  const close = () => {
    for (const bitmap of Object.values(bitmaps)) {
      if (typeof ImageBitmap !== "undefined" && bitmap instanceof ImageBitmap) bitmap.close();
    }
  };
  if (!canRenderHere()) {
    close();
    throw new OffThreadUnavailableError("This browser can't draw in the background.");
  }
  const size = checkDimensions(doc.width, doc.height);
  if (!size.ok) {
    close();
    throw new Error(size.reason);
  }
  const assets = new AssetStore(noDecoder);
  for (const id of Object.keys(bitmaps)) {
    const bitmap = bitmaps[id];
    if (!(bitmap instanceof ImageBitmap)) {
      close();
      throw new Error("Invalid image data.");
    }
    assets.add(
      { id, mime: "image/png", width: bitmap.width, height: bitmap.height, blob: null },
      bitmap,
    );
  }
  return {
    assets,
    sizer: createCanvasTextSizer(() => new OffscreenCanvas(1, 1).getContext("2d")),
    createSurface: (width, height) => new OffscreenCanvas(width, height),
    dispose: close,
  };
}
