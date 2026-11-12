import { bakeLayers, moveSelectedPixels } from "../../core/commands";
import { findLayerDeep } from "../../core/document/tree";
import type {
  EditorDocument,
  Layer,
  LayerMask,
  RasterLayer,
  SmartDistortion,
  SmartObjectLayer,
} from "../../core/document/types";
import { checkDimensions } from "../../core/document/limits";
import { invert3, isConvexQuad, project, squareToQuad } from "../../core/geometry/homography";
import { applyMatrix, fromTransform, invertMatrix, type Matrix } from "../../core/geometry/matrix";
import {
  boxMesh,
  boxQuad,
  drawMapped,
  isBoxMesh,
  mapBounds,
  perspectiveMap,
  warpMap,
  type MeshMap,
} from "../../core/geometry/mesh";
import { presetMesh, type WarpSettings } from "../../core/geometry/warp-presets";
import { msg } from "../../core/message";
import { Observable } from "../../core/observable";
import { documentToScreen, type Point } from "../../core/viewport/viewport";
import {
  context2d,
  releaseSurface,
  selectionSurface,
  type Surface,
} from "../../pixels/layer-pixels";
import { liftSelection, releaseLifted, type LiftedPixels } from "../../pixels/move-pixels";
import type { CompositePreview } from "../../rendering/compositing/compositor";
import type { Overlay } from "../../rendering/overlay";
import { createSelection, type SelectionMask } from "../../selection/mask";
import { insidePolygon } from "../selection/transform-selection-tool";
import {
  HANDLE_HIT_PX,
  type Tool,
  type ToolContext,
  type ToolKey,
  type ToolPointer,
} from "../tool";
import { movablePixels, planePreview } from "./move-tool";

/**
 * Edit → Transform → Skew, Distort, Perspective and Warp (ADR-0044). Like Free Transform with a
 * selection, it overrides the active tool until Enter applies or Esc cancels; the whole edit is
 * one undo step.
 *
 * - **Selected pixels** (of a pixel layer or of the mask being edited) are lifted and drawn back
 *   through the map.
 * - **A whole pixel layer** is redrawn through the map into a new box (the layer ends up
 *   unscaled); its linked mask follows.
 * - **A smart object** keeps the distortion as an editable setting; choosing the command again
 *   starts from it. Text and shapes are converted to smart objects before they get here.
 */

export type DistortMode = "skew" | "distort" | "perspective" | "warp";

export const DISTORT_LABELS: Record<DistortMode, string> = {
  skew: "Skew",
  distort: "Distort",
  perspective: "Perspective",
  warp: "Warp",
};

/** What the options bar shows while a transform is open. */
export interface DistortState {
  readonly mode: DistortMode;
  readonly warp: WarpSettings & { readonly custom: boolean };
}

const PREVIEW_ID = "__distort-preview__";

type Target =
  | { kind: "selection"; lifted: LiftedPixels; source: SelectionMask }
  | { kind: "layer"; layer: RasterLayer; image: CanvasImageSource }
  | { kind: "smart"; layer: SmartObjectLayer };

interface Session {
  readonly document: EditorDocument;
  readonly mode: DistortMode;
  readonly target: Target;
  /** Source picture size (pixels) — the map takes 0…1 across it. */
  readonly w: number;
  readonly h: number;
  /** Source pixels → document, before this edit (affine). */
  readonly toDoc: Matrix;
  /** Where the picture was before this edit (document quad), for masks that follow. */
  readonly startQuad: readonly number[];
  quad: number[];
  mesh: number[];
  warp: WarpSettings & { custom: boolean };
  surface: Surface | null;
  preview: CompositePreview | undefined;
}

type Drag = {
  kind: "move" | "handle";
  index: number;
  quad: number[];
  mesh: number[];
  start: Point;
};

const mapPoints = (m: Matrix, pts: readonly number[]) => {
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const p = applyMatrix(m, { x: pts[i], y: pts[i + 1] });
    out.push(p.x, p.y);
  }
  return out;
};

const pointAt = (pts: readonly number[], i: number): Point => ({
  x: pts[i * 2],
  y: pts[i * 2 + 1],
});

export class DistortTool implements Tool {
  readonly id = "distort";
  readonly state = new Observable<DistortState | null>(null);
  private session: Session | null = null;
  private drag: Drag | null = null;

  get active(): boolean {
    return this.session !== null;
  }

  isStale(doc: EditorDocument | undefined): boolean {
    return !!this.session && this.session.document !== doc;
  }

  begin(ctx: ToolContext, mode: DistortMode, layerId: string): boolean {
    const doc = ctx.store.getSession()?.document;
    const layer = doc && findLayerDeep(doc.layers, layerId);
    if (!doc || !layer) return false;
    if (layer.locked) {
      ctx.notify("error", msg('"{layer}" is locked. Unlock it to edit it.', { layer: layer.name }));
      return false;
    }
    const prepared = this.prepare(ctx, doc, layer);
    if (!prepared) return false;
    const { target, w, h, toDoc, local } = prepared;
    const startQuad = mapPoints(toDoc, boxQuad(w, h));
    // A smart object that is already distorted starts from its distortion.
    const quad = local?.kind === "perspective" ? mapPoints(toDoc, local.corners) : [...startQuad];
    const mesh =
      local?.kind === "warp"
        ? mapPoints(toDoc, local.mesh)
        : mode === "warp" && local?.kind === "perspective"
          ? meshFromQuad(quad)
          : mapPoints(toDoc, boxMesh(w, h));
    // An existing warp is edited point by point (its preset amounts are not stored).
    const custom = local?.kind === "warp";
    this.session = {
      document: doc,
      mode,
      target,
      w,
      h,
      toDoc,
      startQuad: local?.kind === "perspective" ? quad : startQuad,
      quad,
      mesh,
      warp: { style: "arc", bend: 0, horizontal: 0, vertical: 0, custom },
      surface: null,
      preview: undefined,
    };
    this.publish();
    this.compose(ctx, 16);
    ctx.invalidate();
    return true;
  }

  /** The picture to distort and how it sits in the document. */
  private prepare(
    ctx: ToolContext,
    doc: EditorDocument,
    layer: Layer,
  ): {
    target: Target;
    w: number;
    h: number;
    toDoc: Matrix;
    local?: SmartDistortion;
  } | null {
    if (layer.kind === "smart") {
      const { width: w, height: h } = layer.content;
      return {
        target: { kind: "smart", layer },
        w,
        h,
        toDoc: fromTransform(layer.transform),
        local: layer.distortion,
      };
    }
    const selection = doc.selection;
    const pixels = movablePixels(layer, ctx.store.getState().editTarget);
    if (selection?.bounds && pixels) {
      const lifted = liftSelection(ctx, doc, pixels.plane, selection, false);
      if (!lifted) {
        ctx.notify("info", "This layer is still loading. Try again in a moment.");
        return null;
      }
      const b = selection.bounds;
      return {
        target: { kind: "selection", lifted, source: selection },
        w: b.width,
        h: b.height,
        toDoc: [1, 0, 0, 1, b.x, b.y],
      };
    }
    if (ctx.store.getState().editTarget === "mask" && layer.mask) {
      ctx.notify("error", "Select part of the mask first (Select → All selects all of it).");
      return null;
    }
    if (layer.kind !== "raster" || !layer.assetId) {
      ctx.notify("error", "This layer has no pixels to transform.");
      return null;
    }
    const image = ctx.assets.getBitmap(layer.assetId);
    if (!image) {
      ctx.notify("info", "This layer is still loading. Try again in a moment.");
      return null;
    }
    return {
      target: { kind: "layer", layer, image },
      w: layer.width,
      h: layer.height,
      toDoc: fromTransform(layer.transform),
    };
  }

  /** Normalised picture coordinates → document, for the current shape. */
  private map(): MeshMap | null {
    const s = this.session!;
    return s.mode === "warp" ? warpMap(s.mesh) : perspectiveMap(s.quad);
  }

  /** Redraw the live preview with `n × n` cells. */
  private compose(ctx: ToolContext, n: number): void {
    const s = this.session;
    const map = s && this.map();
    if (!s || !map) return;
    const doc = s.document;
    const t = s.target;
    if (t.kind === "selection") {
      const { plane, base, clip } = t.lifted;
      s.surface ??= ctx.createSurface(plane.width, plane.height);
      const c = context2d(s.surface);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, plane.width, plane.height);
      c.drawImage(base, 0, 0);
      const inverse = invertMatrix(plane.toDocument);
      if (!inverse) return;
      c.setTransform(...inverse);
      drawMapped(c, clip.surface, s.w, s.h, map, n);
      c.setTransform(1, 0, 0, 1, 0, 0);
      s.preview = planePreview(plane, s.surface);
      return;
    }
    if (t.kind === "layer") {
      s.surface ??= ctx.createSurface(doc.width, doc.height);
      const c = context2d(s.surface);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, doc.width, doc.height);
      drawMapped(c, t.image, s.w, s.h, map, n);
      const stand: RasterLayer = {
        ...t.layer,
        id: PREVIEW_ID,
        width: doc.width,
        height: doc.height,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      };
      s.preview = {
        hiddenLayerIds: new Set([t.layer.id]),
        extraLayers: [{ layer: stand, aboveLayerId: t.layer.id }],
        overrides: new Map([[PREVIEW_ID, s.surface]]),
      };
      return;
    }
    const distortion = this.localDistortion();
    const stand: SmartObjectLayer = { ...t.layer, id: PREVIEW_ID };
    if (distortion) (stand as { distortion?: SmartDistortion }).distortion = distortion;
    else delete (stand as { distortion?: SmartDistortion }).distortion;
    s.preview = {
      hiddenLayerIds: new Set([t.layer.id]),
      extraLayers: [{ layer: stand, aboveLayerId: t.layer.id }],
    };
  }

  /** The smart object's distortion in its own coordinates; undefined when it is back to a box. */
  private localDistortion(): SmartDistortion | undefined {
    const s = this.session!;
    const inverse = invertMatrix(s.toDoc);
    if (!inverse) return undefined;
    if (s.mode === "warp") {
      const mesh = mapPoints(inverse, s.mesh);
      if (isBoxMesh(mesh, s.w, s.h)) return undefined;
      return { kind: "warp", mesh, style: s.warp.custom ? "custom" : s.warp.style };
    }
    const corners = mapPoints(inverse, s.quad);
    const box = boxQuad(s.w, s.h);
    if (corners.every((v, i) => Math.abs(v - box[i]) < 0.01)) return undefined;
    return { kind: "perspective", corners };
  }

  apply(ctx: ToolContext): void {
    const s = this.session;
    if (!s) return;
    if (this.isStale(ctx.store.getSession()?.document)) {
      this.end(ctx);
      return;
    }
    const map = this.map();
    const label = DISTORT_LABELS[s.mode];
    // End the session first: the edit below changes the document.
    this.session = null;
    this.drag = null;
    this.state.set(null);
    if (!map) {
      this.release(s);
      ctx.invalidate();
      return;
    }
    const t = s.target;
    let result;
    if (t.kind === "selection") {
      this.session = s;
      this.compose(ctx, 48);
      this.session = null;
      const { plane } = t.lifted;
      const asset = ctx.assets.addBitmap(s.surface!, plane.width, plane.height);
      const outline = selectionThrough(ctx, s.document, t.source, s.w, s.h, map);
      releaseLifted(t.lifted);
      result = ctx.store.dispatch(
        moveSelectedPixels(plane.layerId, asset.id, outline, { label, target: plane.target }),
      );
    } else if (t.kind === "layer") {
      releaseSurface(s.surface);
      const b = mapBounds(map, 32);
      const x = Math.floor(b.x);
      const y = Math.floor(b.y);
      const width = Math.max(1, Math.ceil(b.x + b.width) - x);
      const height = Math.max(1, Math.ceil(b.y + b.height) - y);
      const size = checkDimensions(width, height);
      if (!size.ok) {
        ctx.notify("error", size.reason);
        ctx.invalidate();
        return;
      }
      const out = ctx.createSurface(width, height);
      const c = context2d(out);
      c.setTransform(1, 0, 0, 1, -x, -y);
      drawMapped(c, t.image, s.w, s.h, map, 48);
      const asset = ctx.assets.addBitmap(out, width, height);
      const mask = followMask(ctx, t.layer.mask, s.startQuad, map);
      result = ctx.store.dispatch(
        bakeLayers(
          [
            {
              ...t.layer,
              assetId: asset.id,
              width,
              height,
              transform: { x, y, scaleX: 1, scaleY: 1, rotation: 0 },
              ...(mask ? { mask } : {}),
            },
          ],
          label,
        ),
      );
    } else {
      this.session = s;
      const distortion = this.localDistortion();
      this.session = null;
      const mask = followMask(ctx, t.layer.mask, s.startQuad, map);
      const next: SmartObjectLayer = { ...t.layer, ...(mask ? { mask } : {}) };
      if (distortion) (next as { distortion?: SmartDistortion }).distortion = distortion;
      else delete (next as { distortion?: SmartDistortion }).distortion;
      result = ctx.store.dispatch(bakeLayers([next], label));
    }
    if (!result.ok) ctx.notify("error", result.error);
    else ctx.pixelsCommitted();
    ctx.invalidate();
  }

  end(ctx: ToolContext): void {
    const s = this.session;
    if (!s) return;
    this.release(s);
    this.session = null;
    this.drag = null;
    this.state.set(null);
    ctx.invalidate();
  }

  private release(s: Session): void {
    if (s.target.kind === "selection") releaseLifted(s.target.lifted);
    releaseSurface(s.surface);
  }

  /** Options bar: pick a warp preset or change its amounts. */
  setWarp(ctx: ToolContext, settings: Partial<WarpSettings>): void {
    const s = this.session;
    if (!s || s.mode !== "warp") return;
    s.warp = { ...s.warp, ...settings, custom: false };
    s.mesh = mapPoints(s.toDoc, presetMesh(s.w, s.h, s.warp));
    this.publish();
    this.compose(ctx, 16);
    ctx.invalidate();
  }

  private publish(): void {
    const s = this.session;
    this.state.set(s ? { mode: s.mode, warp: { ...s.warp } } : null);
  }

  /** Corner and edge handles, or the 16 warp control points. */
  private handles(): Point[] {
    const s = this.session!;
    if (s.mode === "warp") return Array.from({ length: 16 }, (_, i) => pointAt(s.mesh, i));
    const corners = [0, 1, 2, 3].map((i) => pointAt(s.quad, i));
    if (s.mode !== "skew") return corners;
    const mids = corners.map((p, i) => {
      const q = corners[(i + 1) % 4];
      return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    });
    return [...corners, ...mids];
  }

  private outline(): Point[] {
    const s = this.session!;
    if (s.mode !== "warp") return [0, 1, 2, 3].map((i) => pointAt(s.quad, i));
    const map = warpMap(s.mesh);
    const out: Point[] = [];
    const n = 12;
    for (let i = 0; i < n; i++) out.push(map(i / n, 0));
    for (let i = 0; i < n; i++) out.push(map(1, i / n));
    for (let i = n; i > 0; i--) out.push(map(i / n, 1));
    for (let i = n; i > 0; i--) out.push(map(0, i / n));
    return out;
  }

  private hit(
    ctx: ToolContext,
    pointer: ToolPointer,
  ): { kind: "move" | "handle"; index: number } | null {
    if (!this.session) return null;
    const viewport = ctx.viewport();
    const handles = this.handles();
    for (let i = 0; i < handles.length; i++) {
      const q = documentToScreen(viewport, handles[i]);
      if (Math.hypot(q.x - pointer.screen.x, q.y - pointer.screen.y) <= HANDLE_HIT_PX) {
        return { kind: "handle", index: i };
      }
    }
    return insidePolygon(this.outline(), pointer.doc) ? { kind: "move", index: -1 } : null;
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    if (this.drag) return this.drag.kind === "move" ? "move" : "crosshair";
    const hit = pointer && this.hit(ctx, pointer);
    return hit ? (hit.kind === "move" ? "move" : "crosshair") : "default";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const s = this.session;
    if (!s || pointer.button !== 0) return;
    const hit = this.hit(ctx, pointer);
    if (!hit) return;
    this.drag = { ...hit, quad: [...s.quad], mesh: [...s.mesh], start: pointer.doc };
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    const s = this.session;
    const d = this.drag;
    if (!s || !d) return;
    const dx = pointer.doc.x - d.start.x;
    const dy = pointer.doc.y - d.start.y;
    if (d.kind === "move") {
      s.quad = d.quad.map((v, i) => v + (i % 2 ? dy : dx));
      s.mesh = d.mesh.map((v, i) => v + (i % 2 ? dy : dx));
    } else if (s.mode === "warp") {
      const mesh = [...d.mesh];
      mesh[d.index * 2] += dx;
      mesh[d.index * 2 + 1] += dy;
      s.mesh = mesh;
      if (!s.warp.custom) {
        s.warp = { ...s.warp, custom: true };
        this.publish();
      }
    } else {
      const quad = dragQuad(s.mode, d.quad, d.index, dx, dy);
      // Crossed or folded corners can't be drawn: keep the last valid shape.
      if (isConvexQuad(quad)) s.quad = quad;
    }
    this.compose(ctx, 16);
    ctx.invalidate();
  }

  pointerUp(ctx: ToolContext): void {
    if (!this.drag) return;
    this.drag = null;
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
    return false;
  }

  cancel(ctx: ToolContext): void {
    this.drag = null;
    ctx.invalidate();
  }

  overlays(): readonly Overlay[] {
    const s = this.session;
    if (!s) return [];
    if (s.mode !== "warp") {
      const c = [0, 1, 2, 3].map((i) => pointAt(s.quad, i)) as [Point, Point, Point, Point];
      // Skew also has edge handles; Distort and Perspective drag the corners only.
      return s.mode === "skew"
        ? [{ kind: "transform", corners: c, handles: true }]
        : [{ kind: "quad", corners: c, shade: false }];
    }
    const map = warpMap(s.mesh);
    const grid: Point[][] = [];
    for (const f of [1 / 3, 2 / 3]) {
      const row: Point[] = [];
      const col: Point[] = [];
      for (let i = 0; i <= 12; i++) {
        row.push(map(i / 12, f));
        col.push(map(f, i / 12));
      }
      grid.push(row, col);
    }
    return [{ kind: "mesh", outline: this.outline(), grid, handles: this.handles() }];
  }

  preview(): CompositePreview | undefined {
    return this.session?.preview;
  }

  selectionPreview(): SelectionMask | null | undefined {
    return this.session?.target.kind === "selection" ? null : undefined;
  }
}

/**
 * Move a quad's handle for Skew, Distort or Perspective. Corners are nw, ne, se, sw (0–3); in
 * Skew mode 4–7 are the edge midpoints (top, right, bottom, left).
 */
export function dragQuad(
  mode: Exclude<DistortMode, "warp">,
  start: readonly number[],
  index: number,
  dx: number,
  dy: number,
): number[] {
  const q = [...start];
  const move = (corner: number, mx: number, my: number) => {
    q[corner * 2] += mx;
    q[corner * 2 + 1] += my;
  };
  const sameRow = (c: number) => [1, 0, 3, 2][c];
  const sameColumn = (c: number) => [3, 2, 1, 0][c];
  if (mode === "distort") {
    move(index, dx, dy);
    return q;
  }
  if (index >= 4) {
    // Skew from an edge: slide the edge along itself.
    const edge = index - 4;
    const a = edge;
    const b = (edge + 1) % 4;
    const horizontal = edge === 0 || edge === 2;
    move(a, horizontal ? dx : 0, horizontal ? 0 : dy);
    move(b, horizontal ? dx : 0, horizontal ? 0 : dy);
    return q;
  }
  const alongX = Math.abs(dx) >= Math.abs(dy);
  if (mode === "skew") {
    // A corner slides its edge: along x moves the row, along y the column.
    if (alongX) {
      move(index, dx, 0);
      move(sameRow(index), dx, 0);
    } else {
      move(index, 0, dy);
      move(sameColumn(index), 0, dy);
    }
    return q;
  }
  // Perspective: the corner on the same edge moves the mirror way.
  if (alongX) {
    move(index, dx, 0);
    move(sameRow(index), -dx, 0);
  } else {
    move(index, 0, dy);
    move(sameColumn(index), 0, -dy);
  }
  return q;
}

/** The warp mesh that matches a perspective quad (control points on its projective grid). */
function meshFromQuad(quad: readonly number[]): number[] {
  const map = perspectiveMap(quad);
  const out: number[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const p = map ? map(j / 3, i / 3) : { x: 0, y: 0 };
      out.push(p.x, p.y);
    }
  }
  return out;
}

/**
 * A linked mask redrawn so it keeps covering the same part of the picture: its document points
 * are located in the picture through the old quad's homography, then placed through the new map.
 * Outside the old mask everything stays revealed. Unlinked or still-loading masks are kept.
 */
function followMask(
  ctx: ToolContext,
  mask: LayerMask | undefined,
  oldQuad: readonly number[],
  map: MeshMap,
): LayerMask | undefined {
  if (!mask?.linked) return undefined;
  const h = squareToQuad(oldQuad);
  const inverse = h && invert3(h);
  if (!inverse) return undefined;
  const out = new Float64Array(2);
  const through: MeshMap = (s, t) => {
    const ok = project(inverse, mask.x + s * mask.width, mask.y + t * mask.height, out);
    return ok ? map(out[0], out[1]) : { x: NaN, y: NaN };
  };
  const b = mapBounds(through, 32);
  const x = Math.floor(b.x);
  const y = Math.floor(b.y);
  const width = Math.max(1, Math.ceil(b.x + b.width) - x);
  const height = Math.max(1, Math.ceil(b.y + b.height) - y);
  if (!checkDimensions(width, height).ok) return undefined;
  if (!mask.assetId) return { ...mask, x, y, width, height };
  const bitmap = ctx.assets.getBitmap(mask.assetId);
  if (!bitmap) return undefined;
  const surface = ctx.createSurface(width, height);
  const c = context2d(surface);
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, width, height);
  c.setTransform(1, 0, 0, 1, -x, -y);
  // Each cell replaces what is under it, so hidden areas stay hidden.
  c.globalCompositeOperation = "copy";
  drawMapped(c, bitmap, mask.width, mask.height, through, 32);
  const asset = ctx.assets.addBitmap(surface, width, height);
  return { ...mask, assetId: asset.id, x, y, width, height };
}

/** The selection outline after the edit: the old one drawn through the map. */
function selectionThrough(
  ctx: ToolContext,
  doc: EditorDocument,
  source: SelectionMask,
  w: number,
  h: number,
  map: MeshMap,
): SelectionMask | null {
  const b = source.bounds;
  if (!b) return null;
  const crop = ctx.createSurface(w, h);
  context2d(crop).drawImage(selectionSurface(ctx, source), -b.x, -b.y);
  const out = ctx.createSurface(doc.width, doc.height);
  const c = context2d(out, true);
  drawMapped(c, crop, w, h, map, 48);
  releaseSurface(crop);
  const rgba = c.getImageData(0, 0, doc.width, doc.height).data;
  releaseSurface(out);
  const alpha = new Uint8Array(doc.width * doc.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  return createSelection(doc.width, doc.height, alpha);
}
