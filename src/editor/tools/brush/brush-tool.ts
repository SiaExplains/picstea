import { msg } from "../../core/message";
import { setMaskContent, setRasterContent } from "../../core/commands";
import { luminance, rgba } from "../../core/color";
import { activeLayer } from "../../core/document/queries";
import type { Layer, LayerMask } from "../../core/document/types";
import { applyMatrix, fromTransform, invertMatrix, type Matrix } from "../../core/geometry/matrix";
import { stepBrushSize, type BrushSettings } from "../../core/tool-settings";
import type { Point } from "../../core/viewport/viewport";
import type { CompositePreview } from "../../rendering/compositing/compositor";
import type { Overlay } from "../../rendering/overlay";
import { selectionSurface } from "../../pixels/layer-pixels";
import { pickColor } from "../eyedropper/eyedropper-tool";
import type { Tool, ToolContext, ToolKey, ToolPointer } from "../tool";
import { StrokeInterpolator } from "./stroke-interpolator";

type Surface = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function context(surface: Surface): Ctx2D {
  const ctx = surface.getContext("2d") as Ctx2D | null;
  if (!ctx) throw new Error("2D canvas is not available.");
  return ctx;
}

function release(surface: Surface | null | undefined): void {
  if (surface) {
    surface.width = 0;
    surface.height = 0;
  }
}

/** Pre-rendered round brush tip: solid core out to `hardness`, then a soft falloff. */
export function createTip(
  createSurface: (w: number, h: number) => Surface,
  radius: number,
  hardness: number,
  color: string,
): { tip: Surface; half: number } {
  const size = Math.max(1, Math.ceil(radius * 2) + 2);
  const tip = createSurface(size, size);
  const ctx = context(tip);
  const c = size / 2;
  if (hardness >= 0.99) {
    ctx.fillStyle = color;
  } else {
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, radius);
    gradient.addColorStop(0, rgba(color, 1));
    gradient.addColorStop(Math.max(0, Math.min(0.98, hardness)), rgba(color, 1));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
  }
  ctx.beginPath();
  ctx.arc(c, c, radius, 0, Math.PI * 2);
  ctx.fill();
  return { tip, half: c };
}

/** Aliased tip for the pencil: pixels whose centre is within the radius, no soft edge. */
export function createPencilTip(
  createSurface: (w: number, h: number) => Surface,
  radius: number,
  color: string,
): { tip: Surface; half: number } {
  const size = Math.max(1, Math.round(radius * 2));
  const tip = createSurface(size, size);
  const ctx = context(tip);
  ctx.fillStyle = color;
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      if (size <= 2 || dx * dx + dy * dy <= c * c) ctx.fillRect(x, y, 1, 1);
    }
  }
  return { tip, half: c };
}

interface Stroke {
  readonly layerId: string;
  readonly width: number;
  readonly height: number;
  readonly base: Surface;
  readonly buffer: Surface;
  readonly preview: Surface;
  readonly toLocal: Matrix;
  readonly interpolator: StrokeInterpolator;
  readonly tip: Surface;
  readonly half: number;
  readonly settings: BrushSettings;
  /** Painting the layer's pixels, or its mask (grey level `level`, 0 = hide … 1 = reveal). */
  readonly target: "content" | "mask";
  readonly level: number;
  /** The selection in the stroke's pixel space; paint outside it is discarded. */
  readonly clip: Surface | null;
  readonly scratch: Surface | null;
  /** Pencil dabs snap to whole pixels. */
  readonly aliased: boolean;
  /** Area (layer pixels) touched by dabs since the last refresh; only it is recomposed. */
  dirty: { x0: number; y0: number; x1: number; y1: number } | null;
}

type PaintTarget =
  | { kind: "content"; layer: Layer & { kind: "raster" } }
  | { kind: "mask"; layer: Layer; mask: LayerMask };

/**
 * Brush, pencil and eraser. Dabs accumulate in a stroke buffer; the live preview is the layer's pixels
 * with the buffer composited on top (or cut out, for the eraser) at the tool opacity. On release
 * the preview becomes a new immutable asset and one undoable `setRasterContent` command.
 */
export class BrushTool implements Tool {
  private stroke: Stroke | null = null;
  private hover: Point | null = null;
  private readonly overrides = new Map<string, Surface>();
  private readonly maskOverrides = new Map<string, Surface>();

  constructor(readonly id: "brush" | "pencil" | "eraser") {}

  private get erase(): boolean {
    return this.id === "eraser";
  }

  private settings(ctx: ToolContext): BrushSettings {
    return ctx.store.getState().toolSettings[this.id];
  }

  private paintTarget(ctx: ToolContext): PaintTarget | null {
    const doc = ctx.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    const tool = this.erase ? "The eraser" : this.id === "pencil" ? "The pencil" : "The brush";
    if (!layer) {
      ctx.notify("error", "Select a layer to paint on.");
      return null;
    }
    if (layer.locked) {
      ctx.notify("error", msg('"{layer}" is locked. Unlock it to paint.', { layer: layer.name }));
      return null;
    }
    if (!layer.visible) {
      ctx.notify(
        "error",
        msg('"{layer}" is hidden. Show it to paint on it.', { layer: layer.name }),
      );
      return null;
    }
    if (ctx.store.getState().editTarget === "mask" && layer.mask) {
      return { kind: "mask", layer, mask: layer.mask };
    }
    if (layer.kind !== "raster") {
      const hint = layer.mask
        ? "Click the layer's mask thumbnail to paint on its mask, or use Layer → New Layer."
        : "Use Layer → New Layer to add a pixel layer, or add a mask to paint on.";
      ctx.notify("error", msg("{tool} works on pixel layers and masks. {hint}", { tool, hint }));
      return null;
    }
    return { kind: "content", layer };
  }

  cursor(): string {
    return "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0 || this.stroke) return;
    // Alt-click picks a colour with the brush and pencil, as in professional editors.
    if (pointer.altKey && !this.erase) {
      pickColor(ctx, pointer.doc, "foreground", true);
      return;
    }
    const target = this.paintTarget(ctx);
    if (!target) return;
    const settings = this.settings(ctx);
    const { colors } = ctx.store.getState();

    let existing: CanvasImageSource | undefined;
    const assetId = target.kind === "content" ? target.layer.assetId : target.mask.assetId;
    if (assetId) {
      existing = ctx.assets.getBitmap(assetId);
      if (!existing) {
        ctx.notify("info", "This layer is still loading. Try again in a moment.");
        return;
      }
    }

    let width: number;
    let height: number;
    let toLocal: Matrix | null;
    let radius: number;
    let tipColor: string;
    if (target.kind === "content") {
      ({ width, height } = target.layer);
      toLocal = invertMatrix(fromTransform(target.layer.transform));
      // Brush size is in document pixels; convert to layer pixels for scaled layers.
      const t = target.layer.transform;
      const scale = Math.sqrt(Math.abs(t.scaleX * t.scaleY)) || 1;
      radius = Math.max(0.5, settings.size / 2 / scale);
      tipColor = this.erase ? "#000000" : colors.foreground;
    } else {
      ({ width, height } = target.mask);
      toLocal = [1, 0, 0, 1, -target.mask.x, -target.mask.y];
      radius = Math.max(0.5, settings.size / 2);
      // Mask strokes record coverage only; the grey level is applied in refresh().
      tipColor = "#ffffff";
    }
    if (!toLocal) return;

    const base = ctx.createSurface(width, height);
    const bctx = context(base);
    if (existing) bctx.drawImage(existing, 0, 0, width, height);
    else if (target.kind === "mask") {
      // An empty mask reveals everything.
      bctx.fillStyle = "#ffffff";
      bctx.fillRect(0, 0, width, height);
    }
    const aliased = this.id === "pencil";
    const { tip, half } = aliased
      ? createPencilTip(ctx.createSurface, radius, tipColor)
      : createTip(ctx.createSurface, radius, settings.hardness, tipColor);

    const selection = ctx.store.getSession()?.document.selection;
    let clip: Surface | null = null;
    if (selection) {
      clip = ctx.createSurface(width, height);
      const cctx = context(clip);
      cctx.setTransform(...toLocal);
      cctx.drawImage(selectionSurface(ctx, selection), 0, 0);
    }

    this.stroke = {
      layerId: target.layer.id,
      width,
      height,
      base,
      buffer: ctx.createSurface(width, height),
      preview: ctx.createSurface(width, height),
      toLocal,
      interpolator: new StrokeInterpolator(aliased ? 0.5 : Math.max(0.5, radius * 0.25)),
      tip,
      half,
      settings,
      clip,
      scratch: clip ? ctx.createSurface(width, height) : null,
      aliased,
      dirty: { x0: 0, y0: 0, x1: width, y1: height },
      target: target.kind,
      // Like professional editors: the brush paints the foreground grey on a mask, the eraser
      // paints the background grey.
      level: luminance(this.erase ? colors.background : colors.foreground),
    };
    (target.kind === "mask" ? this.maskOverrides : this.overrides).set(
      target.layer.id,
      this.stroke.preview,
    );
    this.stamp(this.stroke.interpolator.start(applyMatrix(toLocal, pointer.doc)));
    this.refresh(ctx);
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    this.hover = pointer.doc;
    const stroke = this.stroke;
    if (!stroke) {
      ctx.invalidate();
      return;
    }
    const points = [...(pointer.coalesced ?? []), pointer.doc];
    for (const p of points) this.stamp(stroke.interpolator.moveTo(applyMatrix(stroke.toLocal, p)));
    this.refresh(ctx);
  }

  pointerUp(ctx: ToolContext): void {
    const stroke = this.stroke;
    if (!stroke) return;
    this.stroke = null;
    this.overrides.clear();
    this.maskOverrides.clear();
    release(stroke.base);
    release(stroke.buffer);
    release(stroke.tip);
    release(stroke.clip);
    release(stroke.scratch);
    const asset = ctx.assets.addBitmap(stroke.preview, stroke.width, stroke.height);
    const result = ctx.store.dispatch(
      stroke.target === "mask"
        ? setMaskContent(stroke.layerId, asset.id, this.erase ? "Erase Mask" : "Paint Mask")
        : setRasterContent(stroke.layerId, asset.id, this.erase ? "Eraser" : "Brush Stroke"),
    );
    if (!result.ok) ctx.notify("error", result.error);
    ctx.pixelsCommitted();
    ctx.invalidate();
  }

  private stamp(points: readonly Point[]): void {
    const stroke = this.stroke;
    if (!stroke || points.length === 0) return;
    const ctx = context(stroke.buffer);
    const pad = stroke.half + 2;
    const d = stroke.dirty ?? { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const p of points) {
      d.x0 = Math.min(d.x0, p.x - pad);
      d.y0 = Math.min(d.y0, p.y - pad);
      d.x1 = Math.max(d.x1, p.x + pad);
      d.y1 = Math.max(d.y1, p.y + pad);
    }
    stroke.dirty = d;
    for (const p of points) {
      if (stroke.aliased) {
        ctx.drawImage(stroke.tip, Math.round(p.x - stroke.half), Math.round(p.y - stroke.half));
      } else {
        ctx.drawImage(stroke.tip, p.x - stroke.half, p.y - stroke.half);
      }
    }
  }

  private refresh(ctx: ToolContext): void {
    const stroke = this.stroke;
    if (!stroke?.dirty) return;
    // Recompose only the area new dabs touched (ADR-0012): the rest of the preview is unchanged.
    const x0 = Math.max(0, Math.floor(stroke.dirty.x0));
    const y0 = Math.max(0, Math.floor(stroke.dirty.y0));
    const x1 = Math.min(stroke.width, Math.ceil(stroke.dirty.x1));
    const y1 = Math.min(stroke.height, Math.ceil(stroke.dirty.y1));
    stroke.dirty = null;
    if (x1 <= x0 || y1 <= y0) return;
    const clipTo = (c: Ctx2D) => {
      c.save();
      c.beginPath();
      c.rect(x0, y0, x1 - x0, y1 - y0);
      c.clip();
    };
    const p = context(stroke.preview);
    clipTo(p);
    p.globalCompositeOperation = "copy";
    p.globalAlpha = 1;
    p.drawImage(stroke.base, 0, 0);
    const opacity = stroke.settings.opacity;
    // Clip a copy each time, so soft selection edges are not applied twice.
    let paint: Surface = stroke.buffer;
    if (stroke.clip && stroke.scratch) {
      const s = context(stroke.scratch);
      clipTo(s);
      s.globalCompositeOperation = "copy";
      s.drawImage(stroke.buffer, 0, 0);
      s.globalCompositeOperation = "destination-in";
      s.drawImage(stroke.clip, 0, 0);
      s.restore();
      paint = stroke.scratch;
    }
    if (stroke.target === "mask") {
      // Move the mask towards the grey level: a' = a·(1−k) + level·k for stroke coverage k.
      p.globalAlpha = opacity;
      p.globalCompositeOperation = "destination-out";
      p.drawImage(paint, 0, 0);
      p.globalAlpha = opacity * stroke.level;
      p.globalCompositeOperation = "lighter";
      p.drawImage(paint, 0, 0);
    } else {
      p.globalAlpha = opacity;
      p.globalCompositeOperation = this.erase ? "destination-out" : "source-over";
      p.drawImage(paint, 0, 0);
    }
    p.restore();
    ctx.invalidate();
  }

  keyDown(ctx: ToolContext, key: ToolKey): boolean {
    if (key.key !== "[" && key.key !== "]") return false;
    const size = stepBrushSize(this.settings(ctx).size, key.key === "]" ? 1 : -1);
    ctx.store.updateToolSettings(this.id, { size });
    ctx.invalidate();
    return true;
  }

  cancel(ctx: ToolContext): void {
    const stroke = this.stroke;
    this.stroke = null;
    this.overrides.clear();
    this.maskOverrides.clear();
    if (stroke) {
      release(stroke.base);
      release(stroke.buffer);
      release(stroke.preview);
      release(stroke.tip);
      release(stroke.clip);
      release(stroke.scratch);
    }
    this.hover = null;
    ctx.invalidate();
  }

  /** Pointer left the canvas: hide the brush outline. */
  leave(ctx: ToolContext): void {
    this.hover = null;
    ctx.invalidate();
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    if (!this.hover) return [];
    return [{ kind: "brush", center: this.hover, radius: this.settings(ctx).size / 2 }];
  }

  preview(): CompositePreview | undefined {
    if (this.overrides.size > 0) return { overrides: this.overrides };
    if (this.maskOverrides.size > 0) return { maskOverrides: this.maskOverrides };
    return undefined;
  }
}
