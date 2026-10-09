import { checkEffect, EFFECT_LIMITS, normalizeEffect } from "../../core/commands/effect-commands";
import {
  FONT_FAMILIES,
  type Adjustment,
  type FontFamily,
  type EffectKind,
  type LayerEffects,
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
const opacity = (d: Descriptor | undefined) => clamp((getNumber(d, "Opct") ?? 100) / 100, 0, 1);

/** The first enabled entry of an effect: newer files use `…Multi` lists. */
function effect(fx: Descriptor, key: string, multi: string): Descriptor | undefined {
  const list = getList(fx, multi);
  if (list) {
    const items = list.filter(
      (v): v is Descriptor => !!v && typeof v === "object" && !Array.isArray(v),
    );
    return items.find((d) => getBool(d, "enab") !== false) ?? items[0];
  }
  return getDescriptor(fx, key);
}

function decodeEffects(
  body: Uint8Array,
  globalAngle: number,
  notes: Set<string>,
): LayerEffects | undefined {
  const r = new ByteReader(body);
  r.u32(); // object effects version
  const fx = readVersionedDescriptor(r);
  if (getBool(fx, "masterFXSwitch") === false) return undefined;
  const out: { -readonly [K in keyof LayerEffects]: LayerEffects[K] } = {};
  const shadow = effect(fx, "DrSh", "dropShadowMulti");
  if (shadow) {
    const angle = getBool(shadow, "uglg")
      ? globalAngle
      : (getNumber(shadow, "lagl") ?? globalAngle);
    out.dropShadow = {
      enabled: getBool(shadow, "enab") ?? true,
      color: getColor(shadow) ?? "#000000",
      opacity: opacity(shadow),
      angle: clamp(angle, ...EFFECT_LIMITS.angle),
      distance: clamp(getNumber(shadow, "Dstn") ?? 5, ...EFFECT_LIMITS.distance),
      blur: clamp(getNumber(shadow, "blur") ?? 5, ...EFFECT_LIMITS.blur),
    };
  }
  const glow = effect(fx, "OrGl", "outerGlowMulti");
  if (glow) {
    out.outerGlow = {
      enabled: getBool(glow, "enab") ?? true,
      color: getColor(glow) ?? "#ffffbe",
      opacity: opacity(glow),
      size: clamp(getNumber(glow, "blur") ?? 5, ...EFFECT_LIMITS.size),
    };
  }
  const stroke = effect(fx, "FrFX", "frameFXMulti");
  if (stroke) {
    const style = getEnum(stroke, "Styl");
    if (style && style !== "OutF")
      notes.add("Inside and centred strokes were imported as outside strokes.");
    out.stroke = {
      enabled: getBool(stroke, "enab") ?? true,
      color: getColor(stroke) ?? "#000000",
      opacity: opacity(stroke),
      size: clamp(getNumber(stroke, "Sz  ") ?? 3, ...EFFECT_LIMITS.size),
    };
  }
  const overlay = effect(fx, "SoFi", "solidFillMulti");
  if (overlay) {
    out.colorOverlay = {
      enabled: getBool(overlay, "enab") ?? true,
      color: getColor(overlay) ?? "#ff0000",
      opacity: opacity(overlay),
    };
  }
  const inner = effect(fx, "IrSh", "innerShadowMulti");
  if (inner) {
    const angle = getBool(inner, "uglg") ? globalAngle : (getNumber(inner, "lagl") ?? globalAngle);
    out.innerShadow = {
      enabled: getBool(inner, "enab") ?? true,
      color: getColor(inner) ?? "#000000",
      opacity: opacity(inner),
      angle: clamp(angle, ...EFFECT_LIMITS.angle),
      distance: clamp(getNumber(inner, "Dstn") ?? 5, ...EFFECT_LIMITS.distance),
      blur: clamp(getNumber(inner, "blur") ?? 5, ...EFFECT_LIMITS.blur),
    };
  }
  const bevel = getDescriptor(fx, "ebbl");
  if (bevel) {
    const style = getEnum(bevel, "bvlS");
    if (style && style !== "InrB") {
      notes.add("Outer bevels and embossing were imported as inner bevels.");
    }
    const angle = getBool(bevel, "uglg") ? globalAngle : (getNumber(bevel, "lagl") ?? globalAngle);
    out.bevel = {
      enabled: getBool(bevel, "enab") ?? true,
      color: getColor(bevel, "hglC") ?? "#ffffff",
      opacity: clamp((getNumber(bevel, "hglO") ?? 75) / 100, 0, 1),
      shadowColor: getColor(bevel, "sdwC") ?? "#000000",
      shadowOpacity: clamp((getNumber(bevel, "sdwO") ?? 75) / 100, 0, 1),
      angle: clamp(angle, ...EFFECT_LIMITS.angle),
      size: clamp(getNumber(bevel, "blur") ?? 5, ...EFFECT_LIMITS.size),
      direction: getEnum(bevel, "bvlD") === "Out " ? "down" : "up",
    };
  }
  const fill = effect(fx, "GrFl", "gradientFillMulti");
  if (fill) {
    const gradient = getDescriptor(fill, "Grad");
    const stops = (getList(gradient, "Clrs") ?? [])
      .filter((v): v is Descriptor => !!v && typeof v === "object" && !Array.isArray(v))
      .map((stop) => ({
        position: clamp((getNumber(stop, "Lctn") ?? 0) / 4096, 0, 1),
        color: getColor(stop) ?? "#000000",
      }))
      .sort((a, b) => a.position - b.position);
    if (stops.length > 16) {
      // Keep both ends; drop stops from the middle.
      stops.splice(15, stops.length - 16);
      notes.add("Gradient overlays were limited to 16 colours.");
    }
    const type = getEnum(fill, "Type");
    if (type && type !== "Lnr ")
      notes.add("Radial and other gradient overlays were imported as linear.");
    if (getEnum(gradient, "GrdF") === "ClNs" || stops.length < 2) {
      notes.add("Noise gradient overlays were not imported.");
    } else {
      out.gradientOverlay = {
        enabled: getBool(fill, "enab") ?? true,
        opacity: opacity(fill),
        angle: clamp(getNumber(fill, "Angl") ?? 90, ...EFFECT_LIMITS.angle),
        stops,
        reverse: getBool(fill, "Rvrs") ?? false,
      };
    }
  }
  // Everything goes through the same checks as edits and saved projects.
  for (const kind of Object.keys(out) as EffectKind[]) {
    const value = out[kind] as unknown as Record<string, unknown>;
    if (checkEffect(kind, value)) {
      delete out[kind];
      notes.add("Some layer styles could not be read and were left out.");
    } else {
      (out as Record<string, unknown>)[kind] = normalizeEffect(kind, value);
    }
  }
  const others = ["IrGl", "ChFX", "patternFill"];
  if (others.some((k) => fx[k] !== undefined && fx[k] !== null)) {
    notes.add("Some layer styles (inner glow, satin or pattern) were not imported.");
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

/** Placement of a smart object, or undefined when MYLPER can't reproduce it (warps, filters). */
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
