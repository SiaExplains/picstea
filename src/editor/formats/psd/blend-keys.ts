import type { BlendMode, GroupBlendMode } from "../../core/document/types";

/** Photoshop blend-mode keys (4 characters) for the modes Picstea supports. */
const TO_KEY: Record<GroupBlendMode, string> = {
  "pass-through": "pass",
  normal: "norm",
  multiply: "mul ",
  screen: "scrn",
  overlay: "over",
  darken: "dark",
  lighten: "lite",
  "color-dodge": "div ",
  "color-burn": "idiv",
  "hard-light": "hLit",
  "soft-light": "sLit",
  difference: "diff",
  exclusion: "smud",
  hue: "hue ",
  saturation: "sat ",
  color: "colr",
  luminosity: "lum ",
};

const FROM_KEY = new Map<string, GroupBlendMode>(
  (Object.entries(TO_KEY) as [GroupBlendMode, string][]).map(([mode, key]) => [key, mode]),
);

export const blendKey = (mode: GroupBlendMode): string => TO_KEY[mode];

/** The Picstea mode for a Photoshop key, or null for modes we do not have (e.g. "lbrn"). */
export function blendModeFromKey(key: string): GroupBlendMode | null {
  return FROM_KEY.get(key) ?? null;
}

export const isLayerBlend = (mode: GroupBlendMode): mode is BlendMode => mode !== "pass-through";
