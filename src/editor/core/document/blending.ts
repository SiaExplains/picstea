/**
 * Advanced blending (Layer Style → Blending Options, ADR-0031): Blend If and channel
 * restrictions. Pure data and maths, shared by the compositor, the validator, PSD import/export
 * and the UI.
 */

export const BLEND_IF_CHANNELS = ["gray", "red", "green", "blue"] as const;
export type BlendIfChannel = (typeof BLEND_IF_CHANNELS)[number];

/**
 * Photoshop's split sliders, 0…255: below `blackLow` hidden, fading in up to `blackHigh`, fully
 * shown up to `whiteLow`, fading out to `whiteHigh`, hidden above. Always ordered.
 */
export type BlendRange = readonly [
  blackLow: number,
  blackHigh: number,
  whiteLow: number,
  whiteHigh: number,
];

export const FULL_RANGE: BlendRange = [0, 0, 255, 255];

/** "This Layer" and "Underlying Layer" ranges for one channel. */
export interface BlendIfRanges {
  readonly current: BlendRange;
  readonly below: BlendRange;
}

/** Ranges per channel; a channel left out uses the full range. Every channel applies at once. */
export type BlendIf = { readonly [C in BlendIfChannel]?: BlendIfRanges };

/** Which colour channels the layer changes (all when absent). */
export interface ChannelSet {
  readonly r: boolean;
  readonly g: boolean;
  readonly b: boolean;
}

export const isFullRange = (r: BlendRange) =>
  r[0] === 0 && r[1] === 0 && r[2] === 255 && r[3] === 255;

/** How much of the layer shows for a channel value under one range, 0…1. */
export function rangeWeight(range: BlendRange, value: number): number {
  const [b0, b1, w0, w1] = range;
  if (value < b0 || value > w1) return 0;
  if (value < b1) return (value - b0) / (b1 - b0);
  if (value > w0) return (w1 - value) / (w1 - w0);
  return 1;
}

/** 256-entry weight tables, one per range: cheap per-pixel lookups. */
export function weightTable(range: BlendRange): Float32Array {
  const table = new Float32Array(256);
  for (let v = 0; v < 256; v++) table[v] = rangeWeight(range, v);
  return table;
}

/** Photoshop's grey for Blend If (luma). */
export const grayOf = (r: number, g: number, b: number) =>
  Math.round(r * 0.299 + g * 0.587 + b * 0.114);

export const hasChannelLimits = (c: ChannelSet | undefined) => !!c && !(c.r && c.g && c.b);

export function hasBlendIf(blendIf: BlendIf | undefined): boolean {
  if (!blendIf) return false;
  return BLEND_IF_CHANNELS.some((c) => {
    const r = blendIf[c];
    return !!r && (!isFullRange(r.current) || !isFullRange(r.below));
  });
}

export function hasAdvancedBlending(layer: {
  readonly blendIf?: BlendIf;
  readonly channels?: ChannelSet;
}): boolean {
  return hasBlendIf(layer.blendIf) || hasChannelLimits(layer.channels);
}

export class BlendingError extends Error {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(message);
    this.name = "BlendingError";
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function parseRange(value: unknown, path: string): BlendRange {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new BlendingError("must be four values", path);
  }
  const r = value.map((v) => {
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 255) {
      throw new BlendingError("values must be whole numbers from 0 to 255", path);
    }
    return v;
  });
  if (!(r[0] <= r[1] && r[1] <= r[2] && r[2] <= r[3])) {
    throw new BlendingError("values must be in order", path);
  }
  return [r[0], r[1], r[2], r[3]];
}

/** Validate Blend If from untrusted input; full ranges are dropped. Throws `BlendingError`. */
export function parseBlendIf(value: unknown, path = "blendIf"): BlendIf {
  if (!isRecord(value)) throw new BlendingError("must be an object", path);
  const out: { -readonly [C in BlendIfChannel]?: BlendIfRanges } = {};
  for (const channel of BLEND_IF_CHANNELS) {
    if (!Object.hasOwn(value, channel)) continue;
    const ranges = value[channel];
    if (!isRecord(ranges)) throw new BlendingError("must be an object", `${path}.${channel}`);
    const current = parseRange(
      Object.hasOwn(ranges, "current") ? ranges.current : undefined,
      `${path}.${channel}.current`,
    );
    const below = parseRange(
      Object.hasOwn(ranges, "below") ? ranges.below : undefined,
      `${path}.${channel}.below`,
    );
    if (!isFullRange(current) || !isFullRange(below)) out[channel] = { current, below };
  }
  return out;
}

export function parseChannels(value: unknown, path = "channels"): ChannelSet {
  if (!isRecord(value)) throw new BlendingError("must be an object", path);
  const flag = (key: "r" | "g" | "b") => {
    const v = Object.hasOwn(value, key) ? value[key] : undefined;
    if (typeof v !== "boolean") throw new BlendingError("must be true or false", `${path}.${key}`);
    return v;
  };
  return { r: flag("r"), g: flag("g"), b: flag("b") };
}
