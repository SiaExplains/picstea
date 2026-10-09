import type { RgbaPixels } from "../selection/flood";
import {
  addNoise,
  boxBlur,
  emboss,
  findEdges,
  gaussianBlur,
  motionBlur,
  pixelate,
  unsharpMask,
} from "./filters";

/**
 * Filter catalogue (docs/05 Phase 8, ADR-0014). A filter is described by data (id, name,
 * parameters) plus one pure function, so the menu, the dialog, validation and the worker job all
 * come from this list. Adding a filter means one entry here.
 *
 * `apply` is synchronous and pure: it runs inside the worker job; the asynchronous part of the
 * docs/05 interface lives in the job runner.
 */

export type FilterParam =
  | {
      readonly kind: "range";
      readonly key: string;
      readonly label: string;
      readonly min: number;
      readonly max: number;
      readonly step: number;
      readonly unit?: string;
      readonly default: number;
    }
  | {
      readonly kind: "toggle";
      readonly key: string;
      readonly label: string;
      readonly default: boolean;
    };

export type FilterValues = Readonly<Record<string, number | boolean>>;

export interface FilterContext {
  /** Seed for filters with randomness, so a preview and the applied result match. */
  readonly seed: number;
}

export interface Filter {
  readonly id: FilterId;
  readonly name: string;
  readonly group: "Blur" | "Sharpen" | "Noise" | "Pixelate" | "Stylize";
  readonly parameters: readonly FilterParam[];
  apply(pixels: RgbaPixels, values: FilterValues, context: FilterContext): RgbaPixels;
}

export type FilterId =
  | "gaussian-blur"
  | "box-blur"
  | "motion-blur"
  | "unsharp-mask"
  | "add-noise"
  | "pixelate"
  | "emboss"
  | "find-edges";

const num = (v: FilterValues, k: string) => v[k] as number;
const bool = (v: FilterValues, k: string) => v[k] as boolean;

export const FILTERS: readonly Filter[] = [
  {
    id: "gaussian-blur",
    name: "Gaussian Blur",
    group: "Blur",
    parameters: [
      {
        kind: "range",
        key: "radius",
        label: "Radius",
        min: 0.1,
        max: 250,
        step: 0.1,
        unit: "px",
        default: 4,
      },
    ],
    apply: (p, v) => gaussianBlur(p, num(v, "radius")),
  },
  {
    id: "box-blur",
    name: "Box Blur",
    group: "Blur",
    parameters: [
      {
        kind: "range",
        key: "radius",
        label: "Radius",
        min: 1,
        max: 250,
        step: 1,
        unit: "px",
        default: 5,
      },
    ],
    apply: (p, v) => boxBlur(p, num(v, "radius")),
  },
  {
    id: "motion-blur",
    name: "Motion Blur",
    group: "Blur",
    parameters: [
      {
        kind: "range",
        key: "angle",
        label: "Angle",
        min: -180,
        max: 180,
        step: 1,
        unit: "°",
        default: 0,
      },
      {
        kind: "range",
        key: "distance",
        label: "Distance",
        min: 1,
        max: 200,
        step: 1,
        unit: "px",
        default: 20,
      },
    ],
    apply: (p, v) => motionBlur(p, num(v, "angle"), num(v, "distance")),
  },
  {
    id: "unsharp-mask",
    name: "Unsharp Mask",
    group: "Sharpen",
    parameters: [
      {
        kind: "range",
        key: "amount",
        label: "Amount",
        min: 1,
        max: 500,
        step: 1,
        unit: "%",
        default: 100,
      },
      {
        kind: "range",
        key: "radius",
        label: "Radius",
        min: 0.1,
        max: 100,
        step: 0.1,
        unit: "px",
        default: 1.5,
      },
      {
        kind: "range",
        key: "threshold",
        label: "Threshold",
        min: 0,
        max: 255,
        step: 1,
        unit: "levels",
        default: 0,
      },
    ],
    apply: (p, v) => unsharpMask(p, num(v, "amount"), num(v, "radius"), num(v, "threshold")),
  },
  {
    id: "add-noise",
    name: "Add Noise",
    group: "Noise",
    parameters: [
      {
        kind: "range",
        key: "amount",
        label: "Amount",
        min: 0,
        max: 100,
        step: 0.5,
        unit: "%",
        default: 10,
      },
      { kind: "toggle", key: "gaussian", label: "Gaussian distribution", default: false },
      { kind: "toggle", key: "monochromatic", label: "Monochromatic", default: false },
    ],
    apply: (p, v, ctx) =>
      addNoise(p, num(v, "amount"), bool(v, "gaussian"), bool(v, "monochromatic"), ctx.seed),
  },
  {
    id: "pixelate",
    name: "Pixelate",
    group: "Pixelate",
    parameters: [
      {
        kind: "range",
        key: "size",
        label: "Cell size",
        min: 2,
        max: 200,
        step: 1,
        unit: "px",
        default: 10,
      },
    ],
    apply: (p, v) => pixelate(p, num(v, "size")),
  },
  {
    id: "emboss",
    name: "Emboss",
    group: "Stylize",
    parameters: [
      {
        kind: "range",
        key: "angle",
        label: "Angle",
        min: -180,
        max: 180,
        step: 1,
        unit: "°",
        default: 135,
      },
      {
        kind: "range",
        key: "height",
        label: "Height",
        min: 1,
        max: 10,
        step: 1,
        unit: "px",
        default: 3,
      },
      {
        kind: "range",
        key: "amount",
        label: "Amount",
        min: 1,
        max: 500,
        step: 1,
        unit: "%",
        default: 100,
      },
    ],
    apply: (p, v) => emboss(p, num(v, "angle"), num(v, "height"), num(v, "amount")),
  },
  {
    id: "find-edges",
    name: "Find Edges",
    group: "Stylize",
    parameters: [],
    apply: (p) => findEdges(p),
  },
];

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
