import type { RgbaPixels } from "../selection/flood";
import { BLUR_FILTERS } from "./catalogue/blur";
import { BLUR_GALLERY_FILTERS } from "./catalogue/blur-gallery";
import { DISTORT_FILTERS } from "./catalogue/distort";
import { FOURIER_FILTERS } from "./catalogue/fourier";
import { NOISE_FILTERS } from "./catalogue/noise";
import { OTHER_FILTERS } from "./catalogue/other";
import { PIXELATE_FILTERS } from "./catalogue/pixelate";
import { RENDER_FILTERS } from "./catalogue/render";
import { SHARPEN_FILTERS } from "./catalogue/sharpen";
import { STYLIZE_FILTERS } from "./catalogue/stylize";
import { THREE_D_FILTERS } from "./catalogue/three-d";
import { TOP_FILTERS } from "./catalogue/top";
import type { FilterContext, FilterDefinition, FilterValues } from "./types";

export type { FilterContext, FilterGroup, FilterParam, FilterValues } from "./types";
export { FILTER_GROUPS } from "./types";

/**
 * Filter catalogue (docs/05 Phase 8, ADR-0014, ADR-0036). A filter is described by data (id,
 * name, parameters) plus one pure function, so the menu, the dialog, validation and the worker
 * job all come from this list. Adding a filter means one entry in its group's
 * `catalogue/*.ts` file.
 *
 * `apply` is synchronous and pure: it runs inside the worker job; the asynchronous part of the
 * docs/05 interface lives in the job runner.
 */

const CATALOGUE = [
  ...TOP_FILTERS,
  ...THREE_D_FILTERS,
  ...BLUR_FILTERS,
  ...BLUR_GALLERY_FILTERS,
  ...DISTORT_FILTERS,
  ...NOISE_FILTERS,
  ...PIXELATE_FILTERS,
  ...RENDER_FILTERS,
  ...SHARPEN_FILTERS,
  ...STYLIZE_FILTERS,
  ...OTHER_FILTERS,
  ...FOURIER_FILTERS,
] as const;

export type FilterId = (typeof CATALOGUE)[number]["id"];
export type Filter = FilterDefinition<FilterId>;

export const FILTERS: readonly Filter[] = CATALOGUE;

export function filterById(id: string): Filter | undefined {
  return FILTERS.find((f) => f.id === id);
}

export function defaultFilterValues(filter: Filter): FilterValues {
  return Object.fromEntries(filter.parameters.map((p) => [p.key, p.default]));
}

/** Validate filter values from untrusted input (a worker message, stored settings); null if invalid. */
export function parseFilterValues(filter: Filter, value: unknown): FilterValues | null {
  if (typeof value !== "object" || value === null) return null;
  const out: Record<string, number | boolean> = {};
  for (const p of filter.parameters) {
    const v = (value as Record<string, unknown>)[p.key];
    if (p.kind === "toggle") {
      if (typeof v !== "boolean") return null;
    } else if (p.kind === "choice") {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v >= p.options.length) {
        return null;
      }
    } else if (typeof v !== "number" || !Number.isFinite(v) || v < p.min || v > p.max) {
      return null;
    }
    out[p.key] = v;
  }
  return out;
}

/** Run a filter by id with validated values; throws on unknown filters or bad values. */
export function runFilter(
  id: string,
  pixels: RgbaPixels,
  values: unknown,
  context: FilterContext,
): RgbaPixels {
  const filter = filterById(id);
  if (!filter) throw new Error("Unknown filter.");
  const parsed = parseFilterValues(filter, values);
  if (!parsed) throw new Error("Invalid filter settings.");
  if (pixels.data.length !== pixels.width * pixels.height * 4) throw new Error("Invalid pixels.");
  return filter.apply(pixels, parsed, context);
}

/**
 * Settings for running a filter on pixels resampled by `scale` (a reduced-size preview): sizes
 * in pixels shrink with the image so the preview looks like the full-size result.
 */
export function scaleFilterValues(
  filter: Filter,
  values: FilterValues,
  scale: number,
): FilterValues {
  if (scale === 1) return values;
  const out: Record<string, number | boolean> = { ...values };
  for (const p of filter.parameters) {
    if (p.kind === "range" && p.unit === "px") {
      out[p.key] = Math.min(p.max, Math.max(p.min, (values[p.key] as number) * scale));
    }
  }
  return out;
}
