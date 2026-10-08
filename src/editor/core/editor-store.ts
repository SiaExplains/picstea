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
import { DEFAULT_VIEWPORT, type Viewport } from "./viewport/viewport";

export type ToolId = "hand" | "zoom";

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
}

export interface EditorState {
  /** Tab order. */
  readonly sessions: readonly DocumentSession[];
  readonly activeDocumentId: string | null;
  readonly activeTool: ToolId;
}

export type DispatchResult = { ok: true; changed: boolean } | { ok: false; error: string };

export type Listener = () => void;

export const isDirty = (session: DocumentSession) => session.revision !== session.savedRevision;

/**
 * The single source of truth for editor state (docs/01_PRODUCT_PRINCIPLES.md §3).
 *
 * Framework-agnostic: React subscribes through useSyncExternalStore, tests drive it directly.
 * State is replaced, never mutated, so snapshots are safe to compare by reference.
 */
export class EditorStore {
  private state: EditorState = { sessions: [], activeDocumentId: null, activeTool: "hand" };
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
    this.setState({ ...this.state, activeDocumentId: documentId });
  }

  setActiveTool(tool: ToolId): void {
    if (this.state.activeTool !== tool) this.setState({ ...this.state, activeTool: tool });
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

  /**
   * Change which layer is active. Selection is UI state, not an edit, so it is not recorded in
   * history and does not mark the document dirty.
   */
  selectLayer(layerId: string, documentId = this.state.activeDocumentId): void {
    const session = this.getSession(documentId);
    if (!session || session.document.activeLayerId === layerId) return;
    if (!session.document.layers.some((l) => l.id === layerId)) return;
    this.updateSession(session.document.id, {
      document: { ...session.document, activeLayerId: layerId },
    });
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
