import type {
  BlendMode,
  EditorDocument,
  Layer,
  ShapeLayer,
  TextLayer,
} from "../../core/document/types";
import type { ContentSizer } from "../../core/geometry/layer-geometry";
import { applyTextStyle, lineAdvance, textLines } from "../text/text-layout";

/**
 * Composite a document's layer stack into a 2D context at document resolution
 * (docs/04_RENDERING_ENGINE.md, "Rendering pipeline"): visibility → transform → blend → composite.
 *
 * Compositing happens on a transparent, document-sized surface — not straight onto the screen —
 * so blend modes act on the layers beneath and never on the checkerboard or workspace.
 * Masks/effects/adjustments slot in per layer when they land (Gate 4).
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
> & { roundRect?: CanvasRenderingContext2D["roundRect"]; letterSpacing?: string };

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
}

export interface CompositeOptions {
  readonly preview?: CompositePreview;
  readonly sizer: ContentSizer;
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

export function compositeOperation(mode: BlendMode): GlobalCompositeOperation {
  return COMPOSITE_OPERATION[mode];
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
  const layers = [...doc.layers];
  for (const { layer, aboveLayerId } of extras) {
    const index = aboveLayerId ? layers.findIndex((l) => l.id === aboveLayerId) : -1;
    layers.splice(index === -1 ? layers.length : index + 1, 0, layer);
  }
  return layers;
}

export function compositeDocument(
  ctx: CompositeContext,
  doc: EditorDocument,
  assets: AssetResolver,
  options: CompositeOptions,
): CompositeResult {
  const pending: string[] = [];
  ctx.clearRect(0, 0, doc.width, doc.height);
  for (const layer of withExtras(doc, options.preview)) {
    if (!layer.visible || layer.opacity <= 0) continue;
    if (options.preview?.hiddenLayerIds?.has(layer.id)) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = compositeOperation(layer.blendMode);
    drawLayer(ctx, doc, layer, assets, options, pending);
    ctx.restore();
  }
  return { pendingAssetIds: pending };
}
