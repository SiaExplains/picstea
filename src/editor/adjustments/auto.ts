import type { Adjustment, LevelsChannel } from "../core/document/types";
import { NEUTRAL_LEVELS } from "./tone";

/**
 * Image → Auto Tone, Auto Contrast and Auto Color (ADR-0033): a Levels adjustment computed from
 * the image's histogram, added as an adjustment layer so it stays editable.
 *
 * - Auto Tone stretches each colour channel on its own (it can change the colour cast).
 * - Auto Contrast stretches all channels together (colours keep their balance).
 * - Auto Color stretches each channel and then sets each channel's midtone so the average colour
 *   becomes neutral grey.
 *
 * The darkest and lightest 0.1% of pixels are ignored, as in Photoshop, so a few stray pixels
 * don't stop the stretch.
 */

export type AutoKind = "tone" | "contrast" | "color";

export const AUTO_NAMES: Record<AutoKind, string> = {
  tone: "Auto Tone",
  contrast: "Auto Contrast",
  color: "Auto Color",
};

const CLIP = 0.001;

interface Histograms {
  readonly red: Float64Array;
  readonly green: Float64Array;
  readonly blue: Float64Array;
  readonly total: number;
}

/** Channel histograms, each pixel weighted by its alpha. */
export function histograms(data: Uint8ClampedArray): Histograms {
  const red = new Float64Array(256);
  const green = new Float64Array(256);
  const blue = new Float64Array(256);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a === 0) continue;
    red[data[i]] += a;
    green[data[i + 1]] += a;
    blue[data[i + 2]] += a;
    total += a;
  }
  return { red, green, blue, total };
}

/** The levels at which `clip` of the histogram lies below / above. */
export function clippedRange(hist: Float64Array, total: number, clip = CLIP): [number, number] {
  const limit = total * clip;
  let low = 0;
  for (let sum = 0; low < 255; low++) {
    sum += hist[low];
    if (sum > limit) break;
  }
  let high = 255;
  for (let sum = 0; high > 0; high--) {
    sum += hist[high];
    if (sum > limit) break;
  }
  return [low, high];
}

/** Levels that stretch [low, high] to the full range (identity when it can't stretch). */
function stretch(low: number, high: number, gamma = 1): LevelsChannel {
  if (high - low < 2 || (low === 0 && high === 255 && gamma === 1)) return NEUTRAL_LEVELS;
  return { ...NEUTRAL_LEVELS, inBlack: low, inWhite: high, gamma };
}

/** Mean level of a channel after stretching [low, high], 0…1. */
function stretchedMean(hist: Float64Array, total: number, low: number, high: number): number {
  let sum = 0;
  for (let v = 0; v < 256; v++) {
    sum += hist[v] * Math.min(1, Math.max(0, (v - low) / Math.max(1, high - low)));
  }
  return total > 0 ? sum / total : 0.5;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** The Levels adjustment for an auto command, or null when the image needs no change. */
export function autoLevels(kind: AutoKind, data: Uint8ClampedArray): Adjustment | null {
  const h = histograms(data);
  if (h.total === 0) return null;
  const channels = [h.red, h.green, h.blue] as const;
  let rgb: LevelsChannel = NEUTRAL_LEVELS;
  let per: LevelsChannel[] = [NEUTRAL_LEVELS, NEUTRAL_LEVELS, NEUTRAL_LEVELS];

  if (kind === "contrast") {
    const ranges = channels.map((c) => clippedRange(c, h.total));
    rgb = stretch(Math.min(...ranges.map((r) => r[0])), Math.max(...ranges.map((r) => r[1])));
  } else {
    const ranges = channels.map((c) => clippedRange(c, h.total));
    if (kind === "tone") {
      per = ranges.map(([low, high]) => stretch(low, high));
    } else {
      // Neutral midtones: move each channel's mean to the average of the three.
      const means = channels.map((c, i) => stretchedMean(c, h.total, ...ranges[i]));
      const target = Math.min(0.95, Math.max(0.05, (means[0] + means[1] + means[2]) / 3));
      per = ranges.map(([low, high], i) => {
        const m = Math.min(0.99, Math.max(0.01, means[i]));
        const gamma = round2(Math.min(9.99, Math.max(0.1, Math.log(m) / Math.log(target))));
        return stretch(low, high, Math.abs(gamma - 1) < 0.01 ? 1 : gamma);
      });
    }
  }
  const unchanged = [rgb, ...per].every((l) => l === NEUTRAL_LEVELS);
  if (unchanged) return null;
  return { type: "levels", rgb, red: per[0], green: per[1], blue: per[2] };
}
