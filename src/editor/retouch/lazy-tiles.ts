import { isEmptyRect, type PixelRect } from "./stroke";

/**
 * Bookkeeping for pixels that are read on demand, tile by tile (ADR-0022): a retouch stroke on a
 * large layer reads only the area it touches instead of the whole layer at the start.
 * `load` fills the caller's arrays for a rectangle; missing tiles are loaded in one call covering
 * their bounding box.
 */
export class LazyTiles {
  private readonly loaded: Uint8Array;
  private readonly tilesX: number;
  private remaining: number;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly load: (rect: PixelRect) => void,
    readonly tile = 128,
  ) {
    this.tilesX = Math.ceil(width / tile);
    this.loaded = new Uint8Array(this.tilesX * Math.ceil(height / tile));
    this.remaining = this.loaded.length;
  }

  /** Make `rect` (clipped to the image) available; returns the tiles loaded just now. */
  prepare = (rect: PixelRect): PixelRect[] => {
    if (this.remaining === 0) return [];
    const { tile, width, height } = this;
    const clip: PixelRect = {
      x0: Math.max(0, Math.floor(rect.x0)),
      y0: Math.max(0, Math.floor(rect.y0)),
      x1: Math.min(width, Math.ceil(rect.x1)),
      y1: Math.min(height, Math.ceil(rect.y1)),
    };
    if (isEmptyRect(clip)) return [];
    const tx0 = Math.floor(clip.x0 / tile);
    const ty0 = Math.floor(clip.y0 / tile);
    const tx1 = Math.ceil(clip.x1 / tile);
    const ty1 = Math.ceil(clip.y1 / tile);
    const fresh: PixelRect[] = [];
    let box: { x0: number; y0: number; x1: number; y1: number } | null = null;
    for (let ty = ty0; ty < ty1; ty++) {
      for (let tx = tx0; tx < tx1; tx++) {
        if (this.loaded[ty * this.tilesX + tx]) continue;
        const r = {
          x0: tx * tile,
          y0: ty * tile,
          x1: Math.min(width, (tx + 1) * tile),
          y1: Math.min(height, (ty + 1) * tile),
        };
        fresh.push(r);
        box = box
          ? {
              x0: Math.min(box.x0, r.x0),
              y0: Math.min(box.y0, r.y0),
              x1: Math.max(box.x1, r.x1),
              y1: Math.max(box.y1, r.y1),
            }
          : { ...r };
      }
    }
    if (!box) return [];
    this.load(box);
    for (const r of fresh) {
      this.loaded[Math.floor(r.y0 / tile) * this.tilesX + Math.floor(r.x0 / tile)] = 1;
    }
    this.remaining -= fresh.length;
    return fresh;
  };

  /** Whether every tile has been loaded. */
  get complete(): boolean {
    return this.remaining === 0;
  }
}
