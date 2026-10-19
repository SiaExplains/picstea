import {
  DEFAULT_EFFECTS,
  effectList,
  maxCopies,
  type EffectByKind,
  type EffectKind,
  type GlobalLight,
  type LayerEffects,
} from "../effects/model";
import { EffectError, parseEffect, parseGlobalLight, parseLayerEffects } from "../effects/parse";
import {
  BlendingError,
  hasBlendIf,
  hasChannelLimits,
  parseBlendIf,
  parseChannels,
  type BlendIf,
  type ChannelSet,
} from "../document/blending";
import type { EditorDocument, Layer } from "../document/types";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";

/** Layer style commands (ADR-0030). Every effect is validated by `parse.ts` before it is stored. */

export { DEFAULT_EFFECTS } from "../effects/model";
export { EFFECT_LIMITS } from "../effects/parse";

function styledLayer(doc: EditorDocument, layerId: string): Layer {
  const layer = requireLayer(doc, layerId);
  requireUnlocked(layer, doc);
  if (layer.kind === "adjustment") throw new CommandError("Adjustment layers have no effects.");
  return layer;
}

const asCommandError = <T>(run: () => T): T => {
  try {
    return run();
  } catch (error) {
    if (error instanceof EffectError) {
      throw new CommandError(`Layer style: ${error.path} ${error.message}.`);
    }
    throw error;
  }
};

/** The layer with `effects` set (or removed when empty). */
function withEffects(doc: EditorDocument, layer: Layer, effects: LayerEffects): EditorDocument {
  const next: Record<string, unknown> = {};
  for (const [kind, list] of Object.entries(effects)) if (list && list.length) next[kind] = list;
  const has = Object.keys(next).length > 0;
  if (JSON.stringify(layer.effects ?? null) === JSON.stringify(has ? next : null)) return doc;
  const rest: Record<string, unknown> = { ...layer };
  delete rest.effects;
  return replaceLayer(doc, (has ? { ...rest, effects: next } : rest) as unknown as Layer);
}

/**
 * Set (or remove, with `null`) copy `index` of one effect. Index = current length adds a copy.
 * Slider drags merge into one undo step per layer, effect and copy.
 */
export function setLayerEffect<K extends EffectKind>(
  layerId: string,
  kind: K,
  effect: EffectByKind[K] | null,
  index = 0,
): Command {
  return {
    type: "layer.effect",
    label: "Layer Effect",
    mergeKey: `layer.effect:${layerId}:${kind}:${index}`,
    apply(doc) {
      const layer = styledLayer(doc, layerId);
      const list = [...effectList(layer.effects, kind)];
      if (!Number.isInteger(index) || index < 0 || index > list.length) {
        throw new CommandError("That effect no longer exists.");
      }
      if (effect === null) {
        if (index === list.length) return doc;
        list.splice(index, 1);
      } else {
        if (index === list.length && list.length >= maxCopies(kind)) {
          throw new CommandError(`A layer can have at most ${maxCopies(kind)} of this effect.`);
        }
        list[index] = asCommandError(() => parseEffect(kind, effect));
      }
      return withEffects(doc, layer, { ...layer.effects, [kind]: list });
    },
  };
}

/** Photoshop's "+": another copy of an effect, with default settings, above copy `after`. */
export function addEffectCopy(layerId: string, kind: EffectKind, after: number): Command {
  return {
    type: "layer.effect.add",
    label: "Add Effect",
    apply(doc) {
      const layer = styledLayer(doc, layerId);
      const list = [...effectList(layer.effects, kind)];
      if (list.length >= maxCopies(kind)) {
        throw new CommandError(`A layer can have at most ${maxCopies(kind)} of this effect.`);
      }
      list.splice(Math.min(list.length, Math.max(0, after + 1)), 0, DEFAULT_EFFECTS[kind] as never);
      return withEffects(doc, layer, { ...layer.effects, [kind]: list });
    },
  };
}

/** Move copy `from` of an effect to position `to` (the ⇕ buttons). */
export function moveEffectCopy(
  layerId: string,
  kind: EffectKind,
  from: number,
  to: number,
): Command {
  return {
    type: "layer.effect.move",
    label: "Reorder Effects",
    apply(doc) {
      const layer = styledLayer(doc, layerId);
      const list = [...effectList(layer.effects, kind)];
      if (!list[from] || to < 0 || to >= list.length) return doc;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return withEffects(doc, layer, { ...layer.effects, [kind]: list });
    },
  };
}

/** Replace the whole style (a saved style, Clear Layer Style). `null` removes every effect. */
export function setLayerStyle(
  layerId: string,
  effects: LayerEffects | null,
  label = "Layer Style",
): Command {
  return {
    type: "layer.style",
    label,
    apply(doc) {
      const layer = styledLayer(doc, layerId);
      const parsed = effects ? asCommandError(() => parseLayerEffects(effects)) : {};
      return withEffects(doc, layer, parsed);
    },
  };
}

/** Blending Options → Fill: fades the layer's content but not its effects. */
export function setFillOpacity(layerId: string, fillOpacity: number): Command {
  return {
    type: "layer.fill",
    label: "Fill Opacity",
    mergeKey: `layer.fill:${layerId}`,
    apply(doc) {
      const layer = styledLayer(doc, layerId);
      if (!Number.isFinite(fillOpacity) || fillOpacity < 0 || fillOpacity > 1) {
        throw new CommandError("Fill must be between 0 and 100%.");
      }
      const current = layer.fillOpacity ?? 1;
      if (current === fillOpacity) return doc;
      const rest: Record<string, unknown> = { ...layer };
      delete rest.fillOpacity;
      return replaceLayer(
        doc,
        (fillOpacity === 1 ? rest : { ...rest, fillOpacity }) as unknown as Layer,
      );
    },
  };
}

/** The document's global light, shared by every effect with "Use global angle". */
export function setGlobalLight(light: GlobalLight): Command {
  return {
    type: "document.globalLight",
    label: "Global Light",
    mergeKey: "document.globalLight",
    apply(doc) {
      const parsed = asCommandError(() => parseGlobalLight(light));
      const current = doc.globalLight;
      if (current && current.angle === parsed.angle && current.altitude === parsed.altitude) {
        return doc;
      }
      return { ...doc, globalLight: parsed };
    },
  };
}

/** The layer with an optional field set, or removed when `value` is undefined. */
function withField<K extends "blendIf" | "channels">(
  doc: EditorDocument,
  layer: Layer,
  key: K,
  value: Layer[K] | undefined,
): EditorDocument {
  if (JSON.stringify(layer[key] ?? null) === JSON.stringify(value ?? null)) return doc;
  const rest: Record<string, unknown> = { ...layer };
  delete rest[key];
  return replaceLayer(
    doc,
    (value === undefined ? rest : { ...rest, [key]: value }) as unknown as Layer,
  );
}

const asBlendingError = <T>(run: () => T): T => {
  try {
    return run();
  } catch (error) {
    if (error instanceof BlendingError) {
      throw new CommandError(`Blending options: ${error.path} ${error.message}.`);
    }
    throw error;
  }
};

/** Blending Options → Blend If (ADR-0031). `null` removes every limit. Drags merge. */
export function setBlendIf(layerId: string, blendIf: BlendIf | null): Command {
  return {
    type: "layer.blendIf",
    label: "Blend If",
    mergeKey: `layer.blendIf:${layerId}`,
    apply(doc) {
      const layer = styledLayer(doc, layerId);
      const parsed = blendIf ? asBlendingError(() => parseBlendIf(blendIf)) : undefined;
      return withField(doc, layer, "blendIf", hasBlendIf(parsed) ? parsed : undefined);
    },
  };
}

/** Blending Options → Channels: which of R, G and B the layer changes. */
export function setLayerChannels(layerId: string, channels: ChannelSet): Command {
  return {
    type: "layer.channels",
    label: "Blending Channels",
    apply(doc) {
      const layer = styledLayer(doc, layerId);
      const parsed = asBlendingError(() => parseChannels(channels));
      return withField(doc, layer, "channels", hasChannelLimits(parsed) ? parsed : undefined);
    },
  };
}
