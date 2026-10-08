/**
 * The selection subsystem (ADR-0010). A selection is an immutable, document-sized coverage mask:
 * one byte per pixel, 0 = not selected … 255 = fully selected. Soft values come from anti-aliased
 * edges and feathering. Everything in `src/editor/selection` is pure TypeScript with no canvas, so
 * it runs in tests and can later move to a worker unchanged.
 */

export interface PixelBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SelectionMask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  /** Smallest rectangle containing every non-zero pixel; null when nothing is selected. */
  readonly bounds: PixelBounds | null;
}

export function computeBounds(width: number, height: number, data: Uint8Array): PixelBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let first = -1;
    for (let x = 0; x < width; x++) {
      if (data[row + x] !== 0) {
        first = x;
        break;
      }
    }
    if (first === -1) continue;
    let last = first;
    for (let x = width - 1; x > first; x--) {
      if (data[row + x] !== 0) {
        last = x;
        break;
      }
    }
    if (first < minX) minX = first;
    if (last > maxX) maxX = last;
    if (minY === height) minY = y;
    maxY = y;
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Wrap coverage data (taking ownership of `data`) and compute its bounds. */
export function createSelection(width: number, height: number, data: Uint8Array): SelectionMask {
  if (data.length !== width * height) throw new RangeError("Selection data has the wrong size.");
  return { width, height, data, bounds: computeBounds(width, height, data) };
}

export function selectAll(width: number, height: number): SelectionMask {
  return {
    width,
    height,
    data: new Uint8Array(width * height).fill(255),
    bounds: { x: 0, y: 0, width, height },
  };
}

export const isEmptySelection = (mask: SelectionMask | null | undefined): boolean =>
  !mask || mask.bounds === null;

export function coverageAt(mask: SelectionMask, x: number, y: number): number {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= mask.width || py >= mask.height) return 0;
  return mask.data[py * mask.width + px];
}

/** Bytes held by a selection, for the undo memory budget. */
export const selectionBytes = (mask: SelectionMask | null | undefined): number =>
  mask ? mask.data.byteLength : 0;
