import { rgba } from "../../core/color";
import type { LayerEffects } from "../../core/document/types";

/**
 * Layer effects built from the layer's rendered silhouette (ADR-0008). Everything is drawn with
 * standard 2D canvas operations so it behaves the same in every engine and in exports.
 */

type Surface = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D;

export function hasActiveEffects(effects: LayerEffects | undefined): boolean {
  return (
    !!effects &&
    !!(
      effects.dropShadow?.enabled ||
      effects.outerGlow?.enabled ||
      effects.stroke?.enabled ||
      effects.colorOverlay?.enabled
    )
  );
}

/** Shadow offset for a light angle in degrees (counter-clockwise from +x; shadow falls opposite). */
export function shadowOffset(angle: number, distance: number): { dx: number; dy: number } {
  const rad = (angle * Math.PI) / 180;
  return { dx: -Math.cos(rad) * distance, dy: Math.sin(rad) * distance };
}

/** Points on rings used to dilate a silhouette for an outside stroke. */
export function strokeOffsets(size: number): { x: number; y: number }[] {
  if (size <= 0) return [];
  const rings = size <= 2 ? [size] : [size, (size * 2) / 3, size / 3];
  const out: { x: number; y: number }[] = [];
  for (const r of rings) {
    const n = Math.min(48, Math.max(8, Math.ceil((2 * Math.PI * r) / 2)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
  }
  return out;
}

function context(surface: Surface): Ctx {
  const ctx = surface.getContext("2d") as Ctx | null;
  if (!ctx) throw new Error("2D canvas is not available.");
  return ctx;
}

/** Draw only the shadow of `source` by placing the image off-canvas and offsetting its shadow. */
function drawShadowOnly(
  ctx: Ctx,
  source: Surface,
  color: string,
  blur: number,
  dx: number,
  dy: number,
): void {
  const away = source.width + blur * 4 + Math.abs(dx) + 100;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = dx + away;
  ctx.shadowOffsetY = dy;
  ctx.drawImage(source, -away, 0);
  ctx.restore();
}

/**
 * Render `content` (a layer already rendered and masked on a document-sized surface) with its
 * effects into a new surface: shadow → glow → content (+ colour overlay) → outside stroke.
 */
export function renderWithEffects(
  content: Surface,
  effects: LayerEffects,
  createSurface: (w: number, h: number) => Surface,
): Surface {
  const { width, height } = content;
  const out = createSurface(width, height);
  const ctx = context(out);

  const shadow = effects.dropShadow;
  if (shadow?.enabled) {
    const { dx, dy } = shadowOffset(shadow.angle, shadow.distance);
    drawShadowOnly(ctx, content, rgba(shadow.color, shadow.opacity), shadow.blur, dx, dy);
  }

  const glow = effects.outerGlow;
  if (glow?.enabled && glow.size > 0) {
    drawShadowOnly(ctx, content, rgba(glow.color, glow.opacity), glow.size, 0, 0);
  }

  const overlay = effects.colorOverlay;
  if (overlay?.enabled) {
    const tinted = createSurface(width, height);
    const t = context(tinted);
    t.drawImage(content, 0, 0);
    t.globalCompositeOperation = "source-atop";
    t.globalAlpha = overlay.opacity;
    t.fillStyle = overlay.color;
    t.fillRect(0, 0, width, height);
    ctx.drawImage(tinted, 0, 0);
    tinted.width = 0;
    tinted.height = 0;
  } else {
    ctx.drawImage(content, 0, 0);
  }

  const stroke = effects.stroke;
  if (stroke?.enabled && stroke.size > 0) {
    const ring = createSurface(width, height);
    const r = context(ring);
    for (const p of strokeOffsets(stroke.size)) r.drawImage(content, p.x, p.y);
    r.globalCompositeOperation = "source-in";
    r.fillStyle = stroke.color;
    r.fillRect(0, 0, width, height);
    // Outside stroke: remove the area covered by the layer itself.
    r.globalCompositeOperation = "destination-out";
    r.drawImage(content, 0, 0);
    ctx.globalAlpha = stroke.opacity;
    ctx.drawImage(ring, 0, 0);
    ctx.globalAlpha = 1;
    ring.width = 0;
    ring.height = 0;
  }
  return out;
}
