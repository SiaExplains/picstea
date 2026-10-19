import {
  BLEND_IF_CHANNELS,
  FULL_RANGE,
  hasBlendIf,
  hasChannelLimits,
  parseBlendIf,
  type BlendIf,
  type BlendRange,
  type ChannelSet,
} from "../../core/document/blending";
import type { ByteReader, ByteWriter } from "../binary/bytes";

/**
 * Blend If and channel restrictions in PSD files (ADR-0031). The layer record's blending ranges
 * hold a source ("This Layer") and destination ("Underlying Layer") range for the composite grey
 * and then for each colour channel, four bytes each: black low, black high, white low, white
 * high. The `brst` block lists the channels a layer may not change.
 */
export interface PsdBlending {
  /** [source, destination] for grey, red, green, blue. */
  readonly ranges: readonly (readonly [BlendRange, BlendRange])[];
  /** Channel indices (0 red, 1 green, 2 blue) the layer does not change. */
  readonly restricted: readonly number[];
}

function readRange(r: ByteReader): BlendRange {
  const v = [r.u8(), r.u8(), r.u8(), r.u8()].sort((a, b) => a - b);
  return [v[0], v[1], v[2], v[3]];
}

/** Read the blending ranges section (already cut to its length). */
export function readBlendingRanges(r: ByteReader): [BlendRange, BlendRange][] {
  const out: [BlendRange, BlendRange][] = [];
  while (r.remaining >= 8 && out.length < 4) out.push([readRange(r), readRange(r)]);
  return out;
}

/** Restricted channel numbers from a `brst` block. */
export function readRestrictedChannels(r: ByteReader): number[] {
  const out: number[] = [];
  while (r.remaining >= 4 && out.length < 8) {
    const channel = r.u32();
    if (channel <= 2 && !out.includes(channel)) out.push(channel);
  }
  return out;
}

const writeRange = (w: ByteWriter, range: BlendRange) => {
  for (const v of range) w.u8(v);
};

/** The blending ranges section with its length; a full-range section when there are none. */
export function writeBlendingRanges(w: ByteWriter, blending: PsdBlending | undefined): void {
  if (!blending?.ranges.length) {
    w.u32(0);
    return;
  }
  w.u32(blending.ranges.length * 8);
  for (const [source, destination] of blending.ranges) {
    writeRange(w, source);
    writeRange(w, destination);
  }
}

export function encodeRestrictedChannels(restricted: readonly number[], w: ByteWriter): void {
  for (const c of restricted) w.u32(c);
}

/** A layer's Blend If and channels for a PSD record (undefined when it uses neither). */
export function psdBlendingOf(layer: {
  readonly blendIf?: BlendIf;
  readonly channels?: ChannelSet;
}): PsdBlending | undefined {
  const blendIf = hasBlendIf(layer.blendIf) ? layer.blendIf : undefined;
  const limited = hasChannelLimits(layer.channels);
  if (!blendIf && !limited) return undefined;
  return {
    ranges: blendIf
      ? BLEND_IF_CHANNELS.map((c) => {
          const r = blendIf[c];
          return [r?.current ?? FULL_RANGE, r?.below ?? FULL_RANGE] as const;
        })
      : [],
    restricted: limited
      ? (["r", "g", "b"] as const).flatMap((key, i) => (layer.channels![key] ? [] : [i]))
      : [],
  };
}

/** Blend If and channels for an imported layer; anything invalid is left out. */
export function layerBlendingOf(blending: PsdBlending | undefined): {
  blendIf?: BlendIf;
  channels?: ChannelSet;
} {
  if (!blending) return {};
  const raw: Record<string, unknown> = {};
  // Grey always; colour channels only when all three are present (RGB files).
  const channels = blending.ranges.length >= 4 ? BLEND_IF_CHANNELS : (["gray"] as const);
  channels.forEach((c, i) => {
    const r = blending.ranges[i];
    if (r) raw[c] = { current: r[0], below: r[1] };
  });
  let blendIf: BlendIf | undefined;
  try {
    blendIf = parseBlendIf(raw);
  } catch {
    blendIf = undefined;
  }
  const set: ChannelSet = {
    r: !blending.restricted.includes(0),
    g: !blending.restricted.includes(1),
    b: !blending.restricted.includes(2),
  };
  return {
    ...(blendIf && hasBlendIf(blendIf) ? { blendIf } : {}),
    ...(hasChannelLimits(set) ? { channels: set } : {}),
  };
}
