import { checkDimensions } from "../document/limits";
import { CommandError, type Command } from "./command";
import { translateAllLayers } from "./group-commands";

export const MAX_DOCUMENT_NAME_LENGTH = 255;

export function renameDocument(name: string): Command {
  return {
    type: "document.rename",
    label: "Rename Document",
    apply(doc) {
      const trimmed = name.trim();
      if (!trimmed) throw new CommandError("Document name cannot be empty.");
      if (trimmed.length > MAX_DOCUMENT_NAME_LENGTH) {
        throw new CommandError(
          `Document name can be at most ${MAX_DOCUMENT_NAME_LENGTH} characters.`,
        );
      }
      if (trimmed === doc.name) return doc;
      return { ...doc, name: trimmed };
    },
  };
}

export type CanvasAnchor = "top-left" | "center";

/**
 * Change the canvas size without resampling content. Layers keep their pixels; with a centre
 * anchor they shift so the old canvas stays centred in the new one.
 */
export function resizeCanvas(width: number, height: number, anchor: CanvasAnchor): Command {
  return {
    type: "document.resizeCanvas",
    label: "Canvas Size",
    apply(doc) {
      const check = checkDimensions(width, height);
      if (!check.ok) throw new CommandError(check.reason);
      if (width === doc.width && height === doc.height) return doc;
      const dx = anchor === "center" ? Math.round((width - doc.width) / 2) : 0;
      const dy = anchor === "center" ? Math.round((height - doc.height) / 2) : 0;
      const layers = translateAllLayers(doc, dx, dy);
      return { ...doc, width, height, layers };
    },
  };
}
