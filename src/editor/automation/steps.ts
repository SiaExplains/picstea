import { adjustmentDefinition, parseAdjustment } from "../adjustments/registry";
import { parseHexColor } from "../core/color";
import type { SelectionModification } from "../core/commands/selection-commands";
import type { Adjustment } from "../core/document/types";
import { ALIGN_LABELS, type AlignEdge } from "../core/geometry/snapping";
import {
  filterById,
  parseFilterValues,
  type FilterId,
  type FilterValues,
} from "../filters/registry";
import { MAX_MODIFY_RADIUS } from "../selection/modify";

/**
 * One recorded step of an action (ADR-0018). Steps are plain data — never closures — so actions
 * can be stored, exported and replayed; each one maps to a single controller operation.
 */
export type ActionStep =
  | { readonly type: "filter"; readonly filterId: FilterId; readonly values: FilterValues }
  | { readonly type: "adjustment"; readonly adjustment: Adjustment }
  | { readonly type: "flip"; readonly axis: "horizontal" | "vertical" }
  | { readonly type: "align"; readonly edge: AlignEdge }
  | { readonly type: "select"; readonly op: "all" | "deselect" | "inverse" }
  | {
      readonly type: "modifySelection";
      readonly kind: SelectionModification;
      readonly radius: number;
    }
  | { readonly type: "fill"; readonly color: string }
  | { readonly type: "clear" }
  | { readonly type: "newLayer" }
  | { readonly type: "duplicateLayer" }
  | { readonly type: "fillLayer"; readonly color: string }
  | { readonly type: "cropToSelection" };

const SELECT_LABELS = { all: "Select All", deselect: "Deselect", inverse: "Select Inverse" };
const MODIFY_LABELS = { feather: "Feather", expand: "Expand", contract: "Contract" };

/** What the step does, for the Actions panel and error notices. */
export function stepLabel(step: ActionStep): string {
  switch (step.type) {
    case "filter":
      return filterById(step.filterId)?.name ?? "Filter";
    case "adjustment":
      return `${adjustmentDefinition(step.adjustment.type).label} Adjustment Layer`;
    case "flip":
      return step.axis === "horizontal" ? "Flip Horizontal" : "Flip Vertical";
    case "align":
      return ALIGN_LABELS[step.edge];
    case "select":
      return SELECT_LABELS[step.op];
    case "modifySelection":
      return `${MODIFY_LABELS[step.kind]} Selection ${step.radius} px`;
    case "fill":
      return `Fill with ${step.color}`;
    case "clear":
      return "Clear";
    case "newLayer":
      return "New Layer";
    case "duplicateLayer":
      return "Duplicate Layer";
    case "fillLayer":
      return `New Fill Layer ${step.color}`;
    case "cropToSelection":
      return "Crop to Selection";
  }
}

const own = (o: object, key: string): unknown =>
  Object.hasOwn(o, key) ? (o as Record<string, unknown>)[key] : undefined;

const oneOf = <T extends string>(value: unknown, options: readonly T[]): T | null =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : null;

/** Validate a step from untrusted input (an imported action file, stored actions); null if invalid. */
export function parseStep(value: unknown): ActionStep | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  switch (own(value, "type")) {
    case "filter": {
      const id = own(value, "filterId");
      const filter = typeof id === "string" ? filterById(id) : undefined;
      const values = filter && parseFilterValues(filter, own(value, "values"));
      return filter && values ? { type: "filter", filterId: filter.id, values } : null;
    }
    case "adjustment": {
      const adjustment = parseAdjustment(own(value, "adjustment"));
      return adjustment ? { type: "adjustment", adjustment } : null;
    }
    case "flip": {
      const axis = oneOf(own(value, "axis"), ["horizontal", "vertical"] as const);
      return axis ? { type: "flip", axis } : null;
    }
    case "align": {
      const edge = oneOf(own(value, "edge"), Object.keys(ALIGN_LABELS) as AlignEdge[]);
      return edge ? { type: "align", edge } : null;
    }
    case "select": {
      const op = oneOf(own(value, "op"), ["all", "deselect", "inverse"] as const);
      return op ? { type: "select", op } : null;
    }
    case "modifySelection": {
      const kind = oneOf(own(value, "kind"), ["feather", "expand", "contract"] as const);
      const radius = own(value, "radius");
      const valid =
        typeof radius === "number" &&
        Number.isFinite(radius) &&
        radius > 0 &&
        radius <= MAX_MODIFY_RADIUS;
      return kind && valid ? { type: "modifySelection", kind, radius } : null;
    }
    case "fill":
    case "fillLayer": {
      const raw = own(value, "color");
      const color = typeof raw === "string" ? parseHexColor(raw) : null;
      if (!color) return null;
      return own(value, "type") === "fill" ? { type: "fill", color } : { type: "fillLayer", color };
    }
    case "clear":
      return { type: "clear" };
    case "newLayer":
      return { type: "newLayer" };
    case "duplicateLayer":
      return { type: "duplicateLayer" };
    case "cropToSelection":
      return { type: "cropToSelection" };
    default:
      return null;
  }
}
