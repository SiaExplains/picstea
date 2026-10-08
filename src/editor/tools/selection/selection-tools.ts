import { moveSelection, setSelection } from "../../core/commands/selection-commands";
import { activeLayer } from "../../core/document/queries";
import type { EditorDocument } from "../../core/document/types";
import type { Point } from "../../core/viewport/viewport";
import { renderBitmap } from "../../formats/layer-render";
import type { Overlay } from "../../rendering/overlay";
import { coverageAt, type SelectionMask } from "../../selection/mask";
import {
  combineSelections,
  modeFromModifiers,
  translateSelection,
  type SelectionMode,
} from "../../selection/ops";
import {
  ellipsePoints,
  ellipseSelection,
  polygonSelection,
  rectSelection,
} from "../../selection/shapes";
import {
  HANDLE_HIT_PX,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";

/**
 * Selection tools (ADR-0010): marquee, lasso and magic wand. They share how a new shape combines
 * with the current selection (options-bar mode, or Shift add / Alt subtract / both intersect), and
 * dragging inside an existing selection moves its outline. Every change is one undoable command.
 */

const NUDGE_KEYS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

let nudgeGesture = 0;

const errorMessage = (error: unknown) =>
  error instanceof Error && error.name === "FormatError" ? error.message : "That did not work.";

interface MoveGesture {
  readonly start: Point;
  readonly original: SelectionMask;
  preview: SelectionMask | null;
}

abstract class SelectionToolBase implements Tool {
  abstract readonly id: string;
  protected moving: MoveGesture | null = null;

  protected document(ctx: ToolContext): EditorDocument | undefined {
    return ctx.store.getSession()?.document;
  }

  /** Commit a new shape combined with the current selection. */
  protected commit(ctx: ToolContext, shape: SelectionMask, mode: SelectionMode, label: string) {
    const doc = this.document(ctx);
    if (!doc) return;
    const result = ctx.store.dispatch(
      setSelection(combineSelections(doc.selection, shape, mode), label),
    );
    if (!result.ok) ctx.notify("error", result.error);
  }

  protected deselect(ctx: ToolContext): void {
    if (this.document(ctx)?.selection) ctx.store.dispatch(setSelection(null, "Deselect"));
  }

  /** Start moving the outline when the press lands inside the selection without modifiers. */
  protected beginMove(ctx: ToolContext, pointer: ToolPointer): boolean {
    const selection = this.document(ctx)?.selection;
    if (!selection || pointer.shiftKey || pointer.altKey) return false;
    if (coverageAt(selection, pointer.doc.x, pointer.doc.y) < 128) return false;
    this.moving = { start: pointer.doc, original: selection, preview: selection };
    return true;
  }

  protected updateMove(ctx: ToolContext, pointer: ToolPointer): void {
    const move = this.moving;
    if (!move) return;
    move.preview = translateSelection(
      move.original,
      pointer.doc.x - move.start.x,
      pointer.doc.y - move.start.y,
    );
    ctx.invalidate();
  }

  protected endMove(ctx: ToolContext): void {
    const move = this.moving;
    if (!move) return;
    this.moving = null;
    if (move.preview !== move.original) {
      ctx.store.dispatch(setSelection(move.preview, "Move Selection"));
    }
    ctx.invalidate();
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    const selection = this.document(ctx)?.selection;
    if (this.moving) return "move";
    if (pointer && selection && coverageAt(selection, pointer.doc.x, pointer.doc.y) >= 128) {
      return "move";
    }
    return "crosshair";
  }

  abstract pointerDown(ctx: ToolContext, pointer: ToolPointer): void;
  abstract pointerMove(ctx: ToolContext, pointer: ToolPointer): void;
  abstract pointerUp(ctx: ToolContext, pointer: ToolPointer): void;

  keyDown(ctx: ToolContext, key: ToolKey): boolean {
    const step = NUDGE_KEYS[key.key];
    const doc = this.document(ctx);
    if (!step || !doc?.selection || key.modKey) return false;
    const by = key.shiftKey ? 10 : 1;
    ctx.store.dispatch(moveSelection(step.x * by, step.y * by, `nudge-selection-${nudgeGesture}`));
    return true;
  }

  cancel(ctx: ToolContext): void {
    this.moving = null;
    ctx.invalidate();
  }

  abstract overlays(ctx: ToolContext): readonly Overlay[];

  preview() {
    return undefined;
  }

  selectionPreview(): SelectionMask | null | undefined {
    return this.moving ? this.moving.preview : undefined;
  }
}

/** Arrow-key nudges merge into one undo step until another selection gesture starts. */
function sealNudges(): void {
  nudgeGesture++;
}

interface MarqueeDrag {
  readonly start: Point;
  readonly mode: SelectionMode;
  /** Modifiers held at the press choose the mode; held later they constrain / centre. */
  readonly modifiersAtStart: boolean;
  current: Point;
  constrain: boolean;
  fromCenter: boolean;
}

export class MarqueeTool extends SelectionToolBase {
  readonly id = "marquee";
  private drag: MarqueeDrag | null = null;

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0 || !this.document(ctx)) return;
    sealNudges();
    if (this.beginMove(ctx, pointer)) return;
    const settings = ctx.store.getState().toolSettings.marquee;
    this.drag = {
      start: pointer.doc,
      current: pointer.doc,
      mode: modeFromModifiers(settings.mode, pointer.shiftKey, pointer.altKey),
      modifiersAtStart: pointer.shiftKey || pointer.altKey,
      constrain: false,
      fromCenter: false,
    };
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    if (this.moving) return this.updateMove(ctx, pointer);
    const drag = this.drag;
    if (!drag) return;
    drag.current = pointer.doc;
    drag.constrain = !drag.modifiersAtStart && pointer.shiftKey;
    drag.fromCenter = !drag.modifiersAtStart && pointer.altKey;
    ctx.invalidate();
  }

  private rect(drag: MarqueeDrag, shape: "rect" | "ellipse") {
    let dx = drag.current.x - drag.start.x;
    let dy = drag.current.y - drag.start.y;
    if (drag.constrain) {
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx || 1) * side;
      dy = Math.sign(dy || 1) * side;
    }
    let x = drag.fromCenter ? drag.start.x - dx : drag.start.x;
    let y = drag.fromCenter ? drag.start.y - dy : drag.start.y;
    let x2 = drag.start.x + dx;
    let y2 = drag.start.y + dy;
    if (shape === "rect") {
      // Rectangular selections snap to whole pixels.
      [x, y, x2, y2] = [x, y, x2, y2].map(Math.round);
    }
    return {
      x: Math.min(x, x2),
      y: Math.min(y, y2),
      width: Math.abs(x2 - x),
      height: Math.abs(y2 - y),
    };
  }

  pointerUp(ctx: ToolContext): void {
    if (this.moving) return this.endMove(ctx);
    const drag = this.drag;
    this.drag = null;
    const doc = this.document(ctx);
    if (!drag || !doc) return;
    const { shape } = ctx.store.getState().toolSettings.marquee;
    const r = this.rect(drag, shape);
    if (r.width < 1 || r.height < 1) {
      // A click without a drag clears the selection, as in professional editors.
      if (drag.mode === "replace") this.deselect(ctx);
      ctx.invalidate();
      return;
    }
    const mask =
      shape === "rect"
        ? rectSelection(doc.width, doc.height, r)
        : ellipseSelection(doc.width, doc.height, r);
    this.commit(
      ctx,
      mask,
      drag.mode,
      shape === "rect" ? "Rectangular Marquee" : "Elliptical Marquee",
    );
    ctx.invalidate();
  }

  cancel(ctx: ToolContext): void {
    this.drag = null;
    super.cancel(ctx);
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    const drag = this.drag;
    if (!drag) return [];
    const { shape } = ctx.store.getState().toolSettings.marquee;
    const r = this.rect(drag, shape);
    const points =
      shape === "rect"
        ? [
            { x: r.x, y: r.y },
            { x: r.x + r.width, y: r.y },
            { x: r.x + r.width, y: r.y + r.height },
            { x: r.x, y: r.y + r.height },
          ]
        : ellipsePoints(r);
    return [{ kind: "path", points, closed: true }];
  }
}

export class LassoTool extends SelectionToolBase {
  readonly id = "lasso";
  private points: Point[] = [];
  private mode: SelectionMode = "replace";
  private hover: Point | null = null;
  private dragging = false;

  private get polygonal(): boolean {
    return this.points.length > 0 && !this.dragging;
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0 || !this.document(ctx)) return;
    const settings = ctx.store.getState().toolSettings.lasso;
    if (settings.kind === "polygonal" && this.points.length > 0) {
      // Clicking near the first point closes the polygon.
      const first = this.points[0];
      const zoom = ctx.viewport().zoom;
      const near = Math.hypot(pointer.doc.x - first.x, pointer.doc.y - first.y) * zoom;
      if (this.points.length >= 3 && near <= HANDLE_HIT_PX) return this.finish(ctx);
      this.points.push(pointer.doc);
      ctx.invalidate();
      return;
    }
    sealNudges();
    if (this.beginMove(ctx, pointer)) return;
    this.mode = modeFromModifiers(settings.mode, pointer.shiftKey, pointer.altKey);
    this.points = [pointer.doc];
    this.dragging = settings.kind === "freehand";
    ctx.invalidate();
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    if (this.moving) return this.updateMove(ctx, pointer);
    this.hover = pointer.doc;
    if (this.dragging) {
      const last = this.points[this.points.length - 1];
      for (const p of [...(pointer.coalesced ?? []), pointer.doc]) {
        if (Math.hypot(p.x - last.x, p.y - last.y) >= 0.5) this.points.push(p);
      }
    }
    if (this.points.length > 0) ctx.invalidate();
  }

  pointerUp(ctx: ToolContext): void {
    if (this.moving) return this.endMove(ctx);
    if (this.dragging) this.finish(ctx);
  }

  doubleClick(ctx: ToolContext): void {
    if (this.points.length > 0 && !this.dragging) this.finish(ctx);
  }

  private finish(ctx: ToolContext): void {
    const points = this.points;
    const mode = this.mode;
    this.points = [];
    this.dragging = false;
    const doc = this.document(ctx);
    if (!doc) return;
    if (points.length < 3) {
      if (mode === "replace") this.deselect(ctx);
    } else {
      const mask = polygonSelection(doc.width, doc.height, points);
      if (mask.bounds) this.commit(ctx, mask, mode, "Lasso");
      else if (mode === "replace") this.deselect(ctx);
    }
    ctx.invalidate();
  }

  keyDown(ctx: ToolContext, key: ToolKey): boolean {
    if (this.polygonal) {
      if (key.key === "Enter") {
        this.finish(ctx);
        return true;
      }
      if (key.key === "Escape") {
        this.cancel(ctx);
        return true;
      }
      if (key.key === "Backspace" || key.key === "Delete") {
        this.points.pop();
        ctx.invalidate();
        return true;
      }
    }
    return super.keyDown(ctx, key);
  }

  cancel(ctx: ToolContext): void {
    this.points = [];
    this.dragging = false;
    super.cancel(ctx);
  }

  leave(): void {
    this.hover = null;
  }

  overlays(): readonly Overlay[] {
    if (this.points.length === 0) return [];
    const points = this.polygonal && this.hover ? [...this.points, this.hover] : this.points;
    return [{ kind: "path", points, closed: !this.dragging }];
  }
}

export class MagicWandTool extends SelectionToolBase {
  readonly id = "wand";

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const doc = this.document(ctx);
    if (pointer.button !== 0 || !doc) return;
    sealNudges();
    const settings = ctx.store.getState().toolSettings.wand;
    const mode = modeFromModifiers(settings.mode, pointer.shiftKey, pointer.altKey);
    const layer = settings.sampleAll ? undefined : activeLayer(doc);
    const documentId = doc.id;
    const sampled = layer ? [{ ...layer, visible: true }] : doc.layers;
    // Draw here (GPU); read the pixels back and flood fill in the worker (ADR-0012).
    void renderBitmap(ctx, doc, sampled)
      .then((bitmap) =>
        ctx.jobs.run(
          "floodBitmap",
          {
            bitmap,
            x: pointer.doc.x,
            y: pointer.doc.y,
            tolerance: settings.tolerance,
            contiguous: settings.contiguous,
          },
          [bitmap],
        ),
      )
      .then((region) => {
        // Ignore the result if another document is active by now.
        if (this.document(ctx)?.id !== documentId) return;
        if (!region.bounds) {
          if (mode === "replace") this.deselect(ctx);
          return;
        }
        this.commit(ctx, region, mode, "Magic Wand");
        ctx.invalidate();
      })
      .catch((error: unknown) => ctx.notify("error", errorMessage(error)));
  }

  pointerMove(): void {}
  pointerUp(): void {}

  cursor(): string {
    return "crosshair";
  }

  overlays(): readonly Overlay[] {
    return [];
  }
}
