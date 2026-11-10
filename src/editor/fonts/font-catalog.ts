import { SYSTEM_FONTS } from "../core/document/types";
import { BUNDLED_FONT_DATA } from "./bundled-fonts";

/** The fonts Picstea offers (ADR-0040). Pure data and lookups; loading is in font-library.ts. */

export type FontCategory = "sans-serif" | "serif" | "display" | "handwriting" | "monospace";

export interface BundledFace {
  readonly weight: 400 | 700;
  readonly italic: boolean;
  /** Same-origin URL under /fonts. */
  readonly url: string;
  readonly postscriptName: string;
}

export interface BundledFont {
  readonly family: string;
  readonly category: FontCategory;
  readonly faces: readonly BundledFace[];
}

/** PostScript names of the system fonts, for PSD export (Photoshop identifies fonts by them). */
const SYSTEM_POSTSCRIPT: Record<string, readonly [string, string, string, string]> = {
  // Regular, Bold, Italic, BoldItalic
  Arial: ["ArialMT", "Arial-BoldMT", "Arial-ItalicMT", "Arial-BoldItalicMT"],
  Helvetica: ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique"],
  Verdana: ["Verdana", "Verdana-Bold", "Verdana-Italic", "Verdana-BoldItalic"],
  "Trebuchet MS": ["TrebuchetMS", "TrebuchetMS-Bold", "TrebuchetMS-Italic", "Trebuchet-BoldItalic"],
  Georgia: ["Georgia", "Georgia-Bold", "Georgia-Italic", "Georgia-BoldItalic"],
  "Times New Roman": [
    "TimesNewRomanPSMT",
    "TimesNewRomanPS-BoldMT",
    "TimesNewRomanPS-ItalicMT",
    "TimesNewRomanPS-BoldItalicMT",
  ],
  "Courier New": [
    "CourierNewPSMT",
    "CourierNewPS-BoldMT",
    "CourierNewPS-ItalicMT",
    "CourierNewPS-BoldItalicMT",
  ],
  Impact: ["Impact", "Impact", "Impact", "Impact"],
  "system-ui": ["ArialMT", "Arial-BoldMT", "Arial-ItalicMT", "Arial-BoldItalicMT"],
};

export const isSystemFont = (family: string) =>
  (SYSTEM_FONTS as readonly string[]).includes(family);

/** A PostScript name for a family and style (best effort for fonts we know nothing about). */
export function postscriptNameFor(
  family: string,
  weight: 400 | 700,
  italic: boolean,
  bundled: readonly BundledFont[],
  known?: string,
): string {
  if (known) return known;
  const index = (weight === 700 ? 1 : 0) + (italic ? 2 : 0);
  const system = SYSTEM_POSTSCRIPT[family];
  if (system) return system[index];
  const face = bundled
    .find((f) => f.family === family)
    ?.faces.find((f) => f.weight === weight && f.italic === italic);
  if (face) return face.postscriptName;
  const style = ["Regular", "Bold", "Italic", "BoldItalic"][index];
  return `${family.replace(/\s+/g, "")}-${style}`;
}

/** Normalised for matching: lower case, letters and digits only. */
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Style suffixes PostScript names carry after the family ("-BoldItalic", "MT", …). */
const STYLE_SUFFIX =
  /[-_]?(regular|roman|book|normal|bold|semibold|demibold|extrabold|black|heavy|light|thin|medium|italic|oblique|it|ps|mt|psmt)*$/i;

/**
 * Which known family a Photoshop PostScript name belongs to: system fonts, then bundled Google
 * Fonts, then `extra` families (fonts on this computer or uploaded). Null when unknown.
 */
export function familyForPostscript(
  postscriptName: string,
  bundled: readonly BundledFont[],
  extra: readonly { family: string; postscriptName?: string }[] = [],
): string | null {
  const exact = extra.find((f) => f.postscriptName === postscriptName);
  if (exact) return exact.family;
  for (const [family, names] of Object.entries(SYSTEM_POSTSCRIPT)) {
    if (family !== "system-ui" && names.includes(postscriptName)) return family;
  }
  for (const font of bundled) {
    if (font.faces.some((f) => f.postscriptName === postscriptName)) return font.family;
  }
  const stem = key(postscriptName.split("-")[0].replace(STYLE_SUFFIX, ""));
  const all = [
    ...Object.keys(SYSTEM_POSTSCRIPT).filter((f) => f !== "system-ui"),
    ...bundled.map((f) => f.family),
    ...extra.map((f) => f.family),
  ];
  return all.find((family) => key(family) === stem) ?? null;
}

/** Weight and italic from a PostScript name such as "Montserrat-BoldItalic". */
export function styleOfPostscript(postscriptName: string): { weight: 400 | 700; italic: boolean } {
  const style = postscriptName.includes("-")
    ? postscriptName.slice(postscriptName.indexOf("-"))
    : "";
  return {
    weight: /bold|black|heavy/i.test(style) ? 700 : 400,
    italic: /italic|oblique|-it$/i.test(style),
  };
}

const PS_STYLE = ["Regular", "Italic", "Bold", "BoldItalic"] as const;

/** Picstea's bundled Google Fonts (ADR-0040), expanded from the compact generated list. */
export const BUNDLED_FONTS: readonly BundledFont[] = BUNDLED_FONT_DATA.map(
  ([family, category, id, bits]) => ({
    family,
    category,
    faces: ([0, 1, 2, 3] as const)
      .filter((i) => bits & (1 << i))
      .map((i) => {
        const weight = i >= 2 ? 700 : 400;
        const italic = i % 2 === 1;
        return {
          weight,
          italic,
          url: `/fonts/${id}/${id}-latin-${weight}-${italic ? "italic" : "normal"}.woff2`,
          postscriptName: `${family.replace(/\s+/g, "")}-${PS_STYLE[i]}`,
        } as BundledFace;
      }),
  }),
);
