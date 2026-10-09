import { parseHexColor } from "../core/color";
import type {
  Adjustment,
  AdjustmentType,
  ColorBalanceRange,
  MixerRow,
} from "../core/document/types";
import { parseGradientStops } from "./gradient";
import {
  NEUTRAL_CURVE,
  NEUTRAL_LEVELS,
  parseCurve,
  parseLevelsChannel,
  parseToneChannels,
} from "./tone";

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
  /**
   * Validates settings that aren't plain numbers (Levels, Curves). When present it replaces the
   * range check over `params`; it receives the untrusted value and returns the settings or null.
   */
  readonly parse?: (value: Record<string, unknown>) => Adjustment | null;
}

const own = (o: object, key: string): unknown =>
  Object.hasOwn(o, key) ? (o as Record<string, unknown>)[key] : undefined;

const inRange = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

export const NEUTRAL_BALANCE: ColorBalanceRange = { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };

function parseBalance(value: unknown): ColorBalanceRange | null {
  if (typeof value !== "object" || value === null) return null;
  const out: Record<string, number> = {};
  for (const key of ["cyanRed", "magentaGreen", "yellowBlue"]) {
    const v = own(value, key);
    if (!inRange(v, -100, 100)) return null;
    out[key] = v as number;
  }
  return out as unknown as ColorBalanceRange;
}

export const MIXER_LIMIT = 200;

function parseMixerRow(value: unknown): MixerRow | null {
  if (typeof value !== "object" || value === null) return null;
  const out: Record<string, number> = {};
  for (const key of ["red", "green", "blue", "constant"]) {
    const v = own(value, key);
    if (!inRange(v, -MIXER_LIMIT, MIXER_LIMIT)) return null;
    out[key] = v as number;
  }
  return out as unknown as MixerRow;
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
  {
    type: "levels",
    label: "Levels",
    defaults: {
      type: "levels",
      rgb: NEUTRAL_LEVELS,
      red: NEUTRAL_LEVELS,
      green: NEUTRAL_LEVELS,
      blue: NEUTRAL_LEVELS,
    },
    params: [],
    parse: (value) => {
      const channels = parseToneChannels(value, parseLevelsChannel);
      return channels && { type: "levels", ...channels };
    },
  },
  {
    type: "curves",
    label: "Curves",
    defaults: {
      type: "curves",
      rgb: NEUTRAL_CURVE,
      red: NEUTRAL_CURVE,
      green: NEUTRAL_CURVE,
      blue: NEUTRAL_CURVE,
    },
    params: [],
    parse: (value) => {
      const channels = parseToneChannels(value, parseCurve);
      return channels && { type: "curves", ...channels };
    },
  },
  {
    type: "vibrance",
    label: "Vibrance",
    defaults: { type: "vibrance", vibrance: 0, saturation: 0 },
    params: [
      { key: "vibrance", label: "Vibrance", min: -100, max: 100, step: 1 },
      { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1 },
    ],
  },
  {
    type: "color-balance",
    label: "Color Balance",
    defaults: {
      type: "color-balance",
      shadows: NEUTRAL_BALANCE,
      midtones: NEUTRAL_BALANCE,
      highlights: NEUTRAL_BALANCE,
      preserveLuminosity: true,
    },
    params: [],
    parse: (value) => {
      const ranges = (["shadows", "midtones", "highlights"] as const).map((key) =>
        parseBalance(own(value, key)),
      );
      const preserve = own(value, "preserveLuminosity");
      if (ranges.some((r) => !r) || typeof preserve !== "boolean") return null;
      return {
        type: "color-balance",
        shadows: ranges[0]!,
        midtones: ranges[1]!,
        highlights: ranges[2]!,
        preserveLuminosity: preserve,
      };
    },
  },
  {
    type: "photo-filter",
    label: "Photo Filter",
    defaults: { type: "photo-filter", color: "#ec8a00", density: 25, preserveLuminosity: true },
    params: [{ key: "density", label: "Density", min: 1, max: 100, step: 1 }],
    parse: (value) => {
      const raw = own(value, "color");
      const color = typeof raw === "string" ? parseHexColor(raw) : null;
      const density = own(value, "density");
      const preserve = own(value, "preserveLuminosity");
      if (!color || !inRange(density, 1, 100) || typeof preserve !== "boolean") return null;
      return {
        type: "photo-filter",
        color,
        density: density as number,
        preserveLuminosity: preserve,
      };
    },
  },
  {
    type: "channel-mixer",
    label: "Channel Mixer",
    defaults: {
      type: "channel-mixer",
      red: { red: 100, green: 0, blue: 0, constant: 0 },
      green: { red: 0, green: 100, blue: 0, constant: 0 },
      blue: { red: 0, green: 0, blue: 100, constant: 0 },
      monochrome: false,
    },
    params: [],
    parse: (value) => {
      const rows = (["red", "green", "blue"] as const).map((key) => parseMixerRow(own(value, key)));
      const monochrome = own(value, "monochrome");
      if (rows.some((r) => !r) || typeof monochrome !== "boolean") return null;
      return {
        type: "channel-mixer",
        red: rows[0]!,
        green: rows[1]!,
        blue: rows[2]!,
        monochrome,
      };
    },
  },
  {
    type: "gradient-map",
    label: "Gradient Map",
    defaults: {
      type: "gradient-map",
      stops: [
        { position: 0, color: "#000000" },
        { position: 1, color: "#ffffff" },
      ],
      reverse: false,
    },
    params: [],
    parse: (value) => {
      const stops = parseGradientStops(own(value, "stops"));
      const reverse = own(value, "reverse");
      if (!stops || typeof reverse !== "boolean") return null;
      return { type: "gradient-map", stops, reverse };
    },
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
  const type = own(value, "type");
  const def = ADJUSTMENTS.find((a) => a.type === type);
  if (!def) return null;
  if (def.parse) return def.parse(value as Record<string, unknown>);
  const out: Record<string, unknown> = { type: def.type };
  for (const p of def.params) {
    const v = own(value, p.key);
    if (typeof v !== "number" || !Number.isFinite(v) || v < p.min || v > p.max) return null;
    out[p.key] = v;
  }
  return out as Adjustment;
}
