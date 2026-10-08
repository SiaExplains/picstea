import { createId } from "../core/ids";

/**
 * Immutable binary assets referenced by layers (raster pixels today; fonts/linked files later).
 *
 * Assets never change once created — an edit that changes pixels creates a new asset — which is
 * what makes snapshot-based undo cheap (ADR-0003). The store lives in memory only; persistence
 * copies the bytes into IndexedDB. Nothing here touches the network.
 */

export type RasterMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export interface AssetRecord {
  readonly id: string;
  readonly mime: RasterMime;
  readonly width: number;
  readonly height: number;
  /** Encoded bytes; null for pixels created in the editor until they are first saved. */
  readonly blob: Blob | null;
}

export type Drawable = CanvasImageSource & { close?: () => void };

/** Turns encoded bytes into something drawable. Injected so the store works outside a browser. */
export type BitmapDecoder = (blob: Blob) => Promise<Drawable>;
/** Turns a drawable into PNG bytes (used when painted pixels are saved). */
export type BitmapEncoder = (bitmap: Drawable, width: number, height: number) => Promise<Blob>;

const unsupportedEncoder: BitmapEncoder = () =>
  Promise.reject(new Error("No image encoder is available."));

export class AssetStore {
  private readonly records = new Map<string, AssetRecord>();
  private readonly bitmaps = new Map<string, Drawable>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly failed = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private version = 0;

  constructor(
    private readonly decode: BitmapDecoder,
    private readonly encode: BitmapEncoder = unsupportedEncoder,
  ) {}

  /** Bumped whenever a bitmap becomes available; renderers use it to invalidate caches. */
  getVersion = () => this.version;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  add(input: Omit<AssetRecord, "id"> & { id?: string }, bitmap?: Drawable): AssetRecord {
    const record: AssetRecord = {
      id: input.id ?? createId("asset"),
      mime: input.mime,
      width: input.width,
      height: input.height,
      blob: input.blob,
    };
    this.records.set(record.id, record);
    if (bitmap) {
      this.bitmaps.set(record.id, bitmap);
      this.bump();
    }
    return record;
  }

  /** Store pixels produced in the editor (e.g. a finished brush stroke). Encoded lazily. */
  addBitmap(bitmap: Drawable, width: number, height: number): AssetRecord {
    return this.add({ mime: "image/png", width, height, blob: null }, bitmap);
  }

  /** Encoded bytes for persistence, encoding (once) if the asset was created in the editor. */
  async getBlob(id: string): Promise<Blob> {
    const record = this.records.get(id);
    if (!record) throw new Error("Unknown asset.");
    if (record.blob) return record.blob;
    const bitmap = this.bitmaps.get(id);
    if (!bitmap) throw new Error("Asset has neither bytes nor pixels.");
    const blob = await this.encode(bitmap, record.width, record.height);
    const current = this.records.get(id);
    if (current) this.records.set(id, { ...current, blob });
    return blob;
  }

  /** Rough decoded size of the given assets in bytes (RGBA), for memory budgeting. */
  estimateBytes(ids: Iterable<string>): number {
    let total = 0;
    for (const id of new Set(ids)) {
      const record = this.records.get(id);
      if (record) total += record.width * record.height * 4;
    }
    return total;
  }

  get(id: string): AssetRecord | undefined {
    return this.records.get(id);
  }

  has(id: string): boolean {
    return this.records.has(id);
  }

  /**
   * The decoded bitmap, or undefined while it is still decoding. Decoding is started on first
   * request and listeners are notified when it finishes.
   */
  getBitmap(id: string): Drawable | undefined {
    const bitmap = this.bitmaps.get(id);
    if (bitmap) return bitmap;
    const record = this.records.get(id);
    if (record?.blob && !this.pending.has(id) && !this.failed.has(id)) {
      const blob = record.blob;
      this.pending.set(
        id,
        this.decode(blob)
          .then((decoded) => {
            if (this.records.has(id)) {
              this.bitmaps.set(id, decoded);
              this.bump();
            } else {
              decoded.close?.();
            }
          })
          .catch(() => {
            this.failed.add(id);
          })
          .finally(() => this.pending.delete(id)),
      );
    }
    return undefined;
  }

  /** Drop assets no longer referenced by any open document, releasing their bitmaps. */
  retainOnly(ids: Iterable<string>): void {
    const keep = new Set(ids);
    for (const id of [...this.records.keys()]) {
      if (keep.has(id)) continue;
      this.records.delete(id);
      this.bitmaps.get(id)?.close?.();
      this.bitmaps.delete(id);
      this.failed.delete(id);
    }
  }

  private bump() {
    this.version++;
    for (const listener of this.listeners) listener();
  }
}
