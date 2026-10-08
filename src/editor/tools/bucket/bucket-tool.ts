import { setRasterContent } from "../../core/commands";
import { combineSelections } from "../../selection/ops";
import { floodRegion } from "../../selection/flood";
import {
  paintRasterLayer,
  readPixels,
  releaseSurface,
  selectionFill,
} from "../../pixels/layer-pixels";
import { editablePixelLayer } from "../pixel-target";
import type { Tool, ToolContext, ToolPointer } from "../tool";

/**
 * Paint bucket: fill the area of similar colour under the click with the foreground colour,
 * limited to the selection. Uses the same flood fill as the magic wand.
 */
export class BucketTool implements Tool {
  readonly id = "bucket";

  cursor(): string {
    return "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0) return;
    const doc = ctx.store.getSession()?.document;
    if (!doc) return;
    const layer = editablePixelLayer(ctx, "The paint bucket");
    if (!layer) return;
    const { toolSettings, colors } = ctx.store.getState();
    const settings = toolSettings.bucket;
    const pixels = readPixels(ctx, doc, settings.sampleAll ? undefined : layer);
    if (!pixels) {
      ctx.notify("info", "The image is still loading. Try again in a moment.");
      return;
    }
    let region = floodRegion(
      pixels,
      pointer.doc.x,
      pointer.doc.y,
      settings.tolerance,
      settings.contiguous,
    );
    if (doc.selection) {
      const inside = combineSelections(doc.selection, region, "intersect");
      if (!inside) return;
      region = inside;
    }
    if (!region.bounds) return;
    const paint = selectionFill(ctx, doc, colors.foreground, region);
    try {
      const assetId = paintRasterLayer(ctx, layer, paint);
      if (!assetId) return;
      const result = ctx.store.dispatch(setRasterContent(layer.id, assetId, "Paint Bucket"));
      if (!result.ok) ctx.notify("error", result.error);
      ctx.pixelsCommitted();
    } finally {
      releaseSurface(paint);
    }
  }

  pointerMove(): void {}
  pointerUp(): void {}
  cancel(): void {}

  overlays() {
    return [];
  }

  preview() {
    return undefined;
  }
}
