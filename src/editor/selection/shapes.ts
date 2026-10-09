import type { Point } from "../core/viewport/viewport";
import { createSelection, type SelectionMask } from "./mask";

/** Vertical sub-scanlines per pixel row; horizontal coverage is computed exactly. */
const SUBSAMPLES = 4;

/**
 * Rasterise a closed polygon (even-odd rule) into a document-sized selection. Edges are
 * anti-aliased unless `antiAlias` is false, in which case a pixel is selected when its centre is
 * inside the polygon.
 */
export function polygonSelection(
  width: number,
  height: number,
  points: readonly Point[],
  antiAlias = true,
): SelectionMask {
  return polygonsSelection(width, height, [points], antiAlias);
}

/**
 * Rasterise several closed rings with the even-odd rule, so a ring inside another cuts a hole
 * (paths with holes, traced selections).
 */
export function polygonsSelection(
  width: number,
  height: number,
  polygons: readonly (readonly Point[])[],
  antiAlias = true,
): SelectionMask {
  const data = new Uint8Array(width * height);
  const rings = polygons.filter((r) => r.length >= 3);
  if (rings.length === 0) return createSelection(width, height, data);

  let minY = Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const p of ring) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const rowStart = Math.max(0, Math.floor(minY));
  const rowEnd = Math.min(height - 1, Math.ceil(maxY));
  const samples = antiAlias ? SUBSAMPLES : 1;
  const coverage = new Float32Array(width);
  const xs: number[] = [];

  for (let row = rowStart; row <= rowEnd; row++) {
    coverage.fill(0);
    let touched = false;
    for (let s = 0; s < samples; s++) {
      const sy = row + (s + 0.5) / samples;
      xs.length = 0;
      for (const points of rings) {
        for (let i = 0; i < points.length; i++) {
          const a = points[i];
          const b = points[(i + 1) % points.length];
          // Half-open rule so shared vertices are counted once.
          if ((a.y <= sy && b.y > sy) || (b.y <= sy && a.y > sy)) {
            xs.push(a.x + ((sy - a.y) / (b.y - a.y)) * (b.x - a.x));
          }
        }
      }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        let x0 = xs[i];
        let x1 = xs[i + 1];
        if (!antiAlias) {
          // Pixel centres inside the span.
          x0 = Math.ceil(x0 - 0.5);
          x1 = Math.ceil(x1 - 0.5);
        }
        x0 = Math.max(0, x0);
        x1 = Math.min(width, x1);
        if (x1 <= x0) continue;
        touched = true;
        const first = Math.floor(x0);
        const last = Math.ceil(x1) - 1;
        for (let px = first; px <= last; px++) {
          coverage[px] += (Math.min(x1, px + 1) - Math.max(x0, px)) / samples;
        }
      }
    }
    if (!touched) continue;
    const base = row * width;
    for (let x = 0; x < width; x++) {
      const c = coverage[x];
      if (c > 0) data[base + x] = Math.min(255, Math.round(c * 255));
    }
  }
  return createSelection(width, height, data);
}

export function rectSelection(
  width: number,
  height: number,
  rect: { x: number; y: number; width: number; height: number },
): SelectionMask {
  const { x, y } = rect;
  const x2 = x + rect.width;
  const y2 = y + rect.height;
  return polygonSelection(width, height, [
    { x, y },
    { x: x2, y },
    { x: x2, y: y2 },
    { x, y: y2 },
  ]);
}

/** Ellipse as a fine polygon: at most ~1 px between vertices, so the error is sub-pixel. */
export function ellipsePoints(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Point[] {
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  const cx = rect.x + rx;
  const cy = rect.y + ry;
  const segments = Math.max(16, Math.min(4096, Math.ceil(Math.PI * (rx + ry))));
  const out: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    out.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
  }
  return out;
}

export function ellipseSelection(
  width: number,
  height: number,
  rect: { x: number; y: number; width: number; height: number },
): SelectionMask {
  return polygonSelection(width, height, ellipsePoints(rect));
}
