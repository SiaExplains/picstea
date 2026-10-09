import type { Guide } from "../document/types";
import { createId } from "../ids";
import { CommandError, type Command } from "./command";

/** Same limit as the project validator, so a saved document always reopens. */
export const MAX_GUIDES = 1_000;

function checkPosition(position: number): void {
  if (!Number.isFinite(position) || Math.abs(position) > 1e6) {
    throw new CommandError("That guide position is out of range.");
  }
}

/** Add a guide (Mod+R rulers, drag from a ruler or View → New Guide). Positions are document px. */
export function addGuide(
  orientation: Guide["orientation"],
  position: number,
  id: string = createId("guide"),
): Command {
  return {
    type: "guide.add",
    label: "New Guide",
    apply(doc) {
      checkPosition(position);
      if (doc.guides.length >= MAX_GUIDES)
        throw new CommandError("This document has too many guides.");
      return { ...doc, guides: [...doc.guides, { id, orientation, position }] };
    },
  };
}

/** Move a guide; a drag merges into one undo step. */
export function moveGuide(guideId: string, position: number): Command {
  return {
    type: "guide.move",
    label: "Move Guide",
    mergeKey: `guide.move:${guideId}`,
    mergeUntilSealed: true,
    apply(doc) {
      checkPosition(position);
      const guide = doc.guides.find((g) => g.id === guideId);
      if (!guide) throw new CommandError("That guide no longer exists.");
      if (guide.position === position) return doc;
      return {
        ...doc,
        guides: doc.guides.map((g) => (g.id === guideId ? { ...g, position } : g)),
      };
    },
  };
}

export function removeGuide(guideId: string): Command {
  return {
    type: "guide.remove",
    label: "Delete Guide",
    apply(doc) {
      const guides = doc.guides.filter((g) => g.id !== guideId);
      return guides.length === doc.guides.length ? doc : { ...doc, guides };
    },
  };
}

export function clearGuides(): Command {
  return {
    type: "guide.clear",
    label: "Clear Guides",
    apply(doc) {
      return doc.guides.length === 0 ? doc : { ...doc, guides: [] };
    },
  };
}
