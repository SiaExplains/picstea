import { setRasterContent } from "../../core/commands";
import { rgba } from "../../core/color";
import type { EditorDocument, RasterLayer } from "../../core/document/types";
import { fromTransform, invertMatrix } from "../../core/geometry/matrix";
import type { GradientSettings } from "../../core/tool-settings";
import type { Point } from "../../core/viewport/viewport";
import {
  clipToSelection,
  context2d,
  paintRasterLayer,
  releaseSurface,
  type PixelEnv,
  type Surface,
} from "../../pixels/layer-pixels";
import type { CompositePreview } from "../../rendering/compositing/compositor";
import type { Overlay } from "../../rendering/overlay";
import { editablePixelLayer } from "../pixel-target";
import type { Tool, ToolContext, ToolPointer } from "../tool";

/** Document-sized gradient paint from `start` to `end`, clipped to the selection. */
export function renderGradient(
  env: PixelEnv,
  doc: EditorDocument,
  start: Point,
  end: Point,
  settings: GradientSettings,
  colors: { foreground: string; background: string },
): Surface {
  const surface = env.createSurface(doc.width, doc.height);
  const ctx = context2d(surface);
  const gradient =
    settings.kind === "linear"
      ? ctx.createLinearGradient(start.x, start.y, end.x, end.y)
      : ctx.createRadialGradient(
          start.x,
          start.y,
          0,
          start.x,
          start.y,
          Math.max(1, Math.hypot(end.x - start.x, end.y - start.y)),
        );
  gradient.addColorStop(0, rgba(colors.foreground, 1));
  gradient.addColorStop(
    1,
    settings.to === "transparent" ? rgba(colors.foreground, 0) : rgba(colors.background, 1),
  );
  ctx.globalAlpha = settings.opacity;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, doc.width, doc.height);
  clipToSelection(env, surface, doc.selection);
  return surface;
}

interface Drag {
  readonly layer: RasterLayer;
  readonly start: Point;
  end: Point;
  preview: Surface | null;
}

/** Gradient: drag to set the direction and length; released, it becomes one undoable edit. */
export class GradientTool implements Tool {
  readonly id = "gradient";
  private drag: Drag | null = null;
  private readonly overrides = new Map<string, Surface>();

  cursor(): string {
    return "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0 || this.drag) return;
    const layer = editablePixelLayer(ctx, "The gradient");
    if (!layer) return;
    this.drag = { layer, start: pointer.doc, end: pointer.doc, preview: null };
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const drag = this.drag;
    if (!drag) return;
    drag.end = pointer.shiftKey ? snap45(drag.start, pointer.doc) : pointer.doc;
    this.render(ctx, drag);
  }

  /** Re-render the layer preview: its pixels with the gradient drawn over them. */
  private render(ctx: ToolContext, drag: Drag): void {
    const doc = ctx.store.getSession()?.document;
    if (!doc) return;
    const { toolSettings, colors } = ctx.store.getState();
    const paint = renderGradient(ctx, doc, drag.start, drag.end, toolSettings.gradient, colors);
    try {
      // The same drawing as paintRasterLayer, into a reused surface instead of a new asset.
      const { layer } = drag;
      const preview = drag.preview ?? ctx.createSurface(layer.width, layer.height);
      const p = context2d(preview);
      p.setTransform(1, 0, 0, 1, 0, 0);
      p.clearRect(0, 0, layer.width, layer.height);
      const base = layer.assetId ? ctx.assets.getBitmap(layer.assetId) : undefined;
      if (base) p.drawImage(base, 0, 0, layer.width, layer.height);
      const toLocal = invertMatrix(fromTransform(layer.transform));
      if (!toLocal) return;
      p.setTransform(...toLocal);
      p.drawImage(paint, 0, 0);
      p.setTransform(1, 0, 0, 1, 0, 0);
      drag.preview = preview;
      this.overrides.set(layer.id, preview);
    } finally {
      releaseSurface(paint);
    }
    ctx.invalidate();
  }

  pointerUp(ctx: ToolContext): void {
    const drag = this.drag;
    this.drag = null;
    this.overrides.clear();
    if (!drag) return;
    releaseSurface(drag.preview);
    const doc = ctx.store.getSession()?.document;
    if (!doc || (drag.start.x === drag.end.x && drag.start.y === drag.end.y)) {
      ctx.invalidate();
      return;
    }
    const { toolSettings, colors } = ctx.store.getState();
    const paint = renderGradient(ctx, doc, drag.start, drag.end, toolSettings.gradient, colors);
    try {
      const assetId = paintRasterLayer(ctx, drag.layer, paint);
      if (assetId) {
        const result = ctx.store.dispatch(setRasterContent(drag.layer.id, assetId, "Gradient"));
        if (!result.ok) ctx.notify("error", result.error);
        ctx.pixelsCommitted();
      }
    } finally {
      releaseSurface(paint);
    }
    ctx.invalidate();
  }

  cancel(ctx: ToolContext): void {
    if (this.drag) releaseSurface(this.drag.preview);
    this.drag = null;
    this.overrides.clear();
    ctx.invalidate();
  }

  overlays(): readonly Overlay[] {
    const drag = this.drag;
    if (!drag) return [];
    return [{ kind: "path", points: [drag.start, drag.end], closed: false }];
  }

  preview(): CompositePreview | undefined {
    return this.overrides.size > 0 ? { overrides: this.overrides } : undefined;
  }
}

/** Constrain the drag to multiples of 45° (Shift). */
function snap45(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  const length = Math.hypot(dx, dy);
  return { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
}
