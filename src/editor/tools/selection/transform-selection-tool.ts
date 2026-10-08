import { transformSelectionCommand } from "../../core/commands/selection-commands";
import type { Transform } from "../../core/document/types";
import { fromTransform, multiplyMatrix } from "../../core/geometry/matrix";
import {
  framePoint,
  HANDLE_FRACTION,
  rotateAroundCenter,
  SCALE_HANDLES,
  scaleFromHandle,
  type ScaleHandle,
} from "../../core/geometry/transform-handles";
import { documentToScreen, type Point, type Size } from "../../core/viewport/viewport";
import type { Overlay } from "../../rendering/overlay";
import type { SelectionMask } from "../../selection/mask";
import { transformSelection } from "../../selection/modify";
import {
  HANDLE_HIT_PX,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";

const ROTATE_ZONE_PX = 24;

type Drag =
  | { kind: "move"; start: Transform; pointer: Point }
  | { kind: "scale"; start: Transform; handle: ScaleHandle }
  | { kind: "rotate"; start: Transform; pointer: Point };

/**
 * Select → Transform Selection: move, scale and rotate the selection outline with the same
 * handles as Free Transform. The selection's bounds act as the box; Enter applies one undoable
 * command, Esc cancels. Pixels are not affected.
 */
export class TransformSelectionTool implements Tool {
  readonly id = "transform-selection";
  private source: SelectionMask | null = null;
  private size: Size = { width: 1, height: 1 };
  private transform: Transform | null = null;
  private drag: Drag | null = null;
  /** Result for the current transform, recomputed when a drag ends. */
  private result: SelectionMask | null = null;

  get active(): boolean {
    return this.source !== null;
  }

  begin(ctx: ToolContext): boolean {
    const selection = ctx.store.getSession()?.document.selection;
    if (!selection?.bounds) {
      ctx.notify("error", "Make a selection first.");
      return false;
    }
    const b = selection.bounds;
    this.source = selection;
    this.result = selection;
    this.size = { width: b.width, height: b.height };
    this.transform = { x: b.x, y: b.y, scaleX: 1, scaleY: 1, rotation: 0 };
    ctx.invalidate();
    return true;
  }

  /** Document → document matrix for the current box. */
  private matrix() {
    const b = this.source!.bounds!;
    return multiplyMatrix(fromTransform(this.transform!), [1, 0, 0, 1, -b.x, -b.y]);
  }

  apply(ctx: ToolContext): void {
    if (!this.source || !this.transform) return;
    const result = ctx.store.dispatch(transformSelectionCommand(this.matrix()));
    if (!result.ok) ctx.notify("error", result.error);
    this.end(ctx);
  }

  end(ctx: ToolContext): void {
    this.source = null;
    this.transform = null;
    this.drag = null;
    this.result = null;
    ctx.invalidate();
  }

  private hit(ctx: ToolContext, pointer: ToolPointer): "move" | "rotate" | ScaleHandle | null {
    const t = this.transform;
    if (!t) return null;
    const viewport = ctx.viewport();
    const distance = (p: Point) => {
      const s = documentToScreen(viewport, p);
      return Math.hypot(s.x - pointer.screen.x, s.y - pointer.screen.y);
    };
    for (const handle of SCALE_HANDLES) {
      if (distance(framePoint(t, this.size, HANDLE_FRACTION[handle])) <= HANDLE_HIT_PX) {
        return handle;
      }
    }
    const corners = (["nw", "ne", "se", "sw"] as const).map((h) =>
      framePoint(t, this.size, HANDLE_FRACTION[h]),
    );
    if (insidePolygon(corners, pointer.doc)) return "move";
    if (corners.some((c) => distance(c) <= ROTATE_ZONE_PX)) return "rotate";
    return null;
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    if (this.drag) return this.drag.kind === "rotate" ? "grabbing" : "move";
    if (!pointer) return "default";
    const hit = this.hit(ctx, pointer);
    if (hit === "rotate") return "alias";
    if (hit === "move") return "move";
    return hit ? "crosshair" : "default";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const t = this.transform;
    if (!t || pointer.button !== 0) return;
    const hit = this.hit(ctx, pointer);
    if (hit === "move" || hit === "rotate")
      this.drag = { kind: hit, start: t, pointer: pointer.doc };
    else if (hit) this.drag = { kind: "scale", start: t, handle: hit };
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const drag = this.drag;
    if (!drag) return;
    switch (drag.kind) {
      case "move":
        this.transform = {
          ...drag.start,
          x: Math.round(drag.start.x + pointer.doc.x - drag.pointer.x),
          y: Math.round(drag.start.y + pointer.doc.y - drag.pointer.y),
        };
        break;
      case "scale":
        this.transform = scaleFromHandle(drag.start, this.size, drag.handle, pointer.doc, {
          keepAspect: pointer.shiftKey,
          fromCenter: pointer.altKey,
        });
        break;
      case "rotate":
        this.transform = rotateAroundCenter(
          drag.start,
          this.size,
          drag.pointer,
          pointer.doc,
          pointer.shiftKey,
        );
        break;
    }
    ctx.invalidate();
  }

  pointerUp(ctx: ToolContext): void {
    if (!this.drag || !this.source) return;
    this.drag = null;
    this.result = transformSelection(this.source, this.matrix());
    ctx.invalidate();
  }

  keyDown(ctx: ToolContext, key: ToolKey): boolean {
    if (key.key === "Enter") {
      this.apply(ctx);
      return true;
    }
    if (key.key === "Escape") {
      this.end(ctx);
      return true;
    }
    return false;
  }

  cancel(ctx: ToolContext): void {
    this.drag = null;
    ctx.invalidate();
  }

  overlays(): readonly Overlay[] {
    const t = this.transform;
    if (!t) return [];
    const corners = (["nw", "ne", "se", "sw"] as const).map((h) =>
      framePoint(t, this.size, HANDLE_FRACTION[h]),
    ) as [Point, Point, Point, Point];
    return [{ kind: "transform", corners, handles: true }];
  }

  preview() {
    return undefined;
  }

  selectionPreview(): SelectionMask | null | undefined {
    if (!this.source) return undefined;
    // While dragging only the box is shown; the outline updates when the drag ends.
    return this.drag ? null : this.result;
  }
}

function insidePolygon(points: readonly Point[], p: Point): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}
