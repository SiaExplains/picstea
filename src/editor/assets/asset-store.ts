import { createId } from "../core/ids";

/**
 * Immutable binary assets referenced by layers (raster pixels today; fonts/linked files later).
 *
 * Assets never change once created — an edit that changes pixels creates a new asset — which is
 * what makes snapshot-based undo cheap (ADR-0003). The store lives in memory only; persistence
 * copies the bytes into IndexedDB. Nothing here touches the network.
 */

export type RasterMime = "image/png" | "image/jpeg" | "image/webp";

export interface AssetRecord {
  readonly id: string;
  readonly mime: RasterMime;
  readonly width: number;
  readonly height: number;
  readonly blob: Blob;
}

/** Turns encoded bytes into something drawable. Injected so the store works outside a browser. */
export type BitmapDecoder = (blob: Blob) => Promise<CanvasImageSource & { close?: () => void }>;

type Drawable = CanvasImageSource & { close?: () => void };

export class AssetStore {
  private readonly records = new Map<string, AssetRecord>();
  private readonly bitmaps = new Map<string, Drawable>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly failed = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private version = 0;

  constructor(private readonly decode: BitmapDecoder) {}

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
    if (record && !this.pending.has(id) && !this.failed.has(id)) {
      this.pending.set(
        id,
        this.decode(record.blob)
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
