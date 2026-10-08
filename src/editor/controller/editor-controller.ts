import { describeError, silentLogger, type Logger } from "@/lib/logging/logger";
import { AssetStore, type BitmapDecoder, type BitmapEncoder } from "../assets/asset-store";
import {
  addLayer,
  deleteLayer,
  setLayerTransform,
  updateTextLayer,
  type Command,
} from "../core/commands";
import { EditorStore, isDirty, type DocumentSession } from "../core/editor-store";
import {
  createDocument,
  createFillLayer,
  createEmptyRasterLayer,
  createRasterLayer,
  createTextLayer,
  DocumentError,
  nextLayerName,
  type NewDocumentOptions,
  type TextStyle,
} from "../core/document/factory";
import type { Transform } from "../core/document/types";
import { activeLayer } from "../core/document/queries";
import {
  isTransformable,
  layerLocalSize,
  type ContentSizer,
} from "../core/geometry/layer-geometry";
import { flipAboutCenter } from "../core/geometry/transform-handles";
import { referencedAssetIds } from "../core/document/queries";
import { createId } from "../core/ids";
import { Observable } from "../core/observable";
import {
  actualPixels,
  fitToScreen,
  nextZoomStep,
  zoomAt,
  type Point,
  type Size,
} from "../core/viewport/viewport";
import {
  exportDocument,
  exportFilename,
  ExportError,
  type ExportOptions,
} from "../formats/export/raster-export";
import { baseName, importRasterFile } from "../formats/raster/raster-import";
import type { SurfaceFactory } from "../rendering/canvas/canvas2d-renderer";
import { estimateTextSizer } from "../rendering/text/text-layout";
import type { TextEditRequest } from "../tools/tool";
import { ToolManager } from "./tool-manager";
import { MemoryProjectStorage } from "../persistence/memory/memory-project-storage";
import {
  StorageError,
  type ProjectStorage,
  type ProjectSummary,
  type StoredAsset,
} from "../persistence/project-storage";

export type NoticeKind = "info" | "error";

export interface Notice {
  readonly id: string;
  readonly kind: NoticeKind;
  readonly message: string;
}

export interface AppStatus {
  /** null until the first listing completes. */
  readonly recentProjects: readonly ProjectSummary[] | null;
  readonly storagePersistent: boolean;
  readonly notices: readonly Notice[];
}

export type Result = { ok: true } | { ok: false; error: string };

/** The on-canvas text editor's state while the user is typing. */
export interface TextEditSession {
  readonly documentId: string;
  /** null while creating a new text layer. */
  readonly layerId: string | null;
  readonly text: string;
  readonly style: TextStyle;
  readonly transform: Transform;
}

export interface EditorControllerOptions {
  storage: ProjectStorage;
  decode: BitmapDecoder;
  /** PNG-encodes pixels painted in the editor when they are saved. */
  encode?: BitmapEncoder;
  /** Offscreen surfaces for painting and export (browser only). */
  createSurface?: SurfaceFactory;
  /** Measures text; defaults to a rough estimate outside the browser. */
  sizer?: ContentSizer;
  /** Estimated decoded-pixel budget for open documents and their undo history, in bytes. */
  pixelBudgetBytes?: number;
  logger?: Logger;
  /** Idle time after the last edit before autosaving. 0 disables autosave. */
  autosaveDelayMs?: number;
  clock?: () => number;
}

export const DEFAULT_AUTOSAVE_DELAY_MS = 1500;
export const DEFAULT_PIXEL_BUDGET_BYTES = 768 * 1024 * 1024;

const noSurfaces: SurfaceFactory = () => {
  throw new Error("Offscreen canvas is not available.");
};
const MAX_NOTICES = 4;

/**
 * Orchestrates editor use cases (open, import, save, restore, autosave) on top of the store.
 * Framework-free: the React layer calls these methods and renders the observable state.
 */
export class EditorController {
  readonly store: EditorStore;
  readonly assets: AssetStore;
  readonly status: Observable<AppStatus>;
  /** Size of the canvas viewport element in CSS pixels, reported by the UI. */
  readonly viewportSize = new Observable<Size>({ width: 0, height: 0 });
  /** Pointer position in document pixels while over the canvas (for the status bar). */
  readonly cursor = new Observable<Point | null>(null);
  readonly tools: ToolManager;
  readonly textEdit = new Observable<TextEditSession | null>(null);
  readonly sizer: ContentSizer;
  readonly createSurface: SurfaceFactory;

  private storage: ProjectStorage;
  private readonly decode: BitmapDecoder;
  private readonly logger: Logger;
  private readonly autosaveDelayMs: number;
  private readonly pixelBudgetBytes: number;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly saveQueues = new Map<string, Promise<void>>();
  private readonly unsubscribe: () => void;

  constructor(options: EditorControllerOptions) {
    this.store = new EditorStore(options.clock);
    this.assets = new AssetStore(options.decode, options.encode);
    this.sizer = options.sizer ?? estimateTextSizer;
    this.createSurface = options.createSurface ?? noSurfaces;
    this.pixelBudgetBytes = options.pixelBudgetBytes ?? DEFAULT_PIXEL_BUDGET_BYTES;
    this.storage = options.storage;
    this.decode = options.decode;
    this.logger = options.logger ?? silentLogger;
    this.autosaveDelayMs = options.autosaveDelayMs ?? DEFAULT_AUTOSAVE_DELAY_MS;
    this.status = new Observable<AppStatus>({
      recentProjects: null,
      storagePersistent: options.storage.persistent,
      notices: [],
    });
    this.tools = new ToolManager({
      store: this.store,
      assets: this.assets,
      sizer: this.sizer,
      createSurface: this.createSurface,
      notify: (kind, message) => this.notify(kind, message),
      pixelsCommitted: () => this.enforcePixelBudget(),
      beginTextEdit: (request) => this.beginTextEdit(request),
    });
    let lastTool = this.store.getState().activeTool;
    let lastDocument = this.store.getState().activeDocumentId;
    this.unsubscribe = this.store.subscribe(() => {
      const { activeTool, activeDocumentId } = this.store.getState();
      // Leaving the text tool or the document finishes the text being typed.
      if (activeTool !== lastTool || activeDocumentId !== lastDocument) {
        lastTool = activeTool;
        lastDocument = activeDocumentId;
        if (this.textEdit.get()) this.commitTextEdit();
      }
      this.initializeViewport();
      this.scheduleAutosave();
    });
  }

  dispose(): void {
    this.unsubscribe();
    this.tools.dispose();
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
  }

  // ---------------------------------------------------------------- notices

  notify(kind: NoticeKind, message: string): void {
    const notice: Notice = { id: createId("notice"), kind, message };
    this.status.update((s) => ({ ...s, notices: [...s.notices, notice].slice(-MAX_NOTICES) }));
  }

  dismissNotice(id: string): void {
    this.status.update((s) => ({ ...s, notices: s.notices.filter((n) => n.id !== id) }));
  }

  // ---------------------------------------------------------------- editing

  /** Run a command on the active document, surfacing failures as notices. */
  execute(command: Command): boolean {
    const result = this.store.dispatch(command);
    if (!result.ok) {
      this.notify("error", result.error);
      return false;
    }
    return result.changed;
  }

  undo(): void {
    this.store.undo();
  }

  redo(): void {
    this.store.redo();
  }

  newDocument(options: NewDocumentOptions): Result {
    try {
      this.store.openDocument(createDocument(options));
      return { ok: true };
    } catch (error) {
      if (error instanceof DocumentError) return { ok: false, error: error.message };
      throw error;
    }
  }

  /** Add an empty, transparent pixel layer the size of the canvas. */
  addPixelLayer(): void {
    const session = this.store.getSession();
    if (!session) return;
    const layer = createEmptyRasterLayer(session.document, nextLayerName(session.document));
    this.execute(addLayer(layer, "New Layer"));
  }

  /** Mirror the active layer about its centre. */
  flipActiveLayer(axis: "horizontal" | "vertical"): void {
    const session = this.store.getSession();
    const layer = session ? activeLayer(session.document) : undefined;
    if (!session || !layer) return;
    if (!isTransformable(layer)) {
      this.notify("error", "Fill layers cannot be flipped.");
      return;
    }
    const size = layerLocalSize(layer, session.document, this.sizer);
    this.execute(
      setLayerTransform(layer.id, flipAboutCenter(layer.transform, size, axis), {
        label: axis === "horizontal" ? "Flip Horizontal" : "Flip Vertical",
      }),
    );
  }

  addFillLayer(color = "#ffffff"): void {
    const session = this.store.getSession();
    if (!session) return;
    const layer = createFillLayer(color, nextLayerName(session.document));
    this.execute(addLayer(layer, "New Fill Layer"));
  }

  /** Open a local image file as a new document. */
  async openImageFile(file: Blob, filename: string): Promise<Result> {
    const result = await importRasterFile(file, this.decode);
    if (!result.ok) return this.fail(result.error);
    const { image } = result;
    const asset = this.assets.add(
      { mime: image.mime, width: image.width, height: image.height, blob: image.blob },
      image.bitmap,
    );
    const name = baseName(filename);
    const doc = createDocument({
      name,
      width: image.width,
      height: image.height,
      background: { kind: "transparent" },
    });
    const layer = createRasterLayer({
      assetId: asset.id,
      width: image.width,
      height: image.height,
      name,
    });
    this.store.openDocument({ ...doc, layers: [layer], activeLayerId: layer.id });
    return { ok: true };
  }

  /** Add a local image file to the active document as a new, centred layer. */
  async placeImageFile(file: Blob, filename: string): Promise<Result> {
    const session = this.store.getSession();
    if (!session) return this.openImageFile(file, filename);
    const documentId = session.document.id;
    const result = await importRasterFile(file, this.decode);
    if (!result.ok) return this.fail(result.error);
    const { image } = result;
    const current = this.store.getSession(documentId);
    if (!current) {
      image.bitmap.close?.();
      return this.fail("The document was closed before the image finished loading.");
    }
    const asset = this.assets.add(
      { mime: image.mime, width: image.width, height: image.height, blob: image.blob },
      image.bitmap,
    );
    const layer = createRasterLayer({
      assetId: asset.id,
      width: image.width,
      height: image.height,
      name: baseName(filename),
      x: Math.round((current.document.width - image.width) / 2),
      y: Math.round((current.document.height - image.height) / 2),
    });
    const dispatched = this.store.dispatch(addLayer(layer, "Place Image"), documentId);
    return dispatched.ok ? { ok: true } : this.fail(dispatched.error);
  }

  // ---------------------------------------------------------------- viewport

  setViewportSize(size: Size): void {
    const current = this.viewportSize.get();
    if (current.width === size.width && current.height === size.height) return;
    this.viewportSize.set(size);
    this.initializeViewport();
  }

  /** Fit a newly shown document once the viewport has a measurable size. */
  initializeViewport(): void {
    const session = this.store.getSession();
    const screen = this.viewportSize.get();
    if (!session || session.viewportInitialized || screen.width === 0 || screen.height === 0)
      return;
    this.store.setViewport(session.document.id, fitToScreen(session.document, screen));
  }

  fitToScreen(): void {
    const session = this.store.getSession();
    const screen = this.viewportSize.get();
    if (session && screen.width > 0) {
      this.store.setViewport(session.document.id, fitToScreen(session.document, screen));
    }
  }

  actualPixels(): void {
    const session = this.store.getSession();
    const screen = this.viewportSize.get();
    if (session && screen.width > 0) {
      this.store.setViewport(session.document.id, actualPixels(session.document, screen));
    }
  }

  /** Step to the next preset zoom, about `anchor` (screen space) or the viewport centre. */
  zoomStep(direction: 1 | -1, anchor?: Point): void {
    const session = this.store.getSession();
    if (!session) return;
    this.zoomTo(nextZoomStep(session.viewport.zoom, direction), anchor);
  }

  zoomTo(zoom: number, anchor?: Point): void {
    const session = this.store.getSession();
    if (!session) return;
    const screen = this.viewportSize.get();
    const center = anchor ?? { x: screen.width / 2, y: screen.height / 2 };
    this.store.setViewport(session.document.id, zoomAt(session.viewport, zoom, center));
  }

  // ---------------------------------------------------------------- persistence

  async refreshRecentProjects(): Promise<void> {
    try {
      const recent = await this.storage.list();
      this.status.update((s) => ({ ...s, recentProjects: recent }));
    } catch (error) {
      if (error instanceof StorageError && error.code === "unavailable") {
        this.fallBackToMemory();
        this.status.update((s) => ({ ...s, recentProjects: [] }));
        return;
      }
      this.logger.warn("listing projects failed", describeError(error));
      this.status.update((s) => ({ ...s, recentProjects: [] }));
      this.notify(
        "error",
        error instanceof StorageError ? error.message : "Could not list local projects.",
      );
    }
  }

  /** Save a document to local storage. Saves of the same document are serialized. */
  save(documentId = this.store.getState().activeDocumentId): Promise<Result> {
    if (!documentId) return Promise.resolve({ ok: false, error: "No document is open." });
    const previous = this.saveQueues.get(documentId) ?? Promise.resolve();
    const run = previous.then(() => this.saveNow(documentId));
    const tail = run.then(
      () => undefined,
      () => undefined,
    );
    this.saveQueues.set(documentId, tail);
    void tail.then(() => {
      if (this.saveQueues.get(documentId) === tail) this.saveQueues.delete(documentId);
    });
    return run;
  }

  private async saveNow(documentId: string): Promise<Result> {
    const session = this.store.getSession(documentId);
    if (!session) return { ok: false, error: "The document is no longer open." };
    if (!isDirty(session) && session.savedRevision !== null) return { ok: true };

    const { document, revision } = session;
    try {
      const assets: StoredAsset[] = [];
      for (const assetId of referencedAssetIds(document)) {
        const record = this.assets.get(assetId);
        if (!record) continue;
        // Pixels painted in the editor are PNG-encoded on their first save.
        assets.push({ ...record, blob: await this.assets.getBlob(assetId) });
      }
      await this.storage.save({ document, assets });
      this.store.markSaved(documentId, revision);
      void this.refreshRecentProjects();
      return { ok: true };
    } catch (error) {
      this.logger.warn("saving project failed", describeError(error));
      if (error instanceof StorageError && error.code === "unavailable") this.fallBackToMemory();
      const message = error instanceof StorageError ? error.message : "Saving failed.";
      return this.fail(message);
    }
  }

  async saveAllDirty(): Promise<void> {
    const dirty = this.store.getState().sessions.filter(isDirty);
    await Promise.all(dirty.map((s) => this.save(s.document.id)));
  }

  async openProject(id: string): Promise<Result> {
    if (this.store.getSession(id)) {
      this.store.setActiveDocument(id);
      return { ok: true };
    }
    try {
      const project = await this.storage.load(id);
      for (const asset of project.assets) {
        if (!this.assets.has(asset.id)) this.assets.add(asset);
      }
      this.store.openDocument(project.document, { saved: true });
      if (project.missingAssetIds.length > 0) {
        this.notify(
          "error",
          `${project.missingAssetIds.length} image layer(s) could not be restored — the browser may have cleared part of its storage.`,
        );
      }
      return { ok: true };
    } catch (error) {
      this.logger.warn("opening project failed", describeError(error));
      if (error instanceof StorageError && error.code === "not-found")
        void this.refreshRecentProjects();
      return this.fail(
        error instanceof StorageError ? error.message : "The project could not be opened.",
      );
    }
  }

  async deleteProject(id: string): Promise<Result> {
    if (this.store.getSession(id)) {
      return this.fail("Close the document before deleting it from this browser.");
    }
    try {
      await this.storage.delete(id);
      await this.refreshRecentProjects();
      return { ok: true };
    } catch (error) {
      this.logger.warn("deleting project failed", describeError(error));
      return this.fail(
        error instanceof StorageError ? error.message : "The project could not be deleted.",
      );
    }
  }

  /** Close a tab. Unsaved changes are written locally first so closing never loses work. */
  async closeDocument(documentId: string): Promise<Result> {
    const session = this.store.getSession(documentId);
    if (!session) return { ok: true };
    if (isDirty(session)) {
      const saved = await this.save(documentId);
      if (!saved.ok) return saved;
    }
    this.store.closeDocument(documentId);
    this.collectUnusedAssets();
    return { ok: true };
  }

  get storageKind(): ProjectStorage["kind"] {
    return this.storage.kind;
  }

  // ---------------------------------------------------------------- text editing

  /** Open the on-canvas text editor for a new or existing text layer. */
  beginTextEdit(request: TextEditRequest): void {
    if (this.textEdit.get()) this.commitTextEdit();
    const session = this.store.getSession();
    if (!session) return;
    const { colors, toolSettings } = this.store.getState();
    if (request.mode === "edit") {
      const layer = session.document.layers.find((l) => l.id === request.layerId);
      if (layer?.kind !== "text") return;
      this.textEdit.set({
        documentId: session.document.id,
        layerId: layer.id,
        text: layer.text,
        style: {
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize,
          fontWeight: layer.fontWeight,
          italic: layer.italic,
          color: layer.color,
          align: layer.align,
          lineHeight: layer.lineHeight,
          letterSpacing: layer.letterSpacing,
        },
        transform: layer.transform,
      });
    } else {
      this.textEdit.set({
        documentId: session.document.id,
        layerId: null,
        text: "",
        style: { ...toolSettings.text, color: colors.foreground },
        transform: { x: request.at.x, y: request.at.y, scaleX: 1, scaleY: 1, rotation: 0 },
      });
    }
    this.tools.revision.update((n) => n + 1);
  }

  updateTextDraft(patch: { text?: string; style?: Partial<TextStyle> }): void {
    const edit = this.textEdit.get();
    if (!edit) return;
    this.textEdit.set({
      ...edit,
      text: patch.text ?? edit.text,
      style: patch.style ? { ...edit.style, ...patch.style } : edit.style,
    });
  }

  /** Apply the typed text: create, update or (if emptied) delete the text layer. */
  commitTextEdit(): void {
    const edit = this.textEdit.get();
    if (!edit) return;
    this.textEdit.set(null);
    this.tools.revision.update((n) => n + 1);
    const text = edit.text.replace(/\s+$/, "");
    let result;
    if (edit.layerId === null) {
      if (!text) return;
      const layer = createTextLayer({
        text,
        x: edit.transform.x,
        y: edit.transform.y,
        style: edit.style,
      });
      result = this.store.dispatch(addLayer(layer, "New Text"), edit.documentId);
    } else if (!text) {
      result = this.store.dispatch(deleteLayer(edit.layerId), edit.documentId);
    } else {
      result = this.store.dispatch(
        updateTextLayer(edit.layerId, { text, ...edit.style }, "Edit Text"),
        edit.documentId,
      );
      this.store.sealHistory(edit.documentId);
    }
    if (!result.ok) this.notify("error", result.error);
  }

  cancelTextEdit(): void {
    if (!this.textEdit.get()) return;
    this.textEdit.set(null);
    this.tools.revision.update((n) => n + 1);
  }

  // ---------------------------------------------------------------- export

  /** Flatten the active document into an image file. Nothing leaves the browser. */
  async exportActive(
    options: ExportOptions,
  ): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; error: string }> {
    if (this.textEdit.get()) this.commitTextEdit();
    const session = this.store.getSession();
    if (!session) return this.fail("No document is open.");
    try {
      const blob = await exportDocument(
        session.document,
        this.assets,
        this.sizer,
        options,
        this.createSurface,
      );
      return { ok: true, blob, filename: exportFilename(session.document.name, options.format) };
    } catch (error) {
      this.logger.warn("export failed", describeError(error));
      return this.fail(error instanceof ExportError ? error.message : "Export failed.");
    }
  }

  // ---------------------------------------------------------------- memory

  /**
   * Keep decoded pixels for open documents and their undo history under the budget by dropping
   * the oldest undo steps (ADR-0007). The current state of every document is always kept.
   */
  enforcePixelBudget(): void {
    const sessions = () => this.store.getState().sessions;
    const total = () => this.assets.estimateBytes(sessions().flatMap(sessionAssetIds));
    let trimmed = 0;
    while (total() > this.pixelBudgetBytes) {
      const candidate = [...sessions()].sort(
        (a, b) => b.history.past.length - a.history.past.length,
      )[0];
      if (!candidate || candidate.history.past.length === 0) break;
      this.store.trimHistory(candidate.document.id, 1);
      trimmed++;
    }
    this.collectUnusedAssets();
    if (trimmed > 0) {
      this.logger.info("trimmed undo history for memory", { steps: trimmed });
    }
  }

  // ---------------------------------------------------------------- internals

  private scheduleAutosave(): void {
    if (this.autosaveDelayMs <= 0) return;
    const anyDirty = this.store.getState().sessions.some(isDirty);
    if (!anyDirty) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      void this.saveAllDirty();
    }, this.autosaveDelayMs);
  }

  /** Release assets no open document — including its undo/redo history — references. */
  private collectUnusedAssets(): void {
    const keep = new Set<string>();
    const addAll = (ids: string[]) => ids.forEach((id) => keep.add(id));
    for (const session of this.store.getState().sessions) {
      addAll(sessionAssetIds(session));
    }
    this.assets.retainOnly(keep);
  }

  private fallBackToMemory(): void {
    if (this.storage.kind === "memory") return;
    this.storage = new MemoryProjectStorage();
    this.status.update((s) => ({ ...s, storagePersistent: false }));
    this.notify(
      "error",
      "This browser is not allowing local storage (private mode?). Your work will be lost when you close the tab.",
    );
  }

  private fail(error: string): { ok: false; error: string } {
    this.notify("error", error);
    return { ok: false, error };
  }
}

function sessionAssetIds(session: DocumentSession): string[] {
  const ids = referencedAssetIds(session.document);
  for (const entry of [...session.history.past, ...session.history.future]) {
    ids.push(...referencedAssetIds(entry.before), ...referencedAssetIds(entry.after));
  }
  return ids;
}
