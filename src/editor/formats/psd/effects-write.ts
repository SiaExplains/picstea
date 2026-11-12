import type { BlendMode, GradientStop } from "../../core/document/types";
import type {
  Contour,
  ContourPreset,
  EffectKind,
  GlowFill,
  GradientStyle,
  LayerEffects,
} from "../../core/effects/model";
import { ByteWriter } from "../binary/bytes";
import {
  writeVersionedDescriptor,
  type WritableDescriptor,
  type WritableValue,
} from "./descriptor";

/**
 * Layer styles in PSD export (ADR-0045): the `lfx2` block, the inverse of the importer's
 * `decodeEffects` (psd-extras.ts), so Photoshop shows them as editable layer styles. Pattern
 * overlays and bevel textures use Picstea's built-in patterns, which a PSD could only reference,
 * so layers with them keep their effects merged into the pixels (`exportableEffects` says when).
 */

const BLEND_KEYS: Record<BlendMode, string> = {
  normal: "Nrml",
  multiply: "Mltp",
  screen: "Scrn",
  overlay: "Ovrl",
  darken: "Drkn",
  lighten: "Lghn",
  "color-dodge": "CDdg",
  "color-burn": "CBrn",
  "hard-light": "HrdL",
  "soft-light": "SftL",
  difference: "Dfrn",
  exclusion: "Xclu",
  hue: "H   ",
  saturation: "Strt",
  color: "Clr ",
  luminosity: "Lmns",
};

const CONTOUR_NAMES: Record<Exclude<ContourPreset, "custom">, string> = {
  linear: "Linear",
  cone: "Cone",
  "cone-inverted": "Cone - Inverted",
  "cove-deep": "Cove - Deep",
  "cove-shallow": "Cove - Shallow",
  gaussian: "Gaussian",
  "half-round": "Half Round",
  ring: "Ring",
  "ring-double": "Ring - Double",
  "rolling-slope": "Rolling Slope - Descending",
  "rounded-steps": "Rounded Steps",
  sawtooth: "Sawtooth 1",
};

/** True when every enabled effect can be written as an editable Photoshop style. */
export function exportableEffects(effects: LayerEffects): boolean {
  if (effects.patternOverlay?.some((e) => e.enabled)) return false;
  if (effects.bevel?.some((e) => e.enabled && e.texture.enabled)) return false;
  return true;
}

type Item = readonly [string, WritableValue];
const obj = (classId: string, items: readonly Item[]): WritableValue => ({
  type: "Objc",
  descriptor: { classId, items },
});
const bool = (value: boolean): WritableValue => ({ type: "bool", value });
const pct = (fraction: number): WritableValue => ({
  type: "UntF",
  unit: "#Prc",
  value: Math.round(fraction * 1000) / 10,
});
const px = (value: number): WritableValue => ({ type: "UntF", unit: "#Pxl", value });
const ang = (value: number): WritableValue => ({ type: "UntF", unit: "#Ang", value });
const enumOf = (enumType: string, value: string): WritableValue => ({
  type: "enum",
  enumType,
  value,
});
const blend = (mode: BlendMode) => enumOf("BlnM", BLEND_KEYS[mode] ?? "Nrml");

function color(hex: string): WritableValue {
  const n = Number.parseInt(hex.slice(1), 16);
  return obj("RGBC", [
    ["Rd  ", { type: "doub", value: (n >> 16) & 255 }],
    ["Grn ", { type: "doub", value: (n >> 8) & 255 }],
    ["Bl  ", { type: "doub", value: n & 255 }],
  ]);
}

function contour(c: Contour): WritableValue {
  return obj("ShpC", [
    ["Nm  ", { type: "TEXT", value: c.preset === "custom" ? "Custom" : CONTOUR_NAMES[c.preset] }],
    [
      "Crv ",
      {
        type: "VlLs",
        values: c.points.map((p) =>
          obj("CrPt", [
            ["Hrzn", { type: "doub", value: Math.round(p.x * 255) }],
            ["Vrtc", { type: "doub", value: Math.round(p.y * 255) }],
          ]),
        ),
      },
    ],
  ]);
}

function gradient(stops: readonly GradientStop[]): WritableValue {
  return obj("Grdn", [
    ["Nm  ", { type: "TEXT", value: "Custom" }],
    ["GrdF", enumOf("GrdF", "CstS")],
    ["Intr", { type: "doub", value: 4096 }],
    [
      "Clrs",
      {
        type: "VlLs",
        values: stops.map((s) =>
          obj("Clrt", [
            ["Clr ", color(s.color)],
            ["Type", enumOf("Clry", "UsrS")],
            ["Lctn", { type: "long", value: Math.round(s.position * 4096) }],
            ["Mdpn", { type: "long", value: 50 }],
          ]),
        ),
      },
    ],
    [
      "Trns",
      {
        type: "VlLs",
        values: [0, 4096].map((location) =>
          obj("TrnS", [
            ["Opct", pct(1)],
            ["Lctn", { type: "long", value: location }],
            ["Mdpn", { type: "long", value: 50 }],
          ]),
        ),
      },
    ],
  ]);
}

const GRADIENT_TYPES: Record<GradientStyle, string> = {
  linear: "Lnr ",
  radial: "Rdl ",
  angle: "Angl",
  reflected: "Rflc",
  diamond: "Dmnd",
};

const base = (e: { enabled: boolean; blendMode: BlendMode; opacity: number }): Item[] => [
  ["enab", bool(e.enabled)],
  ["Md  ", blend(e.blendMode)],
  ["Opct", pct(e.opacity)],
];

const glowFill = (fill: GlowFill): Item[] =>
  fill.kind === "color" ? [["Clr ", color(fill.color)]] : [["Grad", gradient(fill.stops)]];

/** The effect descriptors, by Photoshop key and its "…Multi" list key. */
function effectItems(effects: LayerEffects): Item[] {
  const out: Item[] = [];
  const add = <K extends EffectKind>(
    kind: K,
    key: string,
    multi: string,
    classId: string,
    items: (e: NonNullable<LayerEffects[K]>[number]) => Item[],
  ) => {
    const list = effects[kind];
    if (!list?.length) return;
    const values = list.map((e) => obj(classId, items(e as NonNullable<LayerEffects[K]>[number])));
    if (values.length === 1) out.push([key, values[0]]);
    else out.push([multi, { type: "VlLs", values }]);
  };
  add("dropShadow", "DrSh", "dropShadowMulti", "DrSh", (e) => [
    ...base(e),
    ["Clr ", color(e.color)],
    ["uglg", bool(e.useGlobalLight)],
    ["lagl", ang(e.angle)],
    ["Dstn", px(e.distance)],
    ["Ckmt", pct(e.spread)],
    ["blur", px(e.size)],
    ["Nose", pct(e.noise)],
    ["AntA", bool(e.antiAlias)],
    ["TrnS", contour(e.contour)],
    ["layerConceals", bool(e.knockout)],
  ]);
  add("innerShadow", "IrSh", "innerShadowMulti", "IrSh", (e) => [
    ...base(e),
    ["Clr ", color(e.color)],
    ["uglg", bool(e.useGlobalLight)],
    ["lagl", ang(e.angle)],
    ["Dstn", px(e.distance)],
    ["Ckmt", pct(e.choke)],
    ["blur", px(e.size)],
    ["Nose", pct(e.noise)],
    ["AntA", bool(e.antiAlias)],
    ["TrnS", contour(e.contour)],
  ]);
  const glow = (e: {
    fill: GlowFill;
    noise: number;
    technique: "softer" | "precise";
    size: number;
    contour: Contour;
    antiAlias: boolean;
    range: number;
    jitter: number;
  }): Item[] => [
    ...glowFill(e.fill),
    ["Nose", pct(e.noise)],
    ["GlwT", enumOf("BETE", e.technique === "precise" ? "PrBL" : "SfBL")],
    ["blur", px(e.size)],
    ["TrnS", contour(e.contour)],
    ["AntA", bool(e.antiAlias)],
    ["Inpr", pct(e.range)],
    ["ShdN", pct(e.jitter)],
  ];
  add("outerGlow", "OrGl", "outerGlowMulti", "OrGl", (e) => [
    ...base(e),
    ...glow(e),
    ["Ckmt", pct(e.spread)],
  ]);
  add("innerGlow", "IrGl", "innerGlowMulti", "IrGl", (e) => [
    ...base(e),
    ...glow(e),
    ["glwS", enumOf("IGSr", e.source === "center" ? "SrcC" : "SrcE")],
    ["Ckmt", pct(e.choke)],
  ]);
  add("satin", "ChFX", "satinMulti", "ChFX", (e) => [
    ...base(e),
    ["Clr ", color(e.color)],
    ["lagl", ang(e.angle)],
    ["Dstn", px(e.distance)],
    ["blur", px(e.size)],
    ["MpgS", contour(e.contour)],
    ["AntA", bool(e.antiAlias)],
    ["Invr", bool(e.invert)],
  ]);
  add("colorOverlay", "SoFi", "solidFillMulti", "SoFi", (e) => [
    ...base(e),
    ["Clr ", color(e.color)],
  ]);
  add("gradientOverlay", "GrFl", "gradientFillMulti", "GrFl", (e) => [
    ...base(e),
    ["Grad", gradient(e.stops)],
    ["Rvrs", bool(e.reverse)],
    ["Type", enumOf("GrdT", GRADIENT_TYPES[e.style])],
    [
      "gradientsInterpolationMethod",
      enumOf(
        "gradientInterpolationMethodType",
        e.method === "perceptual" ? "Perc" : e.method === "linear" ? "Lnr " : "Gcls",
      ),
    ],
    ["Algn", bool(e.align)],
    ["Angl", ang(e.angle)],
    ["Scl ", pct(e.scale)],
    [
      "Ofst",
      obj("Pnt ", [
        ["Hrzn", pct(e.offsetX)],
        ["Vrtc", pct(e.offsetY)],
      ]),
    ],
    ["Dthr", bool(e.dither)],
  ]);
  add("stroke", "FrFX", "frameFXMulti", "FrFX", (e) => [
    ...base(e),
    ["Sz  ", px(e.size)],
    [
      "Styl",
      enumOf("FStl", e.position === "inside" ? "InsF" : e.position === "center" ? "CtrF" : "OutF"),
    ],
    ...(e.fill.kind === "gradient"
      ? ([
          ["PntT", enumOf("FrFl", "GrFl")],
          ["Grad", gradient(e.fill.stops)],
          ["Rvrs", bool(e.fill.reverse)],
          ["Type", enumOf("GrdT", GRADIENT_TYPES[e.fill.style])],
          ["Angl", ang(e.fill.angle)],
          ["Scl ", pct(e.fill.scale)],
        ] as Item[])
      : ([
          ["PntT", enumOf("FrFl", "SClr")],
          ["Clr ", color(e.fill.color)],
        ] as Item[])),
    ["overprint", bool(e.overprint)],
  ]);
  add("bevel", "ebbl", "bevelEmbossMulti", "ebbl", (e) => [
    ["enab", bool(e.enabled)],
    [
      "bvlS",
      enumOf(
        "BESl",
        { inner: "InrB", outer: "OtrB", emboss: "Embs", pillow: "PlEb", stroke: "strokeEmboss" }[
          e.style
        ],
      ),
    ],
    [
      "bvlT",
      enumOf(
        "bvlT",
        e.technique === "chisel-hard" ? "PrBL" : e.technique === "chisel-soft" ? "Slmt" : "SfBL",
      ),
    ],
    ["srgR", pct(e.depth)],
    ["bvlD", enumOf("BESs", e.direction === "down" ? "Out " : "In  ")],
    ["blur", px(e.size)],
    ["Sftn", px(e.soften)],
    ["uglg", bool(e.useGlobalLight)],
    ["lagl", ang(e.angle)],
    ["Lald", ang(e.altitude)],
    ["TrnS", contour(e.glossContour)],
    ["antialiasGloss", bool(e.glossAntiAlias)],
    ["hglM", blend(e.highlightMode)],
    ["hglC", color(e.highlightColor)],
    ["hglO", pct(e.highlightOpacity)],
    ["sdwM", blend(e.shadowMode)],
    ["sdwC", color(e.shadowColor)],
    ["sdwO", pct(e.shadowOpacity)],
    ["useShape", bool(e.contour.enabled)],
    ["MpgS", contour(e.contour.contour)],
    ["AntA", bool(e.contour.antiAlias)],
    ["Inpr", pct(e.contour.range)],
    ["useTexture", bool(false)],
  ]);
  return out;
}

/** The `lfx2` block for a layer's effects. */
export function encodeEffects(effects: LayerEffects): { key: string; data: Uint8Array } {
  const descriptor: WritableDescriptor = {
    classId: "null",
    items: [["Scl ", pct(1)], ["masterFXSwitch", bool(true)], ...effectItems(effects)],
  };
  const w = new ByteWriter();
  w.u32(0);
  writeVersionedDescriptor(w, descriptor);
  return { key: "lfx2", data: w.toBytes() };
}
