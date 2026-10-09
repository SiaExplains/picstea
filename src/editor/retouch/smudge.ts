import type { Point } from "../core/viewport/viewport";
import {
  dabBounds,
  isEmptyRect,
  tipAlpha,
  unionRect,
  type PixelRect,
  type PixelStroke,
  type StrokeOptions,
} from "./stroke";

/**
 * Smudge: the tip carries colour from where the stroke started and deposits it along the way,
 * slowly picking up the colours it passes over. `strength` 1 drags the starting colour all the
 * way; lower strengths fade sooner. Works in premultiplied space.
 */
export class SmudgeStroke implements PixelStroke {
  readonly out: Uint8ClampedArray<ArrayBuffer>;
  private readonly reach: number;
  private carried: Float32Array | null = null;
  private dirty: PixelRect | null = null;

  constructor(private readonly options: StrokeOptions) {
    const { width, height, base } = options;
    if (base.length !== width * height * 4) throw new RangeError("Pixel data does not match.");
    this.out = new Uint8ClampedArray(base);
    this.reach = Math.max(1, Math.ceil(options.radius));
  }

  dab(p: Point): void {
    const { width, height, radius, hardness, strength, selection } = this.options;
    const R = this.reach;
    const side = 2 * R + 1;
    const cx = Math.round(p.x - 0.5);
    const cy = Math.round(p.y - 0.5);
    const out = this.out;
    if (!this.carried) {
      // Pick up the colour under the tip where the stroke starts.
      this.carried = new Float32Array(side * side * 4);
      for (let oy = -R; oy <= R; oy++) {
        for (let ox = -R; ox <= R; ox++) {
          const x = Math.min(width - 1, Math.max(0, cx + ox));
          const y = Math.min(height - 1, Math.max(0, cy + oy));
          const i = (y * width + x) * 4;
          const k = ((oy + R) * side + ox + R) * 4;
          const a = out[i + 3] / 255;
          this.carried[k] = out[i] * a;
          this.carried[k + 1] = out[i + 1] * a;
          this.carried[k + 2] = out[i + 2] * a;
          this.carried[k + 3] = out[i + 3];
        }
      }
      return;
    }
    const carried = this.carried;
    for (let oy = -R; oy <= R; oy++) {
      for (let ox = -R; ox <= R; ox++) {
        const x = cx + ox;
        const y = cy + oy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        let a = tipAlpha(Math.hypot(ox, oy), radius, hardness) * strength;
        if (selection) a *= selection[y * width + x] / 255;
        if (a <= 0) continue;
        const i = (y * width + x) * 4;
        const k = ((oy + R) * side + ox + R) * 4;
        const pa = out[i + 3] / 255;
        const cur = [out[i] * pa, out[i + 1] * pa, out[i + 2] * pa, out[i + 3]];
        const mixed = cur.map((v, c) => v + (carried[k + c] - v) * a);
        // The tip picks up some of what it passes over.
        for (let c = 0; c < 4; c++)
          carried[k + c] = carried[k + c] * strength + cur[c] * (1 - strength);
        const na = mixed[3] / 255;
        out[i + 3] = mixed[3];
        for (let c = 0; c < 3; c++) out[i + c] = na > 0 ? mixed[c] / na : 0;
      }
    }
    const r = dabBounds(p, R, width, height);
    if (!isEmptyRect(r)) this.dirty = unionRect(this.dirty, r);
  }

  flush(): PixelRect | null {
    const rect = this.dirty;
    this.dirty = null;
    return rect;
  }

  finish(): PixelRect | null {
    return this.flush();
  }
}
