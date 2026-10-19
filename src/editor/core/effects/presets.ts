import { DEFAULT_EFFECTS, contourPreset, type LayerEffects } from "./model";
import { parseLayerEffects } from "./parse";

/**
 * Saved layer styles (Layer Style → New Style…, ADR-0030). They belong to the user, not to a
 * document, so they live outside the document store; the UI keeps them in this browser.
 */
export interface LayerStylePreset {
  readonly id: string;
  readonly name: string;
  readonly effects: LayerEffects;
  /** Blending Options → Fill, when the style changes it. */
  readonly fillOpacity?: number;
}

export const MAX_STYLE_PRESETS = 200;
export const MAX_STYLE_NAME_LENGTH = 64;

const D = DEFAULT_EFFECTS;

/** A few ready-made styles, always listed before the user's own. */
export const BUILT_IN_STYLES: readonly LayerStylePreset[] = [
  {
    id: "builtin-soft-shadow",
    name: "Soft shadow",
    effects: { dropShadow: [{ ...D.dropShadow, distance: 8, size: 16, opacity: 0.45 }] },
  },
  {
    id: "builtin-outline",
    name: "Outline",
    effects: { stroke: [{ ...D.stroke, size: 4 }] },
  },
  {
    id: "builtin-emboss",
    name: "Embossed",
    effects: { bevel: [{ ...D.bevel, size: 10, depth: 1.5 }] },
  },
  {
    id: "builtin-pressed",
    name: "Pressed in",
    effects: {
      innerShadow: [{ ...D.innerShadow, distance: 3, size: 8, opacity: 0.6 }],
      bevel: [{ ...D.bevel, direction: "down", size: 4, highlightOpacity: 0.4 }],
    },
  },
  {
    id: "builtin-neon",
    name: "Neon",
    effects: {
      outerGlow: [
        { ...D.outerGlow, fill: { kind: "color", color: "#22d3ee" }, size: 18, opacity: 0.9 },
      ],
      innerGlow: [{ ...D.innerGlow, fill: { kind: "color", color: "#ffffff" }, size: 4 }],
      colorOverlay: [{ ...D.colorOverlay, color: "#0891b2" }],
    },
  },
  {
    id: "builtin-gold",
    name: "Gold",
    effects: {
      gradientOverlay: [
        {
          ...D.gradientOverlay,
          stops: [
            { position: 0, color: "#7a5418" },
            { position: 0.5, color: "#f6d77a" },
            { position: 1, color: "#9c6b1f" },
          ],
        },
      ],
      bevel: [
        {
          ...D.bevel,
          size: 6,
          glossContour: contourPreset("ring"),
          highlightOpacity: 0.9,
          shadowColor: "#4a2f05",
        },
      ],
      dropShadow: [{ ...D.dropShadow, opacity: 0.5 }],
    },
  },
  {
    id: "builtin-glass",
    name: "Glass",
    fillOpacity: 0.15,
    effects: {
      stroke: [{ ...D.stroke, size: 1, fill: { kind: "color", color: "#ffffff" }, opacity: 0.7 }],
      innerGlow: [
        { ...D.innerGlow, fill: { kind: "color", color: "#ffffff" }, size: 10, opacity: 0.5 },
      ],
      dropShadow: [{ ...D.dropShadow, size: 20, distance: 10, opacity: 0.35 }],
    },
  },
];

/** Read stored styles, dropping anything malformed; [] when the value is not a list. */
export function parseStylePresets(value: unknown, newId: () => string): LayerStylePreset[] {
  if (!Array.isArray(value)) return [];
  const out: LayerStylePreset[] = [];
  const seen = new Set<string>();
  for (const item of value.slice(0, MAX_STYLE_PRESETS)) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const name = Object.hasOwn(o, "name") && typeof o.name === "string" ? o.name.trim() : "";
    if (!name) continue;
    let effects: LayerEffects;
    try {
      effects = parseLayerEffects(Object.hasOwn(o, "effects") ? o.effects : undefined);
    } catch {
      continue;
    }
    const fill = Object.hasOwn(o, "fillOpacity") ? o.fillOpacity : undefined;
    const rawId = Object.hasOwn(o, "id") && typeof o.id === "string" ? o.id : "";
    const id = /^[\w-]{1,64}$/.test(rawId) && !seen.has(rawId) ? rawId : newId();
    seen.add(id);
    out.push({
      id,
      name: name.slice(0, MAX_STYLE_NAME_LENGTH),
      effects,
      ...(typeof fill === "number" && Number.isFinite(fill) && fill >= 0 && fill < 1
        ? { fillOpacity: fill }
        : {}),
    });
  }
  return out;
}
