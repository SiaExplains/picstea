import { addLayer, setWorkPath } from "../../core/commands";
import { createPathShapeLayer, nextLayerName } from "../../core/document/factory";
import { corner, type Anchor, type Subpath } from "../../core/path/path";
import type { Point } from "../../core/viewport/viewport";
import type { Overlay } from "../../rendering/overlay";
import { pathTargets } from "./path-targets";
import {
  HANDLE_HIT_PX,
  snappedPointer,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";

interface Drawing {
  readonly documentId: string;
  anchors: Anchor[];
  /** Index of the anchor whose handles the pointer is pulling out, while pressed. */
  dragging: number | null;
  /** Where the pointer is (document space), for the rubber band. */
  hover: Point | null;
}

/**
 * Pen tool (ADR-0015): click for corners, drag for smooth anchors (symmetric handles), click the
 * first anchor to close; Enter or Esc finishes an open path, Backspace removes the last anchor.
 * In Shape mode the result is a path shape layer, in Path mode it is added to the work path.
 */
export class PenTool implements Tool {
  readonly id = "pen";
  private drawing: Drawing | null = null;

  get active(): boolean {
    return this.drawing !== null;
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    if (pointer && this.closesAt(ctx, pointer)) return "cell";
    return "crosshair";
  }

  /** Would a click here close the path (on the first anchor)? */
  private closesAt(ctx: ToolContext, pointer: ToolPointer): boolean {
    const d = this.drawing;
    if (!d || d.anchors.length < 2) return false;
    const first = d.anchors[0];
    const r = HANDLE_HIT_PX / ctx.viewport().zoom;
    return Math.hypot(pointer.doc.x - first.x, pointer.doc.y - first.y) <= r;
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const session = ctx.store.getSession();
    if (!session || pointer.button !== 0) return;
    if (this.drawing && this.drawing.documentId !== session.document.id) this.drawing = null;
    if (this.closesAt(ctx, pointer)) {
      this.finish(ctx, true);
      return;
    }
    const { point } = snappedPointer(ctx, pointer);
    if (!this.drawing) {
      this.drawing = { documentId: session.document.id, anchors: [], dragging: null, hover: null };
    }
    this.drawing.anchors.push(corner(point.x, point.y));
    this.drawing.dragging = this.drawing.anchors.length - 1;
    ctx.invalidate();
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const d = this.drawing;
    if (!d) return;
    d.hover = pointer.doc;
    if (d.dragging !== null) {
      // Pulling out handles: the out handle follows the pointer, the in handle mirrors it.
      const a = d.anchors[d.dragging];
      const p = pointer.doc;
      if (Math.hypot(p.x - a.x, p.y - a.y) * ctx.viewport().zoom > 2) {
        d.anchors[d.dragging] = {
          x: a.x,
          y: a.y,
          out: { x: p.x, y: p.y },
          in: { x: 2 * a.x - p.x, y: 2 * a.y - p.y },
        };
      }
    }
    ctx.invalidate();
  }

  pointerUp(ctx: ToolContext): void {
    if (this.drawing) this.drawing.dragging = null;
    ctx.invalidate();
  }

  keyDown(ctx: ToolContext, key: ToolKey): boolean {
    const d = this.drawing;
    // Mod+Enter (Make Selection) is a menu shortcut; it finishes the path itself.
    if (!d || key.modKey) return false;
    if (key.key === "Enter" || key.key === "Escape") {
      this.finish(ctx, false);
      return true;
    }
    if (key.key === "Backspace" || key.key === "Delete") {
      d.anchors.pop();
      if (d.anchors.length === 0) this.drawing = null;
      ctx.invalidate();
      return true;
    }
    return false;
  }

  /** Commit the path being drawn (a single point is discarded). */
  finish(ctx: ToolContext, closed: boolean): void {
    const d = this.drawing;
    this.drawing = null;
    ctx.invalidate();
    const session = ctx.store.getSession();
    if (!d || !session || session.document.id !== d.documentId || d.anchors.length < 2) return;
    const subpath: Subpath = { closed: closed && d.anchors.length > 2, anchors: d.anchors };
    const settings = ctx.store.getState().toolSettings;
    let result;
    if (settings.pen.mode === "path") {
      const existing = session.document.workPath?.subpaths ?? [];
      result = ctx.store.dispatch(
        setWorkPath({ subpaths: [...existing, subpath] }, { label: "Pen Path" }),
      );
    } else {
      const shape = settings.shape;
      const layer = createPathShapeLayer({
        path: { subpaths: [subpath] },
        fill: shape.fillEnabled ? shape.fill : null,
        // A path with neither fill nor stroke would be invisible: fall back to a stroke.
        stroke:
          shape.strokeEnabled || !shape.fillEnabled
            ? { color: shape.stroke, width: shape.strokeWidth }
            : null,
        name: nextLayerName(session.document, "Shape"),
      });
      if (!layer) return;
      result = ctx.store.dispatch(addLayer(layer, "New Shape"));
    }
    if (!result.ok) ctx.notify("error", result.error);
  }

  cancel(ctx: ToolContext): void {
    if (!this.drawing) return;
    this.drawing = null;
    ctx.invalidate();
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    // Existing paths stay visible while drawing, so new subpaths can line up with them.
    const doc = ctx.store.getSession()?.document;
    const existing: Overlay[] = doc
      ? pathTargets(doc).map((t) => ({ kind: "vector-path", path: t.path, anchors: false }))
      : [];
    const d = this.drawing;
    if (!d || d.anchors.length === 0) return existing;
    const last = d.anchors[d.anchors.length - 1];
    return [
      ...existing,
      {
        kind: "vector-path",
        path: { subpaths: [{ closed: false, anchors: d.anchors }] },
        anchors: true,
        selected: { subpath: 0, anchor: d.anchors.length - 1 },
        rubberBand: d.dragging === null && d.hover ? { from: last, to: d.hover } : null,
      },
    ];
  }

  preview(): undefined {
    return undefined;
  }
}
