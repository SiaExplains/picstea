import { isFontFamilyName } from "../document/text";
import type { DocumentFont } from "../document/types";
import { CommandError, type Command } from "./command";

/** Same limit as the project validator. */
export const MAX_DOCUMENT_FONTS = 500;

const sameFace = (a: DocumentFont, b: DocumentFont) =>
  a.family === b.family && a.weight === b.weight && a.italic === b.italic;

/**
 * Remember fonts the document uses beyond the system fonts (ADR-0040): a font on this computer
 * or an uploaded font file. A face already listed is replaced (e.g. re-uploaded).
 */
export function addDocumentFonts(fonts: readonly DocumentFont[], label = "Add Font"): Command {
  return {
    type: "document.fonts",
    label,
    apply(doc) {
      for (const font of fonts) {
        if (!isFontFamilyName(font.family)) throw new CommandError("Unknown font.");
        if (font.source === "uploaded" && !font.assetId) {
          throw new CommandError("The font file is missing.");
        }
      }
      const kept = (doc.fonts ?? []).filter((f) => !fonts.some((n) => sameFace(f, n)));
      const next = [...kept, ...fonts];
      if (next.length > MAX_DOCUMENT_FONTS) {
        throw new CommandError("This document uses too many fonts.");
      }
      return { ...doc, fonts: next };
    },
  };
}
