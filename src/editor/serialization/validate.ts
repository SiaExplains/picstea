import { isHexColor } from "../core/document/factory";
import { checkDimensions, MAX_DIMENSION } from "../core/document/limits";
import { walkLayers } from "../core/document/tree";
import { checkEffect } from "../core/commands/effect-commands";
import { parseAdjustment } from "../adjustments/registry";
import { MAX_GUIDES } from "../core/commands/guide-commands";
import {
  BLEND_MODES,
  FONT_FAMILIES,
  type FontFamily,
  type StrokeStyle,
  type BlendMode,
  type EditorDocument,
  type Guide,
  type Layer,
  type LayerEffects,
  type LayerMask,
  type Transform,
} from "../core/document/types";

/**
 * Strict validation of stored/imported documents. Records may be corrupt, written by a newer
 * version, or tampered with, so nothing is trusted. Output objects are built field by field —
 * never spread from input — so unknown keys (including `__proto__`) cannot leak through.
 */

export class ValidationError extends Error {
  override name = "ValidationError";
}

type Obj = Record<string, unknown>;

const MAX_LAYERS = 10_000;
const MAX_TEXT = 1_000;
const MAX_COORDINATE = 1e7;

function fail(path: string, expected: string): never {
  throw new ValidationError(`${path}: expected ${expected}`);
}

function obj(value: unknown, path: string): Obj {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(path, "object");
  return value as Obj;
}

function str(value: unknown, path: string, max = MAX_TEXT): string {
  if (typeof value !== "string" || value.length > max) fail(path, `string ≤ ${max} chars`);
  return value;
}

function num(value: unknown, path: string, min = -MAX_COORDINATE, max = MAX_COORDINATE): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    fail(path, `number in [${min}, ${max}]`);
  }
  return value;
}

function int(value: unknown, path: string, min: number, max: number): number {
  const n = num(value, path, min, max);
  if (!Number.isInteger(n)) fail(path, "integer");
  return n;
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "boolean");
  return value;
}

function isoDate(value: unknown, path: string): string {
  const s = str(value, path, 64);
  if (Number.isNaN(Date.parse(s))) fail(path, "ISO date");
  return s;
}

function blendMode(value: unknown, path: string): BlendMode {
  if (typeof value !== "string" || !(BLEND_MODES as readonly string[]).includes(value)) {
    fail(path, "blend mode");
  }
  return value as BlendMode;
}

function transform(value: unknown, path: string): Transform {
  const o = obj(value, path);
  return {
    x: num(o.x, `${path}.x`),
    y: num(o.y, `${path}.y`),
    scaleX: num(o.scaleX, `${path}.scaleX`, -1000, 1000),
    scaleY: num(o.scaleY, `${path}.scaleY`, -1000, 1000),
    rotation: num(o.rotation, `${path}.rotation`, -360, 360),
  };
}

export const MAX_GROUP_DEPTH = 32;

interface Budget {
  count: number;
}

function mask(value: unknown, path: string): LayerMask {
  const o = obj(value, path);
  return {
    assetId: o.assetId === null ? null : str(o.assetId, `${path}.assetId`, 128),
    enabled: bool(o.enabled, `${path}.enabled`),
    x: num(o.x, `${path}.x`),
    y: num(o.y, `${path}.y`),
    width: int(o.width, `${path}.width`, 1, MAX_DIMENSION),
    height: int(o.height, `${path}.height`, 1, MAX_DIMENSION),
    linked: bool(o.linked, `${path}.linked`),
  };
}

function effects(value: unknown, path: string): LayerEffects {
  const o = obj(value, path);
  const out: Record<string, unknown> = {};
  for (const kind of ["dropShadow", "outerGlow", "stroke", "colorOverlay"] as const) {
    if (o[kind] === undefined) continue;
    const e = obj(o[kind], `${path}.${kind}`);
    const error = checkEffect(kind, e);
    if (error) fail(`${path}.${kind}`, error);
    // Rebuild with known fields only.
    const common = {
      enabled: e.enabled,
      color: (e.color as string).toLowerCase(),
      opacity: e.opacity,
    };
    out[kind] =
      kind === "dropShadow"
        ? { ...common, angle: e.angle, distance: e.distance, blur: e.blur }
        : kind === "colorOverlay"
          ? common
          : { ...common, size: e.size };
  }
  return out as LayerEffects;
}

function layer(value: unknown, path: string, depth: number, budget: Budget): Layer {
  if (depth > MAX_GROUP_DEPTH) fail(path, `groups nested at most ${MAX_GROUP_DEPTH} deep`);
  if (++budget.count > MAX_LAYERS) fail(path, `at most ${MAX_LAYERS} layers`);
  const o = obj(value, path);
  const isGroupLayer = o.kind === "group";
  const base = {
    id: str(o.id, `${path}.id`, 128),
    name: str(o.name, `${path}.name`, 255),
    visible: bool(o.visible, `${path}.visible`),
    locked: bool(o.locked, `${path}.locked`),
    opacity: num(o.opacity, `${path}.opacity`, 0, 1),
    // Groups also accept "pass-through"; they set their own blend mode below.
    blendMode: isGroupLayer ? ("normal" as BlendMode) : blendMode(o.blendMode, `${path}.blendMode`),
    transform: transform(o.transform, `${path}.transform`),
    ...(o.mask !== undefined ? { mask: mask(o.mask, `${path}.mask`) } : {}),
    ...(o.effects !== undefined ? { effects: effects(o.effects, `${path}.effects`) } : {}),
  };
  if (isGroupLayer) {
    if (!Array.isArray(o.children)) fail(`${path}.children`, "array");
    const groupBlend =
      o.blendMode === "pass-through" ? "pass-through" : blendMode(o.blendMode, `${path}.blendMode`);
    return {
      ...base,
      kind: "group",
      blendMode: groupBlend,
      expanded: bool(o.expanded, `${path}.expanded`),
      children: o.children.map((c, i) => layer(c, `${path}.children[${i}]`, depth + 1, budget)),
    };
  }
  switch (o.kind) {
    case "adjustment": {
      const adjustment = parseAdjustment(o.adjustment);
      if (!adjustment) fail(`${path}.adjustment`, "known adjustment within range");
      return { ...base, kind: "adjustment", adjustment };
    }
    case "raster": {
      const width = int(o.width, `${path}.width`, 1, 1e6);
      const height = int(o.height, `${path}.height`, 1, 1e6);
      if (!checkDimensions(width, height).ok) fail(`${path}`, "raster within size limits");
      return {
        ...base,
        kind: "raster",
        assetId: o.assetId === null ? null : str(o.assetId, `${path}.assetId`, 128),
        width,
        height,
      };
    }
    case "fill": {
      return { ...base, kind: "fill", color: hexColor(o.color, `${path}.color`) };
    }
    case "shape": {
      if (o.shape !== "rect" && o.shape !== "ellipse" && o.shape !== "line") {
        fail(`${path}.shape`, "rect|ellipse|line");
      }
      return {
        ...base,
        kind: "shape",
        shape: o.shape,
        width: num(o.width, `${path}.width`, 0, 1e6),
        height: num(o.height, `${path}.height`, 0, 1e6),
        fill: o.fill === null || o.shape === "line" ? null : hexColor(o.fill, `${path}.fill`),
        stroke: o.stroke === null ? null : stroke(o.stroke, `${path}.stroke`),
        cornerRadius: num(o.cornerRadius, `${path}.cornerRadius`, 0, 1e6),
      };
    }
    case "text": {
      if (
        typeof o.fontFamily !== "string" ||
        !(FONT_FAMILIES as readonly string[]).includes(o.fontFamily)
      ) {
        fail(`${path}.fontFamily`, "known font");
      }
      if (o.fontWeight !== 400 && o.fontWeight !== 700) fail(`${path}.fontWeight`, "400|700");
      if (o.align !== "left" && o.align !== "center" && o.align !== "right") {
        fail(`${path}.align`, "left|center|right");
      }
      return {
        ...base,
        kind: "text",
        text: str(o.text, `${path}.text`, 10_000),
        fontFamily: o.fontFamily as FontFamily,
        fontSize: num(o.fontSize, `${path}.fontSize`, 1, 2000),
        fontWeight: o.fontWeight,
        italic: bool(o.italic, `${path}.italic`),
        color: hexColor(o.color, `${path}.color`),
        align: o.align,
        lineHeight: num(o.lineHeight, `${path}.lineHeight`, 0.5, 5),
        letterSpacing: num(o.letterSpacing, `${path}.letterSpacing`, -100, 500),
      };
    }
    default:
      fail(`${path}.kind`, "known layer kind");
  }
}

function hexColor(value: unknown, path: string): string {
  const color = str(value, path, 7);
  if (!isHexColor(color)) fail(path, "#rrggbb");
  return color.toLowerCase();
}

function stroke(value: unknown, path: string): StrokeStyle {
  const o = obj(value, path);
  return {
    color: hexColor(o.color, `${path}.color`),
    width: num(o.width, `${path}.width`, 0.01, 1000),
  };
}

function guide(value: unknown, path: string): Guide {
  const o = obj(value, path);
  if (o.orientation !== "horizontal" && o.orientation !== "vertical") {
    fail(`${path}.orientation`, "horizontal|vertical");
  }
  return {
    id: str(o.id, `${path}.id`, 128),
    orientation: o.orientation,
    position: num(o.position, `${path}.position`),
  };
}

export function validateDocument(value: unknown): EditorDocument {
  const o = obj(value, "document");
  const width = int(o.width, "document.width", 1, 1e6);
  const height = int(o.height, "document.height", 1, 1e6);
  const dims = checkDimensions(width, height);
  if (!dims.ok) throw new ValidationError(`document: ${dims.reason}`);

  if (!Array.isArray(o.layers) || o.layers.length > MAX_LAYERS) fail("document.layers", "array");
  const budget: Budget = { count: 0 };
  const layers = o.layers.map((l, i) => layer(l, `document.layers[${i}]`, 0, budget));
  const ids = new Set<string>();
  walkLayers(layers, (l) => {
    if (ids.has(l.id)) throw new ValidationError("document.layers: duplicate layer ids");
    ids.add(l.id);
  });

  let activeLayerId: string | null = null;
  if (o.activeLayerId !== null && o.activeLayerId !== undefined) {
    activeLayerId = str(o.activeLayerId, "document.activeLayerId", 128);
    // A dangling selection is harmless; repair it rather than rejecting the whole document.
    if (!ids.has(activeLayerId)) activeLayerId = layers.at(-1)?.id ?? null;
  }

  if (!Array.isArray(o.guides) || o.guides.length > MAX_GUIDES) fail("document.guides", "array");
  if (o.colorSpace !== "srgb") fail("document.colorSpace", "srgb");
  const metadata = obj(o.metadata, "document.metadata");

  return {
    id: str(o.id, "document.id", 128),
    name: str(o.name, "document.name", 255),
    width,
    height,
    resolution: num(o.resolution, "document.resolution", 1, 100_000),
    colorSpace: "srgb",
    layers,
    activeLayerId,
    guides: o.guides.map((g, i) => guide(g, `document.guides[${i}]`)),
    metadata: {
      createdAt: isoDate(metadata.createdAt, "document.metadata.createdAt"),
      modifiedAt: isoDate(metadata.modifiedAt, "document.metadata.modifiedAt"),
    },
  };
}
