import type { Message } from "../core/message";
import { LazyTool } from "../tools/lazy-tool";
import type { DistortMode, DistortState, DistortTool } from "../tools/move/distort-tool";
import type { WarpSettings } from "../core/geometry/warp-presets";
import type { AssetStore } from "../assets/asset-store";
import type { EditorStore } from "../core/editor-store";
import type { ContentSizer } from "../core/geometry/layer-geometry";
import { RetouchTool } from "../tools/retouch/retouch-tool";
import { snapTargets, type SnapTargets } from "../core/geometry/snapping";
import type { EditorDocument, Guide } from "../core/document/types";
import type { ViewSettings } from "../core/view-settings";
import { Observable } from "../core/observable";
import type { ToolId } from "../core/tool-settings";
import { DEFAULT_VIEWPORT, type Size } from "../core/viewport/viewport";
import type { SurfaceFactory } from "../rendering/canvas/canvas2d-renderer";
import type { CompositePreview } from "../rendering/compositing/compositor";
import type { Overlay } from "../rendering/overlay";
import type { SelectionMask } from "../selection/mask";
import type { JobRunner } from "../workers/job-runner";
import { BrushTool } from "../tools/brush/brush-tool";
import { BucketTool } from "../tools/bucket/bucket-tool";
import { EyedropperTool } from "../tools/eyedropper/eyedropper-tool";
import { GradientTool } from "../tools/gradient/gradient-tool";
import { LassoTool, MagicWandTool, MarqueeTool } from "../tools/selection/selection-tools";
import { TransformSelectionTool } from "../tools/selection/transform-selection-tool";
import type { PixelTransformTool } from "../tools/move/pixel-transform-tool";
import { movablePixels } from "../tools/move/move-tool";
import { activeLayer } from "../core/document/queries";
import { CropTool } from "../tools/crop/crop-tool";
import { GuideDrag } from "../tools/guide/guide-drag";
import { MoveTool } from "../tools/move/move-tool";
import { DirectSelectTool } from "../tools/pen/direct-select-tool";
import { PenTool } from "../tools/pen/pen-tool";
import { ShapeTool } from "../tools/shape/shape-tool";
import { TextTool } from "../tools/text/text-tool";
import { ColorSamplerTool, RulerTool } from "../tools/measure/measure-tools";
import type { TextEditRequest, Tool, ToolContext, ToolKey, ToolPointer } from "../tools/tool";

export interface ToolManagerHost {
  store: EditorStore;
  assets: AssetStore;
  sizer: ContentSizer;
  createSurface: SurfaceFactory;
  jobs: JobRunner;
  notify(kind: "info" | "error", message: Message): void;
  pixelsCommitted(): void;
  beginTextEdit(request: TextEditRequest): void;
  /** View preferences: guides, grid and snapping. */
  view(): ViewSettings;
  /** Size of the canvas viewport in CSS pixels. */
  screenSize(): Size;
  /** Rotate the whole canvas (Straighten); the new canvas size, or null if refused. */
  rotateCanvas?(degrees: number): { width: number; height: number } | null;
}

/**
 * Routes viewport input to the active tool and exposes the tool's previews/overlays to the
 * renderer. Hand and Zoom are handled by the viewport itself and have no Tool object.
 */
export class ToolManager {
  /** Bumped whenever tool feedback changes and the canvas should be redrawn. */
  readonly revision = new Observable(0);
  readonly crop: CropTool;
  /** Perspective Crop (ADR-0044), loaded when first picked. */
  readonly perspectiveCrop = new LazyTool("perspective-crop", async () => {
    const { PerspectiveCropTool } = await import("../tools/crop/perspective-crop-tool");
    return new PerspectiveCropTool();
  });
  readonly pen = new PenTool();
  /** Select → Transform Selection: overrides the active tool until applied or cancelled. */
  readonly selectionTransform = new TransformSelectionTool();
  /** Free Transform of selected pixels: overrides the active tool until applied or cancelled. */
  /** Loaded the first time it is used (most sessions never transform selected pixels). */
  private pixelTransform: PixelTransformTool | null = null;
  /** Edit → Transform → Skew/Distort/Perspective/Warp (ADR-0044); loaded on first use. */
  private distortTool: DistortTool | null = null;
  /** The open distort transform, for the options bar (null when none). */
  readonly distort = new Observable<DistortState | null>(null);
  /** Moving guides with the Move tool and creating them from the rulers. */
  readonly guides = new GuideDrag();
  private readonly tools: Partial<Record<ToolId, Tool>>;
  private snapCache: {
    doc: EditorDocument;
    view: ViewSettings;
    key: string;
    targets: SnapTargets;
  } | null = null;
  private readonly context: ToolContext;
  private activeId: ToolId;
  private documentId: string | null;
  private readonly unsubscribe: () => void;

  constructor(private readonly host: ToolManagerHost) {
    this.crop = new CropTool((degrees) => host.rotateCanvas?.(degrees) ?? null);
    this.tools = {
      move: new MoveTool(),
      marquee: new MarqueeTool(),
      lasso: new LassoTool(),
      wand: new MagicWandTool(),
      crop: this.crop,
      "perspective-crop": this.perspectiveCrop,
      eyedropper: new EyedropperTool(),
      brush: new BrushTool("brush"),
      pencil: new BrushTool("pencil"),
      eraser: new BrushTool("eraser"),
      clone: new RetouchTool("clone"),
      heal: new RetouchTool("heal"),
      tone: new RetouchTool("tone"),
      focus: new RetouchTool("focus"),
      bucket: new BucketTool(),
      gradient: new GradientTool(),
      shape: new ShapeTool(),
      pen: this.pen,
      "path-select": new DirectSelectTool(),
      text: new TextTool(),
      // Group members (ADR-0027).
      "spot-heal": new RetouchTool("spot-heal"),
      "red-eye": new RetouchTool("red-eye"),
      "bg-eraser": new RetouchTool("bg-eraser"),
      "color-replace": new RetouchTool("color-replace"),
      "magic-eraser": new BucketTool("magic-eraser"),
      "color-sampler": new ColorSamplerTool(),
      ruler: new RulerTool(),
      "path-move": new DirectSelectTool("path"),
      "anchor-add": new DirectSelectTool("add"),
      "anchor-delete": new DirectSelectTool("delete"),
      "anchor-convert": new DirectSelectTool("convert"),
    };
    this.context = {
      store: host.store,
      assets: host.assets,
      sizer: host.sizer,
      createSurface: host.createSurface,
      jobs: host.jobs,
      viewport: () => host.store.getSession()?.viewport ?? DEFAULT_VIEWPORT,
      notify: (kind, message) => host.notify(kind, message),
      invalidate: () => this.revision.update((n) => n + 1),
      pixelsCommitted: () => host.pixelsCommitted(),
      beginTextEdit: (request) => host.beginTextEdit(request),
      snapTargets: (exclude) => this.snapTargets(exclude),
    };
    const state = host.store.getState();
    this.activeId = state.activeTool;
    this.documentId = state.activeDocumentId;
    // Switching tools or documents abandons any gesture in progress.
    this.unsubscribe = host.store.subscribe(() => {
      const next = host.store.getState();
      if (next.activeTool !== this.activeId || next.activeDocumentId !== this.documentId) {
        this.active()?.cancel(this.context);
        this.guides.cancel(this.context);
        if (this.selectionTransform.active) this.selectionTransform.end(this.context);
        if (this.pixelTransform?.active) this.pixelTransform.end(this.context);
        if (this.distortTool?.active) this.distortTool.end(this.context);
        this.activeId = next.activeTool;
        this.documentId = next.activeDocumentId;
        this.context.invalidate();
      }
      // An undo or any other edit while transforming pixels would make the lifted pixels stale.
      if (
        this.pixelTransform?.active &&
        this.pixelTransform.isStale(host.store.getSession()?.document)
      ) {
        this.pixelTransform.end(this.context);
      }
      if (this.distortTool?.active && this.distortTool.isStale(host.store.getSession()?.document)) {
        this.distortTool.end(this.context);
      }
    });
  }

  dispose(): void {
    this.unsubscribe();
  }

  private active(): Tool | undefined {
    if (this.selectionTransform.active) return this.selectionTransform;
    if (this.pixelTransform?.active) return this.pixelTransform;
    if (this.distortTool?.active) return this.distortTool;
    return this.tools[this.host.store.getState().activeTool];
  }

  beginSelectionTransform(): void {
    this.active()?.cancel(this.context);
    if (this.selectionTransform.begin(this.context)) {
      this.host.notify(
        "info",
        "Drag the handles to transform the selection. Enter applies, Esc cancels.",
      );
    }
  }

  /**
   * Free Transform (Mod+T): with a selection on pixels (or a mask being edited) it transforms just
   * the selected pixels; otherwise it switches to the Move tool, whose handles transform layers.
   */
  async beginFreeTransform(): Promise<void> {
    this.host.store.setActiveTool("move");
    const session = this.host.store.getSession();
    const layer = session ? activeLayer(session.document) : undefined;
    const onPixels =
      !!session?.document.selection?.bounds &&
      !!layer?.visible &&
      !!movablePixels(layer, this.host.store.getState().editTarget);
    if (!onPixels) return;
    if (!this.pixelTransform) {
      const { PixelTransformTool } = await import("../tools/move/pixel-transform-tool");
      this.pixelTransform ??= new PixelTransformTool();
    }
    this.active()?.cancel(this.context);
    if (this.pixelTransform.begin(this.context)) {
      this.host.notify(
        "info",
        "Drag the handles to transform the selected pixels. Enter applies, Esc cancels.",
      );
    }
  }

  /** Start Skew, Distort, Perspective or Warp on `layerId` (ADR-0044). */
  async beginDistort(mode: DistortMode, layerId: string): Promise<boolean> {
    if (!this.distortTool) {
      const { DistortTool } = await import("../tools/move/distort-tool");
      if (!this.distortTool) {
        this.distortTool = new DistortTool();
        this.distortTool.state.subscribe(() => this.distort.set(this.distortTool!.state.get()));
      }
    }
    this.active()?.cancel(this.context);
    if (this.pixelTransform?.active) this.pixelTransform.end(this.context);
    if (this.distortTool.active) this.distortTool.end(this.context);
    return this.distortTool.begin(this.context, mode, layerId);
  }

  /** Options bar: change the warp preset or its amounts. */
  setWarp(settings: Partial<WarpSettings>): void {
    this.distortTool?.setWarp(this.context, settings);
  }

  /** Apply (Enter) or cancel (Esc) the open distort transform. */
  finishDistort(apply: boolean): void {
    if (!this.distortTool?.active) return;
    if (apply) this.distortTool.apply(this.context);
    else this.distortTool.end(this.context);
  }

  /** True when the active tool consumes canvas pointer input (Hand/Zoom do not). */
  get handlesPointer(): boolean {
    return !!this.active();
  }

  /** Snap targets for the active document (cached per document state), or null when off. */
  private snapTargets(exclude: readonly string[] = []): SnapTargets | null {
    const view = this.host.view();
    const doc = this.host.store.getSession()?.document;
    if (!view.snap || !doc) return null;
    const key = exclude.join(",");
    const cached = this.snapCache;
    if (cached && cached.doc === doc && cached.view === view && cached.key === key) {
      return cached.targets;
    }
    const targets = snapTargets(doc, this.host.sizer, {
      guides: view.guides,
      grid: view.grid ? view.gridSize : null,
      canvas: true,
      layers: true,
      excludeLayerIds: exclude,
    });
    this.snapCache = { doc, view, key, targets };
    return targets;
  }

  /** A guide the pointer can pick up: Move tool, guides shown and not locked. */
  private guideAt(pointer: ToolPointer | null): Guide | null {
    const view = this.host.view();
    if (!pointer || !view.guides || view.lockGuides || this.selectionTransform.active) return null;
    if (this.pixelTransform?.active) return null;
    if (this.host.store.getState().activeTool !== "move") return null;
    return this.guides.hitTest(this.context, pointer.screen);
  }

  /** Guides to draw: none when hidden; the one being dragged is drawn as an overlay instead. */
  visibleGuides(): readonly Guide[] | undefined {
    if (!this.host.view().guides) return undefined;
    const guides = this.host.store.getSession()?.document.guides ?? [];
    const dragged = this.guides.draggedGuideId;
    return dragged ? guides.filter((g) => g.id !== dragged) : guides;
  }

  cursor(pointer: ToolPointer | null): string {
    const guide = this.guideAt(pointer);
    if (guide) return this.guides.cursor(guide.orientation);
    return this.active()?.cursor(this.context, pointer) ?? "default";
  }

  pointerDown(pointer: ToolPointer): void {
    const guide = this.guideAt(pointer);
    if (guide) this.guides.begin(this.context, guide.orientation, guide);
    else this.active()?.pointerDown(this.context, pointer);
    this.context.invalidate();
  }

  pointerMove(pointer: ToolPointer): void {
    if (this.guides.active) this.guides.move(this.context, pointer, this.host.screenSize());
    else this.active()?.pointerMove(this.context, pointer);
  }

  pointerUp(pointer: ToolPointer): void {
    if (this.guides.active) this.guides.end(this.context);
    else this.active()?.pointerUp(this.context, pointer);
    this.context.invalidate();
  }

  /** Commit a path still being drawn with the Pen tool (before a path command uses it). */
  finishPen(): void {
    if (this.pen.active) this.pen.finish(this.context, false);
  }

  /** Start dragging a new guide out of a ruler. */
  beginRulerGuide(orientation: Guide["orientation"]): void {
    this.active()?.cancel(this.context);
    this.guides.begin(this.context, orientation);
  }

  doubleClick(pointer: ToolPointer): void {
    this.active()?.doubleClick?.(this.context, pointer);
  }

  leave(): void {
    this.active()?.leave?.(this.context);
  }

  keyDown(key: ToolKey): boolean {
    return this.active()?.keyDown?.(this.context, key) ?? false;
  }

  cancel(): void {
    if (this.guides.active) this.guides.cancel(this.context);
    else this.active()?.cancel(this.context);
  }

  applyCrop(): void {
    if (this.host.store.getState().activeTool === "perspective-crop") {
      (this.perspectiveCrop.loaded as { apply?: (ctx: ToolContext) => boolean } | null)?.apply?.(
        this.context,
      );
      return;
    }
    this.crop.apply(this.context);
  }

  resetCrop(): void {
    if (this.host.store.getState().activeTool === "perspective-crop") {
      (this.perspectiveCrop.loaded as { reset?: (ctx: ToolContext) => void } | null)?.reset?.(
        this.context,
      );
      return;
    }
    this.crop.reset(this.context);
  }

  /** A crop ratio preset was picked in the options bar. */
  cropRatioChanged(): void {
    this.crop.ratioChanged(this.context);
  }

  /** Crop options → Straighten: the next drag on the canvas draws the level line. */
  straightenCrop(): void {
    this.crop.straightening = true;
    this.host.notify("info", "Drag along a line that should be level (or upright).");
  }

  overlays(): readonly Overlay[] {
    const tool = this.active()?.overlays(this.context) ?? [];
    return this.guides.active ? [...tool, ...this.guides.overlays()] : tool;
  }

  private layerOverride: { layerId: string; source: CanvasImageSource } | null = null;

  /** Show other pixels for one raster layer (a filter preview); null restores the layer. */
  previewLayerPixels(layerId: string | null, source: CanvasImageSource | null = null): void {
    this.layerOverride = layerId && source ? { layerId, source } : null;
    this.context.invalidate();
  }

  preview(): CompositePreview | undefined {
    const tool = this.active()?.preview(this.context);
    const override = this.layerOverride;
    if (!override) return tool;
    const overrides = new Map(tool?.overrides ?? []);
    overrides.set(override.layerId, override.source);
    return { ...tool, overrides };
  }

  private selectionOverride: SelectionMask | null | undefined = undefined;

  /** Show a candidate selection (e.g. Color Range preview); `undefined` restores the real one. */
  previewSelection(mask: SelectionMask | null | undefined): void {
    this.selectionOverride = mask;
    this.context.invalidate();
  }

  /** The selection outline to draw: a tool's live preview, else the document's selection. */
  selection(): SelectionMask | undefined {
    if (this.selectionOverride !== undefined) return this.selectionOverride ?? undefined;
    const preview = this.active()?.selectionPreview?.(this.context);
    if (preview === null) return undefined;
    return preview ?? this.host.store.getSession()?.document.selection;
  }
}
