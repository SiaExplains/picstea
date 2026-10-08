import { setRasterContent } from "../../core/commands";
import { activeLayer } from "../../core/document/queries";
import type { RasterLayer } from "../../core/document/types";
import { applyMatrix, fromTransform, invertMatrix, type Matrix } from "../../core/geometry/matrix";
import { stepBrushSize, type BrushSettings } from "../../core/tool-settings";
import type { Point } from "../../core/viewport/viewport";
import type { CompositePreview } from "../../rendering/compositing/compositor";
import type { Overlay } from "../../rendering/overlay";
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

function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
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
}

/**
 * Brush and eraser. Dabs accumulate in a stroke buffer; the live preview is the layer's pixels
 * with the buffer composited on top (or cut out, for the eraser) at the tool opacity. On release
 * the preview becomes a new immutable asset and one undoable `setRasterContent` command.
 */
export class BrushTool implements Tool {
  private stroke: Stroke | null = null;
  private hover: Point | null = null;
  private readonly overrides = new Map<string, Surface>();

  constructor(readonly id: "brush" | "eraser") {}

  private get erase(): boolean {
    return this.id === "eraser";
  }

  private settings(ctx: ToolContext): BrushSettings {
    return ctx.store.getState().toolSettings[this.id];
  }

  private paintableLayer(ctx: ToolContext): RasterLayer | null {
    const doc = ctx.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (!layer) {
      ctx.notify("error", "Select a layer to paint on.");
      return null;
    }
    if (layer.kind !== "raster") {
      ctx.notify(
        "error",
        `${this.erase ? "The eraser" : "The brush"} works on pixel layers. Use Layer → New Layer to add one.`,
      );
      return null;
    }
    if (layer.locked) {
      ctx.notify("error", `"${layer.name}" is locked. Unlock it to paint.`);
      return null;
    }
    if (!layer.visible) {
      ctx.notify("error", `"${layer.name}" is hidden. Show it to paint on it.`);
      return null;
    }
    return layer;
  }

  cursor(): string {
    return "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0 || this.stroke) return;
    const layer = this.paintableLayer(ctx);
    if (!layer) return;

    let existing: CanvasImageSource | undefined;
    if (layer.assetId) {
      existing = ctx.assets.getBitmap(layer.assetId);
      if (!existing) {
        ctx.notify("info", "This layer is still loading. Try again in a moment.");
        return;
      }
    }
    const toLocal = invertMatrix(fromTransform(layer.transform));
    if (!toLocal) return;

    const settings = this.settings(ctx);
    const { width, height } = layer;
    const base = ctx.createSurface(width, height);
    if (existing) context(base).drawImage(existing, 0, 0, width, height);

    // Brush size is in document pixels; convert to layer pixels for scaled layers.
    const t = layer.transform;
    const scale = Math.sqrt(Math.abs(t.scaleX * t.scaleY)) || 1;
    const radius = Math.max(0.5, settings.size / 2 / scale);
    const color = this.erase ? "#000000" : ctx.store.getState().colors.foreground;
    const { tip, half } = createTip(ctx.createSurface, radius, settings.hardness, color);

    this.stroke = {
      layerId: layer.id,
      width,
      height,
      base,
      buffer: ctx.createSurface(width, height),
      preview: ctx.createSurface(width, height),
      toLocal,
      interpolator: new StrokeInterpolator(Math.max(0.5, radius * 0.25)),
      tip,
      half,
      settings,
    };
    this.overrides.set(layer.id, this.stroke.preview);
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
    release(stroke.base);
    release(stroke.buffer);
    release(stroke.tip);
    const asset = ctx.assets.addBitmap(stroke.preview, stroke.width, stroke.height);
    const result = ctx.store.dispatch(
      setRasterContent(stroke.layerId, asset.id, this.erase ? "Eraser" : "Brush Stroke"),
    );
    if (!result.ok) ctx.notify("error", result.error);
    ctx.pixelsCommitted();
    ctx.invalidate();
  }

  private stamp(points: readonly Point[]): void {
    const stroke = this.stroke;
    if (!stroke || points.length === 0) return;
    const ctx = context(stroke.buffer);
    for (const p of points) ctx.drawImage(stroke.tip, p.x - stroke.half, p.y - stroke.half);
  }

  private refresh(ctx: ToolContext): void {
    const stroke = this.stroke;
    if (!stroke) return;
    const p = context(stroke.preview);
    p.globalCompositeOperation = "copy";
    p.globalAlpha = 1;
    p.drawImage(stroke.base, 0, 0);
    p.globalAlpha = stroke.settings.opacity;
    p.globalCompositeOperation = this.erase ? "destination-out" : "source-over";
    p.drawImage(stroke.buffer, 0, 0);
    p.globalAlpha = 1;
    p.globalCompositeOperation = "source-over";
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
    if (stroke) {
      release(stroke.base);
      release(stroke.buffer);
      release(stroke.preview);
      release(stroke.tip);
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
    return this.overrides.size > 0 ? { overrides: this.overrides } : undefined;
  }
}
