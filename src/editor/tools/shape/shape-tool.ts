import { addLayer } from "../../core/commands";
import { createPathShapeLayer, createShapeLayer, nextLayerName } from "../../core/document/factory";
import { corner, type VectorPath } from "../../core/path/path";
import type { ShapeKind, ShapeLayer } from "../../core/document/types";
import { constrainDrag, rectFromPoints } from "../../core/geometry/rect";
import type { ShapeSettings } from "../../core/tool-settings";
import type { Point } from "../../core/viewport/viewport";
import type { CompositePreview } from "../../rendering/compositing/compositor";
import type { SnapLine } from "../../core/geometry/snapping";
import type { Overlay } from "../../rendering/overlay";
import { snappedPointer, type Tool, type ToolContext, type ToolPointer } from "../tool";

const SHAPE_NAMES: Record<ShapeKind | "polygon", string> = {
  rect: "Rectangle",
  ellipse: "Ellipse",
  line: "Line",
  path: "Shape",
  polygon: "Polygon",
};

/** A regular polygon inscribed in a box (first corner at the top), as a closed path. */
export function polygonPath(
  box: { x: number; y: number; width: number; height: number },
  sides: number,
): VectorPath {
  const n = Math.max(3, Math.min(64, Math.round(sides)));
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const anchors = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return corner(cx + (Math.cos(a) * box.width) / 2, cy + (Math.sin(a) * box.height) / 2);
  });
  return { subpaths: [{ closed: true, anchors }] };
}

/** Smallest drag (document px) that creates a shape; anything less counts as a click. */
const MIN_DRAG = 2;

/** Build the shape a drag from `start` to `end` describes. Pure, so it is unit-testable. */
export function shapeFromDrag(
  settings: ShapeSettings,
  start: Point,
  end: Point,
  options: { constrain: boolean; fromCenter: boolean },
): ShapeLayer | null {
  const kind = settings.kind;
  let to = end;
  if (options.constrain) to = constrainDrag(start, end, kind === "line" ? "angle45" : "square");

  const strokeEnabled = settings.strokeEnabled || kind === "line";
  const stroke = strokeEnabled
    ? {
        color: kind === "line" && !settings.strokeEnabled ? settings.fill : settings.stroke,
        width: settings.strokeWidth,
      }
    : null;
  const fill = settings.fillEnabled && kind !== "line" ? settings.fill : null;
  if (!fill && !stroke) return null;
  const name = SHAPE_NAMES[kind];

  if (kind === "line") {
    const dx = to.x - start.x;
    const dy = to.y - start.y;
    if (Math.hypot(dx, dy) < MIN_DRAG) return null;
    // The line runs corner to corner of its box; flips encode direction.
    return createShapeLayer({
      shape: "line",
      name,
      x: start.x,
      y: start.y,
      width: Math.abs(dx),
      height: Math.abs(dy),
      scaleX: dx < 0 ? -1 : 1,
      scaleY: dy < 0 ? -1 : 1,
      fill: null,
      stroke,
    });
  }

  const from = options.fromCenter ? { x: 2 * start.x - to.x, y: 2 * start.y - to.y } : start;
  const rect = rectFromPoints(from, to);
  if (rect.width < MIN_DRAG || rect.height < MIN_DRAG) return null;
  if (kind === "polygon") {
    return createPathShapeLayer({ path: polygonPath(rect, settings.sides), fill, stroke, name });
  }
  return createShapeLayer({
    shape: kind,
    name,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fill,
    stroke,
    cornerRadius: kind === "rect" ? settings.cornerRadius : 0,
  });
}

/**
 * Rectangle (rounded with a corner radius), ellipse, polygon and line. Shift: square, circle,
 * even polygon or 45° line. Alt: draw from the centre.
 */
export class ShapeTool implements Tool {
  readonly id = "shape";
  private start: Point | null = null;
  private draft: ShapeLayer | null = null;
  private snapLines: readonly SnapLine[] = [];

  cursor(): string {
    return "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0 || !ctx.store.getSession()) return;
    this.start = snappedPointer(ctx, pointer).point;
    this.draft = null;
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    if (!this.start) return;
    const end = snappedPointer(ctx, pointer);
    this.snapLines = end.lines;
    this.draft = shapeFromDrag(ctx.store.getState().toolSettings.shape, this.start, end.point, {
      constrain: pointer.shiftKey,
      fromCenter: pointer.altKey,
    });
    ctx.invalidate();
  }

  pointerUp(ctx: ToolContext, pointer: ToolPointer): void {
    if (!this.start) return;
    this.pointerMove(ctx, pointer);
    const draft = this.draft;
    this.start = null;
    this.draft = null;
    this.snapLines = [];
    ctx.invalidate();
    const session = ctx.store.getSession();
    if (!draft || !session) return;
    const shape = { ...draft, name: nextLayerName(session.document, draft.name) };
    const kind = ctx.store.getState().toolSettings.shape.kind;
    const result = ctx.store.dispatch(addLayer(shape, `New ${SHAPE_NAMES[kind]}`));
    if (!result.ok) ctx.notify("error", result.error);
  }

  cancel(ctx: ToolContext): void {
    this.start = null;
    this.draft = null;
    this.snapLines = [];
    ctx.invalidate();
  }

  overlays(): readonly Overlay[] {
    return this.start ? [{ kind: "snap", lines: this.snapLines }] : [];
  }

  preview(ctx: ToolContext): CompositePreview | undefined {
    if (!this.draft) return undefined;
    const aboveLayerId = ctx.store.getSession()?.document.activeLayerId ?? null;
    return { extraLayers: [{ layer: this.draft, aboveLayerId }] };
  }
}
