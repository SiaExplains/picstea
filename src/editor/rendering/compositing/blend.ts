import type { BlendMode, GroupBlendMode } from "../../core/document/types";

/** Canvas composite operations for the document blend modes. */
const COMPOSITE_OPERATION: Record<BlendMode, GlobalCompositeOperation> = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  "color-dodge": "color-dodge",
  "color-burn": "color-burn",
  "hard-light": "hard-light",
  "soft-light": "soft-light",
  difference: "difference",
  exclusion: "exclusion",
  hue: "hue",
  saturation: "saturation",
  color: "color",
  luminosity: "luminosity",
};

export function compositeOperation(mode: GroupBlendMode): GlobalCompositeOperation {
  return mode === "pass-through" ? "source-over" : COMPOSITE_OPERATION[mode];
}
