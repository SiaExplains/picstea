import { cropDocument } from "../../core/commands";
import type { Rect } from "../../core/geometry/layer-geometry";
import { rectFromPoints, rectHandles, resizeRect, roundRect } from "../../core/geometry/rect";
import { SCALE_HANDLES, type ScaleHandle } from "../../core/geometry/transform-handles";
import { snapRect, type SnapLine } from "../../core/geometry/snapping";
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
    const handle = this.handleAt(ctx, pointer);
    if (handle) this.drag = { kind: "resize", startRect: rect, handle };
    else if (this.inside(ctx, pointer.doc)) {
      this.drag = { kind: "move", startRect: rect, startPointer: pointer.doc };
    } else this.drag = { kind: "new", start: snappedPointer(ctx, pointer).point };
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const drag = this.drag;
    if (!drag) return;
    switch (drag.kind) {
      case "new": {
        const snapped = snappedPointer(ctx, pointer);
        this.snapLines = snapped.lines;
        this.setRect(ctx, rectFromPoints(drag.start, snapped.point));
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
        this.setRect(ctx, resizeRect(drag.startRect, drag.handle, snapped.point));
        break;
      }
    }
  }

  pointerUp(ctx: ToolContext): void {
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

  /** Commit the crop box. Returns false if there was nothing to apply. */
  apply(ctx: ToolContext): boolean {
    const rect = this.currentRect(ctx);
    if (!rect) return false;
    const result = ctx.store.dispatch(cropDocument(roundRect(rect)));
    if (!result.ok) ctx.notify("error", result.error);
    this.reset(ctx);
    return result.ok && result.changed;
  }

  reset(ctx: ToolContext): void {
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
    return [
      { kind: "crop", rect: roundRect(rect) },
      { kind: "snap", lines: this.drag ? this.snapLines : [] },
    ];
  }

  preview(): undefined {
    return undefined;
  }
}
