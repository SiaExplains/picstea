import type { Rect } from "../../core/geometry/layer-geometry";
import type { ScaleHandle } from "../../core/geometry/transform-handles";
import type { Point } from "../../core/viewport/viewport";
import type { CropSettings } from "../../core/tool-settings";

/** Width ÷ height for the crop settings, or null for a free crop (ADR-0044). */
export function cropRatio(settings: CropSettings, docW: number, docH: number): number | null {
  switch (settings.ratio) {
    case "free":
      return null;
    case "original":
      return docW / docH;
    case "custom":
      return settings.ratioW > 0 && settings.ratioH > 0 ? settings.ratioW / settings.ratioH : null;
    default: {
      const [w, h] = settings.ratio.split(":").map(Number);
      return w / h;
    }
  }
}

/** A box dragged from `start` to `end`, grown on its short side to the ratio. */
export function ratioFromPoints(start: Point, end: Point, ratio: number): Rect {
  let w = Math.abs(end.x - start.x);
  let h = Math.abs(end.y - start.y);
  if (w / Math.max(h, 1e-9) > ratio) h = w / ratio;
  else w = h * ratio;
  return {
    x: end.x < start.x ? start.x - w : start.x,
    y: end.y < start.y ? start.y - h : start.y,
    width: w,
    height: h,
  };
}

/**
 * A resized box kept at the ratio: corners stay anchored on the opposite corner; edges change
 * the other side around its centre.
 */
export function constrainResize(
  start: Rect,
  resized: Rect,
  handle: ScaleHandle,
  ratio: number,
): Rect {
  if (handle === "n" || handle === "s") {
    const width = resized.height * ratio;
    return { ...resized, x: start.x + start.width / 2 - width / 2, width };
  }
  if (handle === "e" || handle === "w") {
    const height = resized.width / ratio;
    return { ...resized, y: start.y + start.height / 2 - height / 2, height };
  }
  const anchor = {
    x: handle.includes("w") ? start.x + start.width : start.x,
    y: handle.includes("n") ? start.y + start.height : start.y,
  };
  const corner = {
    x: handle.includes("w") ? resized.x : resized.x + resized.width,
    y: handle.includes("n") ? resized.y : resized.y + resized.height,
  };
  return ratioFromPoints(anchor, corner, ratio);
}

/** The largest box of the ratio centred on a w × h canvas (when a preset is picked). */
export function centredRatioBox(w: number, h: number, ratio: number): Rect {
  const width = Math.min(w, h * ratio);
  const height = width / ratio;
  return { x: (w - width) / 2, y: (h - height) / 2, width, height };
}

/** The straightening angle (degrees) for a line drawn along a horizon or a vertical edge. */
export function straightenAngle(from: Point, to: Point): number | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) < 4) return null;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Nearest axis: a line close to vertical straightens to vertical.
  while (deg > 45) deg -= 90;
  while (deg < -45) deg += 90;
  return -deg;
}
