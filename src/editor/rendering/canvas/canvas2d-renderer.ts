import type { EditorDocument } from "../../core/document/types";
import { compositeDocument } from "../compositing/compositor";
import type { Renderer, RenderScene } from "../renderer";

export interface Canvas2DTheme {
  workspace: string;
  checkerLight: string;
  checkerDark: string;
  border: string;
}

export const DEFAULT_THEME: Canvas2DTheme = {
  workspace: "#1e1f22",
  checkerLight: "#ffffff",
  checkerDark: "#cccccc",
  border: "rgba(0, 0, 0, 0.6)",
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
  private checker: CanvasPattern | null = null;

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
  }

  dispose(): void {
    if (this.composite) {
      this.composite.width = 0;
      this.composite.height = 0;
    }
    this.composite = null;
    this.compositeOf = null;
    this.checker = null;
  }

  private ensureComposite(scene: RenderScene): void {
    const doc = scene.document;
    const upToDate =
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

    const result = compositeDocument(ctx, doc, scene.assets);
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
