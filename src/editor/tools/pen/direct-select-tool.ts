import { createId } from "../../core/ids";
import {
  hitTestPath,
  insertAnchor,
  mapPath,
  nearestOnPath,
  moveAnchor,
  moveHandle,
  removeAnchor,
  toggleSmooth,
  updateAnchor,
  type PathHit,
  type VectorPath,
} from "../../core/path/path";
import type { Point } from "../../core/viewport/viewport";
import type { Overlay } from "../../rendering/overlay";
import {
  HANDLE_HIT_PX,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";
import { pathTargets, type PathTarget } from "./path-targets";

interface Selected {
  readonly key: PathTarget["key"];
  readonly subpath: number;
  /** null when the whole subpath is selected (clicked on a segment). */
  readonly anchor: number | null;
}

interface Drag {
  readonly documentId: string;
  readonly key: PathTarget["key"];
  readonly hit: PathHit;
  readonly start: VectorPath;
  readonly startPointer: Point;
  readonly mergeKey: string;
  readonly alt: boolean;
  moved: boolean;
}

/**
 * Direct Selection (ADR-0015): edit the anchors and handles of the active path shape, the active
 * layer's vector mask or the work path. Drag an anchor or a segment (whole subpath), drag a
 * handle (Alt breaks the symmetry), Alt-click an anchor to toggle corner/smooth, Delete removes
 * the selected anchor and the arrow keys nudge it. Each drag is one undo step.
 */
/**
 * The same tool covers the rest of Photoshop's path tools (ADR-0027): Path Selection moves a
 * whole path; Add / Delete Anchor Point and Convert Point edit single anchors with a click.
 */
export type PathToolMode = "direct" | "path" | "add" | "delete" | "convert";

const PATH_TOOL_IDS: Record<PathToolMode, string> = {
  direct: "path-select",
  path: "path-move",
  add: "anchor-add",
  delete: "anchor-delete",
  convert: "anchor-convert",
};

export class DirectSelectTool implements Tool {
  readonly id: string;
  private selected: Selected | null = null;
  private drag: Drag | null = null;

  constructor(private readonly mode: PathToolMode = "direct") {
    this.id = PATH_TOOL_IDS[mode];
  }

  private targets(ctx: ToolContext): PathTarget[] {
    const doc = ctx.store.getSession()?.document;
    return doc ? pathTargets(doc) : [];
  }

  private hit(ctx: ToolContext, pointer: ToolPointer): { target: PathTarget; hit: PathHit } | null {
    const r = HANDLE_HIT_PX / ctx.viewport().zoom;
    for (const target of this.targets(ctx)) {
      const hit = hitTestPath(target.path, pointer.doc, r);
      if (hit) return { target, hit };
    }
    return null;
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    if (this.drag) return "grabbing";
    if (!pointer) return "default";
    if (this.mode === "add") return this.segmentAt(ctx, pointer) ? "copy" : "default";
    const found = this.hit(ctx, pointer);
    if (!found) return "default";
    if (this.mode === "path") return "move";
    if (this.mode === "delete") return found.hit.kind === "anchor" ? "pointer" : "default";
    return found.hit.kind === "segment" ? "move" : "pointer";
  }

  /** The nearest segment position within reach, for adding an anchor. */
  private segmentAt(ctx: ToolContext, pointer: ToolPointer) {
    const r = HANDLE_HIT_PX / ctx.viewport().zoom;
    for (const target of this.targets(ctx)) {
      const at = nearestOnPath(target.path, pointer.doc);
      if (at && at.distance <= r) return { target, at };
    }
    return null;
  }

  private commit(ctx: ToolContext, key: PathTarget["key"], path: VectorPath, mergeKey?: string) {
    const target = this.targets(ctx).find((t) => t.key === key);
    const command = target?.commit(path, mergeKey);
    if (!command) {
      ctx.notify("error", "A shape needs at least one point. Delete the layer instead.");
      return false;
    }
    const result = ctx.store.dispatch(command);
    if (!result.ok) ctx.notify("error", result.error);
    return result.ok;
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const session = ctx.store.getSession();
    if (!session || pointer.button !== 0) return;
    if (this.mode === "add") {
      const seg = this.segmentAt(ctx, pointer);
      if (!seg) return;
      const { target, at } = seg;
      if (this.commit(ctx, target.key, insertAnchor(target.path, at.subpath, at.index, at.t))) {
        this.selected = { key: target.key, subpath: at.subpath, anchor: at.index + 1 };
      }
      ctx.invalidate();
      return;
    }
    if (this.mode === "delete") {
      const found = this.hit(ctx, pointer);
      if (found?.hit.kind === "anchor") {
        this.commit(
          ctx,
          found.target.key,
          removeAnchor(found.target.path, found.hit.subpath, found.hit.anchor),
        );
        this.selected = null;
        ctx.invalidate();
      }
      return;
    }
    const found = this.hit(ctx, pointer);
    if (!found) {
      this.selected = null;
      ctx.invalidate();
      return;
    }
    const { target, hit } = found;
    this.selected = {
      key: target.key,
      subpath: hit.subpath,
      // Path Selection always takes the whole path.
      anchor: hit.kind === "segment" || this.mode === "path" ? null : hit.anchor,
    };
    this.drag = {
      documentId: session.document.id,
      key: target.key,
      hit,
      start: target.path,
      startPointer: pointer.doc,
      mergeKey: `path:${target.key}:${createId("drag")}`,
      alt: pointer.altKey,
      moved: false,
    };
    ctx.invalidate();
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const drag = this.drag;
    if (!drag) return;
    const dx = pointer.doc.x - drag.startPointer.x;
    const dy = pointer.doc.y - drag.startPointer.y;
    if (!drag.moved && Math.hypot(dx, dy) * ctx.viewport().zoom < 2) return;
    drag.moved = true;
    const { hit, start } = drag;
    let next: VectorPath;
    if (this.mode === "path") {
      next = mapPath(start, (p) => ({ x: p.x + dx, y: p.y + dy }));
    } else if (this.mode === "convert" && hit.kind === "anchor") {
      // Drag out of an anchor: pull symmetric handles (a corner becomes smooth).
      const to = pointer.doc;
      next = updateAnchor(start, hit.subpath, hit.anchor, (a) => ({
        ...a,
        out: to,
        in: { x: 2 * a.x - to.x, y: 2 * a.y - to.y },
      }));
    } else if (this.mode === "convert" && hit.kind === "handle") {
      next = updateAnchor(start, hit.subpath, hit.anchor, (a) =>
        moveHandle(a, hit.side, pointer.doc, true),
      );
    } else if (hit.kind === "anchor") {
      next = updateAnchor(start, hit.subpath, hit.anchor, (a) => moveAnchor(a, dx, dy));
    } else if (hit.kind === "handle") {
      next = updateAnchor(start, hit.subpath, hit.anchor, (a) =>
        moveHandle(a, hit.side, pointer.doc, pointer.altKey),
      );
    } else {
      next = {
        subpaths: start.subpaths.map((s, i) =>
          i === hit.subpath
            ? mapPath({ subpaths: [s] }, (p) => ({ x: p.x + dx, y: p.y + dy })).subpaths[0]
            : s,
        ),
      };
    }
    if (!this.commit(ctx, drag.key, next, drag.mergeKey)) this.drag = null;
  }

  pointerUp(ctx: ToolContext): void {
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    if (drag.moved) {
      ctx.store.sealHistory();
    } else if ((drag.alt || this.mode === "convert") && drag.hit.kind === "anchor") {
      // Alt-click (or a click with Convert Point): corner ↔ smooth.
      this.commit(ctx, drag.key, toggleSmooth(drag.start, drag.hit.subpath, drag.hit.anchor));
    }
    ctx.invalidate();
  }

  keyDown(ctx: ToolContext, key: ToolKey): boolean {
    const sel = this.selected;
    if (!sel || key.modKey) return false;
    const target = this.targets(ctx).find((t) => t.key === sel.key);
    if (!target || !target.path.subpaths[sel.subpath]) return false;
    if ((key.key === "Delete" || key.key === "Backspace") && sel.anchor !== null) {
      this.commit(ctx, sel.key, removeAnchor(target.path, sel.subpath, sel.anchor));
      this.selected = null;
      return true;
    }
    const step = key.shiftKey ? 10 : 1;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const d = delta[key.key];
    if (!d) return false;
    const next =
      sel.anchor === null
        ? {
            subpaths: target.path.subpaths.map((s, i) =>
              i === sel.subpath
                ? mapPath({ subpaths: [s] }, (p) => ({ x: p.x + d.x, y: p.y + d.y })).subpaths[0]
                : s,
            ),
          }
        : updateAnchor(target.path, sel.subpath, sel.anchor, (a) => moveAnchor(a, d.x, d.y));
    this.commit(ctx, sel.key, next, `path-nudge:${sel.key}`);
    return true;
  }

  cancel(ctx: ToolContext): void {
    // A drag is one merged history entry; undoing it restores the start.
    if (this.drag?.moved) ctx.store.undo(this.drag.documentId);
    this.drag = null;
    this.selected = null;
    ctx.invalidate();
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    return this.targets(ctx).map((t) => ({
      kind: "vector-path",
      path: t.path,
      anchors: true,
      selected:
        this.selected?.key === t.key && this.selected.anchor !== null
          ? { subpath: this.selected.subpath, anchor: this.selected.anchor }
          : null,
    }));
  }

  preview(): undefined {
    return undefined;
  }
}
