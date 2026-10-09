import { addGuide, moveGuide, removeGuide } from "../../core/commands";
import type { Guide } from "../../core/document/types";
import { snapPoint, type SnapLine } from "../../core/geometry/snapping";
import { documentToScreen, type Point, type Size } from "../../core/viewport/viewport";
import type { Overlay } from "../../rendering/overlay";
import { dragSnapping, type ToolContext, type ToolPointer } from "../tool";

/** Screen distance within which a guide can be picked up, in CSS pixels. */
export const GUIDE_HIT_PX = 4;

interface State {
  readonly documentId: string;
  /** null while creating a guide from a ruler. */
  readonly guideId: string | null;
  readonly orientation: Guide["orientation"];
  position: number;
  /** Released here, the guide is removed (dragged back onto a ruler / off the canvas). */
  outside: boolean;
  lines: readonly SnapLine[];
}

/**
 * Creating and moving guides (ADR-0014). The guide being dragged is drawn as an overlay and the
 * document changes once, on release, so each drag is a single undo step: New Guide, Move Guide
 * or Delete Guide (dropping it outside the canvas area).
 */
export class GuideDrag {
  private state: State | null = null;

  get active(): boolean {
    return this.state !== null;
  }

  /** The guide hidden from normal drawing while it is being dragged. */
  get draggedGuideId(): string | null {
    return this.state?.guideId ?? null;
  }

  /** The guide under the pointer, if any (topmost = last added). */
  hitTest(ctx: ToolContext, screen: Point): Guide | null {
    const doc = ctx.store.getSession()?.document;
    if (!doc) return null;
    const viewport = ctx.viewport();
    for (let i = doc.guides.length - 1; i >= 0; i--) {
      const guide = doc.guides[i];
      const p = documentToScreen(viewport, { x: guide.position, y: guide.position });
      const d =
        guide.orientation === "vertical" ? Math.abs(p.x - screen.x) : Math.abs(p.y - screen.y);
      if (d <= GUIDE_HIT_PX) return guide;
    }
    return null;
  }

  begin(ctx: ToolContext, orientation: Guide["orientation"], guide?: Guide): void {
    const session = ctx.store.getSession();
    if (!session) return;
    this.state = {
      documentId: session.document.id,
      guideId: guide?.id ?? null,
      orientation,
      position: guide?.position ?? 0,
      // A new guide only exists once it has been dragged onto the canvas.
      outside: !guide,
      lines: [],
    };
    ctx.invalidate();
  }

  /** `screen` is relative to the canvas viewport whose size is `area`. */
  move(ctx: ToolContext, pointer: ToolPointer, area: Size): void {
    const state = this.state;
    if (!state) return;
    const vertical = state.orientation === "vertical";
    let position = Math.round(vertical ? pointer.doc.x : pointer.doc.y);
    state.lines = [];
    const snapping = dragSnapping(ctx, pointer);
    if (snapping) {
      const others = {
        ...snapping.targets,
        x: snapping.targets.x.filter((c) => !(c.source === "guide" && c.value === state.position)),
        y: snapping.targets.y.filter((c) => !(c.source === "guide" && c.value === state.position)),
      };
      const snap = snapPoint(
        { x: position, y: position },
        others,
        snapping.threshold,
        vertical ? { y: false } : { x: false },
      );
      position += vertical ? snap.dx : snap.dy;
      state.lines = snap.lines;
    }
    state.position = position;
    const s = pointer.screen;
    state.outside = s.x < 0 || s.y < 0 || s.x > area.width || s.y > area.height;
    ctx.invalidate();
  }

  end(ctx: ToolContext): void {
    const state = this.state;
    this.state = null;
    ctx.invalidate();
    if (!state || ctx.store.getSession()?.document.id !== state.documentId) return;
    let result;
    if (state.guideId === null) {
      if (state.outside) return;
      result = ctx.store.dispatch(addGuide(state.orientation, state.position));
    } else if (state.outside) {
      result = ctx.store.dispatch(removeGuide(state.guideId));
    } else {
      result = ctx.store.dispatch(moveGuide(state.guideId, state.position));
      ctx.store.sealHistory();
    }
    if (!result.ok) ctx.notify("error", result.error);
  }

  cancel(ctx: ToolContext): void {
    if (!this.state) return;
    this.state = null;
    ctx.invalidate();
  }

  overlays(): readonly Overlay[] {
    const state = this.state;
    if (!state || state.outside) return [];
    return [
      { kind: "snap", lines: state.lines },
      { kind: "guide", orientation: state.orientation, position: state.position },
    ];
  }

  cursor(orientation: Guide["orientation"]): string {
    return orientation === "vertical" ? "col-resize" : "row-resize";
  }
}
