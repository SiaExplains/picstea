import { msg } from "../../core/message";
import {
  setLayerTransform,
  transformLayers,
  translateLayer,
  translateLayers,
} from "../../core/commands";
import { ancestorIds, findLayerDeep } from "../../core/document/tree";
import { selectedLayerIds } from "../../core/editor-store";
import {
  applyFrameChange,
  frameChange,
  frameTransform,
  targetsBounds,
  transformTargets,
  type TransformTarget,
} from "../../core/geometry/multi-transform";
import { activeLayer } from "../../core/document/queries";
import type { Layer, Transform } from "../../core/document/types";
import { createId } from "../../core/ids";
import {
  boundsOf,
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
import { snapPoint, snapRect, type SnapLine } from "../../core/geometry/snapping";
import type { Rect } from "../../core/geometry/layer-geometry";
import { documentToScreen, type Point, type Size } from "../../core/viewport/viewport";
import type { Overlay } from "../../rendering/overlay";
import {
  dragSnapping,
  HANDLE_HIT_PX,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";

type Hit = { kind: "scale"; handle: ScaleHandle } | { kind: "rotate" } | { kind: "body" } | null;

/** Several selected layers, or one group, transformed together through a frame (ADR-0020). */
interface MultiSelection {
  readonly ids: readonly string[];
  readonly targets: readonly TransformTarget[];
  /** Null when nothing in the selection can be scaled or rotated (e.g. an empty group). */
  readonly frame: { readonly transform: Transform; readonly size: Size } | null;
  readonly locked: boolean;
}

interface MultiDrag {
  readonly kind: "move" | "scale" | "rotate";
  readonly documentId: string;
  readonly selection: MultiSelection;
  readonly startPointer: Point;
  readonly startBounds: Rect;
  readonly handle?: ScaleHandle;
  readonly mergeKey: string;
  changed: boolean;
  applied: Point;
  /** The frame as it is now, for the overlay. */
  frameNow: Transform | null;
  /** The last step was rejected (a notice was shown once). */
  refused?: boolean;
}

interface Drag {
  readonly kind: "move" | "scale" | "rotate" | "move-group";
  readonly documentId: string;
  readonly layerId: string;
  readonly start: Transform;
  readonly size: Size;
  readonly startPointer: Point;
  /** Axis-aligned bounds at the start, for snapping a move. */
  readonly startBounds: Rect;
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
  private multiDrag: MultiDrag | null = null;
  /** Smart guides for the current drag. */
  private snapLines: readonly SnapLine[] = [];

  /**
   * Snap a move by (dx, dy) of a box that started at `bounds`: returns the adjusted offset.
   * With Shift (axis lock) only the moving axis snaps.
   */
  private snapMove(
    ctx: ToolContext,
    pointer: ToolPointer,
    drag: Drag,
    dx: number,
    dy: number,
  ): Point {
    this.snapLines = [];
    const snapping = dragSnapping(ctx, pointer, [drag.layerId]);
    if (!snapping) return { x: dx, y: dy };
    const b = drag.startBounds;
    const snap = snapRect({ ...b, x: b.x + dx, y: b.y + dy }, snapping.targets, snapping.threshold);
    const lockX = pointer.shiftKey && dx === 0;
    const lockY = pointer.shiftKey && dy === 0;
    this.snapLines = snap.lines.filter((l) => (l.axis === "x" ? !lockX : !lockY));
    return { x: lockX ? dx : dx + snap.dx, y: lockY ? dy : dy + snap.dy };
  }

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

  /** The multi-layer selection, or null when a single non-group layer is being edited. */
  private multi(ctx: ToolContext): MultiSelection | null {
    const session = ctx.store.getSession();
    if (!session) return null;
    const doc = session.document;
    const active = activeLayer(doc);
    const ids = selectedLayerIds(session).filter((id) => {
      const layer = findLayerDeep(doc.layers, id);
      return !!layer && isMovable(layer) && layer.visible;
    });
    if (ids.length === 0 || (ids.length === 1 && active?.kind !== "group")) return null;
    if (ids.length === 1 && ids[0] !== active?.id) return null;
    const targets = transformTargets(doc, ids, ctx.sizer);
    const bounds = targetsBounds(targets);
    // Locked anywhere: a selected layer, its ancestors, or anything inside a selected group.
    const locked =
      ids.some((id) => {
        const layer = findLayerDeep(doc.layers, id)!;
        return (
          layer.locked ||
          ancestorIds(doc.layers, id).some((a) => findLayerDeep(doc.layers, a)?.locked)
        );
      }) || targets.some((t) => t.layer.locked);
    return { ids, targets, frame: bounds && frameTransform(bounds), locked };
  }

  private multiHitTest(ctx: ToolContext, pointer: ToolPointer, multi: MultiSelection): Hit {
    const frame = multi.frame;
    if (!frame) return null;
    const viewport = ctx.viewport();
    const toScreen = (p: Point) => documentToScreen(viewport, p);
    const distance = (p: Point) => Math.hypot(p.x - pointer.screen.x, p.y - pointer.screen.y);
    if (!multi.locked) {
      for (const handle of SCALE_HANDLES) {
        const p = toScreen(framePoint(frame.transform, frame.size, HANDLE_FRACTION[handle]));
        if (distance(p) <= HANDLE_HIT_PX) return { kind: "scale", handle };
      }
    }
    const pad = HANDLE_HIT_PX / viewport.zoom;
    const { x, y } = frame.transform;
    const inside =
      pointer.doc.x >= x - pad &&
      pointer.doc.y >= y - pad &&
      pointer.doc.x <= x + frame.size.width + pad &&
      pointer.doc.y <= y + frame.size.height + pad;
    if (inside) return { kind: "body" };
    if (!multi.locked) {
      const corners = (["nw", "ne", "se", "sw"] as const).map((h) =>
        toScreen(framePoint(frame.transform, frame.size, HANDLE_FRACTION[h])),
      );
      if (corners.some((c) => distance(c) <= ROTATE_ZONE_PX)) return { kind: "rotate" };
    }
    return null;
  }

  private multiPointerDown(
    ctx: ToolContext,
    pointer: ToolPointer,
    multi: MultiSelection,
    hitOverride?: Hit,
  ): boolean {
    const session = ctx.store.getSession()!;
    const doc = session.document;
    let hit = hitOverride ?? this.multiHitTest(ctx, pointer, multi);
    const autoSelect = ctx.store.getState().toolSettings.move.autoSelect !== pointer.modKey;
    if (!hitOverride && hit?.kind !== "scale" && hit?.kind !== "rotate" && autoSelect) {
      const top = topLayerAt(doc, pointer.doc, ctx.sizer, HANDLE_HIT_PX / ctx.viewport().zoom);
      if (top) {
        const inSelection =
          multi.ids.includes(top.id) ||
          ancestorIds(doc.layers, top.id).some((a) => multi.ids.includes(a));
        if (!inSelection) {
          if (!pointer.shiftKey) return false; // fall back to selecting that one layer
          ctx.store.toggleLayerSelected(top.id);
          const grown = this.multi(ctx);
          if (!grown) return false;
          multi = grown;
        }
        hit = { kind: "body" };
      }
    }
    if (multi.locked) {
      // Only complain when the click was meant for the selection.
      if (hit) ctx.notify("error", "A selected layer is locked. Unlock it to move the selection.");
      return true;
    }
    const startBounds = multi.frame
      ? {
          x: multi.frame.transform.x,
          y: multi.frame.transform.y,
          width: multi.frame.size.width,
          height: multi.frame.size.height,
        }
      : { x: pointer.doc.x, y: pointer.doc.y, width: 0, height: 0 };
    const kind = hit?.kind === "scale" ? "scale" : hit?.kind === "rotate" ? "rotate" : "move";
    this.multiDrag = {
      kind,
      documentId: doc.id,
      selection: multi,
      startPointer: pointer.doc,
      startBounds,
      handle: hit?.kind === "scale" ? hit.handle : undefined,
      mergeKey: `transform:multi:${createId("drag")}`,
      changed: false,
      applied: { x: 0, y: 0 },
      frameNow: multi.frame?.transform ?? null,
    };
    return true;
  }

  private multiPointerMove(ctx: ToolContext, pointer: ToolPointer, drag: MultiDrag): void {
    const { selection } = drag;
    if (drag.kind === "move") {
      let dx = pointer.doc.x - drag.startPointer.x;
      let dy = pointer.doc.y - drag.startPointer.y;
      if (pointer.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      this.snapLines = [];
      const snapping = dragSnapping(ctx, pointer, [
        ...selection.ids,
        ...selection.targets.map((t) => t.layer.id),
      ]);
      if (snapping && selection.frame) {
        const b = drag.startBounds;
        const snap = snapRect(
          { ...b, x: b.x + dx, y: b.y + dy },
          snapping.targets,
          snapping.threshold,
        );
        const lockX = pointer.shiftKey && dx === 0;
        const lockY = pointer.shiftKey && dy === 0;
        this.snapLines = snap.lines.filter((l) => (l.axis === "x" ? !lockX : !lockY));
        dx = lockX ? dx : dx + snap.dx;
        dy = lockY ? dy : dy + snap.dy;
      }
      dx = Math.round(dx);
      dy = Math.round(dy);
      const step = { x: dx - drag.applied.x, y: dy - drag.applied.y };
      if (step.x === 0 && step.y === 0) return;
      const result = ctx.store.dispatch(
        translateLayers(selection.ids, step.x, step.y, { mergeKey: drag.mergeKey, gesture: true }),
      );
      if (!result.ok) {
        ctx.notify("error", result.error);
        this.multiDrag = null;
        return;
      }
      drag.applied = { x: dx, y: dy };
      drag.changed = true;
      if (selection.frame) {
        drag.frameNow = {
          ...selection.frame.transform,
          x: selection.frame.transform.x + dx,
          y: selection.frame.transform.y + dy,
        };
      }
      return;
    }
    const frame = selection.frame;
    if (!frame) return;
    const next =
      drag.kind === "scale"
        ? scaleFromHandle(frame.transform, frame.size, drag.handle!, pointer.doc, {
            keepAspect: pointer.shiftKey,
            fromCenter: pointer.altKey,
          })
        : rotateAroundCenter(
            frame.transform,
            frame.size,
            drag.startPointer,
            pointer.doc,
            pointer.shiftKey,
          );
    const change = frameChange(frame.transform, next);
    if (!change) return;
    const result = ctx.store.dispatch(
      transformLayers(applyFrameChange(selection.targets, change), {
        label: drag.kind === "scale" ? "Scale" : "Rotate",
        mergeKey: drag.mergeKey,
        gesture: true,
      }),
    );
    if (!result.ok) {
      // Out of range (e.g. too small or too large): keep the last valid state and the gesture.
      if (!drag.refused) ctx.notify("error", result.error);
      drag.refused = true;
      return;
    }
    drag.refused = false;
    drag.frameNow = next;
    if (result.changed) drag.changed = true;
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    if (this.multiDrag) {
      return this.multiDrag.kind === "move"
        ? "move"
        : this.multiDrag.kind === "rotate"
          ? "grabbing"
          : "crosshair";
    }
    const multi = !this.drag && pointer ? this.multi(ctx) : null;
    if (multi && pointer) {
      const hit = this.multiHitTest(ctx, pointer, multi);
      if (hit?.kind === "rotate") return "alias";
      if (hit?.kind === "scale") {
        const f = HANDLE_FRACTION[hit.handle];
        const angle = (Math.atan2(f.y - 0.5, f.x - 0.5) * 180) / Math.PI;
        return RESIZE_CURSORS[((Math.round(angle / 45) % 4) + 4) % 4];
      }
      return "move";
    }
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
    const multi = this.multi(ctx);
    if (multi && this.multiPointerDown(ctx, pointer, multi)) return;
    let hit = this.hitTest(ctx, pointer);
    let layer = this.editableActive(ctx);

    const autoSelect = ctx.store.getState().toolSettings.move.autoSelect !== pointer.modKey;
    if (hit?.kind !== "scale" && hit?.kind !== "rotate" && autoSelect) {
      const top = topLayerAt(doc, pointer.doc, ctx.sizer, HANDLE_HIT_PX / ctx.viewport().zoom);
      if (top && top.id !== layer?.id) {
        // Shift-click adds the layer under the pointer to the selection.
        if (pointer.shiftKey && layer) {
          ctx.store.toggleLayerSelected(top.id);
          const grown = this.multi(ctx);
          if (grown && this.multiPointerDown(ctx, pointer, grown, { kind: "body" })) return;
        }
        ctx.store.selectLayer(top.id);
        layer = top;
        hit = { kind: "body" };
      }
    }
    if (!layer) return;
    if (layer.locked) {
      ctx.notify("error", msg('"{layer}" is locked. Unlock it to move it.', { layer: layer.name }));
      return;
    }
    const mergeKey = `transform:${layer.id}:${createId("drag")}`;
    const base = {
      documentId: doc.id,
      layerId: layer.id,
      start: layer.transform,
      size: layerLocalSize(layer, doc, ctx.sizer),
      startPointer: pointer.doc,
      startBounds: boundsOf(layerCorners(layer, doc, ctx.sizer)),
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
    if (this.multiDrag) {
      this.multiPointerMove(ctx, pointer, this.multiDrag);
      return;
    }
    const drag = this.drag;
    if (!drag) return;
    if (drag.kind === "move-group") {
      let dx = pointer.doc.x - drag.startPointer.x;
      let dy = pointer.doc.y - drag.startPointer.y;
      if (pointer.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const snapped = this.snapMove(ctx, pointer, drag, dx, dy);
      dx = Math.round(snapped.x);
      dy = Math.round(snapped.y);
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
        const snapped = this.snapMove(ctx, pointer, drag, dx, dy);
        const snappedX = this.snapLines.some((l) => l.axis === "x");
        const snappedY = this.snapLines.some((l) => l.axis === "y");
        // A snapped axis keeps the exact offset so the edge lands on the line; otherwise the
        // origin moves in whole pixels.
        next = {
          ...drag.start,
          x: snappedX ? drag.start.x + snapped.x : Math.round(drag.start.x + snapped.x),
          y: snappedY ? drag.start.y + snapped.y : Math.round(drag.start.y + snapped.y),
        };
        break;
      }
      case "scale": {
        // The dragged handle snaps when the layer isn't rotated (its edges are axis-aligned).
        let target = pointer.doc;
        this.snapLines = [];
        const snapping =
          drag.start.rotation === 0 ? dragSnapping(ctx, pointer, [drag.layerId]) : null;
        if (snapping) {
          const f = HANDLE_FRACTION[drag.handle!];
          const snap = snapPoint(target, snapping.targets, snapping.threshold, {
            x: f.x !== 0.5,
            y: f.y !== 0.5,
          });
          target = { x: target.x + snap.dx, y: target.y + snap.dy };
          this.snapLines = snap.lines;
        }
        next = scaleFromHandle(drag.start, drag.size, drag.handle!, target, {
          keepAspect: pointer.shiftKey,
          fromCenter: pointer.altKey,
        });
        break;
      }
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
    if (!this.drag && !this.multiDrag) return;
    this.drag = null;
    this.multiDrag = null;
    this.snapLines = [];
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
    const multi = this.multi(ctx);
    if (multi) {
      const moved = ctx.store.dispatch(
        translateLayers(multi.ids, delta.x * step, delta.y * step, {
          label: "Nudge",
          mergeKey: `nudge:${multi.ids.join(",")}`,
        }),
      );
      if (!moved.ok) ctx.notify("error", moved.error);
      return true;
    }
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
    if (this.multiDrag?.changed) ctx.store.undo(this.multiDrag.documentId);
    this.drag = null;
    this.multiDrag = null;
    this.snapLines = [];
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    const session = ctx.store.getSession();
    const layer = this.editableActive(ctx);
    if (!session || !layer) return [];
    const drag = this.multiDrag;
    const multi = drag?.selection ?? this.multi(ctx);
    if (multi) {
      const out: Overlay[] = [{ kind: "snap", lines: drag ? this.snapLines : [] }];
      // Each layer's own outline, then the shared frame with handles.
      for (const { layer: l } of drag ? [] : multi.targets) {
        out.push({
          kind: "transform",
          corners: layerCorners(l, session.document, ctx.sizer),
          handles: false,
        });
      }
      if (multi.frame) {
        const t = drag?.frameNow ?? multi.frame.transform;
        const corners = (["nw", "ne", "se", "sw"] as const).map((h) =>
          framePoint(t, multi.frame!.size, HANDLE_FRACTION[h]),
        ) as [Point, Point, Point, Point];
        out.push({ kind: "transform", corners, handles: !multi.locked });
      }
      return out;
    }
    return [
      { kind: "snap", lines: this.drag ? this.snapLines : [] },
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
