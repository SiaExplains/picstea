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
      effects.colorOverlay?.enabled ||
      effects.innerShadow?.enabled ||
      effects.bevel?.enabled ||
      effects.gradientOverlay?.enabled
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
 * Draw a shadow cast *inside* `content`'s silhouette onto `target` (which holds the content):
 * the shadow of the inverted silhouette, offset, kept only where the content is.
 */
function drawInnerShadow(
  target: Ctx,
  content: Surface,
  createSurface: (w: number, h: number) => Surface,
  color: string,
  blur: number,
  dx: number,
  dy: number,
  operation: GlobalCompositeOperation,
): void {
  const { width, height } = content;
  // The inverse silhouette, with a margin so the shadow enters from beyond the edges.
  const margin = Math.ceil(blur * 2 + Math.abs(dx) + Math.abs(dy) + 2);
  const inverse = createSurface(width + margin * 2, height + margin * 2);
  const inv = context(inverse);
  inv.fillStyle = "#000";
  inv.fillRect(0, 0, inverse.width, inverse.height);
  inv.globalCompositeOperation = "destination-out";
  inv.drawImage(content, margin, margin);
  const shade = createSurface(width, height);
  const s = context(shade);
  const away = inverse.width + blur * 4 + Math.abs(dx) + 100;
  s.shadowColor = color;
  s.shadowBlur = blur;
  s.shadowOffsetX = dx + away;
  s.shadowOffsetY = dy;
  s.drawImage(inverse, -margin - away, -margin);
  s.shadowColor = "transparent";
  // Keep it inside the layer.
  s.globalCompositeOperation = "destination-in";
  s.drawImage(content, 0, 0);
  target.save();
  target.globalCompositeOperation = operation;
  target.drawImage(shade, 0, 0);
  target.restore();
  inverse.width = inverse.height = 0;
  shade.width = shade.height = 0;
}

/**
 * Render `content` (a layer already rendered and masked on a render-space surface) with its
 * effects into a new surface: shadow → glow → content → inner shadow and bevel → gradient and
 * colour overlays → outside stroke. `scale` is surface pixels per document pixel, so effect
 * sizes match at every zoom; `bounds` is the layer's box on the surface (for gradients).
 */
export function renderWithEffects(
  content: Surface,
  effects: LayerEffects,
  createSurface: (w: number, h: number) => Surface,
  scale = 1,
  bounds?: { x: number; y: number; width: number; height: number },
): Surface {
  const { width, height } = content;
  const out = createSurface(width, height);
  const ctx = context(out);

  const shadow = effects.dropShadow;
  if (shadow?.enabled) {
    const { dx, dy } = shadowOffset(shadow.angle, shadow.distance * scale);
    drawShadowOnly(ctx, content, rgba(shadow.color, shadow.opacity), shadow.blur * scale, dx, dy);
  }

  const glow = effects.outerGlow;
  if (glow?.enabled && glow.size > 0) {
    drawShadowOnly(ctx, content, rgba(glow.color, glow.opacity), glow.size * scale, 0, 0);
  }

  const inner = effects.innerShadow;
  const bevel = effects.bevel;
  const gradient = effects.gradientOverlay;
  const overlay = effects.colorOverlay;
  const decorated = inner?.enabled || bevel?.enabled || gradient?.enabled || overlay?.enabled;
  if (decorated) {
    const tinted = createSurface(width, height);
    const t = context(tinted);
    t.drawImage(content, 0, 0);
    if (inner?.enabled) {
      const { dx, dy } = shadowOffset(inner.angle, inner.distance * scale);
      drawInnerShadow(
        t,
        content,
        createSurface,
        rgba(inner.color, inner.opacity),
        inner.blur * scale,
        dx,
        dy,
        "source-atop",
      );
    }
    if (bevel?.enabled && bevel.size > 0) {
      // Two opposite inner shadows: light on the edges facing the light, shade on the others.
      const size = bevel.size * scale;
      const towards = shadowOffset(bevel.angle + 180, size / 2);
      const away = shadowOffset(bevel.angle, size / 2);
      const [light, dark] = bevel.direction === "up" ? [towards, away] : [away, towards];
      drawInnerShadow(
        t,
        content,
        createSurface,
        rgba(bevel.color, bevel.opacity),
        size,
        light.dx,
        light.dy,
        "screen",
      );
      drawInnerShadow(
        t,
        content,
        createSurface,
        rgba(bevel.shadowColor, bevel.shadowOpacity),
        size,
        dark.dx,
        dark.dy,
        "multiply",
      );
    }
    if (gradient?.enabled) {
      // A degenerate box (an empty layer) would give a zero-length gradient: use the surface.
      const box =
        bounds && bounds.width >= 1 && bounds.height >= 1 ? bounds : { x: 0, y: 0, width, height };
      const rad = (gradient.angle * Math.PI) / 180;
      // The gradient runs along the angle (90° = bottom to top), across the layer's box.
      const half = (Math.abs(Math.cos(rad)) * box.width + Math.abs(Math.sin(rad)) * box.height) / 2;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const dx = Math.cos(rad) * half;
      const dy = -Math.sin(rad) * half;
      const fill = t.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      for (const stop of gradient.stops) {
        fill.addColorStop(gradient.reverse ? 1 - stop.position : stop.position, stop.color);
      }
      t.save();
      t.globalCompositeOperation = "source-atop";
      t.globalAlpha = gradient.opacity;
      t.fillStyle = fill;
      t.fillRect(0, 0, width, height);
      t.restore();
    }
    if (overlay?.enabled) {
      t.save();
      t.globalCompositeOperation = "source-atop";
      t.globalAlpha = overlay.opacity;
      t.fillStyle = overlay.color;
      t.fillRect(0, 0, width, height);
      t.restore();
    }
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
    for (const p of strokeOffsets(stroke.size * scale)) r.drawImage(content, p.x, p.y);
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
