import type { EditorDocument } from "../document/types";

/**
 * Undo/redo as an immutable value. Each entry keeps the document before and after a change.
 * Because documents share structure and pixels live in immutable assets, an entry costs roughly
 * the size of the changed path, not a copy of the image (ADR-0003).
 */
export interface HistoryEntry {
  readonly label: string;
  readonly before: EditorDocument;
  readonly after: EditorDocument;
  readonly mergeKey?: string;
  /** Merge with later same-key changes regardless of time until sealed (pointer gestures). */
  readonly mergeUntilSealed?: boolean;
  /** ms since epoch of the last change merged into this entry */
  readonly timestamp: number;
}

export interface HistoryState {
  /** Oldest first. */
  readonly past: readonly HistoryEntry[];
  /** Next redo first. */
  readonly future: readonly HistoryEntry[];
  readonly limit: number;
}

export const DEFAULT_HISTORY_LIMIT = 200;
export const MERGE_WINDOW_MS = 1000;

export function createHistory(limit = DEFAULT_HISTORY_LIMIT): HistoryState {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError("History limit must be ≥ 1.");
  return { past: [], future: [], limit };
}

export function recordChange(
  state: HistoryState,
  change: Omit<HistoryEntry, "timestamp">,
  now: number,
): HistoryState {
  const last = state.past.at(-1);
  const canMerge =
    change.mergeKey !== undefined &&
    last !== undefined &&
    last.mergeKey === change.mergeKey &&
    last.after === change.before &&
    (change.mergeUntilSealed === true || now - last.timestamp <= MERGE_WINDOW_MS);

  if (canMerge) {
    const merged: HistoryEntry = { ...last, after: change.after, timestamp: now };
    return { ...state, past: [...state.past.slice(0, -1), merged], future: [] };
  }

  const past = [...state.past, { ...change, timestamp: now }];
  const overflow = past.length - state.limit;
  return { ...state, past: overflow > 0 ? past.slice(overflow) : past, future: [] };
}

export interface HistoryStep {
  readonly state: HistoryState;
  readonly document: EditorDocument;
  readonly label: string;
}

export function undo(state: HistoryState): HistoryStep | null {
  const entry = state.past.at(-1);
  if (!entry) return null;
  return {
    state: { ...state, past: state.past.slice(0, -1), future: [entry, ...state.future] },
    document: entry.before,
    label: entry.label,
  };
}

export function redo(state: HistoryState): HistoryStep | null {
  const entry = state.future[0];
  if (!entry) return null;
  return {
    state: { ...state, past: [...state.past, entry], future: state.future.slice(1) },
    document: entry.after,
    label: entry.label,
  };
}

/** Prevent a later change from merging into the current top entry (e.g. on pointer up). */
export function sealHistory(state: HistoryState): HistoryState {
  const last = state.past.at(-1);
  if (!last || last.mergeKey === undefined) return state;
  const sealed: HistoryEntry = {
    label: last.label,
    before: last.before,
    after: last.after,
    timestamp: last.timestamp,
  };
  return { ...state, past: [...state.past.slice(0, -1), sealed] };
}

export const canUndo = (state: HistoryState) => state.past.length > 0;
export const canRedo = (state: HistoryState) => state.future.length > 0;
export const undoLabel = (state: HistoryState) => state.past.at(-1)?.label ?? null;
export const redoLabel = (state: HistoryState) => state.future[0]?.label ?? null;

/** Remove the `count` oldest undo entries (used to stay within the pixel-memory budget). */
export function dropOldest(state: HistoryState, count: number): HistoryState {
  if (count <= 0 || state.past.length === 0) return state;
  return { ...state, past: state.past.slice(Math.min(count, state.past.length)) };
}

/**
 * Undo or redo until `pastLength` entries remain in the past (History panel). `null` when the
 * target is out of range or already current.
 */
export function jumpTo(state: HistoryState, pastLength: number): HistoryStep | null {
  const total = state.past.length + state.future.length;
  if (!Number.isInteger(pastLength) || pastLength < 0 || pastLength > total) return null;
  if (pastLength === state.past.length) return null;
  const all = [...state.past, ...state.future];
  const next: HistoryState = {
    ...state,
    past: all.slice(0, pastLength),
    future: all.slice(pastLength),
  };
  const document =
    pastLength < state.past.length ? all[pastLength].before : all[pastLength - 1].after;
  const label = (pastLength < state.past.length ? all[pastLength] : all[pastLength - 1]).label;
  return { state: next, document, label };
}

/**
 * Fold every entry recorded since the document was `before` into one undo step (action
 * playback). Unchanged when no entry starts at `before` — e.g. it was trimmed for memory.
 */
export function collapseSince(
  state: HistoryState,
  before: EditorDocument,
  label: string,
): HistoryState {
  let start = -1;
  for (let i = state.past.length - 1; i >= 0; i--) {
    if (state.past[i].before === before) {
      start = i;
      break;
    }
  }
  if (start < 0) return state;
  const last = state.past.at(-1)!;
  const merged: HistoryEntry = { label, before, after: last.after, timestamp: last.timestamp };
  return { ...state, past: [...state.past.slice(0, start), merged] };
}
