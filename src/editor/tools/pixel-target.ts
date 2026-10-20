import { msg } from "../core/message";
import { activeLayer } from "../core/document/queries";
import type { RasterLayer } from "../core/document/types";
import type { ToolContext } from "./tool";

/**
 * The active layer if a pixel tool can edit it; otherwise explain why not (same rules and wording
 * as the brush) and return null.
 */
export function editablePixelLayer(ctx: ToolContext, toolName: string): RasterLayer | null {
  const doc = ctx.store.getSession()?.document;
  const layer = doc ? activeLayer(doc) : undefined;
  if (!layer) {
    ctx.notify("error", "Select a layer to paint on.");
    return null;
  }
  if (layer.locked) {
    ctx.notify("error", msg('"{layer}" is locked. Unlock it to paint.', { layer: layer.name }));
    return null;
  }
  if (!layer.visible) {
    ctx.notify("error", msg('"{layer}" is hidden. Show it to paint on it.', { layer: layer.name }));
    return null;
  }
  if (layer.kind !== "raster") {
    ctx.notify(
      "error",
      msg("{tool} works on pixel layers. Use Layer → New Layer to add one, then try again.", {
        tool: toolName,
      }),
    );
    return null;
  }
  if (layer.assetId && !ctx.assets.getBitmap(layer.assetId)) {
    ctx.notify("info", "This layer is still loading. Try again in a moment.");
    return null;
  }
  return layer;
}
