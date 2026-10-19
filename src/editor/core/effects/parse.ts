import { parseGradientStops } from "../../adjustments/gradient";
import { isHexColor } from "../document/factory";
import { BLEND_MODES, type BlendMode } from "../document/types";
import {
  CONTOUR_PRESETS,
  EFFECT_KINDS,
  MAX_CONTOUR_POINTS,
  maxCopies,
  PATTERNS,
  type AnyEffect,
  type Contour,
  type ContourPreset,
  type EffectByKind,
  type EffectKind,
  type GlobalLight,
  type GlowFill,
  type LayerEffects,
  type PatternId,
  type StrokeFill,
} from "./model";

/**
 * Strict validation of layer styles from untrusted input (projects, PSD import, commands): every
 * field is checked, unknown fields are dropped, colours are lower-cased (ADR-0030).
 */

export class EffectError extends Error {
  override name = "EffectError";
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(message);
  }
}

/** Ranges shared by the parser, PSD import and the UI. */
export const EFFECT_LIMITS = {
  opacity: [0, 1],
  angle: [-360, 360],
  altitude: [0, 90],
  distance: [0, 30000],
  size: [0, 250],
  strokeSize: [1, 250],
  fraction: [0, 1],
  range: [0.01, 1],
  depth: [0.01, 10],
  textureDepth: [-10, 10],
  soften: [0, 16],
  gradientScale: [0.1, 1.5],
  offset: [-1.5, 1.5],
  patternScale: [0.01, 10],
  patternOffset: [-30000, 30000],
} as const;

type Range = readonly [number, number];
type Raw = Record<string, unknown>;

const own = (value: unknown, path: string): Raw => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new EffectError("must be an object", path);
  }
  // Own properties only: inherited values never count as settings.
  return Object.fromEntries(Object.entries(value));
};

const num = (o: Raw, key: string, [min, max]: Range, path: string): number => {
  const v = o[key];
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    throw new EffectError(`must be a number from ${min} to ${max}`, `${path}.${key}`);
  }
  return v;
};

const bool = (o: Raw, key: string, path: string): boolean => {
  if (typeof o[key] !== "boolean") throw new EffectError("must be true or false", `${path}.${key}`);
  return o[key] as boolean;
};

function oneOf<T extends string>(o: Raw, key: string, values: readonly T[], path: string): T {
  const v = o[key];
  if (typeof v !== "string" || !(values as readonly string[]).includes(v)) {
    throw new EffectError(`must be one of ${values.join(", ")}`, `${path}.${key}`);
  }
  return v as T;
}

const color = (o: Raw, key: string, path: string): string => {
  const v = o[key];
  if (typeof v !== "string" || !isHexColor(v)) {
    throw new EffectError("must be a #rrggbb colour", `${path}.${key}`);
  }
  return v.toLowerCase();
};

const blend = (o: Raw, key: string, path: string): BlendMode => oneOf(o, key, BLEND_MODES, path);

const stops = (o: Raw, key: string, path: string) => {
  const parsed = parseGradientStops(o[key]);
  if (!parsed) throw new EffectError("needs 2–16 valid gradient stops", `${path}.${key}`);
  // Kept in the given order: the editor's rows stay put while a stop is dragged past another.
  return parsed;
};

const CONTOUR_NAMES = [...Object.keys(CONTOUR_PRESETS), "custom"] as ContourPreset[];

export function parseContour(value: unknown, path: string): Contour {
  const o = own(value, path);
  const preset = oneOf(o, "preset", CONTOUR_NAMES, path);
  if (!Array.isArray(o.points) || o.points.length < 2 || o.points.length > MAX_CONTOUR_POINTS) {
    throw new EffectError(`needs 2–${MAX_CONTOUR_POINTS} points`, `${path}.points`);
  }
  const points = o.points.map((p, i) => {
    const q = own(p, `${path}.points[${i}]`);
    return {
      x: num(q, "x", [0, 1], `${path}.points[${i}]`),
      y: num(q, "y", [0, 1], `${path}.points[${i}]`),
    };
  });
  for (let i = 1; i < points.length; i++) {
    if (points[i].x < points[i - 1].x) {
      throw new EffectError("points must be ordered by x", `${path}.points`);
    }
  }
  return { preset, points };
}

function glowFill(value: unknown, path: string): GlowFill {
  const o = own(value, path);
  const kind = oneOf(o, "kind", ["color", "gradient"] as const, path);
  return kind === "color"
    ? { kind, color: color(o, "color", path) }
    : { kind, stops: stops(o, "stops", path), reverse: bool(o, "reverse", path) };
}

const GRADIENT_STYLES = ["linear", "radial", "angle", "reflected", "diamond"] as const;

function strokeFill(value: unknown, path: string): StrokeFill {
  const o = own(value, path);
  const kind = oneOf(o, "kind", ["color", "gradient"] as const, path);
  if (kind === "color") return { kind, color: color(o, "color", path) };
  return {
    kind,
    stops: stops(o, "stops", path),
    reverse: bool(o, "reverse", path),
    style: oneOf(o, "style", GRADIENT_STYLES, path),
    angle: num(o, "angle", EFFECT_LIMITS.angle, path),
    scale: num(o, "scale", EFFECT_LIMITS.gradientScale, path),
  };
}

const pattern = (o: Raw, key: string, path: string): PatternId => oneOf(o, key, PATTERNS, path);

/** One effect of a kind, rebuilt from known fields only. Throws `EffectError`. */
export function parseEffect<K extends EffectKind>(
  kind: K,
  value: unknown,
  path: string = kind,
): EffectByKind[K] {
  const o = own(value, path);
  const L = EFFECT_LIMITS;
  const enabled = bool(o, "enabled", path);
  let out: AnyEffect;
  if (kind === "bevel") {
    const contour = own(o.contour, `${path}.contour`);
    const texture = own(o.texture, `${path}.texture`);
    out = {
      enabled,
      style: oneOf(o, "style", ["inner", "outer", "emboss", "pillow", "stroke"] as const, path),
      technique: oneOf(o, "technique", ["smooth", "chisel-hard", "chisel-soft"] as const, path),
      depth: num(o, "depth", L.depth, path),
      direction: oneOf(o, "direction", ["up", "down"] as const, path),
      size: num(o, "size", L.size, path),
      soften: num(o, "soften", L.soften, path),
      angle: num(o, "angle", L.angle, path),
      altitude: num(o, "altitude", L.altitude, path),
      useGlobalLight: bool(o, "useGlobalLight", path),
      glossContour: parseContour(o.glossContour, `${path}.glossContour`),
      glossAntiAlias: bool(o, "glossAntiAlias", path),
      highlightMode: blend(o, "highlightMode", path),
      highlightColor: color(o, "highlightColor", path),
      highlightOpacity: num(o, "highlightOpacity", L.opacity, path),
      shadowMode: blend(o, "shadowMode", path),
      shadowColor: color(o, "shadowColor", path),
      shadowOpacity: num(o, "shadowOpacity", L.opacity, path),
      contour: {
        enabled: bool(contour, "enabled", `${path}.contour`),
        contour: parseContour(contour.contour, `${path}.contour.contour`),
        antiAlias: bool(contour, "antiAlias", `${path}.contour`),
        range: num(contour, "range", L.range, `${path}.contour`),
      },
      texture: {
        enabled: bool(texture, "enabled", `${path}.texture`),
        pattern: pattern(texture, "pattern", `${path}.texture`),
        scale: num(texture, "scale", L.patternScale, `${path}.texture`),
        depth: num(texture, "depth", L.textureDepth, `${path}.texture`),
        invert: bool(texture, "invert", `${path}.texture`),
        align: bool(texture, "align", `${path}.texture`),
        offsetX: num(texture, "offsetX", L.patternOffset, `${path}.texture`),
        offsetY: num(texture, "offsetY", L.patternOffset, `${path}.texture`),
      },
    };
    return out as EffectByKind[K];
  }
  const base = {
    enabled,
    blendMode: blend(o, "blendMode", path),
    opacity: num(o, "opacity", L.opacity, path),
  };
  const contour = () => parseContour(o.contour, `${path}.contour`);
  switch (kind) {
    case "dropShadow":
      out = {
        ...base,
        color: color(o, "color", path),
        angle: num(o, "angle", L.angle, path),
        useGlobalLight: bool(o, "useGlobalLight", path),
        distance: num(o, "distance", L.distance, path),
        spread: num(o, "spread", L.fraction, path),
        size: num(o, "size", L.size, path),
        noise: num(o, "noise", L.fraction, path),
        contour: contour(),
        antiAlias: bool(o, "antiAlias", path),
        knockout: bool(o, "knockout", path),
      };
      break;
    case "innerShadow":
      out = {
        ...base,
        color: color(o, "color", path),
        angle: num(o, "angle", L.angle, path),
        useGlobalLight: bool(o, "useGlobalLight", path),
        distance: num(o, "distance", L.distance, path),
        choke: num(o, "choke", L.fraction, path),
        size: num(o, "size", L.size, path),
        noise: num(o, "noise", L.fraction, path),
        contour: contour(),
        antiAlias: bool(o, "antiAlias", path),
      };
      break;
    case "outerGlow":
    case "innerGlow": {
      const common = {
        ...base,
        fill: glowFill(o.fill, `${path}.fill`),
        noise: num(o, "noise", L.fraction, path),
        technique: oneOf(o, "technique", ["softer", "precise"] as const, path),
        size: num(o, "size", L.size, path),
        contour: contour(),
        antiAlias: bool(o, "antiAlias", path),
        range: num(o, "range", L.range, path),
        jitter: num(o, "jitter", L.fraction, path),
      };
      out =
        kind === "outerGlow"
          ? { ...common, spread: num(o, "spread", L.fraction, path) }
          : {
              ...common,
              source: oneOf(o, "source", ["edge", "center"] as const, path),
              choke: num(o, "choke", L.fraction, path),
            };
      break;
    }
    case "satin":
      out = {
        ...base,
        color: color(o, "color", path),
        angle: num(o, "angle", L.angle, path),
        distance: num(o, "distance", L.distance, path),
        size: num(o, "size", L.size, path),
        contour: contour(),
        antiAlias: bool(o, "antiAlias", path),
        invert: bool(o, "invert", path),
      };
      break;
    case "colorOverlay":
      out = { ...base, color: color(o, "color", path) };
      break;
    case "gradientOverlay":
      out = {
        ...base,
        stops: stops(o, "stops", path),
        reverse: bool(o, "reverse", path),
        style: oneOf(o, "style", GRADIENT_STYLES, path),
        method: oneOf(o, "method", ["classic", "perceptual", "linear"] as const, path),
        align: bool(o, "align", path),
        angle: num(o, "angle", L.angle, path),
        scale: num(o, "scale", L.gradientScale, path),
        offsetX: num(o, "offsetX", L.offset, path),
        offsetY: num(o, "offsetY", L.offset, path),
        dither: bool(o, "dither", path),
      };
      break;
    case "patternOverlay":
      out = {
        ...base,
        pattern: pattern(o, "pattern", path),
        angle: num(o, "angle", L.angle, path),
        scale: num(o, "scale", L.patternScale, path),
        align: bool(o, "align", path),
        offsetX: num(o, "offsetX", L.patternOffset, path),
        offsetY: num(o, "offsetY", L.patternOffset, path),
      };
      break;
    case "stroke":
      out = {
        ...base,
        size: num(o, "size", L.strokeSize, path),
        position: oneOf(o, "position", ["outside", "inside", "center"] as const, path),
        fill: strokeFill(o.fill, `${path}.fill`),
        overprint: bool(o, "overprint", path),
      };
      break;
    default:
      throw new EffectError("is not a known effect", path);
  }
  return out as EffectByKind[K];
}

/** A layer's styles: known kinds only, each a list within its copy limit. Throws `EffectError`. */
export function parseLayerEffects(value: unknown, path = "effects"): LayerEffects {
  const o = own(value, path);
  const out: { [K in EffectKind]?: EffectByKind[K][] } = {};
  for (const kind of EFFECT_KINDS) {
    const list = o[kind];
    if (list === undefined) continue;
    if (!Array.isArray(list) || list.length > maxCopies(kind)) {
      throw new EffectError(`must be a list of at most ${maxCopies(kind)}`, `${path}.${kind}`);
    }
    if (list.length === 0) continue;
    (out as Record<string, unknown>)[kind] = list.map((e, i) =>
      parseEffect(kind, e, `${path}.${kind}[${i}]`),
    );
  }
  return out;
}

export function parseGlobalLight(value: unknown, path = "globalLight"): GlobalLight {
  const o = own(value, path);
  return {
    angle: num(o, "angle", EFFECT_LIMITS.angle, path),
    altitude: num(o, "altitude", EFFECT_LIMITS.altitude, path),
  };
}
