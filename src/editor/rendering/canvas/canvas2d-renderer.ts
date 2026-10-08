import type { EditorDocument } from "../../core/document/types";
import { CompositeCache, compositeDocument } from "../compositing/compositor";
import { documentToScreen, type Viewport } from "../../core/viewport/viewport";
import { rectHandles } from "../../core/geometry/rect";
import type { SelectionMask } from "../../selection/mask";
import { selectionOutline } from "../../selection/outline";
import { HANDLE_SIZE_PX, type Overlay } from "../overlay";
import type { Renderer, RenderScene } from "../renderer";

export interface Canvas2DTheme {
  workspace: string;
  checkerLight: string;
  checkerDark: string;
  border: string;
  overlay: string;
  overlayShadow: string;
  cropShade: string;
}

export const DEFAULT_THEME: Canvas2DTheme = {
  workspace: "#1e1f22",
  checkerLight: "#ffffff",
  checkerDark: "#cccccc",
  border: "rgba(0, 0, 0, 0.6)",
  overlay: "#4c8dff",
  overlayShadow: "rgba(0, 0, 0, 0.55)",
  cropShade: "rgba(0, 0, 0, 0.55)",
};

/** Creates an offscreen surface. Injected so the renderer is testable and OffscreenCanvas-aware. */
export type SurfaceFactory = (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas;

export const defaultSurfaceFactory: SurfaceFactory = (width, height) => {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const CHECKER_SIZE = 8;

/**
 * Canvas 2D renderer: composites the document once into a cached document-sized surface, then
 * presents it under the viewport transform. Panning and zooming only re-present; the composite is
 * rebuilt only when the document or its decoded assets change.
 */
export class Canvas2DRenderer implements Renderer {
  private composite: HTMLCanvasElement | OffscreenCanvas | null = null;
  private compositeOf: EditorDocument | null = null;
  private compositeAssetVersion = -1;
  private compositeComplete = false;
  private compositeHadPreview = false;
  private checker: CanvasPattern | null = null;
  private readonly cache = new CompositeCache();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly theme: Canvas2DTheme = DEFAULT_THEME,
    private readonly createSurface: SurfaceFactory = defaultSurfaceFactory,
  ) {}

  render(scene: RenderScene): void {
    const { document: doc, viewport, screen, devicePixelRatio: dpr } = scene;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const pixelWidth = Math.max(1, Math.round(screen.width * dpr));
    const pixelHeight = Math.max(1, Math.round(screen.height * dpr));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    this.ensureComposite(scene);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this.theme.workspace;
    ctx.fillRect(0, 0, screen.width, screen.height);

    const x = viewport.panX;
    const y = viewport.panY;
    const w = doc.width * viewport.zoom;
    const h = doc.height * viewport.zoom;

    // Checkerboard in screen space so the squares stay the same size at every zoom level.
    ctx.fillStyle = this.checkerPattern(ctx) ?? this.theme.checkerLight;
    ctx.fillRect(x, y, w, h);

    if (this.composite) {
      // Show crisp pixels when magnified, smooth resampling when reduced.
      ctx.imageSmoothingEnabled = viewport.zoom < 2;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(this.composite, x, y, w, h);
    }

    ctx.strokeStyle = this.theme.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) - 0.5, Math.round(y) - 0.5, Math.round(w) + 1, Math.round(h) + 1);

    if (scene.selection) this.drawAnts(ctx, scene.selection, viewport, scene.antsPhase ?? 0);
    for (const overlay of scene.overlays ?? []) this.drawOverlay(ctx, overlay, viewport, screen);
  }

  /** Marching ants: a white line under a dashed black one, offset by `phase` to animate. */
  private drawAnts(
    ctx: CanvasRenderingContext2D,
    selection: SelectionMask,
    viewport: Viewport,
    phase: number,
  ): void {
    const segments = selectionOutline(selection);
    if (segments.length === 0) return;
    const { zoom, panX, panY } = viewport;
    // Snap to device-independent half pixels so 1px lines stay crisp.
    const sx = (x: number) => Math.round(x * zoom + panX) + 0.5;
    const sy = (y: number) => Math.round(y * zoom + panY) + 0.5;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < segments.length; i += 4) {
      ctx.moveTo(sx(segments[i]), sy(segments[i + 1]));
      ctx.lineTo(sx(segments[i + 2]), sy(segments[i + 3]));
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -phase;
    ctx.strokeStyle = "#000000";
    ctx.stroke();
    ctx.restore();
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    overlay: Overlay,
    viewport: Viewport,
    screen: { width: number; height: number },
  ): void {
    const toScreen = (p: { x: number; y: number }) => documentToScreen(viewport, p);
    ctx.save();
    ctx.lineWidth = 1;
    switch (overlay.kind) {
      case "transform": {
        const pts = overlay.corners.map(toScreen);
        this.strokeOutline(ctx, () => {
          ctx.beginPath();
          pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.closePath();
        });
        if (overlay.handles) {
          const mids = pts.map((p, i) => {
            const q = pts[(i + 1) % 4];
            return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
          });
          for (const p of [...pts, ...mids]) this.drawHandle(ctx, p);
        }
        break;
      }
      case "crop": {
        const tl = toScreen(overlay.rect);
        const br = toScreen({
          x: overlay.rect.x + overlay.rect.width,
          y: overlay.rect.y + overlay.rect.height,
        });
        ctx.fillStyle = this.theme.cropShade;
        ctx.beginPath();
        ctx.rect(0, 0, screen.width, screen.height);
        ctx.rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        ctx.fill("evenodd");
        this.strokeOutline(ctx, () => {
          ctx.beginPath();
          ctx.rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
          // Rule-of-thirds guides.
          for (const f of [1 / 3, 2 / 3]) {
            ctx.moveTo(tl.x + (br.x - tl.x) * f, tl.y);
            ctx.lineTo(tl.x + (br.x - tl.x) * f, br.y);
            ctx.moveTo(tl.x, tl.y + (br.y - tl.y) * f);
            ctx.lineTo(br.x, tl.y + (br.y - tl.y) * f);
          }
        });
        for (const p of Object.values(rectHandles(overlay.rect))) this.drawHandle(ctx, toScreen(p));
        break;
      }
      case "path": {
        if (overlay.points.length < 2) break;
        const pts = overlay.points.map(toScreen);
        const trace = () => {
          ctx.beginPath();
          pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          if (overlay.closed) ctx.closePath();
        };
        trace();
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "#000000";
        ctx.stroke();
        break;
      }
      case "brush": {
        const c = toScreen(overlay.center);
        const r = Math.max(1, overlay.radius * viewport.zoom);
        this.strokeOutline(ctx, () => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        });
        break;
      }
    }
    ctx.restore();
  }

  /** A light line over a dark one, visible on any image. */
  private strokeOutline(ctx: CanvasRenderingContext2D, path: () => void): void {
    path();
    ctx.strokeStyle = this.theme.overlayShadow;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = this.theme.overlay;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawHandle(ctx: CanvasRenderingContext2D, p: { x: number; y: number }): void {
    const half = HANDLE_SIZE_PX / 2;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = this.theme.overlay;
    ctx.lineWidth = 1;
    ctx.fillRect(Math.round(p.x - half), Math.round(p.y - half), HANDLE_SIZE_PX, HANDLE_SIZE_PX);
    ctx.strokeRect(
      Math.round(p.x - half) + 0.5,
      Math.round(p.y - half) + 0.5,
      HANDLE_SIZE_PX - 1,
      HANDLE_SIZE_PX - 1,
    );
  }

  dispose(): void {
    if (this.composite) {
      this.composite.width = 0;
      this.composite.height = 0;
    }
    this.composite = null;
    this.compositeOf = null;
    this.checker = null;
    this.cache.clear();
  }

  private ensureComposite(scene: RenderScene): void {
    const doc = scene.document;
    const upToDate =
      !scene.preview &&
      !this.compositeHadPreview &&
      this.compositeOf === doc &&
      (this.compositeComplete || this.compositeAssetVersion === scene.assetVersion);
    if (upToDate && this.composite) return;

    if (
      !this.composite ||
      this.composite.width !== doc.width ||
      this.composite.height !== doc.height
    ) {
      if (this.composite) {
        // Release the old backing store before allocating a new one.
        this.composite.width = 0;
        this.composite.height = 0;
      }
      this.composite = this.createSurface(doc.width, doc.height);
    }
    const ctx = this.composite.getContext("2d") as CanvasRenderingContext2D | null;
    if (!ctx) return;

    const result = compositeDocument(ctx, doc, scene.assets, {
      preview: scene.preview,
      sizer: scene.sizer,
      createSurface: this.createSurface,
      cache: this.cache,
      assetVersion: scene.assetVersion,
    });
    this.compositeHadPreview = !!scene.preview;
    this.compositeOf = doc;
    this.compositeAssetVersion = scene.assetVersion;
    this.compositeComplete = result.pendingAssetIds.length === 0;
  }

  private checkerPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
    if (this.checker) return this.checker;
    const tile = this.createSurface(CHECKER_SIZE * 2, CHECKER_SIZE * 2);
    const tctx = tile.getContext("2d") as CanvasRenderingContext2D | null;
    if (!tctx) return null;
    tctx.fillStyle = this.theme.checkerLight;
    tctx.fillRect(0, 0, CHECKER_SIZE * 2, CHECKER_SIZE * 2);
    tctx.fillStyle = this.theme.checkerDark;
    tctx.fillRect(0, 0, CHECKER_SIZE, CHECKER_SIZE);
    tctx.fillRect(CHECKER_SIZE, CHECKER_SIZE, CHECKER_SIZE, CHECKER_SIZE);
    this.checker = ctx.createPattern(tile, "repeat");
    return this.checker;
  }
}
