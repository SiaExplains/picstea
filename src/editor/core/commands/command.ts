import type { EditorDocument, Layer } from "../document/types";

/**
 * An editing operation (docs/01_PRODUCT_PRINCIPLES.md §4).
 *
 * `apply` is a pure function from document to document. Returning the same instance means
 * "nothing changed" and the operation is not recorded in history. Undo works by restoring the
 * previous immutable document (see ADR-0003), so commands do not implement their own inverse.
 */
export interface Command {
  readonly type: string;
  /** Human-readable, shown in Edit → Undo and the future history panel. */
  readonly label: string;
  /**
   * Consecutive commands with the same key (within the history merge window) collapse into one
   * undo step — e.g. every tick of an opacity slider drag.
   */
  readonly mergeKey?: string;
  apply(doc: EditorDocument): EditorDocument;
}

/** A command that cannot be applied to the given document. The message is user-facing. */
export class CommandError extends Error {
  override name = "CommandError";
}

export function requireLayer(doc: EditorDocument, layerId: string): Layer {
  const layer = doc.layers.find((l) => l.id === layerId);
  if (!layer) throw new CommandError("That layer no longer exists.");
  return layer;
}

export function requireUnlocked(layer: Layer): void {
  if (layer.locked) throw new CommandError(`"${layer.name}" is locked. Unlock it to edit it.`);
}

export function replaceLayer(doc: EditorDocument, next: Layer): EditorDocument {
  return { ...doc, layers: doc.layers.map((layer) => (layer.id === next.id ? next : layer)) };
}
