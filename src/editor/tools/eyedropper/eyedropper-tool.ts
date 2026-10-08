import { activeLayer } from "../../core/document/queries";
import type { Point } from "../../core/viewport/viewport";
import { samplePixel } from "../../pixels/layer-pixels";
import type { Tool, ToolContext, ToolPointer } from "../tool";

const hex = (n: number) => n.toString(16).padStart(2, "0");

/**
 * Set the foreground (or background) colour from the pixel under `at`. Samples the visible image,
 * or only the active layer. Transparent pixels are ignored. Returns the picked colour.
 */
export function pickColor(
  ctx: ToolContext,
  at: Point,
  which: "foreground" | "background",
  sampleAll: boolean,
): string | null {
  const doc = ctx.store.getSession()?.document;
  if (!doc) return null;
  const layer = sampleAll ? undefined : activeLayer(doc);
  if (at.x < 0 || at.y < 0 || at.x >= doc.width || at.y >= doc.height) return null;
  const rgba = samplePixel(ctx, doc, at.x, at.y, layer);
  if (!rgba) {
    ctx.notify("info", "The image is still loading. Try again in a moment.");
    return null;
  }
  if (rgba[3] === 0) return null;
  const color = `#${hex(rgba[0])}${hex(rgba[1])}${hex(rgba[2])}`;
  ctx.store.setColors({ [which]: color });
  return color;
}

/** Eyedropper: click for the foreground colour, Alt-click for the background colour. */
export class EyedropperTool implements Tool {
  readonly id = "eyedropper";

  cursor(): string {
    return "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0) return;
    const { sampleAll } = ctx.store.getState().toolSettings.eyedropper;
    pickColor(ctx, pointer.doc, pointer.altKey ? "background" : "foreground", sampleAll);
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
