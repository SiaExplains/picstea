import { EFFECT_LIMITS } from "../effects/parse";
import type { LayerEffects } from "../effects/model";
import type { ShapeLayer } from "../document/types";
import { mapPath } from "../path/path";

/**
 * Shapes keep their size in their geometry, not in their scale (ADR-0043): after a transform the
 * scale is baked into width, height, path and corner radius, and the transform keeps only the
 * sign (flips). The stroke keeps its width unless `scaleStroke` is set ("Scale strokes &
 * effects", or the v10 migration, which keeps how old documents looked).
 */

export const MAX_STROKE_WIDTH = 1000;

export const hasShapeScale = (layer: ShapeLayer) =>
  Math.abs(layer.transform.scaleX) !== 1 || Math.abs(layer.transform.scaleY) !== 1;

export function bakeShapeScale(
  layer: ShapeLayer,
  options: { scaleStroke: boolean; scaleEffects: boolean },
): ShapeLayer {
  if (!hasShapeScale(layer)) return layer;
  const { scaleX, scaleY } = layer.transform;
  const ax = Math.abs(scaleX);
  const ay = Math.abs(scaleY);
  // One factor for line widths and effect sizes: the geometric mean of the two scales.
  const k = Math.sqrt(ax * ay);
  const stroke =
    options.scaleStroke && layer.stroke
      ? {
          ...layer.stroke,
          width: Math.min(MAX_STROKE_WIDTH, Math.max(0.01, layer.stroke.width * k)),
        }
      : layer.stroke;
  return {
    ...layer,
    width: layer.width * ax,
    height: layer.height * ay,
    ...(layer.path ? { path: mapPath(layer.path, (p) => ({ x: p.x * ax, y: p.y * ay })) } : {}),
    cornerRadius: layer.cornerRadius * Math.min(ax, ay),
    stroke,
    ...(options.scaleEffects && layer.effects ? { effects: scaleEffects(layer.effects, k) } : {}),
    transform: {
      ...layer.transform,
      scaleX: Math.sign(scaleX) || 1,
      scaleY: Math.sign(scaleY) || 1,
    },
  };
}

/** Effect distances and sizes times `k`, within the limits the parser accepts. */
export function scaleEffects(effects: LayerEffects, k: number): LayerEffects {
  const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));
  const out: Record<string, unknown> = {};
  for (const [kind, list] of Object.entries(effects)) {
    if (!Array.isArray(list)) continue;
    out[kind] = list.map((effect: Record<string, unknown>) => {
      const next: Record<string, unknown> = { ...effect };
      if (typeof effect.distance === "number") {
        next.distance = clamp(effect.distance * k, EFFECT_LIMITS.distance);
      }
      if (typeof effect.size === "number") {
        const limits = kind === "stroke" ? EFFECT_LIMITS.strokeSize : EFFECT_LIMITS.size;
        next.size = clamp(effect.size * k, limits);
      }
      return next;
    });
  }
  return out as LayerEffects;
}
