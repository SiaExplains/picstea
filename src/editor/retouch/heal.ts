import { cloneEffect } from "./effects";
import {
  CoverageStroke,
  isEmptyRect,
  shiftRect,
  type PixelPrepare,
  type PixelEffect,
  type PixelRect,
  type StrokeOptions,
} from "./stroke";

/**
 * Fill the unknown entries of a `width × height` grid of `channels`-vectors smoothly from the
 * known ones (push–pull pyramid): known averages are pushed down to coarser levels, then pulled
 * back up with bilinear interpolation into the gaps. Close to a membrane (harmonic) fill at a
 * fraction of the cost. `known` is 1 for known entries.
 */
export function pushPullFill(
  values: Float32Array,
  known: Uint8Array,
  width: number,
  height: number,
  channels: number,
): void {
  if (!known.includes(1)) return;
  type Level = { v: Float32Array; w: Float32Array; width: number; height: number };
  const levels: Level[] = [{ v: values, w: Float32Array.from(known), width, height }];
  while (levels.at(-1)!.width > 1 || levels.at(-1)!.height > 1) {
    const fine = levels.at(-1)!;
    const cw = Math.max(1, Math.ceil(fine.width / 2));
    const ch = Math.max(1, Math.ceil(fine.height / 2));
    const v = new Float32Array(cw * ch * channels);
    const w = new Float32Array(cw * ch);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        let sum = 0;
        const o = (y * cw + x) * channels;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const fx = x * 2 + dx;
            const fy = y * 2 + dy;
            if (fx >= fine.width || fy >= fine.height) continue;
            const fi = fy * fine.width + fx;
            const fw = fine.w[fi];
            if (fw <= 0) continue;
            sum += fw;
            for (let c = 0; c < channels; c++) v[o + c] += fine.v[fi * channels + c] * fw;
          }
        }
        if (sum > 0) for (let c = 0; c < channels; c++) v[o + c] /= sum;
        w[y * cw + x] = Math.min(1, sum);
      }
    }
    levels.push({ v, w, width: cw, height: ch });
  }
  for (let l = levels.length - 2; l >= 0; l--) {
    const fine = levels[l];
    const coarse = levels[l + 1];
    for (let y = 0; y < fine.height; y++) {
      const cy = Math.min(coarse.height - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const y0 = Math.floor(cy);
      const y1 = Math.min(coarse.height - 1, y0 + 1);
      const ty = cy - y0;
      for (let x = 0; x < fine.width; x++) {
        const i = y * fine.width + x;
        const fw = fine.w[i];
        if (fw >= 1) continue;
        const cx = Math.min(coarse.width - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
        const x0 = Math.floor(cx);
        const x1 = Math.min(coarse.width - 1, x0 + 1);
        const tx = cx - x0;
        for (let c = 0; c < channels; c++) {
          const at = (xx: number, yy: number) => coarse.v[(yy * coarse.width + xx) * channels + c];
          const up =
            (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) +
            (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty;
          fine.v[i * channels + c] = fine.v[i * channels + c] * fw + up * (1 - fw);
        }
        fine.w[i] = 1;
      }
    }
  }
}

/** Pixels around the stroke used to measure the tone difference. */
const HEAL_MARGIN = 3;

/**
 * Healing brush: paints like the clone stamp while dragging; on release the tone of the cloned
 * pixels is matched to their surroundings. The difference (destination − source, premultiplied)
 * is measured around the stroke and spread smoothly inside it, so the result keeps the source's
 * texture with the destination's colour and brightness.
 */
export class HealStroke extends CoverageStroke {
  constructor(
    options: StrokeOptions,
    private readonly source: Uint8ClampedArray,
    private readonly dx: number,
    private readonly dy: number,
    private readonly inside: Uint8Array | null = null,
    /** For a lazily read `source` (and `inside`). */
    private readonly prepareSource?: PixelPrepare,
  ) {
    super(
      options,
      cloneEffect(source, options.width, options.height, dx, dy, inside, prepareSource),
    );
  }

  private sourceOk(sx: number, sy: number): boolean {
    const { width, height } = this.options;
    if (sx < 0 || sy < 0 || sx >= width || sy >= height) return false;
    return !this.inside || this.inside[sy * width + sx] >= 128;
  }

  override finish(): PixelRect | null {
    this.flush();
    const touched = this.touched;
    if (!touched) return null;
    const { width, height, base } = this.options;
    const rect: PixelRect = {
      x0: Math.max(0, touched.x0 - HEAL_MARGIN),
      y0: Math.max(0, touched.y0 - HEAL_MARGIN),
      x1: Math.min(width, touched.x1 + HEAL_MARGIN),
      y1: Math.min(height, touched.y1 + HEAL_MARGIN),
    };
    if (isEmptyRect(rect)) return null;
    this.options.prepare?.(rect);
    this.prepareSource?.(shiftRect(rect, this.dx, this.dy));
    const rw = rect.x1 - rect.x0;
    const rh = rect.y1 - rect.y0;
    const correction = new Float32Array(rw * rh * 4);
    const known = new Uint8Array(rw * rh);
    const { source, dx, dy } = this;
    for (let y = rect.y0; y < rect.y1; y++) {
      for (let x = rect.x0; x < rect.x1; x++) {
        const sx = x + dx;
        const sy = y + dy;
        if (!this.sourceOk(sx, sy)) continue;
        // Inside the stroke the difference is unknown — that is what the fill estimates.
        if (this.coverage[y * width + x] > 0) continue;
        const k = (y - rect.y0) * rw + (x - rect.x0);
        const i = (y * width + x) * 4;
        const s = (sy * width + sx) * 4;
        const da = base[i + 3] / 255;
        const sa = source[s + 3] / 255;
        for (let c = 0; c < 3; c++) correction[k * 4 + c] = base[i + c] * da - source[s + c] * sa;
        correction[k * 4 + 3] = base[i + 3] - source[s + 3];
        known[k] = 1;
      }
    }
    pushPullFill(correction, known, rw, rh, 4);
    const healed = healedEffect(source, width, height, dx, dy, correction, rect);
    this.effect = {
      target: (x, y, t) => this.sourceOk(x + dx, y + dy) && healed.target(x, y, t),
    };
    this.render(rect);
    return rect;
  }
}

function healedEffect(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  dx: number,
  dy: number,
  correction: Float32Array,
  rect: PixelRect,
): PixelEffect {
  const rw = rect.x1 - rect.x0;
  return {
    target(x, y, t) {
      const sx = x + dx;
      const sy = y + dy;
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) return false;
      if (x < rect.x0 || y < rect.y0 || x >= rect.x1 || y >= rect.y1) return false;
      const s = (sy * width + sx) * 4;
      const k = ((y - rect.y0) * rw + (x - rect.x0)) * 4;
      const alpha = Math.min(255, Math.max(0, source[s + 3] + correction[k + 3]));
      const a = alpha / 255;
      const sa = source[s + 3] / 255;
      for (let c = 0; c < 3; c++) {
        const pm = source[s + c] * sa + correction[k + c];
        t[c] = a > 0 ? Math.min(255, Math.max(0, pm / a)) : 0;
      }
      t[3] = alpha;
      return true;
    },
  };
}
