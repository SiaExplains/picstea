import { boxMesh, type WarpMesh } from "./mesh";

/**
 * Warp presets (ADR-0044), named as in Photoshop. Each turns a box into a 4 × 4 control mesh from
 * a bend (−100…100 %) and horizontal/vertical distortion (−100…100 %). The shapes approximate
 * Photoshop's; "custom" is a mesh edited by hand.
 */

export const WARP_STYLES = [
  "arc",
  "arcLower",
  "arcUpper",
  "arch",
  "bulge",
  "flag",
  "wave",
  "fish",
  "rise",
  "fisheye",
  "inflate",
  "squeeze",
  "twist",
] as const;

export type WarpStyle = (typeof WARP_STYLES)[number];

export const WARP_LABELS: Record<WarpStyle | "custom", string> = {
  arc: "Arc",
  arcLower: "Arc Lower",
  arcUpper: "Arc Upper",
  arch: "Arch",
  bulge: "Bulge",
  flag: "Flag",
  wave: "Wave",
  fish: "Fish",
  rise: "Rise",
  fisheye: "Fisheye",
  inflate: "Inflate",
  squeeze: "Squeeze",
  twist: "Twist",
  custom: "Custom",
};

export interface WarpSettings {
  readonly style: WarpStyle;
  /** −1…1 */
  readonly bend: number;
  /** −1…1 */
  readonly horizontal: number;
  /** −1…1 */
  readonly vertical: number;
}

/** 1 in the middle, 0 at both ends (u ∈ 0…1). */
const hump = (t: number) => 1 - (2 * t - 1) ** 2;

/** Displacement (in box fractions) of the point (u, v) for a style at bend `b`. */
function displace(style: WarpStyle, u: number, v: number, b: number): [number, number] {
  const cu = u - 0.5;
  const cv = v - 0.5;
  switch (style) {
    case "arc":
      // The whole box bends; the bottom narrows as it would on a curved band.
      return [-cu * b * 0.4 * v, -b * 0.5 * hump(u)];
    case "arcLower":
      return [0, b * 0.5 * hump(u) * v];
    case "arcUpper":
      return [0, -b * 0.5 * hump(u) * (1 - v)];
    case "arch":
      return [0, -b * 0.5 * hump(u)];
    case "bulge":
      return [0, -b * 0.5 * hump(u) * (1 - 2 * v)];
    case "flag":
      return [0, b * 0.25 * Math.sin(2 * Math.PI * u)];
    case "wave":
      return [0, b * 0.25 * Math.sin(2 * Math.PI * u) * (1 - 2 * v)];
    case "fish":
      return [0, -b * 0.4 * Math.sin(Math.PI * u) * (1 - 2 * v) * (1 - u)];
    case "rise":
      return [0, -b * 0.5 * (2 * u - 1)];
    case "fisheye": {
      const k = b * 0.6 * hump(u) * hump(v);
      return [cu * k, cv * k];
    }
    case "inflate": {
      const k = b * 0.4;
      return [cu * k * hump(v), cv * k * hump(u)];
    }
    case "squeeze":
      return [-cu * b * 0.5 * hump(v), cv * b * 0.3 * hump(u)];
    case "twist": {
      const r = Math.min(1, Math.hypot(cu, cv) * 2);
      const angle = b * (Math.PI / 4) * (1 - r);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [cu * cos - cv * sin - cu, cu * sin + cv * cos - cv];
    }
  }
}

/** The control mesh for `settings` on a w × h box. */
export function presetMesh(w: number, h: number, settings: WarpSettings): WarpMesh {
  const out = [...boxMesh(w, h)];
  const b = clamp(settings.bend);
  const hd = clamp(settings.horizontal);
  const vd = clamp(settings.vertical);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const u = j / 3;
      const v = i / 3;
      let [dx, dy] = b === 0 ? [0, 0] : displace(settings.style, u, v, b);
      // Horizontal distortion: the right side grows taller and the left shorter (or the reverse);
      // vertical distortion does the same for the bottom and top widths.
      dy += hd * (v - 0.5) * (u - 0.5);
      dx += vd * (u - 0.5) * (v - 0.5);
      const k = (i * 4 + j) * 2;
      out[k] += dx * w;
      out[k + 1] += dy * h;
    }
  }
  return out;
}

const clamp = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(-1, v)) : 0);
