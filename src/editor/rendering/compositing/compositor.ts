import { applyAdjustment } from "../../adjustments/pixel-ops";
import type {
  AdjustmentLayer,
  BlendMode,
  EditorDocument,
  GroupBlendMode,
  Layer,
  LayerMask,
  ShapeLayer,
  TextLayer,
} from "../../core/document/types";
import { insertLayerAt, locateLayer } from "../../core/document/tree";
import { hasActiveEffects, renderWithEffects } from "./effects";
import type { ContentSizer } from "../../core/geometry/layer-geometry";
import { applyTextStyle, lineAdvance, textLines } from "../text/text-layout";

/**
 * Composite a document's layer stack into a 2D context at document resolution
 * (docs/04_RENDERING_ENGINE.md, "Rendering pipeline"): visibility → transform → blend → composite.
 *
 * Compositing happens on a transparent, document-sized surface — not straight onto the screen —
 * so blend modes act on the layers beneath and never on the checkerboard or workspace.
 *
 * The tree is composited recursively (ADR-0008): pass-through groups draw straight into their
 * parent; other groups, and layers with masks or effects, render into an isolated surface first;
 * adjustment layers rewrite the pixels composited beneath them.
 */

/** The subset of CanvasRenderingContext2D the compositor uses; lets tests pass a recorder. */
export type CompositeContext = Pick<
  CanvasRenderingContext2D,
  | "save"
  | "restore"
  | "clearRect"
  | "fillRect"
  | "drawImage"
  | "translate"
  | "rotate"
  | "scale"
  | "beginPath"
  | "rect"
  | "ellipse"
  | "moveTo"
  | "lineTo"
  | "fill"
  | "stroke"
  | "fillText"
  | "measureText"
  | "globalAlpha"
  | "globalCompositeOperation"
  | "fillStyle"
  | "strokeStyle"
  | "lineWidth"
  | "lineJoin"
  | "lineCap"
  | "font"
  | "textAlign"
  | "textBaseline"
> & {
  roundRect?: CanvasRenderingContext2D["roundRect"];
  letterSpacing?: string;
  getImageData?: CanvasRenderingContext2D["getImageData"];
  putImageData?: CanvasRenderingContext2D["putImageData"];
};

type Surface = HTMLCanvasElement | OffscreenCanvas;

export interface AssetResolver {
  /** A drawable for the asset, or undefined if it is not decoded yet. */
  getBitmap(assetId: string): CanvasImageSource | undefined;
}

/** Live, uncommitted content shown in place of (or in addition to) document layers. */
export interface CompositePreview {
  /** Drawables replacing a raster layer's pixels (e.g. an in-progress brush stroke). */
  readonly overrides?: ReadonlyMap<string, CanvasImageSource>;
  /** Draft layers drawn above `aboveLayerId` (or on top when null), e.g. a shape being dragged. */
  readonly extraLayers?: readonly { layer: Layer; aboveLayerId: string | null }[];
  /** Layers not drawn (e.g. a text layer while its on-canvas editor shows the draft). */
  readonly hiddenLayerIds?: ReadonlySet<string>;
  /** Drawables replacing a layer's mask (e.g. while painting on the mask). */
  readonly maskOverrides?: ReadonlyMap<string, CanvasImageSource>;
}

/**
 * Remembers each adjustment layer's output so that edits above an adjustment don't re-run it.
 * Keyed by the exact layer objects composited beneath it (documents are immutable).
 */
export class CompositeCache {
  private readonly entries = new Map<
    string,
    {
      layer: AdjustmentLayer;
      below: readonly Layer[];
      assetVersion: number;
      width: number;
      height: number;
      pixels: ImageData;
    }
  >();

  get(
    layer: AdjustmentLayer,
    below: readonly Layer[],
    assetVersion: number,
    width: number,
    height: number,
  ): ImageData | undefined {
    const e = this.entries.get(layer.id);
    if (
      !e ||
      e.layer !== layer ||
      e.assetVersion !== assetVersion ||
      e.width !== width ||
      e.height !== height ||
      e.below.length !== below.length ||
      e.below.some((l, i) => l !== below[i])
    ) {
      return undefined;
    }
    return e.pixels;
  }

  set(
    layer: AdjustmentLayer,
    below: readonly Layer[],
    assetVersion: number,
    width: number,
    height: number,
    pixels: ImageData,
  ): void {
    this.entries.set(layer.id, { layer, below: [...below], assetVersion, width, height, pixels });
  }

  clear(): void {
    this.entries.clear();
  }
}

export interface CompositeOptions {
  readonly preview?: CompositePreview;
  readonly sizer: ContentSizer;
  /**
   * Offscreen surfaces for groups, masks, effects and adjustments. Without it those features
   * degrade (groups pass through, masks/effects/adjustments are skipped) — tests rely on that.
   */
  readonly createSurface?: (width: number, height: number) => Surface;
  readonly cache?: CompositeCache;
  /** Asset version for cache invalidation. */
  readonly assetVersion?: number;
}

const COMPOSITE_OPERATION: Record<BlendMode, GlobalCompositeOperation> = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  "color-dodge": "color-dodge",
  "color-burn": "color-burn",
  "hard-light": "hard-light",
  "soft-light": "soft-light",
  difference: "difference",
  exclusion: "exclusion",
  hue: "hue",
  saturation: "saturation",
  color: "color",
  luminosity: "luminosity",
};

export function compositeOperation(mode: GroupBlendMode): GlobalCompositeOperation {
  return mode === "pass-through" ? "source-over" : COMPOSITE_OPERATION[mode];
}

export interface CompositeResult {
  /** Raster layers whose bitmaps were not ready; the caller should re-composite when they are. */
  readonly pendingAssetIds: readonly string[];
}

function shapePath(ctx: CompositeContext, layer: ShapeLayer): void {
  const { width: w, height: h } = layer;
  ctx.beginPath();
  switch (layer.shape) {
    case "rect": {
      const r = Math.min(layer.cornerRadius, w / 2, h / 2);
      if (r > 0 && ctx.roundRect) ctx.roundRect(0, 0, w, h, r);
      else ctx.rect(0, 0, w, h);
      return;
    }
    case "ellipse":
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      return;
    case "line":
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
      return;
  }
}

export function drawShape(ctx: CompositeContext, layer: ShapeLayer): void {
  shapePath(ctx, layer);
  if (layer.fill && layer.shape !== "line") {
    ctx.fillStyle = layer.fill;
    ctx.fill();
  }
  if (layer.stroke) {
    ctx.strokeStyle = layer.stroke.color;
    ctx.lineWidth = layer.stroke.width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

export function drawText(ctx: CompositeContext, layer: TextLayer, sizer: ContentSizer): void {
  const { width } = sizer.measureText(layer);
  applyTextStyle(ctx, layer);
  ctx.fillStyle = layer.color;
  ctx.textBaseline = "middle";
  ctx.textAlign = layer.align;
  const x = layer.align === "left" ? 0 : layer.align === "center" ? width / 2 : width;
  const advance = lineAdvance(layer);
  textLines(layer.text).forEach((line, i) => {
    ctx.fillText(line, x, i * advance + advance / 2);
  });
}

function drawLayer(
  ctx: CompositeContext,
  doc: EditorDocument,
  layer: Layer,
  assets: AssetResolver,
  options: CompositeOptions,
  pending: string[],
): void {
  if (layer.kind === "fill") {
    ctx.fillStyle = layer.color;
    ctx.fillRect(0, 0, doc.width, doc.height);
    return;
  }
  if (layer.kind === "group" || layer.kind === "adjustment") return;

  const t = layer.transform;
  ctx.translate(t.x, t.y);
  if (t.rotation !== 0) ctx.rotate((t.rotation * Math.PI) / 180);
  if (t.scaleX !== 1 || t.scaleY !== 1) ctx.scale(t.scaleX, t.scaleY);

  switch (layer.kind) {
    case "raster": {
      const override = options.preview?.overrides?.get(layer.id);
      if (override) {
        ctx.drawImage(override, 0, 0, layer.width, layer.height);
        return;
      }
      if (!layer.assetId) return;
      const bitmap = assets.getBitmap(layer.assetId);
      if (!bitmap) {
        pending.push(layer.assetId);
        return;
      }
      ctx.drawImage(bitmap, 0, 0, layer.width, layer.height);
      return;
    }
    case "shape":
      drawShape(ctx, layer);
      return;
    case "text":
      drawText(ctx, layer, options.sizer);
      return;
  }
}

function withExtras(doc: EditorDocument, preview: CompositePreview | undefined): readonly Layer[] {
  const extras = preview?.extraLayers;
  if (!extras?.length) return doc.layers;
  let layers = doc.layers;
  for (const { layer, aboveLayerId } of extras) {
    const location = aboveLayerId ? locateLayer(layers, aboveLayerId) : undefined;
    layers = location
      ? insertLayerAt(layers, location.parentId, location.index + 1, layer)
      : insertLayerAt(layers, null, layers.length, layer);
  }
  return layers;
}

interface Env {
  readonly doc: EditorDocument;
  readonly assets: AssetResolver;
  readonly options: CompositeOptions;
  readonly pending: string[];
}

function context2d(surface: Surface, willRead = false): CompositeContext {
  const ctx = surface.getContext(
    "2d",
    willRead ? { willReadFrequently: true } : undefined,
  ) as CompositeContext | null;
  if (!ctx) throw new Error("2D canvas is not available.");
  return ctx;
}

function release(surface: Surface): void {
  surface.width = 0;
  surface.height = 0;
}

function maskIsActive(mask: LayerMask | undefined, layerId: string, env: Env): mask is LayerMask {
  return (
    !!mask &&
    mask.enabled &&
    (mask.assetId !== null || !!env.options.preview?.maskOverrides?.has(layerId))
  );
}

/** Clip `ctx` (a document-sized surface) to the mask: outside the mask rectangle stays revealed. */
function applyMask(ctx: CompositeContext, layerId: string, mask: LayerMask, env: Env): void {
  const source =
    env.options.preview?.maskOverrides?.get(layerId) ??
    (mask.assetId ? env.assets.getBitmap(mask.assetId) : undefined);
  if (!source) {
    if (mask.assetId) env.pending.push(mask.assetId);
    return;
  }
  const { width, height } = env.doc;
  const m = env.options.createSurface!(width, height);
  const mctx = context2d(m);
  mctx.fillStyle = "#ffffff";
  mctx.fillRect(0, 0, width, height);
  mctx.clearRect(mask.x, mask.y, mask.width, mask.height);
  mctx.drawImage(source, mask.x, mask.y, mask.width, mask.height);
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(m, 0, 0);
  ctx.restore();
  release(m);
}

/** Draw an isolated surface onto the target with the layer's opacity and blend mode. */
function drawIsolated(target: CompositeContext, surface: Surface, layer: Layer): void {
  target.save();
  target.globalAlpha = layer.opacity;
  target.globalCompositeOperation = compositeOperation(layer.blendMode);
  target.drawImage(surface, 0, 0);
  target.restore();
}

/** Finish an isolated layer surface: mask, then effects, then draw onto the target. */
function finishIsolated(target: CompositeContext, surface: Surface, layer: Layer, env: Env): void {
  if (maskIsActive(layer.mask, layer.id, env))
    applyMask(context2d(surface), layer.id, layer.mask, env);
  if (hasActiveEffects(layer.effects)) {
    const withEffects = renderWithEffects(surface, layer.effects!, env.options.createSurface!);
    drawIsolated(target, withEffects, layer);
    release(withEffects);
  } else {
    drawIsolated(target, surface, layer);
  }
}

function compositeAdjustment(
  target: CompositeContext,
  layer: AdjustmentLayer,
  env: Env,
  below: readonly Layer[],
): void {
  const { width, height } = env.doc;
  const { createSurface, cache, preview } = env.options;
  if (!createSurface || !target.getImageData || !target.putImageData) return;
  const cacheable = !!cache && !preview;
  const version = env.options.assetVersion ?? 0;
  const cached = cacheable ? cache!.get(layer, below, version, width, height) : undefined;
  if (cached) {
    target.putImageData(cached, 0, 0);
    return;
  }

  const original = target.getImageData(0, 0, width, height);
  const adjusted = new ImageData(new Uint8ClampedArray(original.data), width, height);
  applyAdjustment(adjusted.data, layer.adjustment);

  // Per-pixel amount: layer opacity × mask (if any).
  let maskAlpha: Uint8ClampedArray | null = null;
  if (maskIsActive(layer.mask, layer.id, env)) {
    const m = createSurface(width, height);
    const mctx = context2d(m, true);
    mctx.fillStyle = "#000000";
    mctx.fillRect(0, 0, width, height);
    applyMask(mctx, layer.id, layer.mask, env);
    maskAlpha = mctx.getImageData!(0, 0, width, height).data;
    release(m);
  }

  const out = original.data;
  const src = adjusted.data;
  const opacity = layer.opacity;
  if (layer.blendMode === "normal") {
    // Exact mix: original + (adjusted − original) · amount. Alpha is preserved.
    for (let i = 0; i < out.length; i += 4) {
      const amount = maskAlpha ? (opacity * maskAlpha[i + 3]) / 255 : opacity;
      if (amount <= 0) continue;
      out[i] += (src[i] - out[i]) * amount;
      out[i + 1] += (src[i + 1] - out[i + 1]) * amount;
      out[i + 2] += (src[i + 2] - out[i + 2]) * amount;
    }
    target.putImageData(original, 0, 0);
  } else {
    // Other blend modes: composite the (masked) adjusted image onto the original with canvas.
    if (maskAlpha)
      for (let i = 0; i < src.length; i += 4) src[i + 3] = (src[i + 3] * maskAlpha[i + 3]) / 255;
    const s = createSurface(width, height);
    context2d(s).putImageData!(adjusted, 0, 0);
    target.save();
    target.globalAlpha = opacity;
    target.globalCompositeOperation = compositeOperation(layer.blendMode);
    target.drawImage(s, 0, 0);
    target.restore();
    release(s);
  }
  if (cacheable && env.pending.length === 0) {
    cache!.set(layer, below, version, width, height, target.getImageData(0, 0, width, height));
  }
}

/** Composite a list of sibling layers into `target`; `drawn` collects what is now beneath. */
function compositeList(
  target: CompositeContext,
  layers: readonly Layer[],
  env: Env,
  drawn: Layer[],
): void {
  const { preview, createSurface } = env.options;
  const { width, height } = env.doc;
  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    if (preview?.hiddenLayerIds?.has(layer.id)) continue;

    if (layer.kind === "group") {
      const passThrough =
        layer.blendMode === "pass-through" &&
        layer.opacity === 1 &&
        !maskIsActive(layer.mask, layer.id, env) &&
        !hasActiveEffects(layer.effects);
      if (passThrough || !createSurface) {
        compositeList(target, layer.children, env, drawn);
      } else {
        const surface = createSurface(width, height);
        compositeList(context2d(surface, true), layer.children, env, []);
        finishIsolated(target, surface, layer, env);
        release(surface);
      }
      drawn.push(layer);
      continue;
    }

    if (layer.kind === "adjustment") {
      compositeAdjustment(target, layer, env, drawn);
      drawn.push(layer);
      continue;
    }

    const isolated =
      createSurface && (maskIsActive(layer.mask, layer.id, env) || hasActiveEffects(layer.effects));
    if (isolated) {
      const surface = createSurface(width, height);
      const sctx = context2d(surface);
      sctx.save();
      drawLayer(sctx, env.doc, layer, env.assets, env.options, env.pending);
      sctx.restore();
      finishIsolated(target, surface, layer, env);
      release(surface);
    } else {
      target.save();
      target.globalAlpha = layer.opacity;
      target.globalCompositeOperation = compositeOperation(layer.blendMode);
      drawLayer(target, env.doc, layer, env.assets, env.options, env.pending);
      target.restore();
    }
    drawn.push(layer);
  }
}

export function compositeDocument(
  ctx: CompositeContext,
  doc: EditorDocument,
  assets: AssetResolver,
  options: CompositeOptions,
): CompositeResult {
  const env: Env = { doc, assets, options, pending: [] };
  ctx.clearRect(0, 0, doc.width, doc.height);
  compositeList(ctx, withExtras(doc, options.preview), env, []);
  return { pendingAssetIds: env.pending };
}
