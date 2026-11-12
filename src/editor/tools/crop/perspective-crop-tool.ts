import { replaceDocumentContent } from "../../core/commands";
import { isConvexQuad } from "../../core/geometry/homography";
import { documentToScreen, type Point } from "../../core/viewport/viewport";
import { perspectiveCrop } from "../../pixels/perspective-crop";
import type { Overlay } from "../../rendering/overlay";
import { insidePolygon } from "../selection/transform-selection-tool";
import {
  HANDLE_HIT_PX,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";

type Drag =
  | { kind: "new"; start: Point }
  | { kind: "corner"; index: number }
  | { kind: "move"; start: Point; quad: number[] };

/**
 * Perspective Crop (ADR-0044): drag a box, move its corners onto the edges of something that
 * should be rectangular (a document, a sign, a façade), then Enter straightens that area into
 * the new canvas; Esc starts over. One undo step.
 */
export class PerspectiveCropTool implements Tool {
  readonly id = "perspective-crop";
  private quad: number[] | null = null;
  private quadDocId: string | null = null;
  private drag: Drag | null = null;

  private current(ctx: ToolContext): number[] | null {
    const doc = ctx.store.getSession()?.document;
    return doc && this.quadDocId === doc.id ? this.quad : null;
  }

  private corner(ctx: ToolContext, pointer: ToolPointer): number {
    const q = this.current(ctx);
    if (!q) return -1;
    const viewport = ctx.viewport();
    for (let i = 0; i < 4; i++) {
      const p = documentToScreen(viewport, { x: q[i * 2], y: q[i * 2 + 1] });
      if (Math.hypot(p.x - pointer.screen.x, p.y - pointer.screen.y) <= HANDLE_HIT_PX) return i;
    }
    return -1;
  }

  private points(q: readonly number[]): Point[] {
    return [0, 1, 2, 3].map((i) => ({ x: q[i * 2], y: q[i * 2 + 1] }));
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    if (!pointer) return "default";
    const q = this.current(ctx);
    if (this.corner(ctx, pointer) >= 0) return "crosshair";
    return q && insidePolygon(this.points(q), pointer.doc) ? "move" : "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0) return;
    const q = this.current(ctx);
    const corner = this.corner(ctx, pointer);
    if (corner >= 0) this.drag = { kind: "corner", index: corner };
    else if (q && insidePolygon(this.points(q), pointer.doc)) {
      this.drag = { kind: "move", start: pointer.doc, quad: [...q] };
    } else this.drag = { kind: "new", start: pointer.doc };
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const d = this.drag;
    if (!d) return;
    const p = pointer.doc;
    if (d.kind === "new") {
      const { x: x0, y: y0 } = d.start;
      this.set(ctx, [x0, y0, p.x, y0, p.x, p.y, x0, p.y], true);
    } else if (d.kind === "corner" && this.quad) {
      const q = [...this.quad];
      q[d.index * 2] = p.x;
      q[d.index * 2 + 1] = p.y;
      this.set(ctx, q, false);
    } else if (d.kind === "move") {
      const dx = p.x - d.start.x;
      const dy = p.y - d.start.y;
      this.set(
        ctx,
        d.quad.map((v, i) => v + (i % 2 ? dy : dx)),
        true,
      );
    }
  }

  private set(ctx: ToolContext, q: number[], force: boolean): void {
    // A box drawn right-to-left is put back in clockwise order.
    const [x0, y0, , , x2, y2] = q;
    const ordered =
      force && (x2 < x0 || y2 < y0)
        ? [
            Math.min(x0, x2),
            Math.min(y0, y2),
            Math.max(x0, x2),
            Math.min(y0, y2),
            Math.max(x0, x2),
            Math.max(y0, y2),
            Math.min(x0, x2),
            Math.max(y0, y2),
          ]
        : q;
    if (!force && !isConvexQuad(ordered)) return;
    this.quad = ordered;
    this.quadDocId = ctx.store.getSession()?.document.id ?? null;
    ctx.invalidate();
  }

  pointerUp(ctx: ToolContext): void {
    const q = this.quad;
    if (this.drag?.kind === "new" && q && Math.abs(q[2] - q[0]) < 2 && Math.abs(q[5] - q[1]) < 2) {
      this.reset(ctx);
    }
    this.drag = null;
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

  apply(ctx: ToolContext): boolean {
    const q = this.current(ctx);
    const doc = ctx.store.getSession()?.document;
    if (!q || !doc) {
      ctx.notify("info", "Drag a box, then move its corners onto the edges to straighten.");
      return false;
    }
    const result = perspectiveCrop(ctx, ctx.sizer, doc, q);
    if (!result.ok) {
      ctx.notify("error", result.error);
      return false;
    }
    const dispatched = ctx.store.dispatch(
      replaceDocumentContent(result.document, "Perspective Crop"),
    );
    if (!dispatched.ok) ctx.notify("error", dispatched.error);
    else ctx.pixelsCommitted();
    this.reset(ctx);
    return dispatched.ok;
  }

  reset(ctx: ToolContext): void {
    this.quad = null;
    this.quadDocId = null;
    this.drag = null;
    ctx.invalidate();
  }

  cancel(ctx: ToolContext): void {
    this.drag = null;
    ctx.invalidate();
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    const q = this.current(ctx);
    return q ? [{ kind: "quad", corners: this.points(q), shade: true }] : [];
  }

  preview(): undefined {
    return undefined;
  }
}
