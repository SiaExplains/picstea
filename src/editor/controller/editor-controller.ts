import { describeError, silentLogger, type Logger } from "@/lib/logging/logger";
import type { LayerMask } from "../core/document/types";
import { walkLayers } from "../core/document/tree";
import { MAX_DOCUMENT_NAME_LENGTH, transformCanvas } from "../core/commands/document-commands";
import type { Matrix } from "../core/geometry/matrix";
import { AUTO_NAMES, autoLevels, type AutoKind } from "../adjustments/auto";
import {
  canvasOpLabel,
  canvasTransform,
  transformRect,
  type CanvasOp,
} from "../core/geometry/canvas-transform";
import { trimBounds } from "../selection/derive";
import {
  maskedPixels,
  similarSelection,
  strokeArea,
  type StrokeLocation,
} from "../selection/derive";
import { AssetStore, type BitmapDecoder, type BitmapEncoder } from "../assets/asset-store";
import {
  addLayer,
  addLayerMask,
  cropDocument,
  createGroup,
  deselect,
  invertSelectionCommand,
  modifySelection,
  selectAllCommand,
  setRasterContent,
  setSelection,
  type SelectionModification,
  deleteLayer,
  deleteLayers,
  deleteLayerMask,
  duplicateLayer,
  duplicateLayers,
  groupLayers,
  transformLayers,
  translateLayersEach,
  groupLayer,
  nextGroupName,
  setLayerTransform,
  setMaskEnabled,
  ungroup,
  updateTextLayer,
  CommandError,
  requireUnlocked,
  addGuide,
  clearGuides,
  translateLayer,
  setClipped,
  setVectorMask,
  setWorkPath,
  convertToSmartObject,
  rasterizeLayer,
  mergeDown,
  mergeTarget,
  flattenImage,
  rasterizeLayerStyle,
  setLayerLabel,
  type BakedPixels,
  replaceSmartContent,
  setSmartFilters,
  type Command,
} from "../core/commands";
import { compositeDocument, type CompositeContext } from "../rendering/compositing/compositor";
import { checkDimensions } from "../core/document/limits";
import { pathToSelection, selectionToPath } from "../core/path/trace";
import type { VectorPath } from "../core/path/path";
import { findLayerDeep, locateLayer, topLevelSelection } from "../core/document/tree";
import { pathTargets } from "../tools/pen/path-targets";
import { ALIGN_LABELS, alignDelta, type AlignEdge } from "../core/geometry/snapping";
import {
  MAX_ACTION_STEPS,
  MAX_ACTIONS,
  normalizeActionName,
  parseActionsFile,
  ActionsFormatError,
  type Action,
} from "../automation/actions";
import { stepLabel, type ActionStep } from "../automation/steps";
import { MAX_BATCH_FILES, MAX_BATCH_OUTPUT_BYTES, uniqueEntryName } from "../automation/batch";
import { writeZip, type ZipInput } from "../formats/zip/zip";
import { EXPORT_FORMATS } from "../formats/export/raster-export";
import { DEFAULT_SWATCHES, type Swatch } from "../core/swatches";
import type { RecentSize } from "../core/document/presets";
import type { LayerStylePreset } from "../core/effects/presets";
import { adjustmentDefinition } from "../adjustments/registry";
import type {
  Adjustment,
  AdjustmentType,
  EditorDocument,
  Guide,
  Layer,
  LayerLabel,
  SmartFilter,
  SmartObjectLayer,
  ToneChannel,
} from "../core/document/types";
import { EditorStore, isDirty, selectedLayerIds, type DocumentSession } from "../core/editor-store";
import {
  applyFrameChange,
  distributeDeltas,
  flipMatrix,
  targetsBounds,
  transformTargets,
  DISTRIBUTE_LABELS,
  type DistributeMode,
} from "../core/geometry/multi-transform";
import {
  createDocument,
  createFillLayer,
  createAdjustmentLayer,
  createEmptyRasterLayer,
  createRasterLayer,
  createTextLayer,
  createPathShapeLayer,
  IDENTITY_TRANSFORM,
  DocumentError,
  nextLayerName,
  type NewDocumentOptions,
  type TextStyle,
} from "../core/document/factory";
import type { Transform } from "../core/document/types";
import { activeLayer, findLayer } from "../core/document/queries";
import {
  boundsOf,
  isMovable,
  isTransformable,
  layerCorners,
  layerLocalSize,
  type ContentSizer,
} from "../core/geometry/layer-geometry";
import { flipAboutCenter } from "../core/geometry/transform-handles";
import { referencedAssetIds } from "../core/document/queries";
import { createId } from "../core/ids";
import { Observable } from "../core/observable";
import { DEFAULT_VIEW_SETTINGS, type ViewSettings } from "../core/view-settings";
import {
  actualPixels,
  fitToScreen,
  nextZoomStep,
  zoomAt,
  type Point,
  type Size,
} from "../core/viewport/viewport";
import { FormatError } from "../formats/binary/bytes";
import type { ExportRequest } from "../formats/export/document-export";
import { ColorRangeSession, exportFile } from "../workers/offthread";
import { exportFilename, ExportError, safeFilename } from "../formats/export/raster-export";
import { rgbaToSurface } from "../formats/layer-render";
import { detectFileKind } from "../formats/open-file";
import {
  PROJECT_EXTENSION,
  readProjectFile,
  writeProjectFile,
} from "../formats/project/project-file";
import { psdToDocument } from "../formats/psd/psd-convert";
import { svgPixelSize } from "../formats/svg/svg-import";
import { MAX_IMPORT_FILE_BYTES } from "../core/document/limits";
import { baseName, importRasterFile } from "../formats/raster/raster-import";
import type { SurfaceFactory } from "../rendering/canvas/canvas2d-renderer";
import { estimateTextSizer } from "../rendering/text/text-layout";
import type { TextEditRequest } from "../tools/tool";
import { hexToRgb } from "../core/color";
import type { RasterLayer } from "../core/document/types";
import {
  context2d,
  copySelectedPixels,
  layerSelectionCoverage,
  readLayerPixels,
  readPixelsBelow,
  paintRasterLayer,
  readPixels,
  samplePixel,
  releaseSurface,
  selectionFill,
  selectionSurface,
  type Surface,
} from "../pixels/layer-pixels";
import type { RgbaPixels } from "../selection/flood";
import { createSelection, selectionBytes, type SelectionMask } from "../selection/mask";
import { mainThreadRunner, type JobRunner } from "../workers/job-runner";
import {
  filterById,
  scaleFilterValues,
  type FilterId,
  type FilterValues,
} from "../filters/registry";
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
  /**
   * Render SVG bytes to pixels at the given size through the browser's image decoder (never the
   * DOM). Without it SVG files cannot be opened.
   */
  rasterizeSvg?: (svg: Blob, width: number, height: number) => Promise<CanvasImageSource>;
  /** Runs CPU-heavy jobs (PSD, flood fill) off the UI thread; inline by default. */
  jobs?: JobRunner;
  /** Estimated decoded-pixel budget for open documents and their undo history, in bytes. */
  pixelBudgetBytes?: number;
  logger?: Logger;
  /** Idle time after the last edit before autosaving. 0 disables autosave. */
  autosaveDelayMs?: number;
  clock?: () => number;
}

export const DEFAULT_AUTOSAVE_DELAY_MS = 1500;
export const DEFAULT_PIXEL_BUDGET_BYTES = 768 * 1024 * 1024;
const MB = 1024 * 1024;

/**
 * Decoded-pixel budget for open documents and their undo history, from the device's memory
 * (`navigator.deviceMemory`, in GB, when the browser reports it): a quarter of it, between
 * 256 MB and 1.5 GB. Unknown devices get the default (ADR-0012).
 */
export function pixelBudgetFor(deviceMemoryGb: number | undefined): number {
  if (!deviceMemoryGb || !Number.isFinite(deviceMemoryGb) || deviceMemoryGb <= 0) {
    return DEFAULT_PIXEL_BUDGET_BYTES;
  }
  return Math.round(Math.min(1536 * MB, Math.max(256 * MB, (deviceMemoryGb * 1024 * MB) / 4)));
}

export { ALIGN_LABELS };

/** Filter previews run on at most this many pixels (larger layers are previewed reduced). */
const FILTER_PREVIEW_PIXELS = 2_000_000;

interface FilterSession {
  readonly documentId: string;
  readonly layer: RasterLayer;
  /** Preview resolution relative to the layer. */
  readonly scale: number;
  readonly pixels: RgbaPixels;
  readonly coverage: Uint8Array | null;
  readonly seed: number;
  surface: Surface | null;
}

/** Documents above this many pixels get a short "large image" note when opened. */
export const LARGE_DOCUMENT_PIXELS = 16_000_000;

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
  /** A long-running operation in progress ("Opening…"), for the progress overlay. */
  readonly busy = new Observable<string | null>(null);
  /** True while the canvas shows a quick, lower-resolution render that will be sharpened. */
  readonly refining = new Observable(false);
  /** Rulers, guides, grid and snapping preferences (the UI persists them). */
  readonly view = new Observable<ViewSettings>(DEFAULT_VIEW_SETTINGS);
  /** Colour swatches (the UI persists them). */
  readonly swatches = new Observable<readonly Swatch[]>(DEFAULT_SWATCHES);
  /** Recorded actions (the UI persists them, ADR-0018). */
  readonly actions = new Observable<readonly Action[]>([]);
  /** Sizes of recently created documents, most recent first (the UI persists them). */
  readonly recentSizes = new Observable<readonly RecentSize[]>([]);
  /** Layer styles saved with New Style… (the UI persists them, ADR-0030). */
  readonly layerStyles = new Observable<readonly LayerStylePreset[]>([]);
  /** The action being recorded into. */
  readonly recording = new Observable<string | null>(null);
  /** The action being played. */
  readonly playing = new Observable<string | null>(null);
  readonly sizer: ContentSizer;
  readonly createSurface: SurfaceFactory;

  private storage: ProjectStorage;
  private readonly decode: BitmapDecoder;
  private readonly rasterizeSvg: EditorControllerOptions["rasterizeSvg"];
  readonly jobs: JobRunner;
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
    this.rasterizeSvg = options.rasterizeSvg;
    this.jobs = options.jobs ?? mainThreadRunner;
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
      jobs: this.jobs,
      notify: (kind, message) => this.notify(kind, message),
      pixelsCommitted: () => this.enforcePixelBudget(),
      beginTextEdit: (request) => this.beginTextEdit(request),
      view: () => this.view.get(),
      screenSize: () => this.viewportSize.get(),
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
    this.jobs.dispose();
    this.tools.dispose();
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
  }

  // ---------------------------------------------------------------- notices

  notify(kind: NoticeKind, message: string): void {
    if (kind === "error") this.errorCount++;
    const notice: Notice = { id: createId("notice"), kind, message };
    this.status.update((s) => ({ ...s, notices: [...s.notices, notice].slice(-MAX_NOTICES) }));
  }

  dismissNotice(id: string): void {
    this.status.update((s) => ({ ...s, notices: s.notices.filter((n) => n.id !== id) }));
  }

  // ---------------------------------------------------------------- editing

  /** Open a document in a new tab, with a note when it is very large. */
  private openSession(
    doc: EditorDocument,
    options: { saved?: boolean; transient?: boolean } = {},
  ): void {
    // Batch documents: processed and closed, never autosaved or stored.
    if (options.transient) this.transientDocuments.add(doc.id);
    this.store.openDocument(doc, options);
    const megapixels = (doc.width * doc.height) / 1_000_000;
    if (doc.width * doc.height > LARGE_DOCUMENT_PIXELS) {
      this.notify(
        "info",
        `Large image (${megapixels.toFixed(0)} MP): editing stays responsive, but exports and some tools take a moment, and fewer undo steps are kept.`,
      );
    }
  }

  /** Show the progress overlay while `run` works (only if it takes more than a moment). */
  private async withBusy<T>(label: string, run: () => Promise<T>): Promise<T> {
    const timer = setTimeout(() => this.busy.set(label), 150);
    try {
      return await run();
    } finally {
      clearTimeout(timer);
      this.busy.set(null);
    }
  }

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
      this.openSession(createDocument(options));
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
    if (this.execute(addLayer(layer, "New Layer"))) this.record({ type: "newLayer" });
  }

  // ---------------------------------------------------------------- groups, masks, adjustments

  /** Add an empty group above the active layer. */
  addGroup(): void {
    const session = this.store.getSession();
    if (!session) return;
    this.execute(addLayer(createGroup(nextGroupName(session.document)), "New Group"));
  }

  /** The selected layers of the active document (ADR-0020), the active layer included. */
  selectedLayers(): readonly string[] {
    return selectedLayerIds(this.store.getSession());
  }

  /** Put the selected layers into a new group (Mod+G). */
  groupActiveLayer(): void {
    const session = this.store.getSession();
    const ids = this.selectedLayers();
    if (!session || ids.length === 0) return;
    const group = createGroup(nextGroupName(session.document));
    this.execute(ids.length > 1 ? groupLayers(ids, group) : groupLayer(ids[0], group));
  }

  /** Delete the selected layers (Layer → Delete Layer). */
  deleteSelectedLayers(): void {
    const ids = this.selectedLayers();
    if (ids.length === 0) return;
    this.execute(ids.length > 1 ? deleteLayers(ids) : deleteLayer(ids[0]));
  }

  /** Dissolve the active group (Mod+Shift+G). */
  ungroupActiveLayer(): void {
    const session = this.store.getSession();
    const layer = session ? activeLayer(session.document) : undefined;
    if (layer) this.execute(ungroup(layer.id));
  }

  /** Add a mask to the active layer; with a selection, the mask reveals only the selection. */
  addMaskToActiveLayer(): void {
    const session = this.store.getSession();
    const layer = session ? activeLayer(session.document) : undefined;
    if (!session || !layer) return;
    const selection = session.document.selection;
    let command = addLayerMask(layer.id);
    if (selection && !layer.mask) {
      const surface = this.createSurface(selection.width, selection.height);
      context2d(surface).drawImage(selectionSurface(this, selection), 0, 0);
      const asset = this.assets.addBitmap(surface, selection.width, selection.height);
      command = addLayerMask(layer.id, asset.id, "Mask from Selection");
    }
    if (this.execute(command)) {
      this.store.setEditTarget("mask");
      this.enforcePixelBudget();
    }
  }

  deleteActiveMask(): void {
    const session = this.store.getSession();
    const layer = session ? activeLayer(session.document) : undefined;
    if (!layer) return;
    this.execute(deleteLayerMask(layer.id));
    this.store.setEditTarget("content");
  }

  toggleActiveMask(): void {
    const session = this.store.getSession();
    const layer = session ? activeLayer(session.document) : undefined;
    if (layer?.mask) this.execute(setMaskEnabled(layer.id, !layer.mask.enabled));
  }

  /** Add an adjustment layer (with a reveal-all mask) above the active layer. */
  addAdjustmentLayer(type: AdjustmentType, settings?: Adjustment): void {
    const session = this.store.getSession();
    if (!session) return;
    const def = adjustmentDefinition(type);
    const adjustment = settings?.type === type ? settings : def.defaults;
    const layer = createAdjustmentLayer(session.document, adjustment, def.label);
    if (!this.execute(addLayer(layer, `New ${def.label}`))) return;
    // The step takes the layer's final settings when recording stops.
    const step: ActionStep = { type: "adjustment", adjustment };
    this.adjustmentSources.set(step, { documentId: session.document.id, layerId: layer.id });
    this.record(step);
  }

  // ---------------------------------------------------------------- selection (ADR-0010)

  /** Selection last removed by Deselect, per document, for Select → Reselect. */
  private readonly lastSelection = new Map<string, SelectionMask>();

  selectAll(): void {
    this.recordIfOk({ type: "select", op: "all" }, () => this.execute(selectAllCommand()));
  }

  deselect(): void {
    const session = this.store.getSession();
    const selection = session?.document.selection;
    if (!session || !selection) return;
    this.lastSelection.set(session.document.id, selection);
    if (this.execute(deselect())) this.record({ type: "select", op: "deselect" });
  }

  reselect(): void {
    const session = this.store.getSession();
    const last = session && this.lastSelection.get(session.document.id);
    if (!session || !last) return;
    const { width, height } = session.document;
    if (last.width !== width || last.height !== height) return;
    this.execute(setSelection(last, "Reselect"));
  }

  canReselect(): boolean {
    const session = this.store.getSession();
    return !!session && this.lastSelection.has(session.document.id);
  }

  invertSelection(): void {
    this.recordIfOk({ type: "select", op: "inverse" }, () =>
      this.execute(invertSelectionCommand()),
    );
  }

  modifySelection(kind: SelectionModification, radius: number): Result {
    const result = this.store.dispatch(modifySelection(kind, radius));
    if (!result.ok) return { ok: false, error: result.error };
    this.record({ type: "modifySelection", kind, radius });
    if (result.changed && !this.store.getSession()?.document.selection) {
      this.notify("info", "Nothing is left selected.");
    }
    this.enforcePixelBudget();
    return { ok: true };
  }

  /**
   * The selection Select → Color Range would make (pixels near `color`), for the dialog preview.
   * The image is drawn once per document state (in the worker when it can, ADR-0022); slider
   * steps only re-run the colour test. Null while the image is still loading.
   */
  colorRangePreview(
    color: string,
    fuzziness: number,
    sampleAll: boolean,
  ): Promise<SelectionMask | null> {
    const doc = this.store.getSession()?.document;
    if (!doc) return Promise.resolve(null);
    const layer = sampleAll ? undefined : activeLayer(doc);
    const [r, g, b] = hexToRgb(color);
    return this.colorRange.preview(doc, layer, [r, g, b, 255], fuzziness);
  }

  private readonly colorRange = new ColorRangeSession(this, (doc, layer) =>
    readPixels(this, doc, layer),
  );

  /** Free the pixels Color Range kept while its dialog was open. */
  endColorRange(): void {
    this.colorRange.end();
  }

  applySelection(mask: SelectionMask | null, label: string): void {
    this.colorRange.end();
    this.execute(setSelection(mask, label));
    this.enforcePixelBudget();
  }

  transformSelection(): void {
    this.tools.beginSelectionTransform();
  }

  cropToSelection(): void {
    const bounds = this.store.getSession()?.document.selection?.bounds;
    if (!bounds) {
      if (this.playing.get()) this.notify("error", "Make a selection first.");
      return;
    }
    this.recordIfOk({ type: "cropToSelection" }, () => this.execute(cropDocument(bounds)));
  }

  /**
   * Histogram of what an adjustment layer receives (the image beneath it), computed on a
   * reduced copy in the worker. Null while images are loading.
   */
  async adjustmentHistogram(layerId: string, channel: ToneChannel): Promise<Uint32Array | null> {
    const doc = this.store.getSession()?.document;
    if (!doc) return null;
    const pixels = readPixelsBelow(this, doc, layerId);
    if (!pixels) return null;
    return this.jobs.run("histogram", { pixels, channel }, [pixels.data.buffer]);
  }

  // ---------------------------------------------------------------- smart objects (ADR-0016)

  /**
   * Open Edit Contents tabs: child document id → the smart object it edits. These tabs are never
   * stored as projects; saving one (Mod+S, autosave, closing it) applies it to the parent layer.
   */
  private readonly smartChildren = new Map<
    string,
    { parentId: string; layerId: string; contentId: string; contentName: string; mergeKey: string }
  >();

  /** Is this tab an Edit Contents tab (for the UI)? */
  isSmartChild(documentId: string): boolean {
    return this.smartChildren.has(documentId);
  }

  /** Layer → Convert to Smart Object. */
  convertToSmartObject(): void {
    const doc = this.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (!doc || !layer) return;
    if (layer.kind === "fill" || layer.kind === "adjustment") {
      this.notify("error", "Fill and adjustment layers can't become smart objects.");
      return;
    }
    this.execute(convertToSmartObject(layer.id, boundsOf(layerCorners(layer, doc, this.sizer))));
  }

  /** Layer → Edit Contents: open the smart object's document in its own tab. */
  editSmartContents(layerId?: string): void {
    const session = this.store.getSession();
    const doc = session?.document;
    const layer = doc ? (layerId ? findLayer(doc, layerId) : activeLayer(doc)) : undefined;
    if (!session || !doc || layer?.kind !== "smart") {
      this.notify("info", "Select a smart object to edit its contents.");
      return;
    }
    for (const [childId, link] of this.smartChildren) {
      if (link.parentId === doc.id && link.layerId === layer.id) {
        this.store.setActiveDocument(childId);
        return;
      }
    }
    const child: EditorDocument = {
      ...layer.content,
      id: createId("document"),
      name: `${layer.name} (Smart Object)`,
    };
    this.smartChildren.set(child.id, {
      parentId: doc.id,
      layerId: layer.id,
      contentId: layer.content.id,
      contentName: layer.content.name,
      mergeKey: `smart:${child.id}`,
    });
    this.store.openDocument(child, { saved: true });
  }

  /** Apply an Edit Contents tab to its smart object (the child's "save"). */
  private applySmartChild(childId: string): Result {
    const link = this.smartChildren.get(childId);
    const child = this.store.getSession(childId);
    if (!link || !child) return { ok: true };
    const parent = this.store.getSession(link.parentId);
    const layer = parent && findLayer(parent.document, link.layerId);
    if (!parent || layer?.kind !== "smart") {
      return this.fail(
        "The smart object this tab belongs to no longer exists. Use File → Save Project As… to keep these contents.",
      );
    }
    const content: EditorDocument = {
      ...child.document,
      id: link.contentId,
      name: link.contentName,
    };
    const result = this.store.dispatch(
      replaceSmartContent(link.layerId, content, { mergeKey: link.mergeKey }),
      link.parentId,
    );
    if (!result.ok) return this.fail(result.error);
    this.store.markSaved(childId, child.revision);
    this.scheduleAutosave();
    return { ok: true };
  }

  /** Layer → Rasterize Layer: a smart object, shape or text becomes pixels that look the same. */
  rasterizeActiveLayer(): void {
    const doc = this.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (!doc || !layer) return;
    if (layer.kind !== "smart" && layer.kind !== "shape" && layer.kind !== "text") {
      this.notify("info", "Only smart objects, shapes and text need rasterizing.");
      return;
    }
    const b = boundsOf(layerCorners(layer, doc, this.sizer));
    const x = Math.floor(b.x);
    const y = Math.floor(b.y);
    const width = Math.max(1, Math.ceil(b.x + b.width) - x);
    const height = Math.max(1, Math.ceil(b.y + b.height) - y);
    if (!checkDimensions(width, height).ok) {
      this.notify("error", "This layer is too large to rasterize.");
      return;
    }
    const plain = {
      ...layer,
      opacity: 1,
      blendMode: "normal",
      visible: true,
      mask: undefined,
      vectorMask: undefined,
      effects: undefined,
      clipped: undefined,
    } as Layer;
    const surface = this.createSurface(width, height);
    const result = compositeDocument(
      context2d(surface) as CompositeContext,
      { ...doc, layers: [plain] },
      this.assets,
      {
        sizer: this.sizer,
        createSurface: this.createSurface,
        assetVersion: this.assets.getVersion(),
        space: { x, y, width, height, scale: 1 },
      },
    );
    if (result.pendingAssetIds.length > 0) {
      releaseSurface(surface);
      this.notify("info", "This layer is still loading. Try again in a moment.");
      return;
    }
    const asset = this.assets.addBitmap(surface, width, height);
    this.execute(rasterizeLayer(layer.id, { assetId: asset.id, x, y, width, height }));
    this.enforcePixelBudget();
  }

  /**
   * Render layers (bottom first) into a new pixel asset covering the document and the layers'
   * own bounds. Null — with a notice — while a bitmap is still loading or when too large.
   */
  private bake(doc: EditorDocument, layers: readonly Layer[]): BakedPixels | null {
    let x0 = 0;
    let y0 = 0;
    let x1 = doc.width;
    let y1 = doc.height;
    for (const layer of layers) {
      if (layer.kind === "group" || layer.kind === "adjustment" || layer.kind === "fill") continue;
      const b = boundsOf(layerCorners(layer, doc, this.sizer));
      x0 = Math.min(x0, Math.floor(b.x));
      y0 = Math.min(y0, Math.floor(b.y));
      x1 = Math.max(x1, Math.ceil(b.x + b.width));
      y1 = Math.max(y1, Math.ceil(b.y + b.height));
    }
    const width = Math.max(1, x1 - x0);
    const height = Math.max(1, y1 - y0);
    if (!checkDimensions(width, height).ok) {
      this.notify("error", "The result would be too large.");
      return null;
    }
    const surface = this.createSurface(width, height);
    const result = compositeDocument(
      context2d(surface) as CompositeContext,
      { ...doc, layers },
      this.assets,
      {
        sizer: this.sizer,
        createSurface: this.createSurface,
        assetVersion: this.assets.getVersion(),
        space: { x: x0, y: y0, width, height, scale: 1 },
      },
    );
    if (result.pendingAssetIds.length > 0) {
      releaseSurface(surface);
      this.notify("info", "A layer is still loading. Try again in a moment.");
      return null;
    }
    const asset = this.assets.addBitmap(surface, width, height);
    return { assetId: asset.id, x: x0, y: y0, width, height };
  }

  /** Layer → Merge Down: the active layer drawn onto the one below it. */
  mergeActiveDown(): void {
    const doc = this.store.getSession()?.document;
    const upper = doc ? activeLayer(doc) : undefined;
    const lower = doc && upper ? mergeTarget(doc, upper.id) : null;
    if (!doc || !upper || !lower) {
      this.notify("info", "Select a layer with a pixel, shape or text layer below it.");
      return;
    }
    // The lower layer's own opacity and blend mode stay on the result (as in Photoshop).
    const base = { ...lower, opacity: 1, blendMode: "normal", visible: true, clipped: undefined };
    const pixels = this.bake(doc, [base as Layer, { ...upper, visible: upper.visible }]);
    if (!pixels) return;
    this.execute(mergeDown(upper.id, pixels));
    this.enforcePixelBudget();
  }

  /** Layer → Flatten Image: every visible layer as one pixel layer; hidden layers are dropped. */
  flattenImage(): void {
    const doc = this.store.getSession()?.document;
    if (!doc || doc.layers.length === 0) return;
    const pixels = this.bake(doc, doc.layers);
    if (!pixels) return;
    this.execute(flattenImage(pixels, createId("layer")));
    this.enforcePixelBudget();
  }

  /** Layer → Rasterize Layer Style: the active layer's effects baked into its pixels. */
  rasterizeActiveLayerStyle(): void {
    const doc = this.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (!doc || !layer?.effects) return;
    const plain = { ...layer, opacity: 1, blendMode: "normal", visible: true, clipped: undefined };
    const pixels = this.bake(doc, [plain as Layer]);
    if (!pixels) return;
    this.execute(rasterizeLayerStyle(layer.id, pixels));
    this.enforcePixelBudget();
  }

  /** Select Pixels: a selection from the active layer's transparency (Cmd-click a thumbnail). */
  selectLayerPixels(layerId?: string): void {
    const doc = this.store.getSession()?.document;
    const layer = doc ? (layerId ? findLayer(doc, layerId) : activeLayer(doc)) : undefined;
    if (!doc || !layer) return;
    const plain = { ...layer, opacity: 1, blendMode: "normal", effects: undefined } as Layer;
    const pixels = readPixels(this, doc, plain);
    if (!pixels) {
      this.notify("info", "This layer is still loading. Try again in a moment.");
      return;
    }
    const alpha = new Uint8Array(doc.width * doc.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = pixels.data[i * 4 + 3];
    const mask = createSelection(doc.width, doc.height, alpha);
    this.applySelection(mask.bounds ? mask : null, "Select Pixels");
  }

  /** The visible colour at a document point (Color Sampler); null while a layer is loading. */
  sampleColor(x: number, y: number): readonly [number, number, number, number] | null {
    const doc = this.store.getSession()?.document;
    return doc ? samplePixel(this, doc, x, y) : null;
  }

  /** Colour-label the selected layers (null clears it). */
  setSelectedLayersLabel(label: LayerLabel | null): void {
    const ids = this.selectedLayers();
    if (ids.length > 0) this.execute(setLayerLabel(ids, label));
  }

  /** File → Place Embedded…: an image, SVG, PSD or project as a smart object, centred. */
  placeEmbedded(file: Blob, filename: string): Promise<Result> {
    return this.withBusy("Placing…", () => this.placeEmbeddedNow(file, filename));
  }

  private async placeEmbeddedNow(file: Blob, filename: string): Promise<Result> {
    const session = this.store.getSession();
    if (!session) return this.openFile(file, filename);
    const documentId = session.document.id;
    if (file.size > MAX_IMPORT_FILE_BYTES) return this.fail("This file is too large to place.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectFileKind(bytes);
    const name = baseName(filename);
    try {
      let content: EditorDocument;
      const single = (layer: Layer, width: number, height: number) => {
        const doc = createDocument({ name, width, height, background: { kind: "transparent" } });
        return { ...doc, layers: [layer], activeLayerId: layer.id };
      };
      switch (kind.kind) {
        case "unsupported":
          return this.fail(kind.message);
        case "raster": {
          const result = await importRasterFile(file, this.decode);
          if (!result.ok) return this.fail(result.error);
          const { image } = result;
          const asset = this.assets.add(
            { mime: image.mime, width: image.width, height: image.height, blob: image.blob },
            image.bitmap,
          );
          const layer = createRasterLayer({
            assetId: asset.id,
            width: image.width,
            height: image.height,
            name,
          });
          content = single(layer, image.width, image.height);
          break;
        }
        case "svg": {
          const layer = await this.svgLayer(bytes, name);
          content = single(layer, layer.width, layer.height);
          break;
        }
        case "psd": {
          const { file: psd, warnings } = await this.jobs.run("psdRead", bytes, [bytes.buffer]);
          const imported = psdToDocument(this, psd, name, warnings);
          this.reportWarnings("Placed with changes", imported.warnings);
          content = imported.document;
          break;
        }
        case "project": {
          const project = await readProjectFile(bytes, (k) =>
            createId(k === "document" ? "doc" : "asset"),
          );
          for (const asset of project.assets) this.assets.add(asset);
          content = project.document;
          break;
        }
      }
      const current = this.store.getSession(documentId);
      if (!current) return this.fail("The document was closed before the file finished loading.");
      const smart: SmartObjectLayer = {
        id: createId("layer"),
        kind: "smart",
        name,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        transform: {
          ...IDENTITY_TRANSFORM,
          x: Math.round((current.document.width - content.width) / 2),
          y: Math.round((current.document.height - content.height) / 2),
        },
        content,
      };
      const dispatched = this.store.dispatch(addLayer(smart, "Place Embedded"), documentId);
      this.enforcePixelBudget();
      return dispatched.ok ? { ok: true } : this.fail(dispatched.error);
    } catch (error) {
      this.logger.warn("placing embedded file failed", describeError(error));
      return this.fail(
        error instanceof FormatError ? error.message : "The file could not be placed.",
      );
    }
  }

  /** Add a smart filter to the active smart object (the Filter menu on smart objects). */
  addSmartFilter(filterId: FilterId, values: FilterValues, mergeKey?: string): string | null {
    const layer = this.activeLayerOrNull();
    if (layer?.kind !== "smart") return null;
    const entry: SmartFilter = {
      id: createId("filter"),
      filterId,
      values,
      enabled: true,
      seed: Math.floor(Math.random() * 2 ** 31),
    };
    const ok = this.execute(
      setSmartFilters(layer.id, [...(layer.filters ?? []), entry], {
        label: `Smart Filter: ${filterById(filterId)?.name ?? filterId}`,
        mergeKey,
      }),
    );
    return ok ? entry.id : null;
  }

  /** Change one smart filter (settings, visibility), or remove it with null. */
  updateSmartFilter(
    layerId: string,
    filterId: string,
    patch: Partial<Pick<SmartFilter, "values" | "enabled">> | null,
    options: { label?: string; mergeKey?: string } = {},
  ): boolean {
    const doc = this.store.getSession()?.document;
    const layer = doc && findLayer(doc, layerId);
    if (layer?.kind !== "smart") return false;
    const filters = layer.filters ?? [];
    const next =
      patch === null
        ? filters.filter((f) => f.id !== filterId)
        : filters.map((f) => (f.id === filterId ? { ...f, ...patch } : f));
    return this.execute(setSmartFilters(layer.id, next, options));
  }

  /** Move a smart filter one step up (applied later) or down (applied earlier). */
  moveSmartFilter(layerId: string, filterId: string, direction: 1 | -1): void {
    const doc = this.store.getSession()?.document;
    const layer = doc && findLayer(doc, layerId);
    if (layer?.kind !== "smart") return;
    const filters = [...(layer.filters ?? [])];
    const i = filters.findIndex((f) => f.id === filterId);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= filters.length) return;
    [filters[i], filters[j]] = [filters[j], filters[i]];
    this.execute(setSmartFilters(layer.id, filters, { label: "Reorder Smart Filters" }));
  }

  // ---------------------------------------------------------------- paths & masks (ADR-0015)

  /** The path that path commands use: the work path, else the active path shape (document space). */
  activePath(): VectorPath | null {
    this.tools.finishPen();
    const doc = this.store.getSession()?.document;
    if (!doc) return null;
    const targets = pathTargets(doc);
    return (
      (targets.find((t) => t.key === "work") ?? targets.find((t) => t.key === "shape"))?.path ??
      null
    );
  }

  /** Select → Make Selection from Path (Mod+Enter): replaces the selection. */
  selectionFromPath(): void {
    // A path still being drawn with the Pen tool is finished first.
    this.tools.finishPen();
    const doc = this.store.getSession()?.document;
    const path = this.activePath();
    if (!doc || !path) {
      this.notify("info", "Draw a path with the Pen tool first.");
      return;
    }
    const mask = pathToSelection(path, doc.width, doc.height);
    this.applySelection(mask.bounds ? mask : null, "Make Selection");
  }

  /** Select → Make Work Path from Selection. */
  workPathFromSelection(tolerance = 1): Result {
    const doc = this.store.getSession()?.document;
    if (!doc?.selection) return this.fail("Make a selection first.");
    const traced = selectionToPath(doc.selection, tolerance);
    if (!traced.ok) {
      return this.fail(
        traced.reason === "empty"
          ? "The selection is too small to make a path."
          : "The selection is too detailed for a path. Try a larger tolerance.",
      );
    }
    this.execute(setWorkPath(traced.path, { label: "Make Work Path" }));
    return { ok: true };
  }

  deleteWorkPath(): void {
    this.execute(setWorkPath(null));
  }

  /** A path shape layer from the work path, with the Shape tool's fill and stroke. */
  shapeFromWorkPath(): void {
    this.tools.finishPen();
    const doc = this.store.getSession()?.document;
    if (!doc?.workPath) return;
    const shape = this.store.getState().toolSettings.shape;
    const layer = createPathShapeLayer({
      path: doc.workPath,
      fill: shape.fillEnabled ? shape.fill : null,
      stroke:
        shape.strokeEnabled || !shape.fillEnabled
          ? { color: shape.stroke, width: shape.strokeWidth }
          : null,
      name: nextLayerName(doc, "Shape"),
    });
    if (layer) this.execute(addLayer(layer, "New Shape"));
  }

  /** Layer → Vector Mask → From Path: the active layer shows only inside the work path. */
  vectorMaskFromPath(): void {
    this.tools.finishPen();
    const doc = this.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    const path = doc?.workPath ?? null;
    if (!layer || !path) {
      this.notify("info", "Draw a work path with the Pen tool (Path mode) first.");
      return;
    }
    this.execute(
      setVectorMask(layer.id, { path, enabled: true, linked: true }, { label: "Add Vector Mask" }),
    );
  }

  deleteVectorMask(): void {
    const layer = this.activeLayerOrNull();
    if (layer?.vectorMask) this.execute(setVectorMask(layer.id, null));
  }

  toggleVectorMask(): void {
    const layer = this.activeLayerOrNull();
    if (!layer?.vectorMask) return;
    this.execute(
      setVectorMask(
        layer.id,
        { ...layer.vectorMask, enabled: !layer.vectorMask.enabled },
        { label: layer.vectorMask.enabled ? "Disable Vector Mask" : "Enable Vector Mask" },
      ),
    );
  }

  /** Layer → Create / Release Clipping Mask (Mod+Alt+G). */
  toggleClipping(): void {
    const doc = this.store.getSession()?.document;
    const layer = this.activeLayerOrNull();
    if (!doc || !layer) return;
    if (!layer.clipped && locateLayer(doc.layers, layer.id)?.index === 0) {
      this.notify("info", "A clipping mask needs a layer below it in the same group.");
      return;
    }
    this.execute(setClipped(layer.id, !layer.clipped));
  }

  private activeLayerOrNull(): Layer | null {
    const doc = this.store.getSession()?.document;
    return (doc && activeLayer(doc)) ?? null;
  }

  // ---------------------------------------------------------------- view, guides, align

  setView(patch: Partial<ViewSettings>): void {
    this.view.update((v) => ({ ...v, ...patch }));
  }

  /** View → New Guide…: position in document pixels. */
  addGuide(orientation: Guide["orientation"], position: number): boolean {
    // A new guide should be visible.
    if (!this.view.get().guides) this.setView({ guides: true });
    return this.execute(addGuide(orientation, position));
  }

  clearGuides(): void {
    this.execute(clearGuides());
  }

  /**
   * Layer → Align: line the active layer up with the selection (when there is one) or the canvas.
   */
  alignActiveLayer(edge: AlignEdge): void {
    const doc = this.store.getSession()?.document;
    const active = doc ? activeLayer(doc) : undefined;
    if (!doc || !active) return;
    const ids = topLevelSelection(doc.layers, this.selectedLayers()).filter((id) => {
      const l = findLayerDeep(doc.layers, id);
      return !!l && isMovable(l);
    });
    // A group selected with its own child: the group is what lines up.
    const layer = ids.length === 1 ? findLayerDeep(doc.layers, ids[0])! : active;
    if (ids.length > 1) {
      // Several layers line up with the pixel selection, or with each other (their bounds).
      const boxes = ids.map((id) =>
        boundsOf(layerCorners(findLayerDeep(doc.layers, id)!, doc, this.sizer)),
      );
      const target =
        doc.selection?.bounds ??
        boundsOf(
          boxes.flatMap((b) => [
            { x: b.x, y: b.y },
            { x: b.x + b.width, y: b.y + b.height },
          ]),
        );
      const round = (v: number) => Math.round(v * 1000) / 1000;
      this.recordIfOk({ type: "align", edge }, () =>
        this.execute(
          translateLayersEach(
            ids.map((layerId, i) => {
              const d = alignDelta(boxes[i], target, edge);
              return { layerId, dx: round(d.x), dy: round(d.y) };
            }),
            ALIGN_LABELS[edge],
          ),
        ),
      );
      return;
    }
    if (!isMovable(layer)) {
      this.notify("error", "This layer covers the whole canvas and cannot be aligned.");
      return;
    }
    const box = boundsOf(layerCorners(layer, doc, this.sizer));
    const target = doc.selection?.bounds ?? { x: 0, y: 0, width: doc.width, height: doc.height };
    const delta = alignDelta(box, target, edge);
    const round = (v: number) => Math.round(v * 1000) / 1000;
    this.recordIfOk({ type: "align", edge }, () =>
      this.execute(
        translateLayer(layer.id, round(delta.x), round(delta.y), { label: ALIGN_LABELS[edge] }),
      ),
    );
  }

  /** Layer → Distribute: spread three or more selected layers evenly. */
  distributeSelectedLayers(mode: DistributeMode): void {
    const doc = this.store.getSession()?.document;
    if (!doc) return;
    const ids = topLevelSelection(doc.layers, this.selectedLayers()).filter((id) => {
      const l = findLayerDeep(doc.layers, id);
      return !!l && isMovable(l);
    });
    if (ids.length < 3) {
      this.notify("error", "Select at least three layers to distribute them.");
      return;
    }
    const boxes = ids.map((id) =>
      boundsOf(layerCorners(findLayerDeep(doc.layers, id)!, doc, this.sizer)),
    );
    const deltas = distributeDeltas(boxes, mode);
    const round = (v: number) => Math.round(v * 1000) / 1000;
    this.recordIfOk({ type: "distribute", mode }, () =>
      this.execute(
        translateLayersEach(
          ids.map((layerId, i) => ({
            layerId,
            dx: round(deltas[i].x),
            dy: round(deltas[i].y),
          })),
          DISTRIBUTE_LABELS[mode],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------- filters (ADR-0014)

  /** The filter applied last, for Filter → Last Filter. */
  readonly lastFilter = new Observable<{ id: FilterId; values: FilterValues } | null>(null);
  private filterSession: FilterSession | null = null;
  private filterSeq = 0;

  /** The active layer when a filter can run on it; otherwise a notice and null. */
  private filterableLayer(): RasterLayer | null {
    const doc = this.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (!doc || !layer) {
      this.notify("error", "Select a layer first.");
      return null;
    }
    if (layer.kind !== "raster") {
      this.notify("error", "Filters work on pixel layers. Select a pixel layer and try again.");
      return null;
    }
    try {
      requireUnlocked(layer, doc);
    } catch (error) {
      if (!(error instanceof CommandError)) throw error;
      this.notify("error", error.message);
      return null;
    }
    if (!layer.assetId) {
      this.notify("info", "This layer is empty. Paint or place an image on it first.");
      return null;
    }
    if (!this.assets.getBitmap(layer.assetId)) {
      this.notify("info", "This layer is still loading. Try again in a moment.");
      return null;
    }
    return layer;
  }

  /** Start a filter dialog on the active layer (prepares a reduced preview). */
  beginFilter(): boolean {
    this.endFilter();
    const layer = this.filterableLayer();
    const doc = this.store.getSession()?.document;
    if (!layer || !doc) return false;
    const scale = Math.min(1, Math.sqrt(FILTER_PREVIEW_PIXELS / (layer.width * layer.height)));
    const pixels = readLayerPixels(this, layer, scale);
    if (!pixels) return false;
    this.filterSession = {
      documentId: doc.id,
      layer,
      scale,
      pixels,
      coverage: doc.selection ? layerSelectionCoverage(this, layer, doc.selection, scale) : null,
      seed: Math.floor(Math.random() * 2 ** 31),
      surface: null,
    };
    return true;
  }

  /** Show the filter's result on the canvas (debounce in the caller; stale results are dropped). */
  async previewFilter(id: FilterId, values: FilterValues): Promise<void> {
    const session = this.filterSession;
    const filter = filterById(id);
    if (!session || !filter) return;
    const seq = ++this.filterSeq;
    try {
      const out = await this.jobs.run("filter", {
        pixels: session.pixels,
        filterId: id,
        values: scaleFilterValues(filter, values, session.scale),
        seed: session.seed,
        coverage: session.coverage,
      });
      if (seq !== this.filterSeq || this.filterSession !== session) return;
      const surface = rgbaToSurface(this, out.data, out.width, out.height);
      releaseSurface(session.surface);
      session.surface = surface;
      this.tools.previewLayerPixels(session.layer.id, surface);
    } catch (error) {
      this.logger.warn("filter preview failed", describeError(error));
    }
  }

  /** The dialog's Preview box was unticked: show the layer's own pixels until it is ticked. */
  hideFilterPreview(): void {
    this.filterSeq++;
    this.tools.previewLayerPixels(null);
  }

  /** Close the filter dialog without applying: the layer shows its own pixels again. */
  endFilter(): void {
    const session = this.filterSession;
    this.filterSession = null;
    this.filterSeq++;
    if (session) {
      this.tools.previewLayerPixels(null);
      releaseSurface(session.surface);
    }
  }

  /**
   * Apply a filter to the active pixel layer at full resolution (in the worker), limited to the
   * selection when there is one. One undo step.
   */
  async applyFilter(id: FilterId, values: FilterValues): Promise<boolean> {
    const seed = this.filterSession?.seed ?? Math.floor(Math.random() * 2 ** 31);
    this.endFilter();
    const filter = filterById(id);
    const layer = this.filterableLayer();
    const doc = this.store.getSession()?.document;
    if (!filter || !layer || !doc) return false;
    const pixels = readLayerPixels(this, layer);
    if (!pixels) return false;
    const coverage = doc.selection ? layerSelectionCoverage(this, layer, doc.selection) : null;
    try {
      const out = await this.withBusy(`Applying ${filter.name}…`, () =>
        this.jobs.run(
          "filter",
          { pixels, filterId: id, values, seed, coverage },
          coverage ? [pixels.data.buffer, coverage.buffer] : [pixels.data.buffer],
        ),
      );
      // The document may have changed while the filter ran.
      const now = this.store.getSession()?.document;
      const current = now && findLayer(now, layer.id);
      if (now?.id !== doc.id || current?.kind !== "raster" || current.assetId !== layer.assetId) {
        this.notify("info", `${filter.name} was not applied because the layer changed.`);
        return false;
      }
      const surface = rgbaToSurface(this, out.data, out.width, out.height);
      const asset = this.assets.addBitmap(surface, out.width, out.height);
      const changed = this.execute(setRasterContent(layer.id, asset.id, filter.name));
      this.enforcePixelBudget();
      this.lastFilter.set({ id, values });
      this.record({ type: "filter", filterId: id, values });
      return changed;
    } catch (error) {
      this.logger.warn("filter failed", describeError(error));
      this.notify("error", `${filter.name} could not be applied. Try a smaller setting.`);
      return false;
    }
  }

  /** Filter → Last Filter: run the previous filter again with the same settings. */
  repeatLastFilter(): Promise<boolean> {
    const last = this.lastFilter.get();
    if (!last) return Promise.resolve(false);
    return this.applyFilter(last.id, last.values);
  }

  /** The active pixel layer, or a notice explaining why the edit is not possible. */
  private selectedPixelLayer(action: string): RasterLayer | null {
    const doc = this.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (!doc?.selection) {
      this.notify("error", "Make a selection first.");
      return null;
    }
    if (!layer || layer.kind !== "raster") {
      this.notify("error", `${action} works on pixel layers. Select a pixel layer and try again.`);
      return null;
    }
    if (layer.assetId && !this.assets.getBitmap(layer.assetId)) {
      this.notify("info", "This layer is still loading. Try again in a moment.");
      return null;
    }
    return layer;
  }

  private paintSelection(
    layer: RasterLayer,
    paint: Surface,
    operation: "source-over" | "destination-out",
    label: string,
  ): boolean {
    try {
      const assetId = paintRasterLayer(this, layer, paint, operation);
      if (!assetId) return false;
      const changed = this.execute(setRasterContent(layer.id, assetId, label));
      this.enforcePixelBudget();
      return changed;
    } finally {
      releaseSurface(paint);
    }
  }

  /** Delete the selected pixels of the active pixel layer. */
  clearSelection(label = "Clear"): boolean {
    const doc = this.store.getSession()?.document;
    const layer = this.selectedPixelLayer("Clear");
    if (!doc?.selection || !layer) return false;
    const paint = this.createSurface(doc.width, doc.height);
    context2d(paint).drawImage(selectionSurface(this, doc.selection), 0, 0);
    const errors = this.errorCount;
    const changed = this.paintSelection(layer, paint, "destination-out", label);
    if (label === "Clear" && this.errorCount === errors) this.record({ type: "clear" });
    return changed;
  }

  /** Fill the selection on the active pixel layer (Edit → Fill). */
  fillSelection(color = this.store.getState().colors.foreground): void {
    const doc = this.store.getSession()?.document;
    const layer = this.selectedPixelLayer("Fill");
    if (!doc || !layer) return;
    this.recordIfOk({ type: "fill", color }, () =>
      this.paintSelection(layer, selectionFill(this, doc, color), "source-over", "Fill"),
    );
  }

  /** Pixels last copied in Picstea (the system clipboard may hold something else). */
  private clipboard: { asset: string; x: number; y: number; width: number; height: number } | null =
    null;

  hasClipboard(): boolean {
    return this.clipboard !== null;
  }

  /**
   * Whether a pasted image is most likely our own copy coming back from the system clipboard
   * (browsers re-encode it, so compare dimensions). Then the in-app copy is pasted instead, at
   * its original position.
   */
  async isOwnClipboardImage(file: Blob): Promise<boolean> {
    const clip = this.clipboard;
    if (!clip) return false;
    try {
      const bitmap = await this.decode(file);
      const [width, height] =
        "displayWidth" in bitmap
          ? [bitmap.displayWidth, bitmap.displayHeight]
          : [bitmap.width, bitmap.height];
      const same = width === clip.width && height === clip.height;
      if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
      return same;
    } catch {
      return false;
    }
  }

  /**
   * Copy the selected pixels of the active layer. Kept in memory for pasting here, and offered
   * to the system clipboard as PNG (best effort; it never leaves the device).
   */
  copySelection(): boolean {
    const doc = this.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (!doc?.selection || !layer) {
      this.notify("error", "Make a selection first.");
      return false;
    }
    const clip = copySelectedPixels(this, doc, layer, doc.selection);
    if (!clip) {
      this.notify("info", "This layer is still loading. Try again in a moment.");
      return false;
    }
    const asset = this.assets.addBitmap(clip.surface, clip.width, clip.height);
    this.clipboard = {
      asset: asset.id,
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
    };
    void this.writeSystemClipboard(asset.id);
    return true;
  }

  cutSelection(): void {
    if (this.selectedPixelLayer("Cut") && this.copySelection()) this.clearSelection("Cut");
  }

  /** Paste copied pixels as a new layer at the position they were copied from. */
  pasteClipboard(): boolean {
    const session = this.store.getSession();
    const clip = this.clipboard;
    if (!session) return false;
    if (!clip || !this.assets.has(clip.asset)) {
      this.notify("info", "Nothing to paste. Make a selection and copy it first.");
      return false;
    }
    const layer = createRasterLayer({
      assetId: clip.asset,
      width: clip.width,
      height: clip.height,
      name: nextLayerName(session.document),
      x: clip.x,
      y: clip.y,
    });
    return this.execute(addLayer(layer, "Paste"));
  }

  /** Layer via Copy (Mod+J with a selection): the selected pixels on a new layer. */
  layerViaCopy(): void {
    const session = this.store.getSession();
    const source = session ? activeLayer(session.document) : undefined;
    const selection = session?.document.selection;
    if (!session || !source || !selection) return;
    const clip = copySelectedPixels(this, session.document, source, selection);
    if (!clip) {
      this.notify("info", "This layer is still loading. Try again in a moment.");
      return;
    }
    const asset = this.assets.addBitmap(clip.surface, clip.width, clip.height);
    const layer = createRasterLayer({
      assetId: asset.id,
      width: clip.width,
      height: clip.height,
      name: `${source.name} copy`,
      x: clip.x,
      y: clip.y,
    });
    this.execute(addLayer(layer, "Layer via Copy"));
    this.enforcePixelBudget();
  }

  // ---------------------------------------------------------------- image commands (ADR-0033)

  /**
   * Image Size, Image Rotation and Flip Canvas: every layer moves through one matrix. Pixel
   * layers keep their pixels and are drawn transformed, so nothing is lost; raster masks are
   * re-rendered.
   */
  transformImage(op: CanvasOp, resolution?: number): boolean {
    const doc = this.store.getSession()?.document;
    if (!doc) return false;
    const { matrix, width, height } = canvasTransform(op, doc.width, doc.height);
    const check = checkDimensions(width, height);
    if (!check.ok) {
      this.notify("error", check.reason);
      return false;
    }
    const targets = transformTargets(
      doc,
      doc.layers.map((l) => l.id),
      this.sizer,
    );
    const transforms: Record<string, Transform> = {};
    for (const { layerId, transform } of applyFrameChange(targets, matrix)) {
      transforms[layerId] = transform;
    }
    const masks: Record<string, LayerMask> = {};
    let pending = false;
    walkLayers(doc.layers, (layer) => {
      if (!layer.mask) return;
      const mask = this.transformMask(layer.mask, matrix);
      if (mask) masks[layer.id] = mask;
      else pending = true;
    });
    if (pending) {
      this.notify("info", "A layer mask is still loading. Try again in a moment.");
      return false;
    }
    const changed = this.execute(
      transformCanvas({
        label: canvasOpLabel(op),
        width,
        height,
        matrix,
        transforms,
        masks,
        resolution,
      }),
    );
    this.enforcePixelBudget();
    return changed;
  }

  /** A raster mask through a matrix: its box moves, and its pixels are redrawn into the new box. */
  private transformMask(mask: LayerMask, m: Matrix): LayerMask | null {
    const box = transformRect(mask, m);
    const x = Math.floor(box.x);
    const y = Math.floor(box.y);
    const width = Math.max(1, Math.ceil(box.x + box.width) - x);
    const height = Math.max(1, Math.ceil(box.y + box.height) - y);
    if (!mask.assetId) return { ...mask, x, y, width, height };
    const bitmap = this.assets.getBitmap(mask.assetId);
    if (!bitmap) return null;
    const surface = this.createSurface(width, height);
    const ctx = context2d(surface);
    // Mask pixels → document (old) → document (new) → this surface.
    ctx.setTransform(
      m[0],
      m[1],
      m[2],
      m[3],
      m[0] * mask.x + m[2] * mask.y + m[4] - x,
      m[1] * mask.x + m[3] * mask.y + m[5] - y,
    );
    ctx.drawImage(bitmap, 0, 0, mask.width, mask.height);
    const asset = this.assets.addBitmap(surface, width, height);
    return { ...mask, assetId: asset.id, x, y, width, height };
  }

  /**
   * Image → Canvas Size: a new canvas size, anchored horizontally and vertically (0 = left/top,
   * 0.5 = centre, 1 = right/bottom). Content is kept, not resampled.
   */
  canvasSize(width: number, height: number, anchorX: number, anchorY: number): boolean {
    const doc = this.store.getSession()?.document;
    if (!doc) return false;
    const x = Math.round((doc.width - width) * anchorX);
    const y = Math.round((doc.height - height) * anchorY);
    return this.execute(cropDocument({ x, y, width, height }, "Canvas Size"));
  }

  /** Image → Trim: crop away transparent pixels, or pixels the colour of a corner. */
  trim(basedOn: "transparent" | "top-left" | "bottom-right"): void {
    const doc = this.store.getSession()?.document;
    if (!doc) return;
    const pixels = readPixels(this, doc);
    if (!pixels) {
      this.notify("info", "The image is still loading. Try again in a moment.");
      return;
    }
    const box = trimBounds(pixels, basedOn);
    if (!box) {
      this.notify("info", "There is nothing to trim to.");
      return;
    }
    this.execute(cropDocument(box, "Trim"));
  }

  /** Image → Reveal All: grow the canvas to show every layer's content. */
  revealAll(): void {
    const doc = this.store.getSession()?.document;
    if (!doc) return;
    let x0 = 0;
    let y0 = 0;
    let x1 = doc.width;
    let y1 = doc.height;
    const targets = transformTargets(
      doc,
      doc.layers.map((l) => l.id),
      this.sizer,
    );
    const bounds = targetsBounds(targets);
    if (bounds) {
      x0 = Math.min(x0, Math.floor(bounds.x));
      y0 = Math.min(y0, Math.floor(bounds.y));
      x1 = Math.max(x1, Math.ceil(bounds.x + bounds.width));
      y1 = Math.max(y1, Math.ceil(bounds.y + bounds.height));
    }
    const width = x1 - x0;
    const height = y1 - y0;
    if (width === doc.width && height === doc.height) {
      this.notify("info", "Everything is already on the canvas.");
      return;
    }
    const check = checkDimensions(width, height);
    if (!check.ok) {
      this.notify("error", check.reason);
      return;
    }
    this.execute(cropDocument({ x: x0, y: y0, width, height }, "Reveal All"));
  }

  /** Image → Auto Tone / Contrast / Color: a Levels adjustment layer set from the histogram. */
  autoAdjust(kind: AutoKind): void {
    const session = this.store.getSession();
    if (!session) return;
    const pixels = readPixels(this, session.document);
    if (!pixels) {
      this.notify("info", "The image is still loading. Try again in a moment.");
      return;
    }
    const adjustment = autoLevels(kind, pixels.data);
    if (!adjustment) {
      this.notify("info", `${AUTO_NAMES[kind]}: the image already uses the full range.`);
      return;
    }
    const layer = createAdjustmentLayer(session.document, adjustment, AUTO_NAMES[kind]);
    this.execute(addLayer(layer, AUTO_NAMES[kind]));
  }

  /** Image → Duplicate: the document as a new, separate document in a new tab. */
  duplicateDocument(): void {
    const doc = this.store.getSession()?.document;
    if (!doc) return;
    const now = new Date().toISOString();
    const copy: EditorDocument = {
      ...doc,
      id: createId("doc"),
      name: `${doc.name} copy`.slice(0, MAX_DOCUMENT_NAME_LENGTH),
      metadata: { createdAt: now, modifiedAt: now },
    };
    this.openSession(copy);
  }

  /** Edit → Copy Merged: the selected pixels of everything visible, as one image. */
  copyMerged(): boolean {
    const doc = this.store.getSession()?.document;
    if (!doc?.selection?.bounds) {
      this.notify("error", "Make a selection first.");
      return false;
    }
    const pixels = readPixels(this, doc);
    const clip = pixels ? maskedPixels(pixels, doc.selection) : null;
    if (!clip) {
      this.notify("info", "The image is still loading. Try again in a moment.");
      return false;
    }
    const surface = rgbaToSurface(this, clip.data, clip.width, clip.height);
    const asset = this.assets.addBitmap(surface, clip.width, clip.height);
    this.clipboard = {
      asset: asset.id,
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
    };
    void this.writeSystemClipboard(asset.id);
    return true;
  }

  /** Edit → Stroke: paint a band along the selection's edge on the active pixel layer. */
  strokeSelection(
    width: number,
    location: StrokeLocation,
    color = this.store.getState().colors.foreground,
  ): void {
    const doc = this.store.getSession()?.document;
    const layer = this.selectedPixelLayer("Stroke");
    if (!doc?.selection || !layer) return;
    const band = strokeArea(doc.selection, width, location);
    if (!band) {
      this.notify("info", "There is no edge to stroke.");
      return;
    }
    this.paintSelection(layer, selectionFill(this, doc, color, band), "source-over", "Stroke");
  }

  /**
   * Select → Grow (connected) or Similar (anywhere): add pixels whose colour matches the
   * selection, within the Magic Wand's tolerance and sampling setting.
   */
  growSelection(contiguous: boolean): void {
    const doc = this.store.getSession()?.document;
    if (!doc?.selection?.bounds) {
      this.notify("error", "Make a selection first.");
      return;
    }
    const { tolerance, sampleAll } = this.store.getState().toolSettings.wand;
    const layer = activeLayer(doc);
    const pixels = sampleAll || !layer ? readPixels(this, doc) : readPixels(this, doc, layer);
    if (!pixels) {
      this.notify("info", "The image is still loading. Try again in a moment.");
      return;
    }
    const mask = similarSelection(pixels, doc.selection, tolerance, contiguous);
    if (mask) this.applySelection(mask, contiguous ? "Grow" : "Similar");
  }

  private async writeSystemClipboard(assetId: string): Promise<void> {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.write) return;
      if (typeof ClipboardItem === "undefined") return;
      const blob = await this.assets.getBlob(assetId);
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch (error) {
      // Denied permission or no image support: copying inside Picstea still works.
      this.logger.info("system clipboard unavailable", describeError(error));
    }
  }

  /** Mirror the active layer about its centre. */
  flipActiveLayer(axis: "horizontal" | "vertical"): void {
    const session = this.store.getSession();
    const layer = session ? activeLayer(session.document) : undefined;
    if (!session || !layer) return;
    const label = axis === "horizontal" ? "Flip Horizontal" : "Flip Vertical";
    const ids = this.selectedLayers();
    if (ids.length > 1 || layer.kind === "group") {
      // Several layers (or a group) mirror together about the centre of their bounds.
      const targets = transformTargets(session.document, ids, this.sizer);
      const bounds = targetsBounds(targets);
      if (!bounds) {
        this.notify("error", "Nothing in the selection can be flipped.");
        return;
      }
      const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      this.recordIfOk({ type: "flip", axis }, () =>
        this.execute(
          transformLayers(applyFrameChange(targets, flipMatrix(centre, axis)), { label }),
        ),
      );
      return;
    }
    if (!isTransformable(layer)) {
      this.notify("error", "Fill layers cannot be flipped.");
      return;
    }
    const size = layerLocalSize(layer, session.document, this.sizer);
    this.recordIfOk({ type: "flip", axis }, () =>
      this.execute(
        setLayerTransform(layer.id, flipAboutCenter(layer.transform, size, axis), {
          label: axis === "horizontal" ? "Flip Horizontal" : "Flip Vertical",
        }),
      ),
    );
  }

  /** Duplicate the active layer (Layer → Duplicate Layer). */
  duplicateActiveLayer(): void {
    const session = this.store.getSession();
    const layer = session ? activeLayer(session.document) : undefined;
    if (!session || !layer) {
      if (this.playing.get()) this.notify("error", "Select a layer first.");
      return;
    }
    const ids = topLevelSelection(session.document.layers, this.selectedLayers());
    // A group selected with its own child: the group is what's duplicated (as Move would).
    if (ids.length === 1 && ids[0] !== layer.id) {
      this.recordIfOk({ type: "duplicateLayer" }, () =>
        this.execute(duplicateLayer(ids[0], createId("layer"))),
      );
      return;
    }
    if (ids.length > 1) {
      const copies = ids.map(() => createId("layer"));
      this.recordIfOk({ type: "duplicateLayer" }, () => {
        if (this.execute(duplicateLayers(ids, copies))) {
          this.store.setLayerSelection(copies, copies.at(-1)!);
        }
      });
      return;
    }
    this.recordIfOk({ type: "duplicateLayer" }, () =>
      this.execute(duplicateLayer(layer.id, createId("layer"))),
    );
  }

  addFillLayer(color = "#ffffff"): void {
    const session = this.store.getSession();
    if (!session) return;
    const layer = createFillLayer(color, nextLayerName(session.document));
    if (this.execute(addLayer(layer, "New Fill Layer"))) this.record({ type: "fillLayer", color });
  }

  // ---------------------------------------------------------------- files (ADR-0011)

  /** Open any supported file — image, SVG, PSD or Picstea project — detected from its bytes. */
  openFile(file: Blob, filename: string): Promise<Result> {
    return this.withBusy("Opening…", () => this.openFileNow(file, filename));
  }

  private async openFileNow(file: Blob, filename: string, transient = false): Promise<Result> {
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return this.fail(
        `The file is larger than ${Math.round(MAX_IMPORT_FILE_BYTES / 2 ** 20)} MB.`,
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectFileKind(bytes);
    try {
      switch (kind.kind) {
        case "raster":
          return await this.openImageFile(file, filename, transient);
        case "svg": {
          const layer = await this.svgLayer(bytes, baseName(filename));
          const doc = createDocument({
            name: baseName(filename),
            width: layer.width,
            height: layer.height,
            background: { kind: "transparent" },
          });
          this.openSession({ ...doc, layers: [layer], activeLayerId: layer.id }, { transient });
          return { ok: true };
        }
        case "psd": {
          const { file: psd, warnings } = await this.jobs.run("psdRead", bytes, [bytes.buffer]);
          const imported = psdToDocument(this, psd, baseName(filename), warnings);
          this.openSession(imported.document, { transient });
          this.reportWarnings("Opened with changes", imported.warnings);
          this.enforcePixelBudget();
          return { ok: true };
        }
        case "project": {
          const project = await readProjectFile(bytes, (k) =>
            createId(k === "document" ? "doc" : "asset"),
          );
          for (const asset of project.assets) this.assets.add(asset);
          this.openSession(project.document, { transient });
          return { ok: true };
        }
        case "unsupported":
          return this.fail(kind.message);
      }
    } catch (error) {
      this.logger.warn("opening file failed", describeError(error));
      return this.fail(
        error instanceof FormatError ? error.message : "The file could not be opened.",
      );
    }
  }

  /** Add a file to the active document as a new layer (images, SVG, flattened PSD). */
  placeFile(file: Blob, filename: string): Promise<Result> {
    return this.withBusy("Placing…", () => this.placeFileNow(file, filename));
  }

  private async placeFileNow(file: Blob, filename: string): Promise<Result> {
    const session = this.store.getSession();
    if (!session) return this.openFile(file, filename);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectFileKind(bytes);
    if (kind.kind === "raster") return this.placeImageFile(file, filename);
    if (kind.kind === "unsupported") return this.fail(kind.message);
    if (kind.kind === "project") {
      return this.fail("Project files open as their own document. Use File → Open.");
    }
    const documentId = session.document.id;
    try {
      let layer: RasterLayer;
      if (kind.kind === "svg") {
        layer = await this.svgLayer(bytes, baseName(filename));
      } else {
        const { file: psd } = await this.jobs.run("psdRead", bytes, [bytes.buffer]);
        const flat = psd.composite;
        if (!flat) return this.fail("This PSD has no flattened image to place.");
        const asset = this.assets.addBitmap(
          rgbaToSurface(this, flat, psd.width, psd.height),
          psd.width,
          psd.height,
        );
        layer = createRasterLayer({
          assetId: asset.id,
          width: psd.width,
          height: psd.height,
          name: baseName(filename),
        });
      }
      const current = this.store.getSession(documentId);
      if (!current) return this.fail("The document was closed before the file finished loading.");
      const centred = {
        ...layer,
        transform: {
          ...layer.transform,
          x: Math.round((current.document.width - layer.width) / 2),
          y: Math.round((current.document.height - layer.height) / 2),
        },
      };
      const dispatched = this.store.dispatch(addLayer(centred, "Place"), documentId);
      this.enforcePixelBudget();
      return dispatched.ok ? { ok: true } : this.fail(dispatched.error);
    } catch (error) {
      this.logger.warn("placing file failed", describeError(error));
      return this.fail(
        error instanceof FormatError ? error.message : "The file could not be placed.",
      );
    }
  }

  /** Rasterise SVG bytes into a new pixel layer (never inserted into the page). */
  private async svgLayer(bytes: Uint8Array, name: string): Promise<RasterLayer> {
    if (!this.rasterizeSvg) throw new FormatError("SVG files cannot be opened here.");
    const size = svgPixelSize(new TextDecoder().decode(bytes));
    if (!size) throw new FormatError("This SVG file is damaged and cannot be opened.");
    let image: CanvasImageSource;
    try {
      image = await this.rasterizeSvg(
        new Blob([bytes as BlobPart], { type: "image/svg+xml" }),
        size.width,
        size.height,
      );
    } catch {
      throw new FormatError("This SVG file could not be drawn. It may be damaged.");
    }
    const surface = this.createSurface(size.width, size.height);
    const ctx = context2d(surface);
    ctx.drawImage(image, 0, 0, size.width, size.height);
    try {
      // Some browsers refuse to read back certain SVGs; then the pixels could never be saved.
      ctx.getImageData(0, 0, 1, 1);
    } catch {
      releaseSurface(surface);
      throw new FormatError("This SVG uses features the browser will not convert to pixels.");
    }
    const asset = this.assets.addBitmap(surface, size.width, size.height);
    return createRasterLayer({ assetId: asset.id, width: size.width, height: size.height, name });
  }

  private reportWarnings(title: string, warnings: readonly string[]): void {
    if (warnings.length > 0) this.notify("info", `${title}: ${warnings.join(" ")}`);
  }

  /** The active document as a portable `.picstea` project file. */
  saveProjectFile(): ReturnType<EditorController["saveProjectFileNow"]> {
    return this.withBusy("Saving project…", () => this.saveProjectFileNow());
  }

  private async saveProjectFileNow(): Promise<
    { ok: true; blob: Blob; filename: string } | { ok: false; error: string }
  > {
    if (this.textEdit.get()) this.commitTextEdit();
    const session = this.store.getSession();
    if (!session) return this.fail("No document is open.");
    try {
      const { document } = session;
      const assets: StoredAsset[] = [];
      for (const assetId of referencedAssetIds(document)) {
        const record = this.assets.get(assetId);
        if (!record) throw new FormatError("Some layers are still loading. Try again in a moment.");
        assets.push({ ...record, blob: await this.assets.getBlob(assetId) });
      }
      const blob = await writeProjectFile(document, assets);
      const filename = safeFilename(document.name, PROJECT_EXTENSION);
      return { ok: true, blob, filename };
    } catch (error) {
      this.logger.warn("saving project file failed", describeError(error));
      return this.fail(
        error instanceof FormatError ? error.message : "The project file could not be created.",
      );
    }
  }

  /** Open a local image file as a new document. */
  async openImageFile(file: Blob, filename: string, transient = false): Promise<Result> {
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
    this.openSession({ ...doc, layers: [layer], activeLayerId: layer.id }, { transient });
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
    // Edit Contents tabs are saved into their smart object, never as projects.
    if (this.smartChildren.has(documentId)) {
      return isDirty(session) ? this.applySmartChild(documentId) : { ok: true };
    }
    // Batch documents are processed and closed, never stored.
    if (this.transientDocuments.has(documentId)) return { ok: true };
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

  /** Save every document with unsaved changes; true when all of them were stored. */
  async saveAllDirty(): Promise<boolean> {
    let ok = true;
    // Edit Contents tabs first: applying them makes their parent documents dirty.
    for (const childId of this.smartChildren.keys()) {
      const child = this.store.getSession(childId);
      if (child && isDirty(child) && !this.applySmartChild(childId).ok) ok = false;
    }
    const dirty = this.store.getState().sessions.filter(isDirty);
    const results = await Promise.all(dirty.map((s) => this.save(s.document.id)));
    return ok && results.every((r) => r.ok);
  }

  /**
   * After the UI crashed: keep any text still being typed, then store every open document.
   * True only when everything reached persistent browser storage.
   */
  async saveAfterCrash(): Promise<boolean> {
    try {
      if (this.textEdit.get()) this.commitTextEdit();
    } catch (error) {
      this.logger.warn("committing text after a crash failed", describeError(error));
    }
    const saved = await this.saveAllDirty();
    return saved && this.storageKind !== "memory";
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
      this.openSession(project.document, { saved: true });
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
    // Edit Contents tabs of this document are applied and closed first.
    for (const [childId, link] of [...this.smartChildren]) {
      if (link.parentId !== documentId) continue;
      const closed = await this.closeDocument(childId);
      if (!closed.ok) return closed;
    }
    if (isDirty(session)) {
      const saved = await this.save(documentId);
      if (!saved.ok) return saved;
    }
    this.store.closeDocument(documentId);
    this.smartChildren.delete(documentId);
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
      const layer = findLayer(session.document, request.layerId);
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

  // ---------------------------------------------------------------- actions (ADR-0018)

  /** Error notices so far: playback stops at a step that raised one. */
  private errorCount = 0;
  /** Adjustment layers recorded steps were made from, to read their final settings. */
  private readonly adjustmentSources = new WeakMap<
    ActionStep,
    { documentId: string; layerId: string }
  >();

  createAction(name: string): string | null {
    const normalized = normalizeActionName(name);
    if (!normalized) return null;
    if (this.actions.get().length >= MAX_ACTIONS) {
      this.notify("error", `You can keep up to ${MAX_ACTIONS} actions. Delete some first.`);
      return null;
    }
    const action: Action = { id: createId("action"), name: normalized, steps: [] };
    this.actions.update((list) => [...list, action]);
    return action.id;
  }

  renameAction(id: string, name: string): void {
    const normalized = normalizeActionName(name);
    if (normalized) this.updateAction(id, (a) => ({ ...a, name: normalized }));
  }

  deleteAction(id: string): void {
    if (this.recording.get() === id) this.stopRecording();
    this.actions.update((list) => list.filter((a) => a.id !== id));
  }

  deleteActionStep(id: string, index: number): void {
    this.updateAction(id, (a) => ({ ...a, steps: a.steps.filter((_, i) => i !== index) }));
  }

  /** Add the actions from an exported file; returns how many were added. */
  importActions(text: string): { ok: true; count: number } | { ok: false; error: string } {
    try {
      const imported = parseActionsFile(text, () => createId("action"));
      if (this.actions.get().length + imported.length > MAX_ACTIONS) {
        return this.fail(`You can keep up to ${MAX_ACTIONS} actions. Delete some first.`);
      }
      this.actions.update((list) => [...list, ...imported]);
      return { ok: true, count: imported.length };
    } catch (error) {
      if (error instanceof ActionsFormatError) return this.fail(error.message);
      throw error;
    }
  }

  startRecording(id: string): void {
    if (this.playing.get() || !this.actions.get().some((a) => a.id === id)) return;
    if (this.recording.get()) this.stopRecording();
    this.recording.set(id);
  }

  /** Stop recording; adjustment steps take the settings their layers ended up with. */
  stopRecording(): void {
    const id = this.recording.get();
    if (!id) return;
    this.recording.set(null);
    this.updateAction(id, (a) => ({
      ...a,
      steps: a.steps.map((step) => {
        const source = this.adjustmentSources.get(step);
        if (step.type !== "adjustment" || !source) return step;
        const doc = this.store.getSession(source.documentId)?.document;
        const layer = doc && findLayerDeep(doc.layers, source.layerId);
        return layer?.kind === "adjustment" && layer.adjustment.type === step.adjustment.type
          ? { type: "adjustment", adjustment: layer.adjustment }
          : step;
      }),
    }));
  }

  private updateAction(id: string, fn: (action: Action) => Action): void {
    this.actions.update((list) => list.map((a) => (a.id === id ? fn(a) : a)));
  }

  /** Append a step to the action being recorded (never while an action plays). */
  private record(step: ActionStep): void {
    const id = this.recording.get();
    if (!id || this.playing.get()) return;
    const action = this.actions.get().find((a) => a.id === id);
    if (!action) {
      this.recording.set(null);
      return;
    }
    if (action.steps.length >= MAX_ACTION_STEPS) {
      this.notify("info", `An action can have up to ${MAX_ACTION_STEPS} steps.`);
      this.stopRecording();
      return;
    }
    this.updateAction(id, (a) => ({ ...a, steps: [...a.steps, step] }));
  }

  /** Run `operation`, recording `step` unless it reported an error. */
  private recordIfOk(step: ActionStep, operation: () => unknown): void {
    const errors = this.errorCount;
    operation();
    if (this.errorCount === errors && this.store.getSession()) this.record(step);
  }

  /**
   * Play an action on the active document. Steps run in order; playback stops at the first
   * step that reports an error. The whole run is one undo step.
   */
  playAction(id: string): Promise<Result> {
    const action = this.actions.get().find((a) => a.id === id);
    if (!action) return Promise.resolve(this.fail("That action no longer exists."));
    return this.withBusy(`Playing ${action.name}…`, () => this.playActionNow(action));
  }

  private async playActionNow(action: Action): Promise<Result> {
    if (this.recording.get()) return this.fail("Stop recording before playing an action.");
    if (this.playing.get()) return this.fail("An action is already playing.");
    if (this.textEdit.get()) this.commitTextEdit();
    const session = this.store.getSession();
    if (!session) return this.fail("Open a document first.");
    const documentId = session.document.id;
    this.store.sealHistory(documentId);
    const start = this.store.getSession(documentId)!.document;
    this.playing.set(action.id);
    try {
      for (const [index, step] of action.steps.entries()) {
        const current = this.store.getSession();
        if (current?.document.id !== documentId) {
          return this.fail(`"${action.name}" stopped because the document changed.`);
        }
        await this.assets.whenDecoded(referencedAssetIds(current.document));
        const errors = this.errorCount;
        await this.runStep(step);
        if (this.errorCount !== errors) {
          return this.fail(`"${action.name}" stopped at step ${index + 1} (${stepLabel(step)}).`);
        }
      }
      return { ok: true };
    } finally {
      this.store.collapseHistory(start, `Action: ${action.name}`, documentId);
      this.playing.set(null);
    }
  }

  private async runStep(step: ActionStep): Promise<void> {
    switch (step.type) {
      case "filter":
        await this.applyFilter(step.filterId, step.values);
        return;
      case "adjustment":
        this.addAdjustmentLayer(step.adjustment.type, step.adjustment);
        return;
      case "flip":
        this.flipActiveLayer(step.axis);
        return;
      case "align":
        this.alignActiveLayer(step.edge);
        return;
      case "distribute":
        this.distributeSelectedLayers(step.mode);
        return;
      case "select":
        if (step.op === "all") this.selectAll();
        else if (step.op === "deselect") this.deselect();
        else this.invertSelection();
        return;
      case "modifySelection": {
        const result = this.modifySelection(step.kind, step.radius);
        if (!result.ok) this.notify("error", result.error);
        return;
      }
      case "fill":
        this.fillSelection(step.color);
        return;
      case "clear":
        this.clearSelection();
        return;
      case "newLayer":
        this.addPixelLayer();
        return;
      case "duplicateLayer":
        this.duplicateActiveLayer();
        return;
      case "fillLayer":
        this.addFillLayer(step.color);
        return;
      case "cropToSelection":
        this.cropToSelection();
        return;
    }
  }

  // ---------------------------------------------------------------- batch (ADR-0018)

  /** Documents opened by a batch: never saved to browser storage. */
  private readonly transientDocuments = new Set<string>();

  /**
   * File → Batch: open each file, play the action, export it, close it. The results are
   * collected into one ZIP, built locally. Files that fail are skipped and named.
   */
  runBatch(options: {
    actionId: string;
    files: readonly { blob: Blob; name: string }[];
    export: ExportRequest;
    onProgress?: (done: number, total: number) => void;
    signal?: AbortSignal;
  }): Promise<
    | { ok: true; blob: Blob; processed: number; failed: readonly string[]; cancelled: boolean }
    | { ok: false; error: string }
  > {
    return this.runBatchNow(options);
  }

  private async runBatchNow({
    actionId,
    files,
    export: request,
    onProgress,
    signal,
  }: Parameters<EditorController["runBatch"]>[0]): ReturnType<EditorController["runBatch"]> {
    const action = this.actions.get().find((a) => a.id === actionId);
    if (!action) return this.fail("That action no longer exists.");
    if (files.length === 0) return this.fail("Choose at least one file.");
    if (files.length > MAX_BATCH_FILES) {
      return this.fail(`A batch can process up to ${MAX_BATCH_FILES} files at a time.`);
    }
    if (this.recording.get()) return this.fail("Stop recording before running a batch.");
    if (this.textEdit.get()) this.commitTextEdit();
    const previous = this.store.getState().activeDocumentId;
    const extension = EXPORT_FORMATS[request.format].extension;
    const entries: ZipInput[] = [];
    const names = new Set<string>();
    const failed: string[] = [];
    let total = 0;
    let cancelled = false;
    for (const [index, file] of files.entries()) {
      if (signal?.aborted) {
        cancelled = true;
        break;
      }
      onProgress?.(index, files.length);
      let documentId: string | null = null;
      try {
        const opened = await this.openFileNow(file.blob, file.name, true);
        documentId = opened.ok ? this.store.getState().activeDocumentId : null;
        if (!documentId || !this.transientDocuments.has(documentId)) {
          failed.push(file.name);
          continue;
        }
        const played = await this.playActionNow(action);
        if (!played.ok) {
          failed.push(file.name);
          continue;
        }
        const doc = this.store.getSession(documentId)!.document;
        await this.assets.whenDecoded(referencedAssetIds(doc));
        const { blob } = await exportFile(this, doc, request, this.jobs);
        if (total + blob.size > MAX_BATCH_OUTPUT_BYTES) {
          this.notify("error", "The batch output reached 1 GB. The remaining files were skipped.");
          cancelled = true;
          break;
        }
        total += blob.size;
        entries.push({
          name: uniqueEntryName(doc.name, extension, names),
          data: new Uint8Array(await blob.arrayBuffer()),
        });
      } catch (error) {
        this.logger.warn("batch file failed", describeError(error));
        failed.push(file.name);
      } finally {
        if (documentId && this.transientDocuments.has(documentId)) {
          this.store.closeDocument(documentId);
          this.transientDocuments.delete(documentId);
          this.collectUnusedAssets();
        }
      }
    }
    onProgress?.(entries.length + failed.length, files.length);
    if (previous && this.store.getSession(previous)) this.store.setActiveDocument(previous);
    if (failed.length > 0) {
      const list = failed.slice(0, 5).join(", ") + (failed.length > 5 ? ", …" : "");
      this.notify("error", `${failed.length} file(s) could not be processed: ${list}`);
    }
    if (entries.length === 0) return { ok: false, error: "No files were processed." };
    const zip = await writeZip(entries);
    return {
      ok: true,
      blob: new Blob([zip as BlobPart], { type: "application/zip" }),
      processed: entries.length,
      failed,
      cancelled,
    };
  }

  // ---------------------------------------------------------------- export

  /** Flatten the active document into an image file. Nothing leaves the browser. */
  exportActive(request: ExportRequest): ReturnType<EditorController["exportNow"]> {
    return this.withBusy("Exporting…", () => this.exportNow(request));
  }

  private async exportNow(
    request: ExportRequest,
  ): Promise<
    | { ok: true; blob: Blob; filename: string; warnings: readonly string[] }
    | { ok: false; error: string }
  > {
    if (this.textEdit.get()) this.commitTextEdit();
    const session = this.store.getSession();
    if (!session) return this.fail("No document is open.");
    try {
      const { blob, warnings } = await exportFile(this, session.document, request, this.jobs);
      const filename = exportFilename(session.document.name, request.format);
      return { ok: true, blob, filename, warnings };
    } catch (error) {
      this.logger.warn("export failed", describeError(error));
      const known = error instanceof ExportError || error instanceof FormatError;
      return this.fail(known ? error.message : "Export failed.");
    }
  }

  // ---------------------------------------------------------------- memory

  /**
   * Keep decoded pixels for open documents and their undo history under the budget by dropping
   * the oldest undo steps (ADR-0007). The current state of every document is always kept.
   */
  enforcePixelBudget(): void {
    const sessions = () => this.store.getState().sessions;
    const total = () =>
      this.assets.estimateBytes(sessions().flatMap(sessionAssetIds)) +
      sessions().reduce((sum, session) => sum + sessionSelectionBytes(session), 0);
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
    const anyDirty = this.store
      .getState()
      .sessions.some((s) => isDirty(s) && !this.transientDocuments.has(s.document.id));
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
    if (this.clipboard) keep.add(this.clipboard.asset);
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

/** Distinct selection masks held by a document and its undo history (ADR-0010). */
export function sessionSelectionBytes(session: DocumentSession): number {
  const masks = new Set<SelectionMask>();
  const add = (doc: EditorDocument) => doc.selection && masks.add(doc.selection);
  add(session.document);
  for (const entry of [...session.history.past, ...session.history.future]) {
    add(entry.before);
    add(entry.after);
  }
  let bytes = 0;
  for (const mask of masks) bytes += selectionBytes(mask);
  return bytes;
}

function sessionAssetIds(session: DocumentSession): string[] {
  const ids = referencedAssetIds(session.document);
  for (const entry of [...session.history.past, ...session.history.future]) {
    ids.push(...referencedAssetIds(entry.before), ...referencedAssetIds(entry.after));
  }
  return ids;
}
