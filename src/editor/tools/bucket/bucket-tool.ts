import { setRasterContent } from "../../core/commands";
import { combineSelections } from "../../selection/ops";
import { findLayer } from "../../core/document/queries";
import type { SelectionMask } from "../../selection/mask";
import { floodDocument } from "../../workers/offthread";
import { paintRasterLayer, releaseSurface, selectionFill } from "../../pixels/layer-pixels";
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
    const documentId = doc.id;
    const fill = colors.foreground;
    const sampled = settings.sampleAll ? doc.layers : [{ ...layer, visible: true }];
    void floodDocument(ctx, doc, sampled, {
      x: pointer.doc.x,
      y: pointer.doc.y,
      tolerance: settings.tolerance,
      contiguous: settings.contiguous,
    })
      .then((flooded) => this.fill(ctx, documentId, layer.id, flooded, fill))
      .catch(() => ctx.notify("error", "The fill did not work. Try again."));
  }

  /** Paint the flooded region (limited to the selection) once the job is done. */
  private fill(
    ctx: ToolContext,
    documentId: string,
    layerId: string,
    flooded: SelectionMask,
    color: string,
  ): void {
    const doc = ctx.store.getSession()?.document;
    if (!doc || doc.id !== documentId) return;
    const layer = findLayer(doc, layerId);
    if (!layer || layer.kind !== "raster") return;
    let region: SelectionMask | null = flooded;
    if (doc.selection) region = combineSelections(doc.selection, flooded, "intersect");
    if (!region?.bounds) return;
    const paint = selectionFill(ctx, doc, color, region);
    try {
      const assetId = paintRasterLayer(ctx, layer, paint);
      if (!assetId) return;
      const result = ctx.store.dispatch(setRasterContent(layer.id, assetId, "Paint Bucket"));
      if (!result.ok) ctx.notify("error", result.error);
      ctx.pixelsCommitted();
      ctx.invalidate();
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
