import {
  BLEND_IF_CHANNELS,
  grayOf,
  hasChannelLimits,
  isFullRange,
  weightTable,
  type BlendIf,
  type ChannelSet,
} from "../../core/document/blending";

/**
 * Blend If and channel restrictions (ADR-0031), applied after a layer has been drawn normally:
 * each pixel is mixed back towards what was beneath it.
 *
 * - `before`: the backdrop (RGBA) before the layer was drawn.
 * - `after`: the same pixels with the layer drawn; overwritten with the result.
 * - `own`: the layer's own pixels, for the "This Layer" ranges.
 *
 * The weight is the product of every active range: "This Layer" looks at the layer's colour,
 * "Underlying Layer" at the backdrop's. Mixing is done with premultiplied alpha. Channels the
 * layer may not change keep the backdrop's value.
 */
export function mixAdvancedBlending(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  own: Uint8ClampedArray,
  blendIf: BlendIf | undefined,
  channels: ChannelSet | undefined,
): void {
  const tables = BLEND_IF_CHANNELS.map((channel) => {
    const r = blendIf?.[channel];
    return {
      current: r && !isFullRange(r.current) ? weightTable(r.current) : null,
      below: r && !isFullRange(r.below) ? weightTable(r.below) : null,
    };
  });
  const limited = hasChannelLimits(channels);
  const keep = [!channels?.r, !channels?.g, !channels?.b];

  const value = (data: Uint8ClampedArray, i: number, channel: number) =>
    channel === 0 ? grayOf(data[i], data[i + 1], data[i + 2]) : data[i + channel - 1];

  for (let i = 0; i < after.length; i += 4) {
    if (
      after[i] === before[i] &&
      after[i + 1] === before[i + 1] &&
      after[i + 2] === before[i + 2] &&
      after[i + 3] === before[i + 3]
    ) {
      continue;
    }
    let w = 1;
    for (let c = 0; c < 4 && w > 0; c++) {
      const t = tables[c];
      // Where the layer has no pixels of its own (e.g. a shadow), "This Layer" doesn't limit.
      if (t.current && own[i + 3] > 0) w *= t.current[value(own, i, c)];
      if (t.below) w *= t.below[value(before, i, c)];
    }
    if (w < 1) {
      const ab = before[i + 3] / 255;
      const aa = after[i + 3] / 255;
      const a = ab + (aa - ab) * w;
      for (let c = 0; c < 3; c++) {
        const pb = before[i + c] * ab;
        const pa = after[i + c] * aa;
        after[i + c] = a > 0 ? (pb + (pa - pb) * w) / a : 0;
      }
      after[i + 3] = a * 255;
    }
    if (limited) {
      for (let c = 0; c < 3; c++) if (keep[c]) after[i + c] = before[i + c];
    }
  }
}
