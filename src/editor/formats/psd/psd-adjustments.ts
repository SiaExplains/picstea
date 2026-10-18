import { parseAdjustment } from "../../adjustments/registry";
import { NEUTRAL_CURVE, NEUTRAL_LEVELS, MAX_CURVE_POINTS } from "../../adjustments/tone";
import type {
  Adjustment,
  CurvePoint,
  LevelsChannel,
  MixerRow,
  ToneChannel,
} from "../../core/document/types";
import { ByteReader, ByteWriter } from "../binary/bytes";
import {
  getNumber,
  readUnicodeString,
  readVersionedDescriptor,
  writeVersionedDescriptor,
} from "./descriptor";

/**
 * Photoshop adjustment layers ↔ Picstea adjustments (ADR-0017). Layouts follow Adobe's PSD file
 * format specification. Every decoded value is clamped into Picstea's ranges and validated with
 * `parseAdjustment`, so a damaged block can only produce a valid adjustment or nothing.
 */

/** Adjustment block keys Picstea reads (`CgEd` refines `brit`). */
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
  "vibA",
  "blnc",
  "phfl",
  "mixr",
  "grdm",
] as const;

/** Photoshop adjustments Picstea doesn't have, by block key, for the warning. */
export const UNSUPPORTED_ADJUSTMENTS: Record<string, string> = {
  selc: "Selective Color",
  clrL: "Color Lookup",
  "hue ": "Hue/Saturation (old format)",
};

/** Clamp; NaN and infinities from damaged files become the in-range value nearest 0. */
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(v) ? v : 0));
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
        notes.push("Brightness/Contrast values were limited to Picstea's range.");
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
    case "vibA": {
      const d = readVersionedDescriptor(r);
      value = {
        type: "vibrance",
        vibrance: clamp(getNumber(d, "vibrance") ?? 0, -100, 100),
        saturation: clamp(getNumber(d, "Strt") ?? 0, -100, 100),
      };
      break;
    }
    case "blnc": {
      const range = () => ({
        cyanRed: clamp(r.i16(), -100, 100),
        magentaGreen: clamp(r.i16(), -100, 100),
        yellowBlue: clamp(r.i16(), -100, 100),
      });
      const shadows = range();
      const midtones = range();
      const highlights = range();
      const preserveLuminosity = r.remaining > 0 ? r.u8() !== 0 : true;
      value = { type: "color-balance", shadows, midtones, highlights, preserveLuminosity };
      break;
    }
    case "phfl": {
      const version = r.u16();
      let color: string;
      if (version === 3) {
        // Lab, hundredths.
        color = labToHex(r.i32() / 100, r.i32() / 100, r.i32() / 100);
        notes.push("Photo Filter colours may differ slightly from Photoshop.");
      } else if (version === 2) {
        color = readColor(r) ?? "#ec8a00";
      } else {
        return null;
      }
      const density = clamp(r.u32(), 1, 100);
      const preserveLuminosity = r.remaining > 0 ? r.u8() !== 0 : true;
      value = { type: "photo-filter", color, density, preserveLuminosity };
      break;
    }
    case "mixr": {
      r.u16(); // version
      const monochrome = r.u16() !== 0;
      const row = () => {
        const red = clamp(r.i16(), -200, 200);
        const green = clamp(r.i16(), -200, 200);
        const blue = clamp(r.i16(), -200, 200);
        r.skip(2); // CMYK only
        const constant = clamp(r.i16(), -200, 200);
        return { red, green, blue, constant };
      };
      const red = row();
      const green = row();
      const blue = row();
      // Monochrome mixes use a separate grey row when present.
      const gray = monochrome && r.remaining >= 10 ? row() : red;
      value = { type: "channel-mixer", red: monochrome ? gray : red, green, blue, monochrome };
      break;
    }
    case "grdm": {
      r.u16(); // version
      const reverse = r.u8() !== 0;
      r.u8(); // dither
      readUnicodeString(r); // name
      const count = r.u16();
      if (count < 2 || count > 1024) return null;
      const stops: { position: number; color: string }[] = [];
      for (let i = 0; i < count; i++) {
        const location = r.u32();
        r.u32(); // midpoint
        const color = readColor(r) ?? "#000000";
        r.skip(2);
        stops.push({ position: clamp(location / 4096, 0, 1), color });
      }
      stops.sort((a, b) => a.position - b.position);
      if (stops.length > 16) {
        // Keep both ends; drop stops from the middle.
        notes.push("Gradient Map gradients were limited to 16 colours.");
        stops.splice(15, stops.length - 16);
      }
      notes.push("Gradient Map transparency and smoothness settings were not imported.");
      value = { type: "gradient-map", stops, reverse };
      break;
    }
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
    case "vibrance":
      writeVersionedDescriptor(w, {
        classId: "null",
        items: [
          ["vibrance", { type: "long", value: Math.round(a.vibrance) }],
          ["Strt", { type: "long", value: Math.round(a.saturation) }],
        ],
      });
      return { key: "vibA", data: w.toBytes() };
    case "color-balance":
      for (const range of [a.shadows, a.midtones, a.highlights]) {
        w.i16(Math.round(range.cyanRed))
          .i16(Math.round(range.magentaGreen))
          .i16(Math.round(range.yellowBlue));
      }
      w.u8(a.preserveLuminosity ? 1 : 0).u8(0);
      return { key: "blnc", data: w.toBytes() };
    case "channel-mixer": {
      w.u16(1).u16(a.monochrome ? 1 : 0);
      const row = (m: MixerRow) =>
        w
          .i16(Math.round(m.red))
          .i16(Math.round(m.green))
          .i16(Math.round(m.blue))
          .i16(0)
          .i16(Math.round(m.constant));
      row(a.red);
      row(a.green);
      row(a.blue);
      row(a.red); // grey (monochrome)
      return { key: "mixr", data: w.toBytes() };
    }
    case "temperature-tint":
    case "black-white":
    case "photo-filter":
    case "gradient-map":
      return null;
  }
}

/** A PSD colour record (colour space + four 16-bit values); RGB only, else undefined. */
function readColor(r: ByteReader): string | undefined {
  const space = r.u16();
  const values = [r.u16(), r.u16(), r.u16(), r.u16()];
  if (space !== 0) return undefined;
  const hex = (v: number) =>
    Math.round(clamp(v / 257, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${hex(values[0])}${hex(values[1])}${hex(values[2])}`;
}

/** CIE Lab (D50, as Photoshop) → sRGB hex. */
export function labToHex(l: number, a: number, b: number): string {
  const fy = (clamp(l, 0, 100) + 16) / 116;
  const fx = fy + clamp(a, -128, 127) / 500;
  const fz = fy - clamp(b, -128, 127) / 200;
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  // D50 white.
  const X = 0.9642 * inv(fx);
  const Y = inv(fy);
  const Z = 0.8251 * inv(fz);
  // Bradford-adapted D50 → linear sRGB.
  const lin = [
    3.1338561 * X - 1.6168667 * Y - 0.4906146 * Z,
    -0.9787684 * X + 1.9161415 * Y + 0.033454 * Z,
    0.0719453 * X - 0.2289914 * Y + 1.4052427 * Z,
  ];
  const gamma = (c: number) =>
    clamp(c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055, 0, 1);
  return `#${lin
    .map((c) =>
      Math.round(gamma(c) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
