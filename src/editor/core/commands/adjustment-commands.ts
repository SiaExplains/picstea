import { parseAdjustment } from "../../adjustments/registry";
import type { Adjustment } from "../document/types";
import { CommandError, replaceLayer, requireLayer, requireUnlocked, type Command } from "./command";

/** Change an adjustment layer's settings (slider drags merge into one undo step). */
export function setAdjustment(layerId: string, adjustment: Adjustment): Command {
  return {
    type: "layer.adjustment",
    label: "Adjustment",
    mergeKey: `layer.adjustment:${layerId}`,
    apply(doc) {
      const layer = requireLayer(doc, layerId);
      if (layer.kind !== "adjustment")
        throw new CommandError("That layer is not an adjustment layer.");
      requireUnlocked(layer, doc);
      const parsed = parseAdjustment(adjustment);
      if (!parsed || parsed.type !== layer.adjustment.type) {
        throw new CommandError("Those adjustment settings are out of range.");
      }
      if (JSON.stringify(parsed) === JSON.stringify(layer.adjustment)) return doc;
      return replaceLayer(doc, { ...layer, adjustment: parsed });
    },
  };
}
