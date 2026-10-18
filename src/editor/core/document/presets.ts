import { checkDimensions } from "./limits";

/**
 * New-document size presets, grouped by what the image is for. Physical sizes (print, photo)
 * carry their own resolution; pixel sizes use 72 ppi, the screen convention.
 */

export type SizeUnit = "px" | "in" | "cm" | "mm";

export const SIZE_UNITS: readonly SizeUnit[] = ["px", "in", "cm", "mm"];

export const MIN_PPI = 1;
export const MAX_PPI = 10_000;

export interface SizePreset {
  readonly id: string;
  readonly name: string;
  /** In `unit`. */
  readonly width: number;
  readonly height: number;
  readonly unit: SizeUnit;
  /** Pixels per inch. */
  readonly ppi: number;
}

export interface PresetCategory {
  readonly id: string;
  readonly label: string;
  readonly presets: readonly SizePreset[];
}

const UNITS_PER_INCH: Record<SizeUnit, number> = { px: 0, in: 1, cm: 2.54, mm: 25.4 };

/** Size in `unit` to whole pixels at `ppi`, rounded the way Photoshop does. */
export function toPixels(value: number, unit: SizeUnit, ppi: number): number {
  if (unit === "px") return Math.round(value);
  return Math.round((value / UNITS_PER_INCH[unit]) * ppi);
}

/**
 * Pixels to `unit` at `ppi`, with at least two decimals and as many more as it takes for
 * `toPixels` to give back the same pixels (whole numbers for px).
 */
export function fromPixels(pixels: number, unit: SizeUnit, ppi: number): number {
  if (unit === "px") return Math.round(pixels);
  const pixelsPerUnit = ppi / UNITS_PER_INCH[unit];
  const decimals = Math.min(6, Math.max(2, Math.floor(Math.log10(pixelsPerUnit)) + 1));
  const factor = 10 ** decimals;
  return Math.round((pixels / pixelsPerUnit) * factor) / factor;
}

export function presetPixels(preset: Pick<SizePreset, "width" | "height" | "unit" | "ppi">) {
  return {
    width: toPixels(preset.width, preset.unit, preset.ppi),
    height: toPixels(preset.height, preset.unit, preset.ppi),
  };
}

/** "1080 × 1920 px", "210 × 297 mm". */
export function formatPresetSize(preset: Pick<SizePreset, "width" | "height" | "unit">): string {
  return `${preset.width} × ${preset.height} ${preset.unit}`;
}

type Row = readonly [name: string, width: number, height: number];

function group(
  id: string,
  label: string,
  unit: SizeUnit,
  ppi: number,
  rows: readonly Row[],
  overrides: Readonly<Record<string, number>> = {},
): PresetCategory {
  return {
    id,
    label,
    presets: rows.map(([name, width, height]) => ({
      id: `${id}-${name
        .toLowerCase()
        .replace(/\+/g, " plus")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`,
      name,
      width,
      height,
      unit,
      ppi: overrides[name] ?? ppi,
    })),
  };
}

export const PRESET_CATEGORIES: readonly PresetCategory[] = [
  group("social", "Social", "px", 72, [
    ["Instagram post", 1080, 1080],
    ["Instagram portrait", 1080, 1350],
    ["Instagram story", 1080, 1920],
    ["TikTok video", 1080, 1920],
    ["Facebook post", 1200, 630],
    ["Facebook cover", 1640, 624],
    ["Facebook event", 1920, 1005],
    ["YouTube thumbnail", 1280, 720],
    ["YouTube banner", 2560, 1440],
    ["YouTube profile", 800, 800],
    ["X post", 1600, 900],
    ["X header", 1500, 500],
    ["X profile", 400, 400],
    ["LinkedIn post", 1200, 627],
    ["LinkedIn banner", 1584, 396],
    ["Pinterest pin", 1000, 1500],
  ]),
  {
    id: "print",
    label: "Print",
    presets: [
      ...group("print", "Print", "mm", 300, [
        ["A2", 420, 594],
        ["A3", 297, 420],
        ["A4", 210, 297],
        ["A5", 148, 210],
        ["A6", 105, 148],
        ["B4", 250, 353],
        ["B5", 176, 250],
        ["Business card (EU)", 85, 55],
      ]).presets,
      ...group("print", "Print", "in", 300, [
        ["Letter", 8.5, 11],
        ["Legal", 8.5, 14],
        ["Tabloid", 11, 17],
        ["Business card (US)", 3.5, 2],
        ["Postcard", 6, 4],
      ]).presets,
    ],
  },
  // Large prints at 300 ppi would pass the memory limit; 150 ppi is plenty at viewing distance.
  group(
    "photo",
    "Photo",
    "in",
    300,
    [
      ["Wallet", 2, 3],
      ["3.5 × 5", 3.5, 5],
      ["4 × 6", 4, 6],
      ["5 × 7", 5, 7],
      ["8 × 10", 8, 10],
      ["8 × 12", 8, 12],
      ["11 × 14", 11, 14],
      ["12 × 18", 12, 18],
      ["16 × 20", 16, 20],
      ["16 × 24", 16, 24],
      ["20 × 30", 20, 30],
      ["24 × 36", 24, 36],
    ],
    { "20 × 30": 150, "24 × 36": 150 },
  ),
  group("screen", "Screen", "px", 72, [
    ["VGA", 640, 480],
    ["XGA", 1024, 768],
    ["HD", 1280, 720],
    ["WXGA", 1366, 768],
    ["HD+", 1600, 900],
    ["Full HD", 1920, 1080],
    ["2K", 2048, 1080],
    ["QHD", 2560, 1440],
    ["MacBook Air 13″", 2560, 1664],
    ["4K UHD", 3840, 2160],
    ["4K DCI", 4096, 2160],
  ]),
  group("mobile", "Mobile", "px", 72, [
    ["iPhone SE", 750, 1334],
    ["iPhone 16", 1179, 2556],
    ["iPhone 16 Pro Max", 1320, 2868],
    ["Android", 1080, 2400],
    ["Galaxy S24", 1080, 2340],
    ["Pixel 9", 1080, 2424],
    ["iPad", 1640, 2360],
    ["iPad Pro 13″", 2064, 2752],
  ]),
  group("ads", "Ads", "px", 72, [
    ["Medium rectangle", 300, 250],
    ["Large rectangle", 336, 280],
    ["Square", 250, 250],
    ["Small square", 200, 200],
    ["Banner", 468, 60],
    ["Leaderboard", 728, 90],
    ["Large leaderboard", 970, 90],
    ["Billboard", 970, 250],
    ["Half page", 300, 600],
    ["Wide skyscraper", 160, 600],
    ["Skyscraper", 120, 600],
    ["Mobile banner", 320, 50],
    ["Large mobile banner", 320, 100],
  ]),
  group("icons", "Icons", "px", 72, [
    ["Icon 16", 16, 16],
    ["Icon 32", 32, 32],
    ["Icon 48", 48, 48],
    ["Icon 64", 64, 64],
    ["Icon 128", 128, 128],
    ["Icon 256", 256, 256],
    ["Icon 512", 512, 512],
    ["Icon 1024", 1024, 1024],
    ["Icon 2048", 2048, 2048],
    ["Icon 4096", 4096, 4096],
  ]),
];

export const ALL_PRESETS: readonly SizePreset[] = PRESET_CATEGORIES.flatMap((c) => c.presets);

/** Presets whose name, category or size contains every word of `query`. */
export function searchPresets(query: string): SizePreset[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return PRESET_CATEGORIES.flatMap((category) =>
    category.presets.filter((preset) => {
      const haystack = [
        preset.name,
        category.label,
        formatPresetSize(preset),
        `${preset.width}x${preset.height}`,
      ]
        .join(" ")
        .toLowerCase();
      return words.every((w) => haystack.includes(w));
    }),
  );
}

// --- recent sizes (per browser; the UI persists them)

export const MAX_RECENT_SIZES = 6;

export type RecentSize = Pick<SizePreset, "width" | "height" | "unit" | "ppi">;

const sameSize = (a: RecentSize, b: RecentSize) =>
  a.width === b.width && a.height === b.height && a.unit === b.unit && a.ppi === b.ppi;

/** Most recent first, without duplicates. */
export function addRecentSize(list: readonly RecentSize[], size: RecentSize): RecentSize[] {
  return [size, ...list.filter((s) => !sameSize(s, size))].slice(0, MAX_RECENT_SIZES);
}

/** Read stored recent sizes, dropping anything malformed or over the limits. */
export function parseRecentSizes(value: unknown): RecentSize[] {
  if (!Array.isArray(value)) return [];
  const out: RecentSize[] = [];
  for (const item of value.slice(0, MAX_RECENT_SIZES)) {
    if (typeof item !== "object" || item === null) continue;
    const get = (key: string): unknown =>
      Object.hasOwn(item, key) ? (item as Record<string, unknown>)[key] : undefined;
    const width = get("width");
    const height = get("height");
    const unit = get("unit");
    const ppi = get("ppi");
    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      typeof ppi !== "number" ||
      !SIZE_UNITS.includes(unit as SizeUnit) ||
      !Number.isFinite(ppi) ||
      ppi < MIN_PPI ||
      ppi > MAX_PPI
    ) {
      continue;
    }
    const size = { width, height, unit: unit as SizeUnit, ppi };
    const px = presetPixels(size);
    if (!checkDimensions(px.width, px.height).ok) continue;
    out.push(size);
  }
  return out;
}
