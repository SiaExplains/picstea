import { parseAdjustment } from "../../adjustments/registry";
import { NEUTRAL_CURVE, NEUTRAL_LEVELS, MAX_CURVE_POINTS } from "../../adjustments/tone";
import type { Adjustment, CurvePoint, LevelsChannel, ToneChannel } from "../../core/document/types";
import { ByteReader, ByteWriter } from "../binary/bytes";
import { getNumber, readVersionedDescriptor } from "./descriptor";

/**
 * Photoshop adjustment layers ↔ MYLPER adjustments (ADR-0017). Layouts follow Adobe's PSD file
 * format specification. Every decoded value is clamped into MYLPER's ranges and validated with
 * `parseAdjustment`, so a damaged block can only produce a valid adjustment or nothing.
 */

/** Adjustment block keys MYLPER reads (`CgEd` refines `brit`). */
export const ADJUSTMENT_KEYS = [
  "brit",
  "CgEd",
  "hue2",
  "expA",
  "levl",
  "curv",
  "nvrt",
  "post",
  "thrs",
  "blwh",
] as const;

/** Photoshop adjustments MYLPER doesn't have, by block key, for the warning. */
export const UNSUPPORTED_ADJUSTMENTS: Record<string, string> = {
  vibA: "Vibrance",
  blnc: "Color Balance",
  phfl: "Photo Filter",
  mixr: "Channel Mixer",
  selc: "Selective Color",
  grdm: "Gradient Map",
  clrL: "Color Lookup",
  "hue ": "Hue/Saturation (old format)",
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const TONE_ORDER: ToneChannel[] = ["rgb", "red", "green", "blue"];

function levelsChannel(r: ByteReader): LevelsChannel {
  const inBlack = clamp(r.u16(), 0, 253);
  const inWhite = clamp(r.u16(), inBlack + 2, 255);
  const outBlack = clamp(r.u16(), 0, 255);
  const outWhite = clamp(r.u16(), 0, 255);
  const gamma = clamp(r.u16() / 100, 0.1, 9.99);
  return { inBlack, inWhite, gamma, outBlack, outWhite };
}

function curvePoints(points: CurvePoint[]): CurvePoint[] {
  const sorted = points
    .map(([x, y]) => [clamp(Math.round(x), 0, 255), clamp(Math.round(y), 0, 255)] as CurvePoint)
    .sort((a, b) => a[0] - b[0])
    .filter((p, i, all) => i === 0 || p[0] > all[i - 1][0]);
  if (sorted.length < 2) return [...NEUTRAL_CURVE];
  if (sorted.length <= MAX_CURVE_POINTS) return sorted;
  // Keep the end points and an even spread in between.
  const out: CurvePoint[] = [];
  for (let i = 0; i < MAX_CURVE_POINTS; i++) {
    out.push(sorted[Math.round((i * (sorted.length - 1)) / (MAX_CURVE_POINTS - 1))]);
  }
  return out;
}

export interface DecodedAdjustment {
  readonly adjustment: Adjustment;
  /** Simplifications worth telling the user about. */
  readonly notes: readonly string[];
}

/** Decode an adjustment block; `blocks` holds every block of the layer (for `CgEd` + `brit`). */
export function decodeAdjustment(
  key: string,
  body: Uint8Array,
  blocks: ReadonlyMap<string, Uint8Array>,
): DecodedAdjustment | null {
  const r = new ByteReader(body);
  const notes: string[] = [];
  let value: unknown;
  switch (key) {
    case "CgEd":
    case "brit": {
      let brightness: number;
      let contrast: number;
      const cged = blocks.get("CgEd");
      if (cged) {
        const d = readVersionedDescriptor(new ByteReader(cged));
        brightness = getNumber(d, "Brgh") ?? 0;
        contrast = getNumber(d, "Cntr") ?? 0;
      } else {
        brightness = r.i16();
        contrast = r.i16();
      }
      if (Math.abs(brightness) > 100 || contrast < -100 || contrast > 100) {
        notes.push("Brightness/Contrast values were limited to MYLPER's range.");
      }
      value = {
        type: "brightness-contrast",
        brightness: clamp(brightness, -100, 100),
        contrast: clamp(contrast, -100, 100),
      };
      break;
    }
    case "hue2": {
      r.u16(); // version
      const colorize = r.u8() !== 0;
      r.u8();
      r.skip(6); // colorization hue, saturation, lightness
      const hue = r.i16();
      const saturation = r.i16();
      const lightness = r.i16();
      if (colorize) notes.push("Colorized Hue/Saturation was imported as a normal Hue/Saturation.");
      value = {
        type: "hue-saturation",
        hue: clamp(hue, -180, 180),
        saturation: clamp(saturation, -100, 100),
        lightness: clamp(lightness, -100, 100),
      };
      break;
    }
    case "expA": {
      r.u16();
      const exposure = r.f32();
      const offset = r.f32();
      const gamma = r.f32();
      if (offset !== 0) notes.push("The Exposure offset was not imported.");
      value = {
        type: "exposure",
        exposure: clamp(Number.isFinite(exposure) ? exposure : 0, -5, 5),
        gamma: clamp(Number.isFinite(gamma) ? gamma : 1, 0.1, 9.99),
      };
      break;
    }
    case "levl": {
      r.u16(); // version
      const channels: Record<string, LevelsChannel> = {};
      for (const c of TONE_ORDER)
        channels[c] = r.remaining >= 10 ? levelsChannel(r) : NEUTRAL_LEVELS;
      value = { type: "levels", ...channels };
      break;
    }
    case "curv": {
      r.u8(); // padding
      r.u16(); // version
      const bitmap = r.u32();
      const channels: Record<string, readonly CurvePoint[]> = {
        rgb: NEUTRAL_CURVE,
        red: NEUTRAL_CURVE,
        green: NEUTRAL_CURVE,
        blue: NEUTRAL_CURVE,
      };
      for (let bit = 0; bit < 32; bit++) {
        if ((bitmap & (1 << bit)) === 0) continue;
        const n = r.u16();
        if (n > 256) return null;
        const points: CurvePoint[] = [];
        for (let i = 0; i < n; i++) {
          const output = r.u16();
          const input = r.u16();
          points.push([input, output]);
        }
        if (bit < TONE_ORDER.length) channels[TONE_ORDER[bit]] = curvePoints(points);
        else notes.push("Curves on other channels were not imported.");
      }
      value = { type: "curves", ...channels };
      break;
    }
    case "nvrt":
      value = { type: "invert" };
      break;
    case "post":
      value = { type: "posterize", levels: clamp(r.u16(), 2, 255) };
      break;
    case "thrs":
      value = { type: "threshold", level: clamp(r.u16(), 0, 255) };
      break;
    case "blwh":
      notes.push("Black & White colour mix settings were not imported.");
      value = { type: "black-white" };
      break;
    default:
      return null;
  }
  const adjustment = parseAdjustment(value);
  return adjustment ? { adjustment, notes } : null;
}

// -------------------------------------------------------------------------------------------
// Export

/** Hue/Saturation ranges Photoshop writes by default (reds, yellows, greens, cyans, blues, magentas). */
const HUE_RANGES = [
  [315, 345, 15, 45],
  [15, 45, 75, 105],
  [75, 105, 135, 165],
  [135, 165, 195, 225],
  [195, 225, 255, 285],
  [255, 285, 315, 345],
];

const isNeutralCurve = (c: readonly CurvePoint[]) =>
  c.length === 2 && c[0][0] === 0 && c[0][1] === 0 && c[1][0] === 255 && c[1][1] === 255;

/**
 * The Photoshop block for an adjustment, or null when Photoshop has no exact equivalent
 * (Temperature/Tint, Black & White — those stay in the flattened image only).
 */
export function encodeAdjustment(a: Adjustment): { key: string; data: Uint8Array } | null {
  const w = new ByteWriter();
  switch (a.type) {
    case "brightness-contrast":
      w.i16(Math.round(a.brightness)).i16(Math.round(a.contrast)).i16(127).u8(0);
      return { key: "brit", data: w.toBytes() };
    case "hue-saturation":
      w.u16(2).u8(0).u8(0).i16(0).i16(25).i16(0);
      w.i16(Math.round(a.hue)).i16(Math.round(a.saturation)).i16(Math.round(a.lightness));
      for (const range of HUE_RANGES) {
        for (const v of range) w.i16(v);
        w.i16(0).i16(0).i16(0);
      }
      return { key: "hue2", data: w.toBytes() };
    case "exposure":
      w.u16(1).f32(a.exposure).f32(0).f32(a.gamma);
      return { key: "expA", data: w.toBytes() };
    case "levels": {
      w.u16(2);
      const write = (l: LevelsChannel) =>
        w
          .u16(Math.round(l.inBlack))
          .u16(Math.round(l.inWhite))
          .u16(Math.round(l.outBlack))
          .u16(Math.round(l.outWhite))
          .u16(Math.round(l.gamma * 100));
      for (const c of TONE_ORDER) write(a[c]);
      // Photoshop stores 29 records; the rest are neutral.
      for (let i = TONE_ORDER.length; i < 29; i++) write(NEUTRAL_LEVELS);
      return { key: "levl", data: w.toBytes() };
    }
    case "curves": {
      const channels = TONE_ORDER.map((c, bit) => ({ bit, points: a[c] })).filter(
        (c) => c.bit === 0 || !isNeutralCurve(c.points),
      );
      w.u8(0)
        .u16(1)
        .u32(channels.reduce((m, c) => m | (1 << c.bit), 0));
      for (const c of channels) {
        w.u16(c.points.length);
        for (const [input, output] of c.points) w.u16(Math.round(output)).u16(Math.round(input));
      }
      return { key: "curv", data: w.toBytes() };
    }
    case "invert":
      return { key: "nvrt", data: new Uint8Array(0) };
    case "posterize":
      w.u16(Math.round(a.levels)).u16(0);
      return { key: "post", data: w.toBytes() };
    case "threshold":
      w.u16(Math.round(a.level)).u16(0);
      return { key: "thrs", data: w.toBytes() };
    case "temperature-tint":
    case "black-white":
      return null;
  }
}
