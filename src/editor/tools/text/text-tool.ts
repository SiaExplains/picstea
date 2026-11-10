import { msg } from "../../core/message";
import { activeLayer } from "../../core/document/queries";
import { flattenTopFirst } from "../../core/document/tree";
import { hitTestLayer } from "../../core/geometry/layer-geometry";
import type { Point } from "../../core/viewport/viewport";
import type { Overlay } from "../../rendering/overlay";
import type { Tool, ToolContext, ToolPointer } from "../tool";

/** Screen pixels the pointer must travel before a click becomes a text-box drag. */
const DRAG_THRESHOLD_PX = 6;

/**
 * Text tool: click empty canvas to start point text, drag to draw a box for paragraph text that
 * wraps inside it, click an existing text layer to edit it. Typing happens in the on-canvas editor
 * owned by the controller (beginTextEdit).
 */
export class TextTool implements Tool {
  readonly id = "text";
  private drag: { start: Point; startScreen: Point; now: Point; moved: boolean } | null = null;

  cursor(): string {
    return "text";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const session = ctx.store.getSession();
    if (!session || pointer.button !== 0) return;
    const doc = session.document;
    const tolerance = 4 / ctx.viewport().zoom;
    for (const { layer, effectivelyVisible } of flattenTopFirst(doc.layers, {
      includeCollapsed: true,
    })) {
      if (!effectivelyVisible) continue;
      if (layer.kind === "text" && hitTestLayer(layer, pointer.doc, doc, ctx.sizer, tolerance)) {
        if (layer.locked) {
          ctx.notify(
            "error",
            msg('"{layer}" is locked. Unlock it to edit the text.', { layer: layer.name }),
          );
          return;
        }
        ctx.store.selectLayer(layer.id);
        ctx.beginTextEdit({ mode: "edit", layerId: layer.id });
        return;
      }
    }
    this.drag = { start: pointer.doc, startScreen: pointer.screen, now: pointer.doc, moved: false };
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const drag = this.drag;
    if (!drag) return;
    drag.now = pointer.doc;
    const distance = Math.hypot(
      pointer.screen.x - drag.startScreen.x,
      pointer.screen.y - drag.startScreen.y,
    );
    if (distance >= DRAG_THRESHOLD_PX) drag.moved = true;
    ctx.invalidate();
  }

  pointerUp(ctx: ToolContext): void {
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    ctx.invalidate();
    if (!drag.moved) {
      ctx.beginTextEdit({
        mode: "new",
        at: { x: Math.round(drag.start.x), y: Math.round(drag.start.y) },
      });
      return;
    }
    const box = boxOf(drag.start, drag.now);
    ctx.beginTextEdit({
      mode: "new",
      at: { x: box.x, y: box.y },
      box: { width: Math.max(1, box.width), height: Math.max(1, box.height) },
    });
  }

  doubleClick(ctx: ToolContext): void {
    const doc = ctx.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (layer?.kind === "text" && !layer.locked)
      ctx.beginTextEdit({ mode: "edit", layerId: layer.id });
  }

  cancel(ctx: ToolContext): void {
    if (!this.drag) return;
    this.drag = null;
    ctx.invalidate();
  }

  overlays(): readonly Overlay[] {
    const drag = this.drag;
    if (!drag?.moved) return [];
    const b = boxOf(drag.start, drag.now);
    return [
      {
        kind: "transform",
        corners: [
          { x: b.x, y: b.y },
          { x: b.x + b.width, y: b.y },
          { x: b.x + b.width, y: b.y + b.height },
          { x: b.x, y: b.y + b.height },
        ],
        handles: false,
      },
    ];
  }

  preview(): undefined {
    return undefined;
  }
}

function boxOf(a: Point, b: Point) {
  const x = Math.round(Math.min(a.x, b.x));
  const y = Math.round(Math.min(a.y, b.y));
  return {
    x,
    y,
    width: Math.round(Math.max(a.x, b.x)) - x,
    height: Math.round(Math.max(a.y, b.y)) - y,
  };
}
