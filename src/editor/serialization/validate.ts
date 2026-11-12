import { isHexColor } from "../core/document/factory";
import { isFontFamilyName } from "../core/document/text";
import { checkDimensions, MAX_DIMENSION } from "../core/document/limits";
import { MAX_GROUP_DEPTH, walkLayers } from "../core/document/tree";
import { EffectError, parseGlobalLight, parseLayerEffects } from "../core/effects/parse";
import {
  BlendingError,
  hasBlendIf,
  hasChannelLimits,
  parseBlendIf,
  parseChannels,
} from "../core/document/blending";
import { parseAdjustment } from "../adjustments/registry";
import { MAX_GUIDES } from "../core/commands/guide-commands";
import { filterById, parseFilterValues } from "../filters/registry";
import { anchorCount, parsePath, type VectorPath } from "../core/path/path";
import {
  BLEND_MODES,
  LAYER_LABELS,
  type LayerLabel,
  type CharStyle,
  type DocumentFont,
  type ParagraphStyle,
  type StrokeStyle,
  type TextRun,
  type BlendMode,
  type EditorDocument,
  type Guide,
  type Layer,
  type GlobalLight,
  type LayerEffects,
  type LayerMask,
  type Transform,
  type SmartFilter,
  type SmartDistortion,
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

function layerLabel(value: unknown, path: string): LayerLabel {
  if (typeof value !== "string" || !(LAYER_LABELS as readonly string[]).includes(value)) {
    fail(path, "layer colour label");
  }
  return value as LayerLabel;
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

const MAX_TEXT_CHARS = 10_000;
const MAX_TEXT_RUNS = 5_000;
const MAX_DOCUMENT_FONTS = 500;

function fontFamilyName(value: unknown, path: string): string {
  if (!isFontFamilyName(value)) fail(path, "font family name");
  return value;
}

function textAlign(value: unknown, path: string): ParagraphStyle["align"] {
  if (value !== "left" && value !== "center" && value !== "right" && value !== "justify") {
    fail(path, "left|center|right|justify");
  }
  return value;
}

/** Character style fields; `complete` requires every field (a layer's base style). */
function charStyle(o: Obj, path: string, complete: boolean): Partial<CharStyle> {
  const out: Record<string, unknown> = {};
  const field = (key: keyof CharStyle, read: (v: unknown, p: string) => unknown) => {
    if (o[key] === undefined && !complete) return;
    out[key] = read(o[key], `${path}.${key}`);
  };
  field("fontFamily", fontFamilyName);
  field("fontSize", (v, p) => num(v, p, 1, 2000));
  field("fontWeight", (v, p) => {
    if (v !== 400 && v !== 700) fail(p, "400|700");
    return v;
  });
  field("italic", bool);
  field("color", hexColor);
  field("lineHeight", (v, p) => num(v, p, 0.5, 5));
  field("letterSpacing", (v, p) => num(v, p, -100, 500));
  field("baselineShift", (v, p) => num(v, p, -1000, 1000));
  field("caps", (v, p) => {
    if (v !== "normal" && v !== "all-caps" && v !== "small-caps") {
      fail(p, "normal|all-caps|small-caps");
    }
    return v;
  });
  field("kerning", bool);
  return out as Partial<CharStyle>;
}

function paragraphStyle(value: unknown, path: string): ParagraphStyle {
  const o = obj(value, path);
  return {
    align: textAlign(o.align, `${path}.align`),
    indentLeft: num(o.indentLeft, `${path}.indentLeft`, -1e5, 1e5),
    indentRight: num(o.indentRight, `${path}.indentRight`, -1e5, 1e5),
    indentFirst: num(o.indentFirst, `${path}.indentFirst`, -1e5, 1e5),
    spaceBefore: num(o.spaceBefore, `${path}.spaceBefore`, 0, 1e5),
    spaceAfter: num(o.spaceAfter, `${path}.spaceAfter`, 0, 1e5),
  };
}

function documentFont(value: unknown, path: string): DocumentFont {
  const o = obj(value, path);
  if (o.weight !== 400 && o.weight !== 700) fail(`${path}.weight`, "400|700");
  if (o.source !== "bundled" && o.source !== "local" && o.source !== "uploaded") {
    fail(`${path}.source`, "bundled|local|uploaded");
  }
  if (o.source === "uploaded" && typeof o.assetId !== "string") fail(`${path}.assetId`, "string");
  return {
    family: fontFamilyName(o.family, `${path}.family`),
    weight: o.weight,
    italic: bool(o.italic, `${path}.italic`),
    source: o.source,
    ...(o.postscriptName !== undefined
      ? { postscriptName: str(o.postscriptName, `${path}.postscriptName`, 128) }
      : {}),
    ...(o.source === "uploaded" ? { assetId: str(o.assetId, `${path}.assetId`, 128) } : {}),
  };
}

export { MAX_GROUP_DEPTH };

interface Budget {
  count: number;
  /** Smart objects nested around the layers being validated. */
  smartDepth: number;
  /** Path anchors across the whole document. */
  anchors: number;
}

/** Anchors a whole document may hold across all its paths. */
const MAX_DOCUMENT_ANCHORS = 100_000;

function vectorPath(value: unknown, path: string, budget: Budget): VectorPath {
  const parsed = parsePath(value);
  if (!parsed) fail(path, "valid path");
  budget.anchors += anchorCount(parsed);
  if (budget.anchors > MAX_DOCUMENT_ANCHORS)
    fail(path, `at most ${MAX_DOCUMENT_ANCHORS} path points`);
  return parsed;
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
  try {
    return parseLayerEffects(value, path);
  } catch (error) {
    if (error instanceof EffectError) fail(error.path, error.message);
    throw error;
  }
}

/** Blend If and channels; values that change nothing are left out. */
function advancedBlending(o: Record<string, unknown>, path: string) {
  try {
    const blendIf =
      o.blendIf !== undefined ? parseBlendIf(o.blendIf, `${path}.blendIf`) : undefined;
    const channels =
      o.channels !== undefined ? parseChannels(o.channels, `${path}.channels`) : undefined;
    return {
      ...(hasBlendIf(blendIf) ? { blendIf } : {}),
      ...(hasChannelLimits(channels) ? { channels } : {}),
    };
  } catch (error) {
    if (error instanceof BlendingError) fail(error.path, error.message);
    throw error;
  }
}

function globalLight(value: unknown, path: string): GlobalLight {
  try {
    return parseGlobalLight(value, path);
  } catch (error) {
    if (error instanceof EffectError) fail(error.path, error.message);
    throw error;
  }
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
    ...(o.fillOpacity !== undefined
      ? { fillOpacity: num(o.fillOpacity, `${path}.fillOpacity`, 0, 1) }
      : {}),
    ...advancedBlending(o, path),
    ...(o.vectorMask !== undefined
      ? (() => {
          const v = obj(o.vectorMask, `${path}.vectorMask`);
          return {
            vectorMask: {
              path: vectorPath(v.path, `${path}.vectorMask.path`, budget),
              enabled: bool(v.enabled, `${path}.vectorMask.enabled`),
              linked: bool(v.linked, `${path}.vectorMask.linked`),
            },
          };
        })()
      : {}),
    ...(o.clipped !== undefined ? { clipped: bool(o.clipped, `${path}.clipped`) } : {}),
    ...(o.label !== undefined ? { label: layerLabel(o.label, `${path}.label`) } : {}),
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
    case "smart": {
      if (budget.smartDepth >= MAX_SMART_DEPTH) {
        fail(path, `smart objects nested at most ${MAX_SMART_DEPTH} deep`);
      }
      budget.smartDepth++;
      const content = documentAt(o.content, `${path}.content`, budget);
      budget.smartDepth--;
      if (o.filters !== undefined && (!Array.isArray(o.filters) || o.filters.length > 32)) {
        fail(`${path}.filters`, "at most 32 filters");
      }
      const filters = Array.isArray(o.filters)
        ? o.filters.map((f, i) => smartFilter(f, `${path}.filters[${i}]`))
        : undefined;
      const distortion =
        o.distortion === undefined
          ? undefined
          : smartDistortion(o.distortion, `${path}.distortion`);
      return {
        ...base,
        kind: "smart",
        content,
        ...(filters ? { filters } : {}),
        ...(distortion ? { distortion } : {}),
      };
    }
    case "fill": {
      return { ...base, kind: "fill", color: hexColor(o.color, `${path}.color`) };
    }
    case "shape": {
      if (o.shape !== "rect" && o.shape !== "ellipse" && o.shape !== "line" && o.shape !== "path") {
        fail(`${path}.shape`, "rect|ellipse|line|path");
      }
      return {
        ...(o.shape === "path" ? { path: vectorPath(o.path, `${path}.path`, budget) } : {}),
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
      const text = str(o.text, `${path}.text`, MAX_TEXT_CHARS);
      const style = charStyle(o, path, true) as CharStyle;
      const box =
        o.box === null
          ? null
          : (() => {
              const b = obj(o.box, `${path}.box`);
              return {
                width: num(b.width, `${path}.box.width`, 1, 1e6),
                height: num(b.height, `${path}.box.height`, 1, 1e6),
              };
            })();
      if (!Array.isArray(o.runs) || o.runs.length > MAX_TEXT_RUNS) fail(`${path}.runs`, "array");
      let previousEnd = 0;
      const runs = o.runs.map((value, i): TextRun => {
        const r = obj(value, `${path}.runs[${i}]`);
        const start = int(r.start, `${path}.runs[${i}].start`, previousEnd, text.length);
        const end = int(r.end, `${path}.runs[${i}].end`, start + 1, text.length);
        previousEnd = end;
        return {
          start,
          end,
          style: charStyle(
            obj(r.style, `${path}.runs[${i}].style`),
            `${path}.runs[${i}].style`,
            false,
          ),
        };
      });
      if (!Array.isArray(o.paragraphs) || o.paragraphs.length > MAX_TEXT_RUNS) {
        fail(`${path}.paragraphs`, "array");
      }
      return {
        ...base,
        kind: "text",
        text,
        ...style,
        align: textAlign(o.align, `${path}.align`),
        box,
        runs,
        paragraphs: o.paragraphs.map((p, i) => paragraphStyle(p, `${path}.paragraphs[${i}]`)),
      };
    }
    default:
      fail(`${path}.kind`, "known layer kind");
  }
}

/** A smart object's distortion (ADR-0044): 4 finite corners, or 16 control points and a style. */
function smartDistortion(value: unknown, path: string): SmartDistortion {
  const o = obj(value, path);
  const points = (v: unknown, count: number, at: string) => {
    if (!Array.isArray(v) || v.length !== count) fail(at, `${count} numbers`);
    return v.map((n, i) => num(n, `${at}[${i}]`));
  };
  if (o.kind === "perspective") {
    return { kind: "perspective", corners: points(o.corners, 8, `${path}.corners`) };
  }
  if (o.kind === "warp") {
    return {
      kind: "warp",
      mesh: points(o.mesh, 32, `${path}.mesh`),
      style: str(o.style, `${path}.style`, 32),
    };
  }
  return fail(`${path}.kind`, "perspective|warp");
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
  return documentAt(value, "document", { count: 0, anchors: 0, smartDepth: 0 });
}

/** Smart objects inside smart objects, at most this deep. */
export const MAX_SMART_DEPTH = 4;

function smartFilter(value: unknown, path: string): SmartFilter {
  const o = obj(value, path);
  const filter = filterById(str(o.filterId, `${path}.filterId`, 64));
  if (!filter) fail(`${path}.filterId`, "known filter");
  const values = parseFilterValues(filter, o.values);
  if (!values) fail(`${path}.values`, "filter settings within range");
  return {
    id: str(o.id, `${path}.id`, 128),
    filterId: filter.id,
    values,
    enabled: bool(o.enabled, `${path}.enabled`),
    seed: int(o.seed, `${path}.seed`, 0, 2 ** 31),
  };
}

function documentAt(value: unknown, at: string, budget: Budget): EditorDocument {
  const o = obj(value, at);
  const width = int(o.width, `${at}.width`, 1, 1e6);
  const height = int(o.height, `${at}.height`, 1, 1e6);
  const dims = checkDimensions(width, height);
  if (!dims.ok) throw new ValidationError(`${at}: ${dims.reason}`);

  if (!Array.isArray(o.layers) || o.layers.length > MAX_LAYERS) fail(`${at}.layers`, "array");
  const layers = o.layers.map((l, i) => layer(l, `${at}.layers[${i}]`, 0, budget));
  const ids = new Set<string>();
  walkLayers(layers, (l) => {
    if (ids.has(l.id)) throw new ValidationError(`${at}.layers: duplicate layer ids`);
    ids.add(l.id);
  });

  let activeLayerId: string | null = null;
  if (o.activeLayerId !== null && o.activeLayerId !== undefined) {
    activeLayerId = str(o.activeLayerId, `${at}.activeLayerId`, 128);
    // A dangling selection is harmless; repair it rather than rejecting the whole document.
    if (!ids.has(activeLayerId)) activeLayerId = layers.at(-1)?.id ?? null;
  }

  if (!Array.isArray(o.guides) || o.guides.length > MAX_GUIDES) fail(`${at}.guides`, "array");
  if (o.colorSpace !== "srgb") fail(`${at}.colorSpace`, "srgb");
  const metadata = obj(o.metadata, `${at}.metadata`);

  return {
    id: str(o.id, `${at}.id`, 128),
    name: str(o.name, `${at}.name`, 255),
    width,
    height,
    resolution: num(o.resolution, `${at}.resolution`, 1, 100_000),
    colorSpace: "srgb",
    layers,
    activeLayerId,
    guides: o.guides.map((g, i) => guide(g, `${at}.guides[${i}]`)),
    ...(o.workPath !== undefined && o.workPath !== null
      ? { workPath: vectorPath(o.workPath, `${at}.workPath`, budget) }
      : {}),
    ...(o.globalLight !== undefined
      ? { globalLight: globalLight(o.globalLight, `${at}.globalLight`) }
      : {}),
    ...(o.fonts !== undefined
      ? {
          fonts: (Array.isArray(o.fonts) && o.fonts.length <= MAX_DOCUMENT_FONTS
            ? o.fonts
            : fail(`${at}.fonts`, "array")
          ).map((f, i) => documentFont(f, `${at}.fonts[${i}]`)),
        }
      : {}),
    metadata: {
      createdAt: isoDate(metadata.createdAt, `${at}.metadata.createdAt`),
      modifiedAt: isoDate(metadata.modifiedAt, `${at}.metadata.modifiedAt`),
    },
  };
}
