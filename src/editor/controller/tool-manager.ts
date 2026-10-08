import type { AssetStore } from "../assets/asset-store";
import type { EditorStore } from "../core/editor-store";
import type { ContentSizer } from "../core/geometry/layer-geometry";
import { Observable } from "../core/observable";
import type { ToolId } from "../core/tool-settings";
import { DEFAULT_VIEWPORT } from "../core/viewport/viewport";
import type { SurfaceFactory } from "../rendering/canvas/canvas2d-renderer";
import type { CompositePreview } from "../rendering/compositing/compositor";
import type { Overlay } from "../rendering/overlay";
import { BrushTool } from "../tools/brush/brush-tool";
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
  private readonly tools: Partial<Record<ToolId, Tool>>;
  private readonly context: ToolContext;
  private activeId: ToolId;
  private documentId: string | null;
  private readonly unsubscribe: () => void;

  constructor(private readonly host: ToolManagerHost) {
    this.tools = {
      move: new MoveTool(),
      crop: this.crop,
      brush: new BrushTool("brush"),
      eraser: new BrushTool("eraser"),
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
    return this.tools[this.host.store.getState().activeTool];
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
}
