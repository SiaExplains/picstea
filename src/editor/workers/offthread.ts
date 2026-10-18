import type { AssetStore } from "../assets/asset-store";
import { createId } from "../core/ids";
import { referencedAssetIds } from "../core/document/queries";
import type { EditorDocument, Layer } from "../core/document/types";
import { FormatError } from "../formats/binary/bytes";
import { exportAs, type ExportedFile, type ExportRequest } from "../formats/export/document-export";
import { ExportError } from "../formats/export/raster-export";
import { PENDING, renderBitmap } from "../formats/layer-render";
import type { PixelEnv } from "../pixels/layer-pixels";
import { colorRange, type Rgba, type RgbaPixels } from "../selection/flood";
import type { SelectionMask } from "../selection/mask";
import type { JobRunner } from "./job-runner";
import type { JobBitmaps } from "./render-env";

/**
 * The page side of drawing in the worker (ADR-0022). Each helper sends the document and copies of
 * its bitmaps to the worker; when the worker can't draw (no worker, or a browser without
 * OffscreenCanvas 2D in workers) it does the work here, as before.
 */

/** Runners whose worker turned out unable to draw; they get the page path from then on. */
const cannotDraw = new WeakSet<JobRunner>();

const drawsOffThread = (jobs: JobRunner) => jobs.offThread === true && !cannotDraw.has(jobs);

/** Errors meant for the user; anything else means "try on the page". */
const isUserFacing = (error: unknown) =>
  error instanceof FormatError || error instanceof ExportError;

function closeAll(bitmaps: JobBitmaps): void {
  for (const bitmap of Object.values(bitmaps)) bitmap.close();
}

/**
 * Copies of the bitmaps `doc` draws, to transfer (the page keeps its own). Copying is GPU work
 * that `createImageBitmap` does asynchronously. Null while one is still decoding.
 */
export async function collectBitmaps(
  assets: AssetStore,
  doc: Pick<EditorDocument, "layers">,
): Promise<Record<string, ImageBitmap> | null> {
  const out: Record<string, ImageBitmap> = {};
  try {
    for (const id of referencedAssetIds(doc as EditorDocument)) {
      const drawable = assets.getBitmap(id);
      if (!drawable) {
        closeAll(out);
        return null;
      }
      out[id] = await createImageBitmap(drawable as ImageBitmapSource);
    }
  } catch (error) {
    closeAll(out);
    throw error;
  }
  return out;
}

/** The document without what drawing doesn't need (the selection can be large). */
const forDrawing = (doc: EditorDocument): EditorDocument => ({ ...doc, selection: undefined });

/**
 * Run a drawing job in the worker. Returns null when the page should do the work itself; user
 * errors (formats, missing layers) are thrown as they are.
 */
async function offThread<T>(
  jobs: JobRunner,
  assets: AssetStore,
  doc: Pick<EditorDocument, "layers">,
  run: (bitmaps: JobBitmaps) => Promise<T>,
): Promise<T | null> {
  if (!drawsOffThread(jobs)) return null;
  const bitmaps = await collectBitmaps(assets, doc);
  if (!bitmaps) throw new FormatError(PENDING);
  try {
    return await run(bitmaps);
  } catch (error) {
    if (isUserFacing(error)) throw error;
    if (error instanceof Error && error.name === "OffThreadUnavailableError") cannotDraw.add(jobs);
    return null;
  }
}

/** Export in any format, drawing in the worker when it can (ADR-0011, ADR-0022). */
export async function exportFile(
  env: PixelEnv,
  doc: EditorDocument,
  request: ExportRequest,
  jobs: JobRunner,
): Promise<ExportedFile> {
  const result = await offThread(jobs, env.assets, doc, async (bitmaps) => {
    const out = await jobs.run(
      "exportDocument",
      { doc: forDrawing(doc), request, bitmaps },
      Object.values(bitmaps),
    );
    return { blob: new Blob([out.bytes as BlobPart], { type: out.mime }), warnings: out.warnings };
  });
  return result ?? exportAs(env, doc, request, jobs);
}

export interface FloodRequest {
  readonly x: number;
  readonly y: number;
  readonly tolerance: number;
  readonly contiguous: boolean;
}

/** Flood fill on `layers` drawn as the document (magic wand, paint bucket). */
export async function floodDocument(
  env: PixelEnv & { readonly jobs: JobRunner },
  doc: EditorDocument,
  layers: readonly Layer[],
  request: FloodRequest,
): Promise<SelectionMask> {
  const { jobs } = env;
  const sampled = { ...forDrawing(doc), layers };
  const result = await offThread(jobs, env.assets, sampled, (bitmaps) =>
    jobs.run(
      "floodDocument",
      { doc: sampled, layers, bitmaps, ...request },
      Object.values(bitmaps),
    ),
  );
  if (result) return result;
  // Draw here (GPU); read the pixels back and flood fill in the worker (ADR-0012).
  const bitmap = await renderBitmap(env, doc, layers);
  return jobs.run("floodBitmap", { bitmap, ...request }, [bitmap]);
}

/**
 * Color Range for a dialog session: the first call draws the image (in the worker when it can),
 * later calls for the same document and layer only re-run the colour test.
 */
export class ColorRangeSession {
  private key: { doc: EditorDocument; layer: Layer | undefined; id: string } | null = null;
  /** The key whose drawing the worker holds. */
  private sent: string | null = null;
  /** The drawing being sent; later calls for the same key wait for it instead of sending again. */
  private sending: { id: string; done: Promise<unknown> } | null = null;
  private local: RgbaPixels | null = null;

  constructor(
    private readonly env: PixelEnv & { readonly jobs: JobRunner },
    /** The page path: the drawn pixels, or null while layers are loading. */
    private readonly readHere: (doc: EditorDocument, layer: Layer | undefined) => RgbaPixels | null,
  ) {}

  /** The selection for `color`, sampling `layer` or (undefined) all layers; null while loading. */
  async preview(
    doc: EditorDocument,
    layer: Layer | undefined,
    color: Rgba,
    fuzziness: number,
  ): Promise<SelectionMask | null> {
    if (!this.key || this.key.doc !== doc || this.key.layer !== layer) {
      this.key = { doc, layer, id: createId("range") };
      this.local = null;
    }
    const { id } = this.key;
    const { jobs } = this.env;
    if (drawsOffThread(jobs)) {
      if (this.sending?.id === id) await this.sending.done.catch(() => {});
      if (this.sent === id) {
        try {
          return await jobs.run("colorRangeDocument", { key: id, source: null, color, fuzziness });
        } catch {
          // The worker lost the drawing (it restarted) or failed: send it again below, which
          // falls back to the page if the worker can't do it.
          this.sent = null;
        }
      }
      const layers = layer ? [{ ...layer, visible: true }] : doc.layers;
      const sampled = { ...forDrawing(doc), layers };
      const sending = offThread(jobs, this.env.assets, sampled, (bitmaps) =>
        jobs.run(
          "colorRangeDocument",
          { key: id, source: { doc: sampled, layers, bitmaps }, color, fuzziness },
          Object.values(bitmaps),
        ),
      );
      this.sending = { id, done: sending };
      let result: SelectionMask | null;
      try {
        result = await sending;
      } catch (error) {
        if (error instanceof FormatError && error.message === PENDING) return null;
        throw error;
      } finally {
        if (this.sending?.id === id) this.sending = null;
      }
      if (result) {
        if (this.key?.id === id) {
          this.sent = id;
        } else {
          // The dialog closed (or the image changed) while the drawing was on its way.
          this.release();
        }
        return result;
      }
    }
    this.local ??= this.readHere(doc, layer);
    return this.local ? colorRange(this.local, color, fuzziness) : null;
  }

  /** Free what the session kept, here and in the worker. */
  end(): void {
    this.key = null;
    this.local = null;
    if (this.sent) {
      this.sent = null;
      this.release();
    }
  }

  private release(): void {
    void this.env.jobs.run("colorRangeRelease", null).catch(() => {});
  }
}
