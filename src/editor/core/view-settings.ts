/**
 * View preferences (View menu): rulers, guides, grid and snapping. They belong to the user, not
 * to a document, so they live outside the document store; the UI persists them locally.
 */
export interface ViewSettings {
  readonly rulers: boolean;
  readonly guides: boolean;
  readonly lockGuides: boolean;
  readonly grid: boolean;
  /** Grid spacing in document pixels. */
  readonly gridSize: number;
  readonly snap: boolean;
}

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  rulers: false,
  guides: true,
  lockGuides: false,
  grid: false,
  gridSize: 50,
  snap: true,
};

export const MIN_GRID_SIZE = 2;
export const MAX_GRID_SIZE = 1000;

/** Read stored settings, falling back to the default for anything missing or malformed. */
export function parseViewSettings(value: unknown): ViewSettings {
  if (typeof value !== "object" || value === null) return DEFAULT_VIEW_SETTINGS;
  const v = value as Record<string, unknown>;
  const flag = (key: keyof ViewSettings) =>
    typeof v[key] === "boolean" ? (v[key] as boolean) : (DEFAULT_VIEW_SETTINGS[key] as boolean);
  const size = v.gridSize;
  return {
    rulers: flag("rulers"),
    guides: flag("guides"),
    lockGuides: flag("lockGuides"),
    grid: flag("grid"),
    snap: flag("snap"),
    gridSize:
      typeof size === "number" &&
      Number.isFinite(size) &&
      size >= MIN_GRID_SIZE &&
      size <= MAX_GRID_SIZE
        ? size
        : DEFAULT_VIEW_SETTINGS.gridSize,
  };
}
