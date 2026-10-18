import type { PixelPrepare } from "./stroke";

/**
 * Spot Healing (ADR-0027): where to copy texture from, without an Alt-click. Eight candidate
 * patches around the spot (1.5 brush widths away) are compared with the ring right around it; the
 * one whose average colour matches that ring best — and that lies inside the image — wins. The
 * healing pass then matches its tone to the surroundings.
 */
export function chooseSpotOffset(
  base: Uint8ClampedArray,
  width: number,
  height: number,
  center: { x: number; y: number },
  radius: number,
  prepare?: PixelPrepare,
): { dx: number; dy: number } {
  const r = Math.max(1, Math.round(radius));
  const mean = (cx: number, cy: number, inner: number, outer: number) => {
    const x0 = Math.max(0, Math.floor(cx - outer));
    const y0 = Math.max(0, Math.floor(cy - outer));
    const x1 = Math.min(width, Math.ceil(cx + outer + 1));
    const y1 = Math.min(height, Math.ceil(cy + outer + 1));
    if (x1 <= x0 || y1 <= y0) return null;
    prepare?.({ x0, y0, x1, y1 });
    let n = 0;
    const sum = [0, 0, 0];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d < inner || d > outer) continue;
        const i = (y * width + x) * 4;
        if (base[i + 3] === 0) continue;
        sum[0] += base[i];
        sum[1] += base[i + 1];
        sum[2] += base[i + 2];
        n++;
      }
    }
    return n ? sum.map((v) => v / n) : null;
  };
  const ring = mean(center.x, center.y, r, r * 1.6);
  const distance = Math.round(r * 3);
  let best: { dx: number; dy: number; score: number } | null = null;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const dx = Math.round(Math.cos(a) * distance);
    const dy = Math.round(Math.sin(a) * distance);
    const cx = center.x + dx;
    const cy = center.y + dy;
    // The whole patch must be inside the image.
    if (cx - r < 0 || cy - r < 0 || cx + r > width || cy + r > height) continue;
    const patch = mean(cx, cy, 0, r);
    if (!patch) continue;
    const score = ring
      ? Math.abs(patch[0] - ring[0]) + Math.abs(patch[1] - ring[1]) + Math.abs(patch[2] - ring[2])
      : k;
    if (!best || score < best.score) best = { dx, dy, score };
  }
  return best ? { dx: best.dx, dy: best.dy } : { dx: distance, dy: 0 };
}
