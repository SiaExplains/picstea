import type { BlendMode, EditorDocument, Layer } from "../../core/document/types";

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
  | "globalAlpha"
  | "globalCompositeOperation"
  | "fillStyle"
>;

export interface AssetResolver {
  /** A drawable for the asset, or undefined if it is not decoded yet. */
  getBitmap(assetId: string): CanvasImageSource | undefined;
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

function drawLayer(
  ctx: CompositeContext,
  doc: EditorDocument,
  layer: Layer,
  assets: AssetResolver,
  pending: string[],
): void {
  switch (layer.kind) {
    case "fill":
      ctx.fillStyle = layer.color;
      ctx.fillRect(0, 0, doc.width, doc.height);
      return;
    case "raster": {
      const bitmap = assets.getBitmap(layer.assetId);
      if (!bitmap) {
        pending.push(layer.assetId);
        return;
      }
      const t = layer.transform;
      ctx.translate(t.x, t.y);
      if (t.rotation !== 0) ctx.rotate((t.rotation * Math.PI) / 180);
      if (t.scaleX !== 1 || t.scaleY !== 1) ctx.scale(t.scaleX, t.scaleY);
      ctx.drawImage(bitmap, 0, 0, layer.width, layer.height);
      return;
    }
  }
}

export function compositeDocument(
  ctx: CompositeContext,
  doc: EditorDocument,
  assets: AssetResolver,
): CompositeResult {
  const pending: string[] = [];
  ctx.clearRect(0, 0, doc.width, doc.height);
  for (const layer of doc.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = compositeOperation(layer.blendMode);
    drawLayer(ctx, doc, layer, assets, pending);
    ctx.restore();
  }
  return { pendingAssetIds: pending };
}
