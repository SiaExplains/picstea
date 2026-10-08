import type { Matrix } from "../geometry/matrix";
import type { EditorDocument } from "../document/types";
import { selectAll as fullSelection, type SelectionMask } from "../../selection/mask";
import {
  contractSelection,
  expandSelection,
  featherSelection,
  MAX_MODIFY_RADIUS,
  transformSelection as transformMask,
} from "../../selection/modify";
import { invertSelection, translateSelection } from "../../selection/ops";
import { CommandError, type Command } from "./command";

/**
 * Selection commands (ADR-0010). The selection is part of the document so every change is
 * undoable; an empty result is stored as "no selection".
 */

/** The document without a selection (used when the canvas size changes). */
export function withoutSelection(doc: EditorDocument): EditorDocument {
  if (!doc.selection) return doc;
  const next = { ...doc };
  delete (next as { selection?: SelectionMask }).selection;
  return next;
}

function withSelection(doc: EditorDocument, mask: SelectionMask | null): EditorDocument {
  if (!mask || !mask.bounds) return withoutSelection(doc);
  if (mask === doc.selection) return doc;
  if (mask.width !== doc.width || mask.height !== doc.height) {
    throw new CommandError("The selection does not match the canvas size.");
  }
  return { ...doc, selection: mask };
}

export function setSelection(mask: SelectionMask | null, label = "Selection"): Command {
  return { type: "selection.set", label, apply: (doc) => withSelection(doc, mask) };
}

export const selectAllCommand = (): Command => ({
  type: "selection.all",
  label: "Select All",
  apply: (doc) => withSelection(doc, fullSelection(doc.width, doc.height)),
});

export const deselect = (): Command => ({
  type: "selection.deselect",
  label: "Deselect",
  apply: withoutSelection,
});

export const invertSelectionCommand = (): Command => ({
  type: "selection.invert",
  label: "Select Inverse",
  apply: (doc) => withSelection(doc, invertSelection(doc.selection, doc.width, doc.height)),
});

export type SelectionModification = "feather" | "expand" | "contract";

const MODIFY_LABELS: Record<SelectionModification, string> = {
  feather: "Feather",
  expand: "Expand Selection",
  contract: "Contract Selection",
};

export function modifySelection(kind: SelectionModification, radius: number): Command {
  return {
    type: "selection.modify",
    label: MODIFY_LABELS[kind],
    apply(doc) {
      const current = doc.selection;
      if (!current) throw new CommandError("Make a selection first.");
      if (!Number.isFinite(radius) || radius <= 0 || radius > MAX_MODIFY_RADIUS) {
        throw new CommandError(`Enter a radius between 1 and ${MAX_MODIFY_RADIUS} pixels.`);
      }
      const op =
        kind === "feather"
          ? featherSelection
          : kind === "expand"
            ? expandSelection
            : contractSelection;
      return withSelection(doc, op(current, radius));
    },
  };
}

/** Move the selection outline. Consecutive nudges of one gesture merge into one undo step. */
export function moveSelection(dx: number, dy: number, mergeKey?: string): Command {
  return {
    type: "selection.move",
    label: "Move Selection",
    mergeKey,
    apply(doc) {
      if (!doc.selection) return doc;
      return withSelection(doc, translateSelection(doc.selection, dx, dy));
    },
  };
}

export function transformSelectionCommand(matrix: Matrix): Command {
  return {
    type: "selection.transform",
    label: "Transform Selection",
    apply(doc) {
      if (!doc.selection) throw new CommandError("Make a selection first.");
      return withSelection(doc, transformMask(doc.selection, matrix));
    },
  };
}
