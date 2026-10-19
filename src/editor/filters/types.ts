import type { RgbaPixels } from "../selection/flood";

/** Filter catalogue types (ADR-0014, ADR-0036). */

export type FilterParam =
  | {
      readonly kind: "range";
      readonly key: string;
      readonly label: string;
      readonly min: number;
      readonly max: number;
      readonly step: number;
      /** "px" values shrink with a reduced-size preview (see `scaleFilterValues`). */
      readonly unit?: string;
      readonly default: number;
    }
  | {
      readonly kind: "toggle";
      readonly key: string;
      readonly label: string;
      readonly default: boolean;
    }
  | {
      /** One of a few named options; the value is the option's index, so values stay numbers. */
      readonly kind: "choice";
      readonly key: string;
      readonly label: string;
      readonly options: readonly string[];
      readonly default: number;
    };

export type FilterValues = Readonly<Record<string, number | boolean>>;

export interface FilterContext {
  /** Seed for filters with randomness, so a preview and the applied result match. */
  readonly seed: number;
}

/** Filter menu sections, in menu order. "Top" filters sit above the submenus. */
export const FILTER_GROUPS = [
  "Top",
  "3D",
  "Blur",
  "Blur Gallery",
  "Distort",
  "Noise",
  "Pixelate",
  "Render",
  "Sharpen",
  "Stylize",
  "Other",
  "Fourier",
] as const;

export type FilterGroup = (typeof FILTER_GROUPS)[number];

export interface FilterDefinition<Id extends string = string> {
  readonly id: Id;
  readonly name: string;
  readonly group: FilterGroup;
  readonly parameters: readonly FilterParam[];
  apply(pixels: RgbaPixels, values: FilterValues, context: FilterContext): RgbaPixels;
}

export const num = (v: FilterValues, k: string) => v[k] as number;
export const bool = (v: FilterValues, k: string) => v[k] as boolean;

/** Shorthand for a range parameter. */
export function range(
  key: string,
  label: string,
  min: number,
  max: number,
  defaultValue: number,
  unit?: string,
  step = 1,
): FilterParam {
  return { kind: "range", key, label, min, max, step, unit, default: defaultValue };
}

export function toggle(key: string, label: string, defaultValue: boolean): FilterParam {
  return { kind: "toggle", key, label, default: defaultValue };
}

export function choice(
  key: string,
  label: string,
  options: readonly string[],
  defaultValue = 0,
): FilterParam {
  return { kind: "choice", key, label, options, default: defaultValue };
}

/** Center X/Y in percent of the layer (50/50 is the middle). */
export const centerParams = (): FilterParam[] => [
  range("cx", "Center X", 0, 100, 50, "%"),
  range("cy", "Center Y", 0, 100, 50, "%"),
];
