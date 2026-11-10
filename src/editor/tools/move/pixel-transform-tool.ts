import { moveSelectedPixels } from "../../core/commands";
import { activeLayer } from "../../core/document/queries";
import type { EditorDocument, Transform } from "../../core/document/types";
import { fromTransform, multiplyMatrix, type Matrix } from "../../core/geometry/matrix";
import {
  framePoint,
  HANDLE_FRACTION,
  rotateAroundCenter,
  SCALE_HANDLES,
  scaleFromHandle,
  type ScaleHandle,
} from "../../core/geometry/transform-handles";
import { msg } from "../../core/message";
import { documentToScreen, type Point, type Size } from "../../core/viewport/viewport";
import { releaseSurface, type Surface } from "../../pixels/layer-pixels";
import {
  composeMoved,
  isTranslation,
  liftSelection,
  releaseLifted,
  type LiftedPixels,
} from "../../pixels/move-pixels";
import type { CompositePreview } from "../../rendering/compositing/compositor";
import type { Overlay } from "../../rendering/overlay";
import type { SelectionMask } from "../../selection/mask";
import { transformSelection } from "../../selection/modify";
import { translateSelection } from "../../selection/ops";
import {
  HANDLE_HIT_PX,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";
import { insidePolygon } from "../selection/transform-selection-tool";
import { movablePixels, planePreview } from "./move-tool";

const ROTATE_ZONE_PX = 24;

type Drag =
  | { kind: "move"; start: Transform; pointer: Point }
  | { kind: "scale"; start: Transform; handle: ScaleHandle }
  | { kind: "rotate"; start: Transform; pointer: Point };

interface Session {
  /** The document the pixels were lifted from; any other means it changed underneath. */
  readonly document: EditorDocument;
  readonly lifted: LiftedPixels;
  readonly source: SelectionMask;
  readonly size: Size;
  readonly surface: Surface;
  readonly preview: CompositePreview;
  transform: Transform;
  /** The outline for the current transform, recomputed when a drag ends. */
  outline: SelectionMask | null;
}

/**
 * Free Transform (Mod+T) with a selection: scale, rotate and move just the selected pixels of a
 * pixel layer — or of the mask being edited — with the usual handles. The pixels are lifted once;
 * Enter applies everything as one undo step (pixels and outline), Esc puts them back.
 */
export class PixelTransformTool implements Tool {
  readonly id = "pixel-transform";
  private session: Session | null = null;
  private drag: Drag | null = null;

  get active(): boolean {
    return this.session !== null;
  }

  /** True when the document is no longer the one the pixels were lifted from. */
  isStale(doc: EditorDocument | undefined): boolean {
    return !!this.session && this.session.document !== doc;
  }

  begin(ctx: ToolContext): boolean {
    const session = ctx.store.getSession();
    const doc = session?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    const selection = doc?.selection;
    const target = layer && movablePixels(layer, ctx.store.getState().editTarget);
    if (!doc || !layer || !selection?.bounds || !target) return false;
    if (layer.locked) {
      ctx.notify("error", msg('"{layer}" is locked. Unlock it to move it.', { layer: layer.name }));
      return false;
    }
    let lifted: LiftedPixels | null;
    try {
      lifted = liftSelection(ctx, doc, target.plane, selection, false);
    } catch (error) {
      ctx.notify("error", error instanceof Error ? error.message : String(error));
      return false;
    }
    if (!lifted) {
      ctx.notify("info", "This layer is still loading. Try again in a moment.");
      return false;
    }
    const b = selection.bounds;
    const surface = ctx.createSurface(target.plane.width, target.plane.height);
    this.session = {
      document: doc,
      lifted,
      source: selection,
      size: { width: b.width, height: b.height },
      surface,
      preview: planePreview(target.plane, surface),
      transform: { x: b.x, y: b.y, scaleX: 1, scaleY: 1, rotation: 0 },
      outline: selection,
    };
    this.compose();
    ctx.invalidate();
    return true;
  }

  /** Document → document matrix for the current box. */
  private matrix(): Matrix {
    const s = this.session!;
    const b = s.source.bounds!;
    return multiplyMatrix(fromTransform(s.transform), [1, 0, 0, 1, -b.x, -b.y]);
  }

  private compose(): void {
    const s = this.session;
    if (s) composeMoved(s.lifted, this.matrix(), s.surface);
  }

  private outlineFor(matrix: Matrix): SelectionMask | null {
    const s = this.session!;
    // Whole-pixel moves keep the outline exact; anything else is resampled.
    if (isTranslation(matrix) && Number.isInteger(matrix[4]) && Number.isInteger(matrix[5])) {
      return translateSelection(s.source, matrix[4], matrix[5]);
    }
    return transformSelection(s.source, matrix);
  }

  apply(ctx: ToolContext): void {
    const s = this.session;
    if (!s) return;
    const matrix = this.matrix();
    const unchanged = isTranslation(matrix) && matrix[4] === 0 && matrix[5] === 0;
    if (unchanged || this.isStale(ctx.store.getSession()?.document)) {
      this.end(ctx);
      return;
    }
    this.compose();
    const outline = this.outlineFor(matrix);
    const { plane } = s.lifted;
    // End the session first: the edit below changes the document, which would otherwise look
    // like an outside change and drop the surface that is about to become the new pixels.
    this.session = null;
    this.drag = null;
    releaseLifted(s.lifted);
    const asset = ctx.assets.addBitmap(s.surface, plane.width, plane.height);
    const result = ctx.store.dispatch(
      moveSelectedPixels(plane.layerId, asset.id, outline, {
        label: "Free Transform",
        target: plane.target,
      }),
    );
    if (!result.ok) ctx.notify("error", result.error);
    else ctx.pixelsCommitted();
    ctx.invalidate();
  }

  /** Abandon the transform: the document never changed, so dropping the preview is enough. */
  end(ctx: ToolContext): void {
    const s = this.session;
    if (!s) return;
    releaseLifted(s.lifted);
    releaseSurface(s.surface);
    this.session = null;
    this.drag = null;
    ctx.invalidate();
  }

  private corners(): [Point, Point, Point, Point] {
    const s = this.session!;
    return (["nw", "ne", "se", "sw"] as const).map((h) =>
      framePoint(s.transform, s.size, HANDLE_FRACTION[h]),
    ) as [Point, Point, Point, Point];
  }

  private hit(ctx: ToolContext, pointer: ToolPointer): "move" | "rotate" | ScaleHandle | null {
    const s = this.session;
    if (!s) return null;
    const viewport = ctx.viewport();
    const distance = (p: Point) => {
      const q = documentToScreen(viewport, p);
      return Math.hypot(q.x - pointer.screen.x, q.y - pointer.screen.y);
    };
    for (const handle of SCALE_HANDLES) {
      if (distance(framePoint(s.transform, s.size, HANDLE_FRACTION[handle])) <= HANDLE_HIT_PX) {
        return handle;
      }
    }
    const corners = this.corners();
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
    const s = this.session;
    if (!s || pointer.button !== 0) return;
    const hit = this.hit(ctx, pointer);
    if (hit === "move" || hit === "rotate") {
      this.drag = { kind: hit, start: s.transform, pointer: pointer.doc };
    } else if (hit) {
      this.drag = { kind: "scale", start: s.transform, handle: hit };
    }
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const s = this.session;
    const drag = this.drag;
    if (!s || !drag) return;
    switch (drag.kind) {
      case "move":
        s.transform = {
          ...drag.start,
          x: Math.round(drag.start.x + pointer.doc.x - drag.pointer.x),
          y: Math.round(drag.start.y + pointer.doc.y - drag.pointer.y),
        };
        break;
      case "scale":
        s.transform = scaleFromHandle(drag.start, s.size, drag.handle, pointer.doc, {
          keepAspect: pointer.shiftKey,
          fromCenter: pointer.altKey,
        });
        break;
      case "rotate":
        s.transform = rotateAroundCenter(
          drag.start,
          s.size,
          drag.pointer,
          pointer.doc,
          pointer.shiftKey,
        );
        break;
    }
    this.compose();
    ctx.invalidate();
  }

  pointerUp(ctx: ToolContext): void {
    const s = this.session;
    if (!this.drag || !s) return;
    this.drag = null;
    s.outline = this.outlineFor(this.matrix());
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
    const deltas: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const delta = deltas[key.key];
    const s = this.session;
    if (!delta || !s || key.modKey) return false;
    const step = key.shiftKey ? 10 : 1;
    s.transform = {
      ...s.transform,
      x: s.transform.x + delta.x * step,
      y: s.transform.y + delta.y * step,
    };
    s.outline = this.outlineFor(this.matrix());
    this.compose();
    ctx.invalidate();
    return true;
  }

  cancel(ctx: ToolContext): void {
    this.drag = null;
    ctx.invalidate();
  }

  overlays(): readonly Overlay[] {
    if (!this.session) return [];
    return [{ kind: "transform", corners: this.corners(), handles: true }];
  }

  preview(): CompositePreview | undefined {
    return this.session?.preview;
  }

  selectionPreview(): SelectionMask | null | undefined {
    const s = this.session;
    if (!s) return undefined;
    // While dragging only the box is shown; the outline follows when the drag ends.
    return this.drag ? null : s.outline;
  }
}
