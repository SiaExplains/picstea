import {
  LINEAR_CONTOUR,
  MAX_CONTOUR_POINTS,
  contourPreset,
  maxCopies,
  type Contour,
  type ContourPreset,
  type EffectByKind,
  type EffectKind,
  type GlowFill,
  type GradientStyle,
  type LayerEffects,
  type PatternId,
} from "../../core/effects/model";
import { EFFECT_LIMITS, parseEffect } from "../../core/effects/parse";
import {
  FONT_FAMILIES,
  type Adjustment,
  type BlendMode,
  type FontFamily,
  type GradientStop,
  type TextAlign,
} from "../../core/document/types";
import { ByteReader } from "../binary/bytes";
import {
  getBool,
  getBytes,
  getColor,
  getDescriptor,
  getEnum,
  getList,
  getNumber,
  getString,
  readVersionedDescriptor,
  type Descriptor,
  type DescriptorValue,
} from "./descriptor";
import { enginePath, parseEngineData, type EngineValue } from "./engine-data";
import { ADJUSTMENT_KEYS, decodeAdjustment, UNSUPPORTED_ADJUSTMENTS } from "./psd-adjustments";
import { decodeVectorMask, type PsdVectorMask } from "./psd-paths";

/**
 * What a Photoshop layer is beyond its pixels (ADR-0017), decoded from its tagged blocks in the
 * worker. Every part is optional and independently validated: when one fails to parse, the layer
 * falls back to its pixels for that part and a warning explains it.
 */
export interface PsdExtras {
  readonly adjustment?: Adjustment;
  readonly effects?: LayerEffects;
  /** Blending Options → Fill (`iOpa`), 0…1. */
  readonly fillOpacity?: number;
  readonly vectorMask?: PsdVectorMask;
  /** Solid colour fill layer (`SoCo`), `#rrggbb`. */
  readonly fill?: string;
  /** Shape stroke (`vstk`), when enabled. */
  readonly stroke?: { readonly color: string; readonly width: number };
  /** Shape stroke turns off the fill (`vstk` fillEnabled false). */
  readonly fillDisabled?: boolean;
  readonly text?: PsdText;
  readonly placed?: PsdPlaced;
}

export interface PsdText {
  readonly text: string;
  readonly fontSize: number;
  readonly color: string;
  readonly fontFamily: FontFamily;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly align: TextAlign;
  readonly lineHeight: number;
  readonly letterSpacing: number;
}

export interface PsdPlaced {
  /** Id of the embedded file in the global `lnk2`/`lnkD` blocks. */
  readonly id: string;
  /** Corners in document space: top-left, top-right, bottom-right, bottom-left (x, y pairs). */
  readonly corners: readonly number[];
}

/** Block keys whose bodies the reader keeps for `decodeExtras`. */
export const EXTRA_KEYS = new Set<string>([
  ...ADJUSTMENT_KEYS,
  ...Object.keys(UNSUPPORTED_ADJUSTMENTS),
  "lfx2",
  "iOpa",
  "vmsk",
  "vsms",
  "SoCo",
  "vstk",
  "TySh",
  "SoLd",
  "SoLE",
  "PlLd",
]);

/** Clamp, treating NaN and infinities from damaged files as the lower bound. */
const clamp = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;

// ---------------------------------------------------------------------------------------------
// Layer styles (`lfx2`, ADR-0030)

const BLEND_ENUMS: Record<string, BlendMode> = {
  Nrml: "normal",
  Mltp: "multiply",
  Scrn: "screen",
  Ovrl: "overlay",
  Drkn: "darken",
  Lghn: "lighten",
  CDdg: "color-dodge",
  CBrn: "color-burn",
  HrdL: "hard-light",
  SftL: "soft-light",
  Dfrn: "difference",
  Xclu: "exclusion",
  "H   ": "hue",
  Strt: "saturation",
  "Clr ": "color",
  Lmns: "luminosity",
};

const CONTOUR_BY_NAME: Record<string, Exclude<ContourPreset, "custom">> = {
  linear: "linear",
  cone: "cone",
  "cone - inverted": "cone-inverted",
  "cove - deep": "cove-deep",
  "cove - shallow": "cove-shallow",
  gaussian: "gaussian",
  "half round": "half-round",
  ring: "ring",
  "ring - double": "ring-double",
  "rolling slope - descending": "rolling-slope",
  "rounded steps": "rounded-steps",
  "sawtooth 1": "sawtooth",
};

const PATTERN_WORDS: [RegExp, PatternId][] = [
  [/checker/i, "checker"],
  [/diagonal/i, "diagonal-stripes"],
  [/stripe|line/i, "stripes"],
  [/dot|halftone/i, "dots"],
  [/grid/i, "grid"],
  [/brick|tile/i, "bricks"],
  [/wave/i, "waves"],
  [/cross|hatch/i, "crosshatch"],
  [/diamond/i, "diamonds"],
];

const descriptors = (list: DescriptorValue[] | undefined): Descriptor[] =>
  (list ?? []).filter(
    (v): v is Descriptor =>
      !!v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Uint8Array),
  );

/** Every copy of an effect: newer files use `…Multi` lists, older ones a single descriptor. */
function copies(fx: Descriptor, key: string, multi: string): Descriptor[] {
  const list = getList(fx, multi);
  if (list) return descriptors(list);
  const one = getDescriptor(fx, key);
  return one ? [one] : [];
}

/** Reads one effect descriptor with clamping, so damaged values still give a valid effect. */
class EffectReader {
  constructor(
    readonly d: Descriptor,
    private readonly notes: Set<string>,
    private readonly light: { angle: number },
  ) {}

  num = (key: string, fallback: number, [min, max]: readonly [number, number]) =>
    clamp(getNumber(this.d, key) ?? fallback, min, max);
  pct = (key: string, fallback: number) => clamp((getNumber(this.d, key) ?? fallback) / 100, 0, 1);
  bool = (key: string, fallback: boolean) => getBool(this.d, key) ?? fallback;
  color = (key = "Clr ", fallback = "#000000") => getColor(this.d, key) ?? fallback;

  mode(key = "Md  ", fallback: BlendMode = "normal"): BlendMode {
    const value = getEnum(this.d, key);
    if (value === undefined) return fallback;
    const mode = BLEND_ENUMS[value];
    if (!mode)
      this.notes.add("Some layer style blend modes are not available and were set to Normal.");
    return mode ?? "normal";
  }

  base(modeFallback: BlendMode, opacityFallback = 75) {
    return {
      enabled: this.bool("enab", true),
      blendMode: this.mode("Md  ", modeFallback),
      opacity: this.pct("Opct", opacityFallback),
    };
  }

  angle() {
    const global = this.bool("uglg", false);
    return {
      useGlobalLight: global,
      angle: clamp(
        global ? this.light.angle : (getNumber(this.d, "lagl") ?? this.light.angle),
        ...EFFECT_LIMITS.angle,
      ),
    };
  }

  contour(key: string): Contour {
    const c = getDescriptor(this.d, key);
    if (!c) return LINEAR_CONTOUR;
    const name = (getString(c, "Nm  ") ?? "").trim().toLowerCase();
    const preset = CONTOUR_BY_NAME[name];
    if (preset) return contourPreset(preset);
    const raw = descriptors(getList(c, "Crv "))
      .map((p) => ({
        x: clamp((getNumber(p, "Hrzn") ?? 0) / 255, 0, 1),
        y: clamp((getNumber(p, "Vrtc") ?? 0) / 255, 0, 1),
      }))
      .sort((a, b) => a.x - b.x);
    if (raw.length < 2) return LINEAR_CONTOUR;
    const points =
      raw.length > MAX_CONTOUR_POINTS
        ? [...raw.slice(0, MAX_CONTOUR_POINTS - 1), raw[raw.length - 1]]
        : raw;
    // The first and last points sit on the edges.
    return {
      preset: "custom",
      points: points.map((p, i) => ({
        x: i === 0 ? 0 : i === points.length - 1 ? 1 : p.x,
        y: p.y,
      })),
    };
  }

  stops(key = "Grad"): GradientStop[] | null {
    const gradient = getDescriptor(this.d, key);
    if (!gradient) return null;
    if (getEnum(gradient, "GrdF") === "ClNs") {
      this.notes.add("Noise gradients in layer styles were not imported.");
      return null;
    }
    const stops = descriptors(getList(gradient, "Clrs"))
      .map((stop) => ({
        position: clamp((getNumber(stop, "Lctn") ?? 0) / 4096, 0, 1),
        color: getColor(stop) ?? "#000000",
      }))
      .sort((a, b) => a.position - b.position);
    if (stops.length > 16) {
      // Keep both ends; drop stops from the middle.
      stops.splice(15, stops.length - 16);
      this.notes.add("Gradients in layer styles were limited to 16 colours.");
    }
    return stops.length >= 2 ? stops : null;
  }

  gradientStyle(): GradientStyle {
    const type = getEnum(this.d, "Type");
    return type === "Rdl "
      ? "radial"
      : type === "Angl"
        ? "angle"
        : type === "Rflc"
          ? "reflected"
          : type === "Dmnd"
            ? "diamond"
            : "linear";
  }

  pattern(key = "Ptrn"): PatternId {
    const name = getString(getDescriptor(this.d, key), "Nm  ") ?? "";
    this.notes.add("Photoshop patterns were replaced by the closest built-in pattern.");
    return PATTERN_WORDS.find(([re]) => re.test(name))?.[1] ?? "noise";
  }

  offset(key: string, scale: number, [min, max]: readonly [number, number]) {
    const o = getDescriptor(this.d, key);
    return {
      x: clamp((getNumber(o, "Hrzn") ?? 0) * scale, min, max),
      y: clamp((getNumber(o, "Vrtc") ?? 0) * scale, min, max),
    };
  }

  glowFill(): GlowFill {
    const stops = getDescriptor(this.d, "Grad") ? this.stops() : null;
    return stops
      ? { kind: "gradient", stops, reverse: false }
      : { kind: "color", color: this.color("Clr ", "#ffffbe") };
  }
}

const L = EFFECT_LIMITS;

function decodeEffects(
  body: Uint8Array,
  globalAngle: number,
  notes: Set<string>,
): LayerEffects | undefined {
  const r = new ByteReader(body);
  r.u32(); // object effects version
  const fx = readVersionedDescriptor(r);
  if (getBool(fx, "masterFXSwitch") === false) return undefined;
  const light = { angle: globalAngle };
  const raw: Partial<Record<EffectKind, unknown[]>> = {};
  const each = (
    kind: EffectKind,
    key: string,
    multi: string,
    read: (e: EffectReader) => unknown,
  ) => {
    let list = copies(fx, key, multi);
    if (list.length > maxCopies(kind)) {
      list = list.slice(0, maxCopies(kind));
      notes.add(
        "Some layer styles had more copies than Picstea supports; extra copies were left out.",
      );
    }
    const out = list.map((d) => read(new EffectReader(d, notes, light))).filter(Boolean);
    if (out.length) raw[kind] = out;
  };

  each("dropShadow", "DrSh", "dropShadowMulti", (e) => ({
    ...e.base("multiply"),
    color: e.color(),
    ...e.angle(),
    distance: e.num("Dstn", 5, L.distance),
    spread: e.pct("Ckmt", 0),
    size: e.num("blur", 5, L.size),
    noise: e.pct("Nose", 0),
    contour: e.contour("TrnS"),
    antiAlias: e.bool("AntA", false),
    knockout: e.bool("layerConceals", true),
  }));
  each("innerShadow", "IrSh", "innerShadowMulti", (e) => ({
    ...e.base("multiply"),
    color: e.color(),
    ...e.angle(),
    distance: e.num("Dstn", 5, L.distance),
    choke: e.pct("Ckmt", 0),
    size: e.num("blur", 5, L.size),
    noise: e.pct("Nose", 0),
    contour: e.contour("TrnS"),
    antiAlias: e.bool("AntA", false),
  }));
  const glow = (e: EffectReader) => ({
    ...e.base("screen"),
    fill: e.glowFill(),
    noise: e.pct("Nose", 0),
    technique: getEnum(e.d, "GlwT") === "PrBL" ? "precise" : "softer",
    size: e.num("blur", 5, L.size),
    contour: e.contour("TrnS"),
    antiAlias: e.bool("AntA", false),
    range: clamp(e.pct("Inpr", 50), ...L.range),
    jitter: e.pct("ShdN", 0),
  });
  each("outerGlow", "OrGl", "outerGlowMulti", (e) => ({ ...glow(e), spread: e.pct("Ckmt", 0) }));
  each("innerGlow", "IrGl", "innerGlowMulti", (e) => ({
    ...glow(e),
    source: getEnum(e.d, "glwS") === "SrcC" ? "center" : "edge",
    choke: e.pct("Ckmt", 0),
  }));
  each("satin", "ChFX", "satinMulti", (e) => ({
    ...e.base("multiply", 50),
    color: e.color(),
    angle: e.num("lagl", 19, L.angle),
    distance: e.num("Dstn", 11, L.distance),
    size: e.num("blur", 14, L.size),
    contour: e.contour("MpgS"),
    antiAlias: e.bool("AntA", false),
    invert: e.bool("Invr", true),
  }));
  each("colorOverlay", "SoFi", "solidFillMulti", (e) => ({
    ...e.base("normal", 100),
    color: e.color("Clr ", "#ff0000"),
  }));
  each("gradientOverlay", "GrFl", "gradientFillMulti", (e) => {
    const stops = e.stops();
    if (!stops) return null;
    const method = getEnum(e.d, "gradientsInterpolationMethod");
    const offset = e.offset("Ofst", 1 / 100, L.offset);
    return {
      ...e.base("normal", 100),
      stops,
      reverse: e.bool("Rvrs", false),
      style: e.gradientStyle(),
      method: method === "Perc" ? "perceptual" : method === "Lnr " ? "linear" : "classic",
      align: e.bool("Algn", true),
      angle: e.num("Angl", 90, L.angle),
      scale: clamp(e.num("Scl ", 100, [10, 150]) / 100, ...L.gradientScale),
      offsetX: offset.x,
      offsetY: offset.y,
      dither: e.bool("Dthr", false),
    };
  });
  each("patternOverlay", "patternFill", "patternFillMulti", (e) => {
    const phase = e.offset("phase", 1, L.patternOffset);
    return {
      ...e.base("normal", 100),
      pattern: e.pattern(),
      angle: e.num("Angl", 0, L.angle),
      scale: clamp(e.num("Scl ", 100, [1, 1000]) / 100, ...L.patternScale),
      align: e.bool("Algn", true),
      offsetX: phase.x,
      offsetY: phase.y,
    };
  });
  each("stroke", "FrFX", "frameFXMulti", (e) => {
    const style = getEnum(e.d, "Styl");
    const paint = getEnum(e.d, "PntT");
    const stops = paint === "GrFl" ? e.stops() : null;
    if (paint === "Ptrn") notes.add("Pattern strokes were imported as colour strokes.");
    return {
      ...e.base("normal", 100),
      size: e.num("Sz  ", 3, L.strokeSize),
      position: style === "InsF" ? "inside" : style === "CtrF" ? "center" : "outside",
      fill: stops
        ? {
            kind: "gradient",
            stops,
            reverse: e.bool("Rvrs", false),
            style: e.gradientStyle(),
            angle: e.num("Angl", 90, L.angle),
            scale: clamp(e.num("Scl ", 100, [10, 150]) / 100, ...L.gradientScale),
          }
        : { kind: "color", color: e.color() },
      overprint: e.bool("overprint", false),
    };
  });
  each("bevel", "ebbl", "bevelEmbossMulti", (e) => {
    const d = e.d;
    const style = getEnum(d, "bvlS");
    const technique = getEnum(d, "bvlT");
    const phase = e.offset("phase", 1, L.patternOffset);
    return {
      enabled: e.bool("enab", true),
      style:
        style === "OtrB"
          ? "outer"
          : style === "Embs"
            ? "emboss"
            : style === "PlEb"
              ? "pillow"
              : style === "strokeEmboss"
                ? "stroke"
                : "inner",
      technique:
        technique === "PrBL" ? "chisel-hard" : technique === "Slmt" ? "chisel-soft" : "smooth",
      depth: clamp(e.num("srgR", 100, [1, 1000]) / 100, ...L.depth),
      direction: getEnum(d, "bvlD") === "Out " ? "down" : "up",
      size: e.num("blur", 5, L.size),
      soften: e.num("Sftn", 0, L.soften),
      ...e.angle(),
      altitude: e.num("Lald", 30, L.altitude),
      glossContour: e.contour("TrnS"),
      glossAntiAlias: e.bool("antialiasGloss", false),
      highlightMode: e.mode("hglM", "screen"),
      highlightColor: e.color("hglC", "#ffffff"),
      highlightOpacity: e.pct("hglO", 75),
      shadowMode: e.mode("sdwM", "multiply"),
      shadowColor: e.color("sdwC", "#000000"),
      shadowOpacity: e.pct("sdwO", 75),
      contour: {
        enabled: e.bool("useShape", false),
        contour: e.contour("MpgS"),
        antiAlias: e.bool("AntA", false),
        range: clamp(e.pct("Inpr", 50), ...L.range),
      },
      texture: {
        enabled: e.bool("useTexture", false),
        pattern: e.bool("useTexture", false) ? e.pattern() : "noise",
        scale: clamp(e.num("Scl ", 100, [1, 1000]) / 100, ...L.patternScale),
        depth: clamp(e.num("textureDepth", 100, [-1000, 1000]) / 100, ...L.textureDepth),
        invert: e.bool("InvT", false),
        align: e.bool("Algn", true),
        offsetX: phase.x,
        offsetY: phase.y,
      },
    };
  });

  // Everything goes through the same checks as edits and saved projects.
  const out: { [K in EffectKind]?: EffectByKind[K][] } = {};
  for (const kind of Object.keys(raw) as EffectKind[]) {
    const valid: unknown[] = [];
    for (const value of raw[kind]!) {
      try {
        valid.push(parseEffect(kind, value));
      } catch {
        notes.add("Some layer styles could not be read and were left out.");
      }
    }
    if (valid.length) (out as Record<string, unknown>)[kind] = valid;
  }
  return Object.keys(out).length ? out : undefined;
}

const FONT_MATCHES: [RegExp, FontFamily][] = [
  [/arial/i, "Arial"],
  [/helvetica/i, "Helvetica"],
  [/verdana/i, "Verdana"],
  [/trebuchet/i, "Trebuchet MS"],
  [/georgia/i, "Georgia"],
  [/times/i, "Times New Roman"],
  [/courier/i, "Courier New"],
  [/impact/i, "Impact"],
];

export function matchFont(postScriptName: string): FontFamily {
  for (const [re, family] of FONT_MATCHES) if (re.test(postScriptName)) return family;
  return FONT_FAMILIES[0];
}

const num = (v: EngineValue | undefined): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

function decodeText(body: Uint8Array, notes: Set<string>): PsdText | undefined {
  const r = new ByteReader(body);
  r.u16(); // version
  const xx = r.f64();
  const xy = r.f64();
  const yx = r.f64();
  const yy = r.f64();
  r.f64();
  r.f64();
  r.u16(); // text version
  const d = readVersionedDescriptor(r);
  const raw = getString(d, "Txt ");
  const engine = getBytes(d, "EngineData");
  if (raw === undefined) return undefined;
  const text = raw.replace(/\r\n?/g, "\n").replace(/\n$/, "").slice(0, 10_000);
  const rawScale = Math.hypot(yx, yy) || Math.hypot(xx, xy);
  const scale = Number.isFinite(rawScale) && rawScale > 0 && rawScale < 1000 ? rawScale : 1;
  let fontSize = 12;
  let color = "#000000";
  let fontName = "";
  let bold = false;
  let italic = false;
  let align: TextAlign = "left";
  let lineHeight = 1.2;
  let letterSpacing = 0;
  if (engine) {
    const root = parseEngineData(engine);
    const runs = enginePath(root, "EngineDict", "StyleRun", "RunArray");
    if (Array.isArray(runs) && runs.length > 1)
      notes.add("Text with mixed styles was simplified to its first style.");
    const style = enginePath(
      root,
      "EngineDict",
      "StyleRun",
      "RunArray",
      0,
      "StyleSheet",
      "StyleSheetData",
    );
    const size = num(enginePath(style ?? null, "FontSize"));
    if (size) fontSize = size;
    const fill = enginePath(style ?? null, "FillColor", "Values");
    if (Array.isArray(fill) && fill.length === 4) {
      const hex = (v: EngineValue) =>
        Math.round(clamp((num(v) ?? 0) * 255, 0, 255))
          .toString(16)
          .padStart(2, "0");
      color = `#${hex(fill[1])}${hex(fill[2])}${hex(fill[3])}`;
    }
    const fontIndex = num(enginePath(style ?? null, "Font")) ?? 0;
    const name = enginePath(root, "ResourceDict", "FontSet", fontIndex, "Name");
    if (typeof name === "string") fontName = name;
    bold = enginePath(style ?? null, "FauxBold") === true || /bold|black|heavy/i.test(fontName);
    italic = enginePath(style ?? null, "FauxItalic") === true || /italic|oblique/i.test(fontName);
    const leading = num(enginePath(style ?? null, "Leading"));
    if (enginePath(style ?? null, "AutoLeading") === false && leading)
      lineHeight = leading / fontSize;
    const tracking = num(enginePath(style ?? null, "Tracking"));
    if (tracking) letterSpacing = (tracking / 1000) * fontSize;
    const justification = num(
      enginePath(
        root,
        "EngineDict",
        "ParagraphRun",
        "RunArray",
        0,
        "ParagraphSheet",
        "Properties",
        "Justification",
      ),
    );
    align = justification === 1 ? "right" : justification === 2 ? "center" : "left";
  }
  if (getDescriptor(d, "warp") && getEnum(getDescriptor(d, "warp"), "warpStyle") !== "warpNone") {
    notes.add("Warped text was imported without its warp.");
  }
  notes.add("Text layers were imported as editable text. Check fonts and line spacing.");
  return {
    text,
    fontSize: clamp(fontSize * scale, 1, 2000),
    color,
    fontFamily: matchFont(fontName),
    bold,
    italic,
    align,
    lineHeight: clamp(lineHeight, 0.5, 5),
    letterSpacing: clamp(letterSpacing * scale, -100, 500),
  };
}

/** Placement of a smart object, or undefined when Picstea can't reproduce it (warps, filters). */
function decodePlaced(key: string, body: Uint8Array, notes: Set<string>): PsdPlaced | undefined {
  const r = new ByteReader(body);
  let id: string | undefined;
  let corners: number[] = [];
  let d: Descriptor | undefined;
  if (key === "SoLd" || key === "SoLE") {
    if (r.ascii(4) !== "soLD") return undefined;
    r.u32();
    d = readVersionedDescriptor(r);
    id = getString(d, "Idnt");
    corners = (getList(d, "Trnf") ?? []).map((v) => (typeof v === "number" ? v : NaN));
    const nonAffine = (getList(d, "nonAffineTransform") ?? []).map((v) =>
      typeof v === "number" ? v : NaN,
    );
    if (nonAffine.length === 8 && nonAffine.some((v, i) => Math.abs(v - corners[i]) > 0.01)) {
      notes.add("Smart objects with perspective were imported as pixels.");
      return undefined;
    }
  } else {
    if (r.ascii(4) !== "plcL") return undefined;
    r.u32();
    const n = r.u8();
    id = r.ascii(n);
    r.skip(16); // page, total pages, anti-alias, type
    for (let i = 0; i < 8; i++) corners.push(r.f64());
  }
  const warp = getDescriptor(d, "warp");
  if (warp && getEnum(warp, "warpStyle") && getEnum(warp, "warpStyle") !== "warpNone") {
    notes.add("Warped smart objects were imported as pixels.");
    return undefined;
  }
  if (d && d.filterFX !== undefined) {
    notes.add("Smart objects with Photoshop smart filters were imported as pixels.");
    return undefined;
  }
  if (
    !id ||
    corners.length !== 8 ||
    corners.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e6)
  ) {
    return undefined;
  }
  return { id, corners };
}

export interface ExtrasContext {
  readonly width: number;
  readonly height: number;
  /** Global light angle (image resource 1037), degrees. */
  readonly globalAngle: number;
}

/** Decode a layer's extras; anything that fails becomes a warning and is left out. */
export function decodeExtras(
  blocks: ReadonlyMap<string, Uint8Array>,
  ctx: ExtrasContext,
  warnings: Set<string>,
): PsdExtras {
  const out: { -readonly [K in keyof PsdExtras]: PsdExtras[K] } = {};
  const attempt = (what: string, run: () => void) => {
    try {
      run();
    } catch {
      warnings.add(`Some ${what} could not be read and were imported as pixels.`);
    }
  };
  for (const key of ADJUSTMENT_KEYS) {
    const body = blocks.get(key);
    if (!body || out.adjustment) continue;
    if (key === "CgEd" && blocks.has("brit")) continue;
    attempt("adjustment layers", () => {
      const decoded = decodeAdjustment(key, body, blocks);
      if (decoded) {
        out.adjustment = decoded.adjustment;
        decoded.notes.forEach((n) => warnings.add(n));
      } else {
        warnings.add("Some adjustment layers could not be read and were left out.");
      }
    });
  }
  for (const [key, name] of Object.entries(UNSUPPORTED_ADJUSTMENTS)) {
    if (blocks.has(key))
      warnings.add(`${name} adjustment layers are not supported yet and were left out.`);
  }
  const lfx2 = blocks.get("lfx2");
  if (lfx2)
    attempt("layer styles", () => (out.effects = decodeEffects(lfx2, ctx.globalAngle, warnings)));
  const iOpa = blocks.get("iOpa");
  if (iOpa && iOpa.length >= 1 && iOpa[0] < 255)
    out.fillOpacity = Math.round((iOpa[0] / 255) * 100) / 100;
  const vmsk = blocks.get("vmsk") ?? blocks.get("vsms");
  if (vmsk) {
    attempt("vector masks", () => {
      const mask = decodeVectorMask(vmsk, ctx.width, ctx.height);
      if (mask?.inverted) warnings.add("Inverted vector masks were imported without inversion.");
      if (mask) out.vectorMask = mask;
    });
  }
  const soco = blocks.get("SoCo");
  if (soco) {
    attempt("fill layers", () => {
      const color = getColor(readVersionedDescriptor(new ByteReader(soco)));
      if (color) out.fill = color;
    });
  }
  const vstk = blocks.get("vstk");
  if (vstk) {
    attempt("shape strokes", () => {
      const d = readVersionedDescriptor(new ByteReader(vstk));
      if (getBool(d, "fillEnabled") === false) out.fillDisabled = true;
      if (getBool(d, "strokeEnabled")) {
        const content = getDescriptor(d, "strokeStyleContent");
        out.stroke = {
          color: getColor(content) ?? "#000000",
          width: clamp(getNumber(d, "strokeStyleLineWidth") ?? 1, 0.01, 1000),
        };
      }
    });
  }
  const tysh = blocks.get("TySh");
  if (tysh) attempt("text layers", () => (out.text = decodeText(tysh, warnings)));
  for (const key of ["SoLd", "SoLE", "PlLd"]) {
    const body = blocks.get(key);
    if (!body || out.placed) continue;
    attempt("smart objects", () => (out.placed = decodePlaced(key, body, warnings)));
  }
  return out;
}
