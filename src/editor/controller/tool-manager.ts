import type { AssetStore } from "../assets/asset-store";
import type { EditorStore } from "../core/editor-store";
import type { ContentSizer } from "../core/geometry/layer-geometry";
import { Observable } from "../core/observable";
import type { ToolId } from "../core/tool-settings";
import { DEFAULT_VIEWPORT } from "../core/viewport/viewport";
import type { SurfaceFactory } from "../rendering/canvas/canvas2d-renderer";
import type { CompositePreview } from "../rendering/compositing/compositor";
import type { Overlay } from "../rendering/overlay";
import type { SelectionMask } from "../selection/mask";
import { BrushTool } from "../tools/brush/brush-tool";
import { BucketTool } from "../tools/bucket/bucket-tool";
import { EyedropperTool } from "../tools/eyedropper/eyedropper-tool";
import { GradientTool } from "../tools/gradient/gradient-tool";
import { LassoTool, MagicWandTool, MarqueeTool } from "../tools/selection/selection-tools";
import { TransformSelectionTool } from "../tools/selection/transform-selection-tool";
import { CropTool } from "../tools/crop/crop-tool";
import { MoveTool } from "../tools/move/move-tool";
import { ShapeTool } from "../tools/shape/shape-tool";
import { TextTool } from "../tools/text/text-tool";
import type { TextEditRequest, Tool, ToolContext, ToolKey, ToolPointer } from "../tools/tool";

export interface ToolManagerHost {
  store: EditorStore;
  assets: AssetStore;
  sizer: ContentSizer;
  createSurface: SurfaceFactory;
  notify(kind: "info" | "error", message: string): void;
  pixelsCommitted(): void;
  beginTextEdit(request: TextEditRequest): void;
}

/**
 * Routes viewport input to the active tool and exposes the tool's previews/overlays to the
 * renderer. Hand and Zoom are handled by the viewport itself and have no Tool object.
 */
export class ToolManager {
  /** Bumped whenever tool feedback changes and the canvas should be redrawn. */
  readonly revision = new Observable(0);
  readonly crop = new CropTool();
  /** Select → Transform Selection: overrides the active tool until applied or cancelled. */
  readonly selectionTransform = new TransformSelectionTool();
  private readonly tools: Partial<Record<ToolId, Tool>>;
  private readonly context: ToolContext;
  private activeId: ToolId;
  private documentId: string | null;
  private readonly unsubscribe: () => void;

  constructor(private readonly host: ToolManagerHost) {
    this.tools = {
      move: new MoveTool(),
      marquee: new MarqueeTool(),
      lasso: new LassoTool(),
      wand: new MagicWandTool(),
      crop: this.crop,
      eyedropper: new EyedropperTool(),
      brush: new BrushTool("brush"),
      pencil: new BrushTool("pencil"),
      eraser: new BrushTool("eraser"),
      bucket: new BucketTool(),
      gradient: new GradientTool(),
      shape: new ShapeTool(),
      text: new TextTool(),
    };
    this.context = {
      store: host.store,
      assets: host.assets,
      sizer: host.sizer,
      createSurface: host.createSurface,
      viewport: () => host.store.getSession()?.viewport ?? DEFAULT_VIEWPORT,
      notify: (kind, message) => host.notify(kind, message),
      invalidate: () => this.revision.update((n) => n + 1),
      pixelsCommitted: () => host.pixelsCommitted(),
      beginTextEdit: (request) => host.beginTextEdit(request),
    };
    const state = host.store.getState();
    this.activeId = state.activeTool;
    this.documentId = state.activeDocumentId;
    // Switching tools or documents abandons any gesture in progress.
    this.unsubscribe = host.store.subscribe(() => {
      const next = host.store.getState();
      if (next.activeTool !== this.activeId || next.activeDocumentId !== this.documentId) {
        this.active()?.cancel(this.context);
        if (this.selectionTransform.active) this.selectionTransform.end(this.context);
        this.activeId = next.activeTool;
        this.documentId = next.activeDocumentId;
        this.context.invalidate();
      }
    });
  }

  dispose(): void {
    this.unsubscribe();
  }

  private active(): Tool | undefined {
    if (this.selectionTransform.active) return this.selectionTransform;
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

  /** True when the active tool consumes canvas pointer input (Hand/Zoom do not). */
  get handlesPointer(): boolean {
    return !!this.active();
  }

  cursor(pointer: ToolPointer | null): string {
    return this.active()?.cursor(this.context, pointer) ?? "default";
  }

  pointerDown(pointer: ToolPointer): void {
    this.active()?.pointerDown(this.context, pointer);
    this.context.invalidate();
  }

  pointerMove(pointer: ToolPointer): void {
    this.active()?.pointerMove(this.context, pointer);
  }

  pointerUp(pointer: ToolPointer): void {
    this.active()?.pointerUp(this.context, pointer);
    this.context.invalidate();
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
    this.active()?.cancel(this.context);
  }

  applyCrop(): void {
    this.crop.apply(this.context);
  }

  resetCrop(): void {
    this.crop.reset(this.context);
  }

  overlays(): readonly Overlay[] {
    return this.active()?.overlays(this.context) ?? [];
  }

  preview(): CompositePreview | undefined {
    return this.active()?.preview(this.context);
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
