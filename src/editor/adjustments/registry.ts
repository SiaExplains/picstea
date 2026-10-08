import type { Adjustment, AdjustmentType } from "../core/document/types";

/**
 * Adjustment catalogue: labels, defaults and parameter ranges. Drives the menus, the properties
 * panel and validation, so adding an adjustment means one entry here plus a pixel function.
 */

export interface AdjustmentParam {
  readonly key: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export interface AdjustmentDefinition {
  readonly type: AdjustmentType;
  readonly label: string;
  readonly defaults: Adjustment;
  readonly params: readonly AdjustmentParam[];
}

export const ADJUSTMENTS: readonly AdjustmentDefinition[] = [
  {
    type: "brightness-contrast",
    label: "Brightness/Contrast",
    defaults: { type: "brightness-contrast", brightness: 0, contrast: 0 },
    params: [
      { key: "brightness", label: "Brightness", min: -100, max: 100, step: 1 },
      { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1 },
    ],
  },
  {
    type: "hue-saturation",
    label: "Hue/Saturation",
    defaults: { type: "hue-saturation", hue: 0, saturation: 0, lightness: 0 },
    params: [
      { key: "hue", label: "Hue", min: -180, max: 180, step: 1 },
      { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1 },
      { key: "lightness", label: "Lightness", min: -100, max: 100, step: 1 },
    ],
  },
  {
    type: "exposure",
    label: "Exposure",
    defaults: { type: "exposure", exposure: 0, gamma: 1 },
    params: [
      { key: "exposure", label: "Exposure", min: -5, max: 5, step: 0.05 },
      { key: "gamma", label: "Gamma", min: 0.1, max: 9.99, step: 0.01 },
    ],
  },
  {
    type: "temperature-tint",
    label: "Temperature/Tint",
    defaults: { type: "temperature-tint", temperature: 0, tint: 0 },
    params: [
      { key: "temperature", label: "Temperature", min: -100, max: 100, step: 1 },
      { key: "tint", label: "Tint", min: -100, max: 100, step: 1 },
    ],
  },
  { type: "black-white", label: "Black & White", defaults: { type: "black-white" }, params: [] },
  { type: "invert", label: "Invert", defaults: { type: "invert" }, params: [] },
  {
    type: "posterize",
    label: "Posterize",
    defaults: { type: "posterize", levels: 4 },
    params: [{ key: "levels", label: "Levels", min: 2, max: 255, step: 1 }],
  },
  {
    type: "threshold",
    label: "Threshold",
    defaults: { type: "threshold", level: 128 },
    params: [{ key: "level", label: "Level", min: 0, max: 255, step: 1 }],
  },
];

export function adjustmentDefinition(type: AdjustmentType): AdjustmentDefinition {
  const def = ADJUSTMENTS.find((a) => a.type === type);
  if (!def) throw new Error(`Unknown adjustment ${type}`);
  return def;
}

/** Validate and normalise an adjustment from untrusted input; null if invalid. */
export function parseAdjustment(value: unknown): Adjustment | null {
  if (typeof value !== "object" || value === null) return null;
  const type = (value as { type?: unknown }).type;
  const def = ADJUSTMENTS.find((a) => a.type === type);
  if (!def) return null;
  const out: Record<string, unknown> = { type: def.type };
  for (const p of def.params) {
    const v = (value as Record<string, unknown>)[p.key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < p.min || v > p.max) return null;
    out[p.key] = v;
  }
  return out as Adjustment;
}
