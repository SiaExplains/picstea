import { setRasterContent } from "../../core/commands";
import { findLayer } from "../../core/document/queries";
import { applyMatrix, fromTransform, invertMatrix, type Matrix } from "../../core/geometry/matrix";
import { stepBrushSize } from "../../core/tool-settings";
import type { Point } from "../../core/viewport/viewport";
import {
  context2d,
  layerSelectionCoverage,
  releaseSurface,
  type Surface,
} from "../../pixels/layer-pixels";
import {
  lazyCompositeInLayerSpace,
  lazyLayerPixels,
  type LazyLayerPixels,
} from "../../pixels/lazy-layer-pixels";
import type { CompositePreview } from "../../rendering/compositing/compositor";
import type { Overlay } from "../../rendering/overlay";
import {
  BlurTiles,
  backgroundEraseEffect,
  blurRadiusFor,
  cloneEffect,
  colorReplaceEffect,
  focusEffect,
  redEyeEffect,
  spongeEffect,
  toneEffect,
} from "../../retouch/effects";
import { chooseSpotOffset } from "../../retouch/spot";
import { hexToRgb } from "../../core/color";
import { HealStroke } from "../../retouch/heal";
import { SmudgeStroke } from "../../retouch/smudge";
import {
  CoverageStroke,
  isEmptyRect,
  type PixelRect,
  type PixelStroke,
  type StrokeOptions,
} from "../../retouch/stroke";
import { StrokeInterpolator } from "../brush/stroke-interpolator";
import { editablePixelLayer } from "../pixel-target";
import type { Tool, ToolContext, ToolKey, ToolPointer } from "../tool";

export type RetouchToolId =
  "clone" | "heal" | "tone" | "focus" | "spot-heal" | "red-eye" | "bg-eraser" | "color-replace";

const TOOL_NAMES: Record<RetouchToolId, string> = {
  clone: "The Clone Stamp",
  heal: "The Healing Brush",
  tone: "The Dodge, Burn and Sponge tool",
  focus: "The Blur, Sharpen and Smudge tool",
  "spot-heal": "The Spot Healing Brush",
  "red-eye": "The Red Eye tool",
  "bg-eraser": "The Background Eraser",
  "color-replace": "The Color Replacement tool",
};

interface ActiveStroke {
  readonly layerId: string;
  /** The layer content the stroke started from; if it changes mid-stroke the stroke is dropped. */
  readonly assetId: string | null;
  readonly width: number;
  readonly height: number;
  readonly toLocal: Matrix;
  readonly stroke: PixelStroke;
  readonly preview: Surface;
  readonly image: ImageData;
  readonly interpolator: StrokeInterpolator;
  readonly label: string;
  /** Pixels read on demand during the stroke (ADR-0022). */
  readonly sources: readonly LazyLayerPixels[];
}

/**
 * Clone Stamp, Healing Brush, Dodge/Burn/Sponge and Blur/Sharpen/Smudge (ADR-0019). The pixel
 * work is done by the pure strokes in `src/editor/retouch`; this tool reads the layer as the stroke
 * reaches it (ADR-0022), feeds dabs in layer space, uploads only the changed area to a preview
 * surface, and commits one `setRasterContent` step on release.
 */
export class RetouchTool implements Tool {
  private active: ActiveStroke | null = null;
  private hover: Point | null = null;
  /** Clone/heal source, set with Alt-click (document space). */
  private source: { documentId: string; point: Point } | null = null;
  /** Source minus stroke start, kept between strokes when "Aligned" is on. */
  private offset: Point | null = null;
  private readonly overrides = new Map<string, Surface>();

  constructor(readonly id: RetouchToolId) {}

  private get usesSource(): boolean {
    return this.id === "clone" || this.id === "heal";
  }

  private settings(ctx: ToolContext) {
    return ctx.store.getState().toolSettings[this.id];
  }

  cursor(): string {
    return "crosshair";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (pointer.button !== 0 || this.active) return;
    const doc = ctx.store.getSession()?.document;
    if (!doc) return;
    if (this.usesSource && pointer.altKey) {
      this.source = { documentId: doc.id, point: pointer.doc };
      this.offset = null;
      ctx.invalidate();
      return;
    }
    if (this.usesSource && this.source?.documentId !== doc.id) {
      ctx.notify("error", "Alt-click (Option-click) where you want to copy from first.");
      return;
    }
    const layer = editablePixelLayer(ctx, TOOL_NAMES[this.id]);
    if (!layer) return;
    const toLocal = invertMatrix(fromTransform(layer.transform));
    if (!toLocal) return;
    const lazy = lazyLayerPixels(ctx, layer);
    if (!lazy) {
      ctx.notify("info", "This layer is still loading. Try again in a moment.");
      return;
    }
    const settings = this.settings(ctx);
    // Sizes are in document pixels; convert to layer pixels for scaled layers.
    const t = layer.transform;
    const scale = Math.sqrt(Math.abs(t.scaleX * t.scaleY)) || 1;
    const radius = Math.max(0.5, settings.size / 2 / scale);
    const hardness = "hardness" in settings ? settings.hardness : 0.5;
    const { width, height } = layer;
    const pixels = lazy.pixels;
    const sources = [lazy];
    const options: StrokeOptions = {
      width,
      height,
      base: pixels.data,
      prepare: lazy.prepare,
      radius,
      hardness,
      strength: 1,
      selection: doc.selection ? layerSelectionCoverage(ctx, layer, doc.selection) : null,
    };

    let stroke: PixelStroke;
    let label: string;
    const s = ctx.store.getState().toolSettings;
    switch (this.id) {
      case "clone":
      case "heal": {
        const cfg = s[this.id];
        const sampled = cfg.sample === "all" ? lazyCompositeInLayerSpace(ctx, doc, layer) : lazy;
        if (!sampled) {
          lazy.release();
          ctx.notify("info", "The image is still loading. Try again in a moment.");
          return;
        }
        if (sampled !== lazy) sources.push(sampled);
        if (!cfg.aligned || !this.offset) {
          const from = this.source!.point;
          this.offset = { x: from.x - pointer.doc.x, y: from.y - pointer.doc.y };
        }
        const start = applyMatrix(toLocal, pointer.doc);
        const from = applyMatrix(toLocal, {
          x: pointer.doc.x + this.offset.x,
          y: pointer.doc.y + this.offset.y,
        });
        const dx = Math.round(from.x - start.x);
        const dy = Math.round(from.y - start.y);
        const source = sampled.pixels.data;
        if (this.id === "clone") {
          stroke = new CoverageStroke(
            { ...options, strength: cfg.opacity },
            cloneEffect(source, width, height, dx, dy, sampled.inside, sampled.prepare),
          );
          label = "Clone Stamp";
        } else {
          stroke = new HealStroke(options, source, dx, dy, sampled.inside, sampled.prepare);
          label = "Healing Brush";
        }
        break;
      }
      case "tone": {
        const cfg = s.tone;
        if (cfg.mode === "sponge") {
          stroke = new CoverageStroke(
            { ...options, strength: cfg.flow },
            spongeEffect(pixels.data, width, cfg.sponge),
          );
          label = "Sponge";
        } else {
          stroke = new CoverageStroke(
            { ...options, strength: cfg.exposure },
            toneEffect(pixels.data, width, cfg.mode, cfg.range),
          );
          label = cfg.mode === "dodge" ? "Dodge" : "Burn";
        }
        break;
      }
      case "spot-heal": {
        const at = applyMatrix(toLocal, pointer.doc);
        const { dx, dy } = chooseSpotOffset(pixels.data, width, height, at, radius, lazy.prepare);
        stroke = new HealStroke(options, pixels.data, dx, dy, lazy.inside, lazy.prepare);
        label = "Spot Healing Brush";
        break;
      }
      case "red-eye": {
        const cfg = s["red-eye"];
        stroke = new CoverageStroke(
          { ...options, hardness: 0.6 },
          redEyeEffect(pixels.data, width, cfg.darken),
        );
        label = "Red Eye";
        break;
      }
      case "bg-eraser":
      case "color-replace": {
        const cfg = s[this.id];
        // The colour under the first dab is what the stroke erases or replaces.
        const at = applyMatrix(toLocal, pointer.doc);
        const sx = Math.min(width - 1, Math.max(0, Math.floor(at.x)));
        const sy = Math.min(height - 1, Math.max(0, Math.floor(at.y)));
        lazy.prepare?.({ x0: sx, y0: sy, x1: sx + 1, y1: sy + 1 });
        const i = (sy * width + sx) * 4;
        const sample = [pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]];
        if (this.id === "bg-eraser") {
          stroke = new CoverageStroke(
            options,
            backgroundEraseEffect(pixels.data, width, sample, cfg.tolerance),
          );
          label = "Background Eraser";
        } else {
          const fg = hexToRgb(ctx.store.getState().colors.foreground);
          stroke = new CoverageStroke(
            options,
            colorReplaceEffect(pixels.data, width, sample, cfg.tolerance, fg),
          );
          label = "Color Replacement";
        }
        break;
      }
      case "focus": {
        const cfg = s.focus;
        if (cfg.mode === "smudge") {
          stroke = new SmudgeStroke({ ...options, strength: cfg.strength });
          label = "Smudge";
        } else {
          const tiles = new BlurTiles(
            pixels.data,
            width,
            height,
            blurRadiusFor(radius),
            lazy.prepare,
          );
          stroke = new CoverageStroke(
            { ...options, strength: cfg.strength },
            focusEffect(pixels.data, width, tiles, cfg.mode),
          );
          label = cfg.mode === "blur" ? "Blur" : "Sharpen";
        }
        break;
      }
    }

    const preview = ctx.createSurface(width, height);
    const image = new ImageData(stroke.out, width, height);
    const bitmap = layer.assetId ? ctx.assets.getBitmap(layer.assetId) : undefined;
    if (lazy.prepare && bitmap) {
      // A GPU copy of the layer; only the areas the stroke changes are uploaded.
      context2d(preview).drawImage(bitmap, 0, 0);
    } else {
      context2d(preview).putImageData(image, 0, 0);
    }
    const spacing = this.id === "focus" ? radius * 0.1 : radius * 0.2;
    this.active = {
      layerId: layer.id,
      assetId: layer.assetId,
      width,
      height,
      toLocal,
      stroke,
      preview,
      image,
      interpolator: new StrokeInterpolator(Math.max(0.5, spacing)),
      label,
      sources,
    };
    this.overrides.set(layer.id, preview);
    for (const p of this.active.interpolator.start(applyMatrix(toLocal, pointer.doc))) {
      stroke.dab(p);
    }
    this.upload(ctx, stroke.flush());
  }

  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    this.hover = pointer.doc;
    const active = this.active;
    if (!active) {
      ctx.invalidate();
      return;
    }
    for (const point of [...(pointer.coalesced ?? []), pointer.doc]) {
      for (const p of active.interpolator.moveTo(applyMatrix(active.toLocal, point))) {
        active.stroke.dab(p);
      }
    }
    this.upload(ctx, active.stroke.flush());
  }

  pointerUp(ctx: ToolContext): void {
    const active = this.active;
    if (!active) return;
    this.active = null;
    this.overrides.clear();
    // Undo or another edit while dragging: don't write the old pixels back over it.
    const doc = ctx.store.getSession()?.document;
    const current = doc ? findLayer(doc, active.layerId) : undefined;
    if (
      current?.kind !== "raster" ||
      current.assetId !== active.assetId ||
      current.width !== active.width ||
      current.height !== active.height
    ) {
      releaseSurface(active.preview);
      for (const source of active.sources) source.release();
      ctx.notify("info", `The ${active.label} stroke was dropped because the layer changed.`);
      ctx.invalidate();
      return;
    }
    this.active = active;
    this.upload(ctx, active.stroke.finish());
    this.active = null;
    for (const source of active.sources) source.release();
    const asset = ctx.assets.addBitmap(active.preview, active.width, active.height);
    const result = ctx.store.dispatch(setRasterContent(active.layerId, asset.id, active.label));
    if (!result.ok) ctx.notify("error", result.error);
    ctx.pixelsCommitted();
    ctx.invalidate();
  }

  /** Copy the changed area of the stroke into the preview surface. */
  private upload(ctx: ToolContext, rect: PixelRect | null): void {
    const active = this.active;
    if (!active || !rect || isEmptyRect(rect)) return;
    context2d(active.preview).putImageData(
      active.image,
      0,
      0,
      rect.x0,
      rect.y0,
      rect.x1 - rect.x0,
      rect.y1 - rect.y0,
    );
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
    if (this.active) {
      releaseSurface(this.active.preview);
      for (const source of this.active.sources) source.release();
    }
    this.active = null;
    this.overrides.clear();
    this.hover = null;
    ctx.invalidate();
  }

  leave(ctx: ToolContext): void {
    this.hover = null;
    ctx.invalidate();
  }

  overlays(ctx: ToolContext): readonly Overlay[] {
    const out: Overlay[] = [];
    if (this.hover) {
      out.push({ kind: "brush", center: this.hover, radius: this.settings(ctx).size / 2 });
    }
    const doc = ctx.store.getSession()?.document;
    if (this.usesSource && this.source && this.source.documentId === doc?.id) {
      // While painting (or with Aligned), the source follows the pointer.
      const aligned = ctx.store.getState().toolSettings[this.id as "clone" | "heal"].aligned;
      const follows = this.hover && this.offset && (this.active || aligned);
      out.push({
        kind: "source",
        center: follows
          ? { x: this.hover!.x + this.offset!.x, y: this.hover!.y + this.offset!.y }
          : this.source.point,
      });
    }
    return out;
  }

  preview(): CompositePreview | undefined {
    return this.overrides.size > 0 ? { overrides: this.overrides } : undefined;
  }
}
