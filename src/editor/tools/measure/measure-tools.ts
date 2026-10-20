import { msg } from "../../core/message";
import { MAX_COLOR_SAMPLERS } from "../../core/editor-store";
import type { Point } from "../../core/viewport/viewport";
import type { Overlay } from "../../rendering/overlay";
import { HANDLE_HIT_PX, type Tool, type ToolContext, type ToolPointer } from "../tool";

/** Ruler readout: start, size, angle (degrees, counter-clockwise like Photoshop) and length. */
export function measureLine(from: Point, to: Point) {
  const w = to.x - from.x;
  const h = to.y - from.y;
  return {
    x: from.x,
    y: from.y,
    width: w,
    height: h,
    // "+ 0" turns −0 into 0, so a line straight to the left reads 180°, not −180°.
    angle: w === 0 && h === 0 ? 0 : (Math.atan2(-h + 0, w) * 180) / Math.PI,
    length: Math.hypot(w, h),
  };
}

/**
 * Color Sampler (ADR-0027): click to place up to four fixed sample points whose colours stay
 * listed in the options bar while you edit; drag a point to move it, Alt-click it to remove it.
 * Points are UI state, never part of the document.
 */
export class ColorSamplerTool implements Tool {
  readonly id = "color-sampler";
  private dragging: number | null = null;

  private nearest(ctx: ToolContext, p: Point): number {
    const r = (HANDLE_HIT_PX + 2) / ctx.viewport().zoom;
    return ctx.store
      .getState()
      .measure.samplers.findIndex((s) => Math.hypot(s.x - p.x, s.y - p.y) <= r);
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    return pointer && this.nearest(ctx, pointer.doc) >= 0 ? "move" : "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const doc = ctx.store.getSession()?.document;
    if (!doc || pointer.button !== 0) return;
    const samplers = ctx.store.getState().measure.samplers;
    const hit = this.nearest(ctx, pointer.doc);
    if (hit >= 0) {
      if (pointer.altKey) {
        ctx.store.setMeasure({ samplers: samplers.filter((_, i) => i !== hit) });
      } else {
        this.dragging = hit;
      }
      ctx.invalidate();
      return;
    }
    if (samplers.length >= MAX_COLOR_SAMPLERS) {
      ctx.notify(
        "info",
        msg("Up to {count} sample points. Alt-click one to remove it.", {
          count: MAX_COLOR_SAMPLERS,
        }),
      );
      return;
    }
    const p = clampToDocument(pointer.doc, doc.width, doc.height);
    ctx.store.setMeasure({ samplers: [...samplers, p] });
    ctx.invalidate();
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    if (this.dragging === null) return;
    const doc = ctx.store.getSession()?.document;
    if (!doc) return;
    const p = clampToDocument(pointer.doc, doc.width, doc.height);
    const samplers = ctx.store.getState().measure.samplers;
    ctx.store.setMeasure({ samplers: samplers.map((s, i) => (i === this.dragging ? p : s)) });
    ctx.invalidate();
  }

  pointerUp(): void {
    this.dragging = null;
  }

  cancel(ctx: ToolContext): void {
    this.dragging = null;
    ctx.invalidate();
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    return ctx.store
      .getState()
      .measure.samplers.map((center, i) => ({ kind: "sampler", center, label: String(i + 1) }));
  }

  preview(): undefined {
    return undefined;
  }
}

/**
 * Ruler: drag to measure a distance and an angle; the result is shown in the options bar and
 * stays until the next measurement. A click without dragging clears it.
 */
export class RulerTool implements Tool {
  readonly id = "ruler";
  private start: Point | null = null;

  cursor(): string {
    return "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0 || !ctx.store.getSession()) return;
    this.start = pointer.doc;
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    if (!this.start) return;
    let to = pointer.doc;
    if (pointer.shiftKey) {
      // Shift: snap to 45° steps.
      const dx = to.x - this.start.x;
      const dy = to.y - this.start.y;
      const step = Math.PI / 4;
      const a = Math.round(Math.atan2(dy, dx) / step) * step;
      const len = Math.hypot(dx, dy);
      to = { x: this.start.x + Math.cos(a) * len, y: this.start.y + Math.sin(a) * len };
    }
    ctx.store.setMeasure({ ruler: { from: this.start, to } });
    ctx.invalidate();
  }

  pointerUp(ctx: ToolContext, pointer: ToolPointer): void {
    const start = this.start;
    this.start = null;
    if (!start) return;
    const moved =
      Math.hypot(pointer.doc.x - start.x, pointer.doc.y - start.y) * ctx.viewport().zoom;
    if (moved < 2) ctx.store.setMeasure({ ruler: null });
    ctx.invalidate();
  }

  cancel(ctx: ToolContext): void {
    this.start = null;
    ctx.invalidate();
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    const ruler = ctx.store.getState().measure.ruler;
    return ruler ? [{ kind: "path", points: [ruler.from, ruler.to], closed: false }] : [];
  }

  preview(): undefined {
    return undefined;
  }
}

function clampToDocument(p: Point, width: number, height: number): Point {
  return {
    x: Math.min(width - 0.5, Math.max(0, Math.floor(p.x) + 0.5)),
    y: Math.min(height - 0.5, Math.max(0, Math.floor(p.y) + 0.5)),
  };
}
