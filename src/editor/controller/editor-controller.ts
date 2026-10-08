import { describeError, silentLogger, type Logger } from "@/lib/logging/logger";
import { AssetStore, type BitmapDecoder } from "../assets/asset-store";
import { addLayer, type Command } from "../core/commands";
import { EditorStore, isDirty, type DocumentSession } from "../core/editor-store";
import {
  createDocument,
  createFillLayer,
  createRasterLayer,
  DocumentError,
  nextLayerName,
  type NewDocumentOptions,
} from "../core/document/factory";
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
import { baseName, importRasterFile } from "../formats/raster/raster-import";
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

export interface EditorControllerOptions {
  storage: ProjectStorage;
  decode: BitmapDecoder;
  logger?: Logger;
  /** Idle time after the last edit before autosaving. 0 disables autosave. */
  autosaveDelayMs?: number;
  clock?: () => number;
}

export const DEFAULT_AUTOSAVE_DELAY_MS = 1500;
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

  private storage: ProjectStorage;
  private readonly decode: BitmapDecoder;
  private readonly logger: Logger;
  private readonly autosaveDelayMs: number;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly saveQueues = new Map<string, Promise<void>>();
  private readonly unsubscribe: () => void;

  constructor(options: EditorControllerOptions) {
    this.store = new EditorStore(options.clock);
    this.assets = new AssetStore(options.decode);
    this.storage = options.storage;
    this.decode = options.decode;
    this.logger = options.logger ?? silentLogger;
    this.autosaveDelayMs = options.autosaveDelayMs ?? DEFAULT_AUTOSAVE_DELAY_MS;
    this.status = new Observable<AppStatus>({
      recentProjects: null,
      storagePersistent: options.storage.persistent,
      notices: [],
    });
    this.unsubscribe = this.store.subscribe(() => {
      this.initializeViewport();
      this.scheduleAutosave();
    });
  }

  dispose(): void {
    this.unsubscribe();
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
    const assets: StoredAsset[] = [];
    for (const assetId of referencedAssetIds(document)) {
      const record = this.assets.get(assetId);
      if (record) assets.push(record);
    }
    try {
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

  private fail(error: string): Result {
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
