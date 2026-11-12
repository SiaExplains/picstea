import { bakeLayers, cropDocument } from "../../core/commands";
import { walkLayers } from "../../core/document/tree";
import type { RasterLayer } from "../../core/document/types";
import { context2d } from "../../pixels/layer-pixels";
import { canGrow } from "../../pixels/grow";
import {
  centredRatioBox,
  constrainResize,
  cropRatio,
  ratioFromPoints,
  straightenAngle,
} from "./crop-ratio";
import type { Rect } from "../../core/geometry/layer-geometry";
import { rectFromPoints, rectHandles, resizeRect, roundRect } from "../../core/geometry/rect";
import { SCALE_HANDLES, type ScaleHandle } from "../../core/geometry/transform-handles";
import { snapRect, type SnapLine } from "../../core/geometry/snapping";
import { straightenedCrop } from "../../core/geometry/canvas-transform";
import { documentToScreen, type Point } from "../../core/viewport/viewport";
import type { Overlay } from "../../rendering/overlay";
import {
  dragSnapping,
  HANDLE_HIT_PX,
  snappedPointer,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";

type Drag =
  | { kind: "straighten"; start: Point; end: Point }
  | { kind: "new"; start: Point }
  | { kind: "move"; startRect: Rect; startPointer: Point }
  | { kind: "resize"; startRect: Rect; handle: ScaleHandle };

const HANDLE_CURSORS: Record<ScaleHandle, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

/**
 * Crop tool: starts with the whole canvas selected; drag handles or draw a new box, then Enter
 * (or Apply) commits and Esc resets. Cropping is non-destructive (see cropDocument).
 */
export class CropTool implements Tool {
  readonly id = "crop";
  private rect: Rect | null = null;
  private rectDocId: string | null = null;
  private drag: Drag | null = null;
  private snapLines: readonly SnapLine[] = [];
  /** Straighten mode: the next drag draws a line along the horizon (ADR-0044). */
  straightening = false;

  constructor(
    /** Rotate the canvas (degrees, clockwise); returns the new canvas size, or null. */
    private readonly rotateCanvas: (
      degrees: number,
    ) => { width: number; height: number } | null = () => null,
  ) {}

  private ratio(ctx: ToolContext): number | null {
    const doc = ctx.store.getSession()?.document;
    if (!doc) return null;
    return cropRatio(ctx.store.getState().toolSettings.crop, doc.width, doc.height);
  }

  /** A ratio preset was picked: show the largest box of that ratio on the canvas. */
  ratioChanged(ctx: ToolContext): void {
    const doc = ctx.store.getSession()?.document;
    const ratio = this.ratio(ctx);
    if (!doc) return;
    this.setRect(
      ctx,
      ratio
        ? centredRatioBox(doc.width, doc.height, ratio)
        : { x: 0, y: 0, width: doc.width, height: doc.height },
    );
  }

  /** The current crop box (the whole canvas until the user changes it). */
  currentRect(ctx: ToolContext): Rect | null {
    const doc = ctx.store.getSession()?.document;
    if (!doc) return null;
    if (this.rectDocId !== doc.id || !this.rect) {
      return { x: 0, y: 0, width: doc.width, height: doc.height };
    }
    return this.rect;
  }

  private setRect(ctx: ToolContext, rect: Rect): void {
    this.rect = rect;
    this.rectDocId = ctx.store.getSession()?.document.id ?? null;
    ctx.invalidate();
  }

  private handleAt(ctx: ToolContext, pointer: ToolPointer): ScaleHandle | null {
    const rect = this.currentRect(ctx);
    if (!rect) return null;
    const handles = rectHandles(rect);
    const viewport = ctx.viewport();
    for (const handle of SCALE_HANDLES) {
      const p = documentToScreen(viewport, handles[handle]);
      if (Math.hypot(p.x - pointer.screen.x, p.y - pointer.screen.y) <= HANDLE_HIT_PX)
        return handle;
    }
    return null;
  }

  private inside(ctx: ToolContext, p: Point): boolean {
    const r = this.currentRect(ctx);
    return !!r && p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    if (!pointer) return "default";
    const handle = this.drag?.kind === "resize" ? this.drag.handle : this.handleAt(ctx, pointer);
    if (handle) return HANDLE_CURSORS[handle];
    return this.drag?.kind === "move" || this.inside(ctx, pointer.doc) ? "move" : "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const rect = this.currentRect(ctx);
    if (!rect || pointer.button !== 0) return;
    if (this.straightening) {
      this.drag = { kind: "straighten", start: pointer.doc, end: pointer.doc };
      return;
    }
    const handle = this.handleAt(ctx, pointer);
    if (handle) this.drag = { kind: "resize", startRect: rect, handle };
    else if (this.inside(ctx, pointer.doc)) {
      this.drag = { kind: "move", startRect: rect, startPointer: pointer.doc };
    } else this.drag = { kind: "new", start: snappedPointer(ctx, pointer).point };
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const drag = this.drag;
    if (!drag) return;
    const ratio =
      this.ratio(ctx) ??
      (pointer.shiftKey && drag.kind !== "new" && drag.kind !== "straighten"
        ? drag.startRect.width / drag.startRect.height
        : null);
    switch (drag.kind) {
      case "straighten":
        drag.end = pointer.doc;
        ctx.invalidate();
        break;
      case "new": {
        const snapped = snappedPointer(ctx, pointer);
        this.snapLines = snapped.lines;
        const r = ratio ?? (pointer.shiftKey ? 1 : null);
        this.setRect(
          ctx,
          r
            ? ratioFromPoints(drag.start, snapped.point, r)
            : rectFromPoints(drag.start, snapped.point),
        );
        break;
      }
      case "move": {
        const moved = {
          ...drag.startRect,
          x: drag.startRect.x + pointer.doc.x - drag.startPointer.x,
          y: drag.startRect.y + pointer.doc.y - drag.startPointer.y,
        };
        const snapping = dragSnapping(ctx, pointer);
        const snap = snapping ? snapRect(moved, snapping.targets, snapping.threshold) : null;
        this.snapLines = snap?.lines ?? [];
        this.setRect(ctx, { ...moved, x: moved.x + (snap?.dx ?? 0), y: moved.y + (snap?.dy ?? 0) });
        break;
      }
      case "resize": {
        const snapped = snappedPointer(ctx, pointer);
        this.snapLines = snapped.lines;
        const resized = resizeRect(drag.startRect, drag.handle, snapped.point);
        this.setRect(
          ctx,
          ratio ? constrainResize(drag.startRect, resized, drag.handle, ratio) : resized,
        );
        break;
      }
    }
  }

  pointerUp(ctx: ToolContext): void {
    if (this.drag?.kind === "straighten") {
      this.finishStraighten(ctx, this.drag.start, this.drag.end);
      this.drag = null;
      return;
    }
    if (this.drag?.kind === "new" && this.rect && (this.rect.width < 1 || this.rect.height < 1)) {
      // A click without a drag: keep the previous box.
      this.reset(ctx);
    }
    this.drag = null;
    this.snapLines = [];
    ctx.invalidate();
  }

  keyDown(ctx: ToolContext, key: ToolKey): boolean {
    if (key.key === "Enter") {
      this.apply(ctx);
      return true;
    }
    if (key.key === "Escape") {
      this.reset(ctx);
      return true;
    }
    return false;
  }

  /** Rotate the canvas so the drawn line is level, then crop to the largest box inside. */
  private finishStraighten(ctx: ToolContext, from: Point, to: Point): void {
    this.straightening = false;
    const doc = ctx.store.getSession()?.document;
    const degrees = straightenAngle(from, to);
    if (!doc || degrees === null || Math.abs(degrees) < 0.05) {
      ctx.invalidate();
      return;
    }
    const size = this.rotateCanvas(degrees);
    if (!size) return;
    this.setRect(ctx, straightenedCrop(doc.width, doc.height, degrees, size.width, size.height));
    ctx.notify("info", "Straightened. Adjust the crop box, then press Enter.");
  }

  /** Commit the crop box. Returns false if there was nothing to apply. */
  apply(ctx: ToolContext): boolean {
    const rect = this.currentRect(ctx);
    const before = ctx.store.getSession()?.document;
    if (!rect || !before) return false;
    const result = ctx.store.dispatch(cropDocument(roundRect(rect)));
    if (!result.ok) ctx.notify("error", result.error);
    else if (result.changed && ctx.store.getState().toolSettings.crop.deletePixels) {
      // "Delete cropped pixels": trim pixel layers to the new canvas, in the same undo step.
      const trimmed = trimToCanvas(ctx);
      if (trimmed.length > 0) {
        ctx.store.dispatch(bakeLayers(trimmed, "Crop"));
        ctx.store.collapseHistory(before, "Crop");
        ctx.pixelsCommitted();
      }
    }
    this.reset(ctx);
    return result.ok && result.changed;
  }

  reset(ctx: ToolContext): void {
    this.straightening = false;
    this.rect = null;
    this.rectDocId = null;
    this.drag = null;
    this.snapLines = [];
    ctx.invalidate();
  }

  cancel(ctx: ToolContext): void {
    this.reset(ctx);
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    const rect = this.currentRect(ctx);
    if (!rect) return [];
    if (this.drag?.kind === "straighten") {
      return [{ kind: "path", points: [this.drag.start, this.drag.end], closed: false }];
    }
    return [
      { kind: "crop", rect: roundRect(rect) },
      { kind: "snap", lines: this.drag ? this.snapLines : [] },
    ];
  }

  preview(): undefined {
    return undefined;
  }
}

/**
 * Pixel layers trimmed to the canvas after a crop: unscaled, unrotated layers lose the pixels
 * outside it (ADR-0044). Layers still loading, or scaled or rotated ones, are left as they are.
 */
function trimToCanvas(ctx: ToolContext): RasterLayer[] {
  const doc = ctx.store.getSession()?.document;
  if (!doc) return [];
  const out: RasterLayer[] = [];
  walkLayers(doc.layers, (layer) => {
    if (layer.kind !== "raster" || layer.locked || !canGrow(layer)) return;
    const { x: tx, y: ty } = layer.transform;
    const x0 = Math.max(0, Math.floor(-tx));
    const y0 = Math.max(0, Math.floor(-ty));
    const x1 = Math.min(layer.width, Math.ceil(doc.width - tx));
    const y1 = Math.min(layer.height, Math.ceil(doc.height - ty));
    if (x0 === 0 && y0 === 0 && x1 === layer.width && y1 === layer.height) return;
    if (x1 <= x0 || y1 <= y0 || !layer.assetId) {
      out.push({
        ...layer,
        assetId: null,
        width: doc.width,
        height: doc.height,
        transform: { ...layer.transform, x: 0, y: 0 },
      });
      return;
    }
    const bitmap = ctx.assets.getBitmap(layer.assetId);
    if (!bitmap) return;
    const surface = ctx.createSurface(x1 - x0, y1 - y0);
    context2d(surface).drawImage(bitmap, -x0, -y0, layer.width, layer.height);
    const asset = ctx.assets.addBitmap(surface, x1 - x0, y1 - y0);
    out.push({
      ...layer,
      assetId: asset.id,
      width: x1 - x0,
      height: y1 - y0,
      transform: { ...layer.transform, x: tx + x0, y: ty + y0 },
    });
  });
  return out;
}
