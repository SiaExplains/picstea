import { CommandError, type Command } from "./commands/command";
import type { EditorDocument } from "./document/types";
import {
  canRedo,
  canUndo,
  createHistory,
  recordChange,
  redo as redoHistory,
  sealHistory,
  undo as undoHistory,
  type HistoryState,
} from "./history/history";
import {
  DEFAULT_COLORS,
  DEFAULT_TOOL_SETTINGS,
  type Colors,
  type ToolId,
  type ToolSettings,
} from "./tool-settings";
import { DEFAULT_VIEWPORT, type Viewport } from "./viewport/viewport";
import { collapseSince, dropOldest, jumpTo } from "./history/history";
import { findLayerDeep, flattenTopFirst } from "./document/tree";
import { setGroupExpanded } from "./commands/group-commands";

export type { ToolId } from "./tool-settings";

/** One open document tab. */
export interface DocumentSession {
  readonly document: EditorDocument;
  readonly history: HistoryState;
  readonly viewport: Viewport;
  /** False until the canvas has measured itself and fitted the document once. */
  readonly viewportInitialized: boolean;
  /** Increments on every document change, including undo/redo. */
  readonly revision: number;
  /** Revision last written to local storage; null if never saved. */
  readonly savedRevision: number | null;
  /**
   * Layers selected together with the active layer (ADR-0020). UI state: not saved, not in
   * history. Read it through `selectedLayerIds()`, which drops stale entries.
   */
  readonly selectedLayerIds: readonly string[];
}

export interface EditorState {
  /** Tab order. */
  readonly sessions: readonly DocumentSession[];
  readonly activeDocumentId: string | null;
  readonly activeTool: ToolId;
  readonly toolSettings: ToolSettings;
  readonly colors: Colors;
  /** Whether painting tools edit the active layer's pixels or its mask. */
  readonly editTarget: EditTarget;
}

export type EditTarget = "content" | "mask";

export type DispatchResult = { ok: true; changed: boolean } | { ok: false; error: string };

export type Listener = () => void;

export const isDirty = (session: DocumentSession) => session.revision !== session.savedRevision;

/**
 * The selected layers: existing ids that include the active layer. If the active layer changed
 * since the selection was made (a command, undo, a click elsewhere), the selection is just the
 * active layer — so commands never have to maintain it.
 */
export function selectedLayerIds(session: DocumentSession | undefined): readonly string[] {
  const doc = session?.document;
  const active = doc?.activeLayerId;
  if (!doc || !active || !findLayerDeep(doc.layers, active)) return [];
  const ids = session.selectedLayerIds;
  if (ids.length <= 1 || !ids.includes(active)) return [active];
  const existing = ids.filter((id) => findLayerDeep(doc.layers, id));
  return existing.length > 0 ? existing : [active];
}

/**
 * The single source of truth for editor state (docs/01_PRODUCT_PRINCIPLES.md §3).
 *
 * Framework-agnostic: React subscribes through useSyncExternalStore, tests drive it directly.
 * State is replaced, never mutated, so snapshots are safe to compare by reference.
 */
export class EditorStore {
  private state: EditorState = {
    sessions: [],
    activeDocumentId: null,
    activeTool: "move",
    toolSettings: DEFAULT_TOOL_SETTINGS,
    colors: DEFAULT_COLORS,
    editTarget: "content",
  };
  private readonly listeners = new Set<Listener>();

  constructor(private readonly clock: () => number = Date.now) {}

  getState = (): EditorState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSession(documentId: string | null = this.state.activeDocumentId): DocumentSession | undefined {
    return documentId ? this.state.sessions.find((s) => s.document.id === documentId) : undefined;
  }

  openDocument(document: EditorDocument, options: { saved?: boolean } = {}): void {
    if (this.getSession(document.id)) {
      this.setActiveDocument(document.id);
      return;
    }
    const session: DocumentSession = {
      document,
      history: createHistory(),
      viewport: DEFAULT_VIEWPORT,
      viewportInitialized: false,
      revision: 0,
      savedRevision: options.saved ? 0 : null,
      selectedLayerIds: [],
    };
    this.setState({
      ...this.state,
      sessions: [...this.state.sessions, session],
      activeDocumentId: document.id,
    });
  }

  closeDocument(documentId: string): void {
    const index = this.state.sessions.findIndex((s) => s.document.id === documentId);
    if (index === -1) return;
    const sessions = this.state.sessions.filter((_, i) => i !== index);
    let activeDocumentId = this.state.activeDocumentId;
    if (activeDocumentId === documentId) {
      activeDocumentId = (sessions[index] ?? sessions[index - 1])?.document.id ?? null;
    }
    this.setState({ ...this.state, sessions, activeDocumentId });
  }

  setActiveDocument(documentId: string): void {
    if (!this.getSession(documentId) || this.state.activeDocumentId === documentId) return;
    this.setState({ ...this.state, activeDocumentId: documentId, editTarget: "content" });
  }

  setActiveTool(tool: ToolId): void {
    if (this.state.activeTool !== tool) this.setState({ ...this.state, activeTool: tool });
  }

  updateToolSettings<K extends keyof ToolSettings>(tool: K, patch: Partial<ToolSettings[K]>): void {
    const current = this.state.toolSettings[tool];
    const next = { ...current, ...patch };
    if ((Object.keys(patch) as (keyof ToolSettings[K])[]).every((k) => current[k] === next[k])) {
      return;
    }
    this.setState({ ...this.state, toolSettings: { ...this.state.toolSettings, [tool]: next } });
  }

  setColors(colors: Partial<Colors>): void {
    const next = { ...this.state.colors, ...colors };
    if (
      next.foreground === this.state.colors.foreground &&
      next.background === this.state.colors.background
    ) {
      return;
    }
    this.setState({ ...this.state, colors: next });
  }

  /** Forget the oldest undo steps of a document (memory budget). */
  trimHistory(documentId: string, count: number): void {
    const session = this.getSession(documentId);
    if (!session || count <= 0) return;
    this.updateSession(documentId, { history: dropOldest(session.history, count) });
  }

  /** Apply an undoable command to a document (the active one by default). */
  dispatch(command: Command, documentId = this.state.activeDocumentId): DispatchResult {
    const session = this.getSession(documentId);
    if (!session) return { ok: false, error: "No document is open." };

    let next: EditorDocument;
    try {
      next = command.apply(session.document);
    } catch (error) {
      if (error instanceof CommandError) return { ok: false, error: error.message };
      throw error;
    }
    if (next === session.document) return { ok: true, changed: false };

    const now = this.clock();
    const stamped: EditorDocument = {
      ...next,
      metadata: { ...next.metadata, modifiedAt: new Date(now).toISOString() },
    };
    this.updateSession(session.document.id, {
      document: stamped,
      history: recordChange(
        session.history,
        {
          label: command.label,
          before: session.document,
          after: stamped,
          mergeKey: command.mergeKey,
          mergeUntilSealed: command.mergeUntilSealed,
        },
        now,
      ),
      revision: session.revision + 1,
    });
    return { ok: true, changed: true };
  }

  /** Close the current merge group so the next change starts a new undo step. */
  sealHistory(documentId = this.state.activeDocumentId): void {
    const session = this.getSession(documentId);
    if (!session) return;
    const history = sealHistory(session.history);
    if (history !== session.history) this.updateSession(session.document.id, { history });
  }

  undo(documentId = this.state.activeDocumentId): string | null {
    const session = this.getSession(documentId);
    if (!session || !canUndo(session.history)) return null;
    const step = undoHistory(session.history)!;
    this.updateSession(session.document.id, {
      document: step.document,
      history: step.state,
      revision: session.revision + 1,
    });
    return step.label;
  }

  redo(documentId = this.state.activeDocumentId): string | null {
    const session = this.getSession(documentId);
    if (!session || !canRedo(session.history)) return null;
    const step = redoHistory(session.history)!;
    this.updateSession(session.document.id, {
      document: step.document,
      history: step.state,
      revision: session.revision + 1,
    });
    return step.label;
  }

  /** Undo or redo until `pastLength` steps remain (History panel). */
  goToHistory(pastLength: number, documentId = this.state.activeDocumentId): string | null {
    const session = this.getSession(documentId);
    if (!session) return null;
    const step = jumpTo(session.history, pastLength);
    if (!step) return null;
    this.updateSession(session.document.id, {
      document: step.document,
      history: step.state,
      revision: session.revision + 1,
    });
    return step.label;
  }

  /** Fold the steps made since the document was `before` into one undo step. */
  collapseHistory(
    before: EditorDocument,
    label: string,
    documentId = this.state.activeDocumentId,
  ): void {
    const session = this.getSession(documentId);
    if (!session) return;
    const history = collapseSince(session.history, before, label);
    if (history !== session.history) this.updateSession(session.document.id, { history });
  }

  /**
   * Change which layer is active. Selection is UI state, not an edit, so it is not recorded in
   * history and does not mark the document dirty.
   */
  selectLayer(layerId: string, documentId = this.state.activeDocumentId): void {
    const session = this.getSession(documentId);
    if (!session || !findLayerDeep(session.document.layers, layerId)) return;
    if (session.document.activeLayerId === layerId && session.selectedLayerIds.length <= 1) return;
    this.state = { ...this.state, editTarget: "content" };
    this.updateSession(session.document.id, {
      document: { ...session.document, activeLayerId: layerId },
      selectedLayerIds: [layerId],
    });
  }

  /**
   * Cmd/Ctrl-click: add a layer to the selection (it becomes active) or remove it (the most
   * recently added remaining layer becomes active).
   */
  toggleLayerSelected(layerId: string, documentId = this.state.activeDocumentId): void {
    const session = this.getSession(documentId);
    if (!session || !findLayerDeep(session.document.layers, layerId)) return;
    const current = selectedLayerIds(session);
    let ids: readonly string[];
    let active: string;
    if (current.includes(layerId)) {
      if (current.length === 1) return;
      ids = current.filter((id) => id !== layerId);
      active =
        session.document.activeLayerId === layerId ? ids.at(-1)! : session.document.activeLayerId!;
    } else {
      ids = [...current, layerId];
      active = layerId;
    }
    this.state = { ...this.state, editTarget: "content" };
    this.updateSession(session.document.id, {
      document: { ...session.document, activeLayerId: active },
      selectedLayerIds: ids,
    });
  }

  /** Shift-click: select every layer between the active one and `layerId`, as listed in the panel. */
  selectLayerRange(layerId: string, documentId = this.state.activeDocumentId): void {
    const session = this.getSession(documentId);
    const anchor = session?.document.activeLayerId;
    if (!session || !anchor || !findLayerDeep(session.document.layers, layerId)) return;
    const order = flattenTopFirst(session.document.layers, { includeCollapsed: true }).map(
      (row) => row.layer.id,
    );
    const a = order.indexOf(anchor);
    const b = order.indexOf(layerId);
    if (a < 0 || b < 0) return;
    const range = order.slice(Math.min(a, b), Math.max(a, b) + 1);
    // Keep the anchor last so it stays the active layer.
    this.updateSession(session.document.id, {
      selectedLayerIds: [...range.filter((id) => id !== anchor), anchor],
    });
  }

  /** Select → All Layers: every top-level layer (groups bring their contents). */
  selectAllLayers(documentId = this.state.activeDocumentId): void {
    const session = this.getSession(documentId);
    if (!session || session.document.layers.length === 0) return;
    const ids = session.document.layers.map((l) => l.id);
    const active = ids.includes(session.document.activeLayerId ?? "")
      ? session.document.activeLayerId!
      : ids.at(-1)!;
    this.updateSession(session.document.id, {
      document: { ...session.document, activeLayerId: active },
      selectedLayerIds: [...ids.filter((id) => id !== active), active],
    });
  }

  /** Make the given layers the selection, `active` among them (after duplicating several). */
  setLayerSelection(
    ids: readonly string[],
    active: string,
    documentId = this.state.activeDocumentId,
  ): void {
    const session = this.getSession(documentId);
    if (!session || !ids.includes(active) || !findLayerDeep(session.document.layers, active))
      return;
    this.updateSession(session.document.id, {
      document: { ...session.document, activeLayerId: active },
      selectedLayerIds: ids,
    });
  }

  /** Paint on the active layer's content or on its mask. */
  setEditTarget(target: EditTarget): void {
    if (this.state.editTarget !== target) this.setState({ ...this.state, editTarget: target });
  }

  /**
   * Open/close a group in the layers panel. Panel state, so it is not an undoable edit (it is
   * still saved with the document).
   */
  setGroupExpanded(
    groupId: string,
    expanded: boolean,
    documentId = this.state.activeDocumentId,
  ): void {
    const session = this.getSession(documentId);
    if (!session) return;
    const document = setGroupExpanded(session.document, groupId, expanded);
    if (document !== session.document) this.updateSession(session.document.id, { document });
  }

  setViewport(documentId: string, viewport: Viewport): void {
    const session = this.getSession(documentId);
    if (!session) return;
    const same =
      session.viewportInitialized &&
      session.viewport.zoom === viewport.zoom &&
      session.viewport.panX === viewport.panX &&
      session.viewport.panY === viewport.panY;
    if (!same) this.updateSession(documentId, { viewport, viewportInitialized: true });
  }

  markSaved(documentId: string, revision: number): void {
    const session = this.getSession(documentId);
    if (session && session.savedRevision !== revision) {
      this.updateSession(documentId, { savedRevision: revision });
    }
  }

  private updateSession(documentId: string, patch: Partial<DocumentSession>): void {
    this.setState({
      ...this.state,
      sessions: this.state.sessions.map((s) =>
        s.document.id === documentId ? { ...s, ...patch } : s,
      ),
    });
  }

  private setState(next: EditorState): void {
    this.state = next;
    for (const listener of this.listeners) listener();
  }
}
