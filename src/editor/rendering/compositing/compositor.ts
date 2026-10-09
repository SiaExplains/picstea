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
import type { Anchor, VectorPath } from "../../core/path/path";
import { hasActiveEffects, renderWithEffects } from "./effects";
import { renderSmartObject, smartLevel } from "./smart-render";
import { boundsOf, layerCorners, type ContentSizer } from "../../core/geometry/layer-geometry";
import { applyTextStyle, lineAdvance, textLines } from "../text/text-layout";
import {
  identitySpace,
  isIdentitySpace,
  sameSpace,
  spaceTransform,
  type RenderSpace,
} from "../render-space";

/**
 * Composite a document's layer stack into a 2D context (docs/04_RENDERING_ENGINE.md, "Rendering
 * pipeline"): visibility → transform → blend → composite. By default at document resolution; with
 * a render space (ADR-0012), only a region at a given scale — the canvas renders just what is
 * visible, at screen resolution.
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
  | "bezierCurveTo"
  | "closePath"
> & {
  roundRect?: CanvasRenderingContext2D["roundRect"];
  letterSpacing?: string;
  getImageData?: CanvasRenderingContext2D["getImageData"];
  putImageData?: CanvasRenderingContext2D["putImageData"];
  setTransform?: CanvasRenderingContext2D["setTransform"];
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
      space: RenderSpace;
      pixels: ImageData;
    }
  >();

  get(
    layer: AdjustmentLayer,
    below: readonly Layer[],
    assetVersion: number,
    space: RenderSpace,
  ): ImageData | undefined {
    const e = this.entries.get(layer.id);
    if (
      !e ||
      e.layer !== layer ||
      e.assetVersion !== assetVersion ||
      !sameSpace(e.space, space) ||
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
    space: RenderSpace,
    pixels: ImageData,
  ): void {
    this.entries.set(layer.id, { layer, below: [...below], assetVersion, space, pixels });
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
  /** Render only part of the document, at a scale (default: whole document at 1:1). */
  readonly space?: RenderSpace;
  /**
   * Reuse the composite of unchanged bottom layers between renders (ADR-0012). Requires
   * `target`, the surface `ctx` draws into.
   */
  readonly prefix?: PrefixCache;
  readonly target?: Surface;
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

/** Add a vector path's subpaths to the current canvas path. */
export function tracePath(ctx: CompositeContext, path: VectorPath): void {
  for (const sub of path.subpaths) {
    const a = sub.anchors;
    if (a.length === 0) continue;
    ctx.moveTo(a[0].x, a[0].y);
    const segment = (from: Anchor, to: Anchor) =>
      ctx.bezierCurveTo(from.out.x, from.out.y, to.in.x, to.in.y, to.x, to.y);
    for (let i = 1; i < a.length; i++) segment(a[i - 1], a[i]);
    if (sub.closed && a.length > 1) {
      segment(a[a.length - 1], a[0]);
      ctx.closePath();
    }
  }
}

function shapePath(ctx: CompositeContext, layer: ShapeLayer): void {
  const { width: w, height: h } = layer;
  ctx.beginPath();
  switch (layer.shape) {
    case "path":
      if (layer.path) tracePath(ctx, layer.path);
      return;
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
    // Paths cut holes where their subpaths overlap (even-odd), as in SVG export and selections.
    if (layer.shape === "path") ctx.fill("evenodd");
    else ctx.fill();
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
    case "smart": {
      // Pixels per content pixel on the target: render space scale × layer scale.
      const scale =
        (options.space?.scale ?? 1) *
        Math.max(Math.abs(layer.transform.scaleX), Math.abs(layer.transform.scaleY));
      const level = smartLevel(layer.content, scale);
      const surface = renderSmartObject(layer, level, assets, options, pending, compositeDocument);
      if (surface) ctx.drawImage(surface, 0, 0, layer.content.width, layer.content.height);
      return;
    }
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
  readonly space: RenderSpace;
  readonly identity: boolean;
}

/** A render-space surface with the document → surface transform applied. */
function spaceSurface(env: Env, willRead = false): { surface: Surface; ctx: CompositeContext } {
  const surface = env.options.createSurface!(env.space.width, env.space.height);
  const ctx = context2d(surface, willRead);
  if (!env.identity) ctx.setTransform!(...spaceTransform(env.space));
  return { surface, ctx };
}

/** Run `draw` in surface pixels (identity transform), e.g. to draw another render-space surface. */
function inSurfacePixels(ctx: CompositeContext, env: Env, draw: () => void): void {
  if (env.identity || !ctx.setTransform) {
    draw();
    return;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  draw();
  ctx.restore();
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

/** Clip `ctx` (a render-space surface) to the mask: outside the mask rectangle stays revealed. */
function applyMask(ctx: CompositeContext, layerId: string, mask: LayerMask, env: Env): void {
  const source =
    env.options.preview?.maskOverrides?.get(layerId) ??
    (mask.assetId ? env.assets.getBitmap(mask.assetId) : undefined);
  if (!source) {
    if (mask.assetId) env.pending.push(mask.assetId);
    return;
  }
  const { surface: m, ctx: mctx } = spaceSurface(env);
  inSurfacePixels(mctx, env, () => {
    mctx.fillStyle = "#ffffff";
    mctx.fillRect(0, 0, env.space.width, env.space.height);
  });
  mctx.clearRect(mask.x, mask.y, mask.width, mask.height);
  mctx.drawImage(source, mask.x, mask.y, mask.width, mask.height);
  inSurfacePixels(ctx, env, () => {
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(m, 0, 0);
    ctx.restore();
  });
  release(m);
}

const vectorMaskIsActive = (layer: Layer) =>
  !!layer.vectorMask?.enabled && layer.vectorMask.path.subpaths.length > 0;

/** Raster or vector mask in effect: the layer must be composited in isolation. */
const hasMask = (layer: Layer, env: Env) =>
  maskIsActive(layer.mask, layer.id, env) || vectorMaskIsActive(layer);

/** Clip `ctx` (a render-space surface) to the filled vector mask path (even-odd, anti-aliased). */
function applyVectorMask(ctx: CompositeContext, layer: Layer, env: Env): void {
  const path = layer.vectorMask!.path;
  const { surface: m, ctx: mctx } = spaceSurface(env);
  mctx.fillStyle = "#ffffff";
  mctx.beginPath();
  tracePath(mctx, path);
  mctx.fill("evenodd");
  inSurfacePixels(ctx, env, () => {
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(m, 0, 0);
    ctx.restore();
  });
  release(m);
}

/** Apply every active mask of a layer to its isolated surface. */
function applyMasks(ctx: CompositeContext, layer: Layer, env: Env): void {
  if (maskIsActive(layer.mask, layer.id, env)) applyMask(ctx, layer.id, layer.mask, env);
  if (vectorMaskIsActive(layer)) applyVectorMask(ctx, layer, env);
}

/** Draw an isolated surface onto the target with the layer's opacity and blend mode. */
function drawIsolated(target: CompositeContext, surface: Surface, layer: Layer, env: Env): void {
  inSurfacePixels(target, env, () => {
    target.save();
    target.globalAlpha = layer.opacity;
    target.globalCompositeOperation = compositeOperation(layer.blendMode);
    target.drawImage(surface, 0, 0);
    target.restore();
  });
}

/** The layer's bounding box on the render-space surface (for gradient overlays). */
function layerBoxInSpace(layer: Layer, env: Env) {
  const b = boundsOf(layerCorners(layer, env.doc, env.options.sizer));
  const { x, y, scale } = env.space;
  return {
    x: (b.x - x) * scale,
    y: (b.y - y) * scale,
    width: b.width * scale,
    height: b.height * scale,
  };
}

/** Finish an isolated layer surface: masks, then effects, then draw onto the target. */
function finishIsolated(
  target: CompositeContext,
  surface: Surface,
  layer: Layer,
  env: Env,
  masked = false,
): void {
  if (!masked) applyMasks(context2d(surface), layer, env);
  if (hasActiveEffects(layer.effects)) {
    const withEffects = renderWithEffects(
      surface,
      layer.effects!,
      env.options.createSurface!,
      env.space.scale,
      layer.effects!.gradientOverlay?.enabled ? layerBoxInSpace(layer, env) : undefined,
    );
    drawIsolated(target, withEffects, layer, env);
    release(withEffects);
  } else {
    drawIsolated(target, surface, layer, env);
  }
}

function compositeAdjustment(
  target: CompositeContext,
  layer: AdjustmentLayer,
  env: Env,
  below: readonly Layer[],
): void {
  const { width, height } = env.space;
  const { createSurface, cache, preview } = env.options;
  if (!createSurface || !target.getImageData || !target.putImageData) return;
  const cacheable = !!cache && !preview;
  const version = env.options.assetVersion ?? 0;
  const cached = cacheable ? cache!.get(layer, below, version, env.space) : undefined;
  if (cached) {
    target.putImageData(cached, 0, 0);
    return;
  }

  const original = target.getImageData(0, 0, width, height);
  const adjusted = new ImageData(new Uint8ClampedArray(original.data), width, height);
  applyAdjustment(adjusted.data, layer.adjustment);

  // Per-pixel amount: layer opacity × mask (if any).
  let maskAlpha: Uint8ClampedArray | null = null;
  if (hasMask(layer, env)) {
    const { surface: m, ctx: mctx } = spaceSurface(env, true);
    inSurfacePixels(mctx, env, () => {
      mctx.fillStyle = "#000000";
      mctx.fillRect(0, 0, width, height);
    });
    applyMasks(mctx, layer, env);
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
    inSurfacePixels(target, env, () => {
      target.save();
      target.globalAlpha = opacity;
      target.globalCompositeOperation = compositeOperation(layer.blendMode);
      target.drawImage(s, 0, 0);
      target.restore();
    });
    release(s);
  }
  if (cacheable && env.pending.length === 0) {
    cache!.set(layer, below, version, env.space, target.getImageData(0, 0, width, height));
  }
}

/** Composite a list of sibling layers into `target`; `drawn` collects what is now beneath. */
function compositeList(
  target: CompositeContext,
  layers: readonly Layer[],
  env: Env,
  drawn: Layer[],
): void {
  const { createSurface } = env.options;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    // Clipping masks (ADR-0015): this layer is the base of the clipped layers right above it.
    let end = i + 1;
    while (end < layers.length && layers[end].clipped) end++;
    if (end > i + 1 && createSurface && layer.kind !== "adjustment") {
      if (isShown(layer, env)) compositeClippingGroup(target, layer, layers.slice(i + 1, end), env);
      drawn.push(...layers.slice(i, end));
      i = end - 1;
      continue;
    }
    compositeOne(target, layer, env, drawn);
  }
}

function isShown(layer: Layer, env: Env): boolean {
  return layer.visible && layer.opacity > 0 && !env.options.preview?.hiddenLayerIds?.has(layer.id);
}

/** Composite one layer (not part of a clipping group) into `target`. */
function compositeOne(target: CompositeContext, layer: Layer, env: Env, drawn: Layer[]): void {
  const { createSurface } = env.options;
  if (!isShown(layer, env)) return;

  if (layer.kind === "group") {
    const passThrough =
      layer.blendMode === "pass-through" &&
      layer.opacity === 1 &&
      !hasMask(layer, env) &&
      !hasActiveEffects(layer.effects);
    if (passThrough || !createSurface) {
      compositeList(target, layer.children, env, drawn);
    } else {
      const { surface, ctx } = spaceSurface(env, true);
      compositeList(ctx, layer.children, env, []);
      finishIsolated(target, surface, layer, env);
      release(surface);
    }
    drawn.push(layer);
    return;
  }

  if (layer.kind === "adjustment") {
    compositeAdjustment(target, layer, env, drawn);
    drawn.push(layer);
    return;
  }

  const isolated = createSurface && (hasMask(layer, env) || hasActiveEffects(layer.effects));
  if (isolated) {
    const { surface, ctx: sctx } = spaceSurface(env);
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

/** A layer's own content (with its masks, without opacity/effects) on a new render-space surface. */
function isolatedContent(layer: Layer, env: Env): Surface {
  const { surface, ctx } = spaceSurface(env, true);
  if (layer.kind === "group") {
    compositeList(ctx, layer.children, env, []);
  } else {
    ctx.save();
    drawLayer(ctx, env.doc, layer, env.assets, env.options, env.pending);
    ctx.restore();
  }
  applyMasks(ctx, layer, env);
  return surface;
}

/**
 * A base layer and the layers clipped to it: each clipped layer is limited to the base's pixels
 * and blended onto it with its own opacity and blend mode (clipped adjustments change only the
 * base); then the result is drawn with the base's opacity, blend mode and effects.
 */
function compositeClippingGroup(
  target: CompositeContext,
  base: Layer,
  clipped: readonly Layer[],
  env: Env,
): void {
  const baseSurface = isolatedContent(base, env);
  const bctx = context2d(baseSurface, true);
  const noCache: Env = { ...env, options: { ...env.options, cache: undefined } };
  const below: Layer[] = [base];
  for (const layer of clipped) {
    if (!isShown(layer, env)) continue;
    if (layer.kind === "adjustment") {
      compositeAdjustment(bctx, layer, noCache, below);
    } else {
      const surface = isolatedContent(layer, env);
      const ctx = context2d(surface);
      // Keep only what lies over the base: multiply by the base's alpha.
      inSurfacePixels(ctx, env, () => {
        ctx.save();
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(baseSurface, 0, 0);
        ctx.restore();
      });
      if (hasActiveEffects(layer.effects)) {
        const withEffects = renderWithEffects(
          surface,
          layer.effects!,
          env.options.createSurface!,
          env.space.scale,
        );
        drawIsolated(bctx, withEffects, layer, env);
        release(withEffects);
      } else {
        drawIsolated(bctx, surface, layer, env);
      }
      release(surface);
    }
    below.push(layer);
  }
  finishIsolated(target, baseSurface, base, env, true);
  release(baseSurface);
}

/**
 * The composite of the bottom root layers from the previous render (ADR-0012). While one layer
 * changes every frame (a brush stroke, a drag), everything beneath it is drawn from this image
 * instead of being composited again.
 */
export class PrefixCache {
  private image: Surface | null = null;
  private layers: readonly Layer[] = [];
  private space: RenderSpace | null = null;
  private version = -1;
  /** Root layers of the previous render, to find the first one that changed. */
  private previousRoots: readonly Layer[] = [];

  /** How many bottom layers can be drawn from the cache for this render. */
  lookup(roots: readonly Layer[], space: RenderSpace, version: number): number {
    if (!this.image || !sameSpace(this.space, space) || this.version !== version) return 0;
    const n = this.layers.length;
    if (n > roots.length) return 0;
    for (let i = 0; i < n; i++) if (roots[i] !== this.layers[i]) return 0;
    return n;
  }

  get surface(): Surface | null {
    return this.image;
  }

  /** Index of the first root layer that differs from the previous render. */
  firstChange(roots: readonly Layer[]): number {
    const prev = this.previousRoots;
    let i = 0;
    while (i < roots.length && i < prev.length && roots[i] === prev[i]) i++;
    return i;
  }

  remember(roots: readonly Layer[]): void {
    this.previousRoots = roots;
  }

  store(
    layers: readonly Layer[],
    space: RenderSpace,
    version: number,
    from: Surface,
    createSurface: (w: number, h: number) => Surface,
  ): void {
    if (!this.image || this.image.width !== space.width || this.image.height !== space.height) {
      if (this.image) release(this.image);
      this.image = createSurface(space.width, space.height);
    }
    const ctx = context2d(this.image);
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(from, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    this.layers = [...layers];
    this.space = space;
    this.version = version;
  }

  clear(): void {
    if (this.image) release(this.image);
    this.image = null;
    this.layers = [];
    this.previousRoots = [];
    this.space = null;
  }
}

/** Root layers that preview content (strokes, drafts, hidden text) touches this frame. */
function previewTouches(root: Layer, preview: CompositePreview | undefined): boolean {
  if (!preview) return false;
  const ids = new Set<string>([
    ...(preview.overrides?.keys() ?? []),
    ...(preview.maskOverrides?.keys() ?? []),
    ...(preview.hiddenLayerIds ?? []),
    ...(preview.extraLayers ?? []).map((e) => e.layer.id),
  ]);
  if (ids.size === 0) return false;
  const visit = (layer: Layer): boolean =>
    ids.has(layer.id) || (layer.kind === "group" && layer.children.some(visit));
  return visit(root);
}

export function compositeDocument(
  ctx: CompositeContext,
  doc: EditorDocument,
  assets: AssetResolver,
  options: CompositeOptions,
): CompositeResult {
  const space = options.space ?? identitySpace(doc);
  const identity = isIdentitySpace(space, doc);
  const env: Env = { doc, assets, options, pending: [], space, identity };
  inSurfacePixels(ctx, env, () => ctx.clearRect(0, 0, space.width, space.height));
  if (!identity) {
    ctx.save();
    ctx.setTransform!(...spaceTransform(space));
  }
  const roots = withExtras(doc, options.preview);
  const { prefix, target, createSurface } = options;
  const version = options.assetVersion ?? 0;
  if (prefix && target && createSurface) {
    // Layers below the first one that changed (or that a preview touches) can come from cache.
    let stable = prefix.firstChange(roots);
    const touched = roots.findIndex((l) => previewTouches(l, options.preview));
    if (touched !== -1) stable = Math.min(stable, touched);
    // Never split a base from the layers clipped to it.
    while (stable > 0 && roots[stable]?.clipped) stable--;
    let start = prefix.lookup(roots, space, version);
    if (start > stable) start = 0;
    const drawn: Layer[] = [...roots.slice(0, start)];
    if (start > 0) inSurfacePixels(ctx, env, () => ctx.drawImage(prefix.surface!, 0, 0));
    if (stable > start) {
      compositeList(ctx, roots.slice(start, stable), env, drawn);
      if (env.pending.length === 0)
        prefix.store(roots.slice(0, stable), space, version, target, createSurface);
    }
    compositeList(ctx, roots.slice(Math.max(start, stable)), env, drawn);
    prefix.remember(roots);
  } else {
    compositeList(ctx, roots, env, []);
  }
  if (!identity) ctx.restore();
  return { pendingAssetIds: env.pending };
}
