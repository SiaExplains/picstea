import { isHexColor } from "../document/factory";
import type {
  ColorOverlayEffect,
  DropShadowEffect,
  EffectKind,
  Layer,
  LayerEffects,
  OuterGlowEffect,
  StrokeEffect,
} from "../document/types";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";

export const DEFAULT_EFFECTS: {
  dropShadow: DropShadowEffect;
  outerGlow: OuterGlowEffect;
  stroke: StrokeEffect;
  colorOverlay: ColorOverlayEffect;
} = {
  dropShadow: { enabled: true, color: "#000000", opacity: 0.6, angle: 120, distance: 10, blur: 12 },
  outerGlow: { enabled: true, color: "#ffe680", opacity: 0.8, size: 16 },
  stroke: { enabled: true, color: "#000000", opacity: 1, size: 3 },
  colorOverlay: { enabled: true, color: "#ff0000", opacity: 1 },
};

/** Ranges shared by the command, the validator and the UI. */
export const EFFECT_LIMITS = {
  opacity: [0, 1],
  angle: [-360, 360],
  distance: [0, 1000],
  blur: [0, 250],
  size: [0, 250],
} as const;

const inRange = (v: unknown, [min, max]: readonly [number, number]) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Validate one effect's settings; returns an error message or null. */
export function checkEffect(kind: EffectKind, effect: Record<string, unknown>): string | null {
  if (typeof effect.enabled !== "boolean") return "Effect must be on or off.";
  if (typeof effect.color !== "string" || !isHexColor(effect.color))
    return "Effect colour must be a hex value.";
  if (!inRange(effect.opacity, EFFECT_LIMITS.opacity))
    return "Effect opacity must be between 0 and 100%.";
  switch (kind) {
    case "dropShadow":
      if (!inRange(effect.angle, EFFECT_LIMITS.angle)) return "Angle is out of range.";
      if (!inRange(effect.distance, EFFECT_LIMITS.distance)) return "Distance is out of range.";
      if (!inRange(effect.blur, EFFECT_LIMITS.blur)) return "Blur is out of range.";
      return null;
    case "outerGlow":
    case "stroke":
      return inRange(effect.size, EFFECT_LIMITS.size) ? null : "Size is out of range.";
    case "colorOverlay":
      return null;
  }
}

/**
 * Set (or remove, with `null`) one effect on a layer. Slider drags merge into one undo step via
 * the per-layer, per-effect merge key.
 */
export function setLayerEffect<K extends EffectKind>(
  layerId: string,
  kind: K,
  effect: LayerEffects[K] | null,
): Command {
  return {
    type: "layer.effect",
    label: "Layer Effect",
    mergeKey: `layer.effect:${layerId}:${kind}`,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      requireUnlocked(layer, doc);
      if (layer.kind === "adjustment") throw new CommandError("Adjustment layers have no effects.");
      if (effect) {
        const error = checkEffect(kind, effect as unknown as Record<string, unknown>);
        if (error) throw new CommandError(error);
      }
      const current = layer.effects ?? {};
      const next: Record<string, unknown> = { ...current };
      if (effect)
        next[kind] = { ...effect, color: (effect as { color: string }).color.toLowerCase() };
      else delete next[kind];
      const same = JSON.stringify(current[kind] ?? null) === JSON.stringify(next[kind] ?? null);
      if (same) return doc;
      const effects = Object.keys(next).length ? (next as LayerEffects) : undefined;
      const { effects: _old, ...rest } = layer;
      void _old;
      return replaceLayer(doc, (effects ? { ...rest, effects } : rest) as Layer);
    },
  };
}
