import { setLayerTransform, translateLayer } from "../../core/commands";
import { activeLayer } from "../../core/document/queries";
import type { Layer, Transform } from "../../core/document/types";
import { createId } from "../../core/ids";
import {
  hitTestLayer,
  isMovable,
  isTransformable,
  layerCorners,
  layerLocalSize,
  topLayerAt,
} from "../../core/geometry/layer-geometry";
import {
  HANDLE_FRACTION,
  rotateAroundCenter,
  scaleFromHandle,
  SCALE_HANDLES,
  framePoint,
  type ScaleHandle,
} from "../../core/geometry/transform-handles";
import { documentToScreen, type Point, type Size } from "../../core/viewport/viewport";
import type { Overlay } from "../../rendering/overlay";
import {
  HANDLE_HIT_PX,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";

type Hit = { kind: "scale"; handle: ScaleHandle } | { kind: "rotate" } | { kind: "body" } | null;

interface Drag {
  readonly kind: "move" | "scale" | "rotate" | "move-group";
  readonly documentId: string;
  readonly layerId: string;
  readonly start: Transform;
  readonly size: Size;
  readonly startPointer: Point;
  readonly handle?: ScaleHandle;
  readonly mergeKey: string;
  changed: boolean;
  /** Group drags apply relative moves; this is what has been applied so far. */
  applied: Point;
}

/** Rotation zone: just outside a corner handle, in CSS pixels. */
const ROTATE_ZONE_PX = 22;
const RESIZE_CURSORS = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"];

/**
 * Move tool with free-transform handles: drag inside to move, drag a handle to scale (Shift keeps
 * proportions, Alt scales from the centre), drag just outside a corner to rotate (Shift snaps to
 * 15°). Arrow keys nudge by 1px, Shift+arrow by 10px.
 */
export class MoveTool implements Tool {
  readonly id = "move";
  private drag: Drag | null = null;

  private editableActive(ctx: ToolContext): Layer | undefined {
    const doc = ctx.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    return layer && isMovable(layer) && layer.visible ? layer : undefined;
  }

  private hitTest(ctx: ToolContext, pointer: ToolPointer): Hit {
    const session = ctx.store.getSession();
    const layer = this.editableActive(ctx);
    if (!session || !layer) return null;
    const doc = session.document;
    const size = layerLocalSize(layer, doc, ctx.sizer);
    const viewport = ctx.viewport();
    const toScreen = (p: Point) => documentToScreen(viewport, p);
    const distance = (p: Point) => Math.hypot(p.x - pointer.screen.x, p.y - pointer.screen.y);

    if (!layer.locked && isTransformable(layer)) {
      for (const handle of SCALE_HANDLES) {
        const p = toScreen(framePoint(layer.transform, size, HANDLE_FRACTION[handle]));
        if (distance(p) <= HANDLE_HIT_PX) return { kind: "scale", handle };
      }
      const corners = layerCorners(layer, doc, ctx.sizer).map(toScreen);
      const inside = hitTestLayer(layer, pointer.doc, doc, ctx.sizer);
      if (!inside && corners.some((c) => distance(c) <= ROTATE_ZONE_PX)) return { kind: "rotate" };
    }
    return hitTestLayer(layer, pointer.doc, doc, ctx.sizer, HANDLE_HIT_PX / viewport.zoom)
      ? { kind: "body" }
      : null;
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    if (this.drag)
      return this.drag.kind === "move"
        ? "move"
        : this.drag.kind === "rotate"
          ? "grabbing"
          : "crosshair";
    if (!pointer) return "default";
    const hit = this.hitTest(ctx, pointer);
    if (hit?.kind === "rotate") return "alias";
    if (hit?.kind === "scale") return this.resizeCursor(ctx, hit.handle);
    return "move";
  }

  /** Pick the resize cursor closest to the handle's on-screen direction (accounts for rotation). */
  private resizeCursor(ctx: ToolContext, handle: ScaleHandle): string {
    const layer = this.editableActive(ctx);
    const doc = ctx.store.getSession()?.document;
    if (!layer || !doc) return "move";
    const size = layerLocalSize(layer, doc, ctx.sizer);
    const center = framePoint(layer.transform, size, { x: 0.5, y: 0.5 });
    const p = framePoint(layer.transform, size, HANDLE_FRACTION[handle]);
    const angle = (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
    const index = ((Math.round(angle / 45) % 4) + 4) % 4;
    return RESIZE_CURSORS[index];
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const session = ctx.store.getSession();
    if (!session || pointer.button !== 0) return;
    const doc = session.document;
    let hit = this.hitTest(ctx, pointer);
    let layer = this.editableActive(ctx);

    const autoSelect = ctx.store.getState().toolSettings.move.autoSelect !== pointer.modKey;
    if (hit?.kind !== "scale" && hit?.kind !== "rotate" && autoSelect) {
      const top = topLayerAt(doc, pointer.doc, ctx.sizer, HANDLE_HIT_PX / ctx.viewport().zoom);
      if (top && top.id !== layer?.id) {
        ctx.store.selectLayer(top.id);
        layer = top;
        hit = { kind: "body" };
      }
    }
    if (!layer) return;
    if (layer.locked) {
      ctx.notify("error", `"${layer.name}" is locked. Unlock it to move it.`);
      return;
    }
    const mergeKey = `transform:${layer.id}:${createId("drag")}`;
    const base = {
      documentId: doc.id,
      layerId: layer.id,
      start: layer.transform,
      size: layerLocalSize(layer, doc, ctx.sizer),
      startPointer: pointer.doc,
      mergeKey,
      changed: false,
      applied: { x: 0, y: 0 },
    };
    if (layer.kind === "group") this.drag = { ...base, kind: "move-group" };
    else if (hit?.kind === "scale") this.drag = { ...base, kind: "scale", handle: hit.handle };
    else if (hit?.kind === "rotate") this.drag = { ...base, kind: "rotate" };
    else this.drag = { ...base, kind: "move" };
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const drag = this.drag;
    if (!drag) return;
    if (drag.kind === "move-group") {
      let dx = Math.round(pointer.doc.x - drag.startPointer.x);
      let dy = Math.round(pointer.doc.y - drag.startPointer.y);
      if (pointer.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const step = { x: dx - drag.applied.x, y: dy - drag.applied.y };
      if (step.x === 0 && step.y === 0) return;
      const result = ctx.store.dispatch(
        translateLayer(drag.layerId, step.x, step.y, { mergeKey: drag.mergeKey, gesture: true }),
      );
      if (!result.ok) {
        ctx.notify("error", result.error);
        this.drag = null;
        return;
      }
      drag.applied = { x: dx, y: dy };
      drag.changed = true;
      return;
    }
    let next: Transform;
    switch (drag.kind) {
      case "move": {
        let dx = pointer.doc.x - drag.startPointer.x;
        let dy = pointer.doc.y - drag.startPointer.y;
        // Shift constrains to the dominant axis.
        if (pointer.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        next = {
          ...drag.start,
          x: Math.round(drag.start.x + dx),
          y: Math.round(drag.start.y + dy),
        };
        break;
      }
      case "scale":
        next = scaleFromHandle(drag.start, drag.size, drag.handle!, pointer.doc, {
          keepAspect: pointer.shiftKey,
          fromCenter: pointer.altKey,
        });
        break;
      default:
        next = rotateAroundCenter(
          drag.start,
          drag.size,
          drag.startPointer,
          pointer.doc,
          pointer.shiftKey,
        );
        break;
    }
    const label = drag.kind === "move" ? "Move" : drag.kind === "scale" ? "Scale" : "Rotate";
    const result = ctx.store.dispatch(
      setLayerTransform(drag.layerId, next, { label, mergeKey: drag.mergeKey, gesture: true }),
    );
    if (!result.ok) {
      ctx.notify("error", result.error);
      this.drag = null;
    } else if (result.changed) {
      drag.changed = true;
    }
  }

  pointerUp(ctx: ToolContext): void {
    if (!this.drag) return;
    this.drag = null;
    ctx.store.sealHistory();
  }

  doubleClick(ctx: ToolContext): void {
    const doc = ctx.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (layer?.kind === "text" && !layer.locked) {
      ctx.store.setActiveTool("text");
      ctx.beginTextEdit({ mode: "edit", layerId: layer.id });
    }
  }

  keyDown(ctx: ToolContext, key: ToolKey): boolean {
    const deltas: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const delta = deltas[key.key];
    const layer = this.editableActive(ctx);
    if (!delta || !layer || key.modKey) return false;
    const step = key.shiftKey ? 10 : 1;
    if (layer.kind === "group") {
      const moved = ctx.store.dispatch(
        translateLayer(layer.id, delta.x * step, delta.y * step, {
          label: "Nudge",
          mergeKey: `nudge:${layer.id}`,
        }),
      );
      if (!moved.ok) ctx.notify("error", moved.error);
      return true;
    }
    const t = layer.transform;
    const result = ctx.store.dispatch(
      setLayerTransform(
        layer.id,
        { ...t, x: t.x + delta.x * step, y: t.y + delta.y * step },
        { label: "Nudge", mergeKey: `nudge:${layer.id}` },
      ),
    );
    if (!result.ok) ctx.notify("error", result.error);
    return true;
  }

  cancel(ctx: ToolContext): void {
    // The whole drag is one merged history entry, so undoing it restores the start state.
    if (this.drag?.changed) ctx.store.undo(this.drag.documentId);
    this.drag = null;
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    const session = ctx.store.getSession();
    const layer = this.editableActive(ctx);
    if (!session || !layer) return [];
    return [
      {
        kind: "transform",
        corners: layerCorners(layer, session.document, ctx.sizer),
        handles: !layer.locked && isTransformable(layer),
      },
    ];
  }

  preview(): undefined {
    return undefined;
  }
}
