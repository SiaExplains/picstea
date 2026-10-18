"use client";

import { useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import styles from "./editor.module.css";

/**
 * Resizable right-hand panels: the column's width and the heights of Properties and the tabbed
 * panel (Layers takes the rest). Sizes are remembered per browser in `picstea.panelSizes`
 * (listed in the cookie policy); storage errors only mean the defaults come back next time.
 */

export interface PanelSizes {
  readonly width?: number;
  readonly properties?: number;
  readonly tabs?: number;
}

export const PANEL_SIZES_KEY = "picstea.panelSizes";
export const PANEL_LIMITS = {
  width: { min: 220, max: 560 },
  properties: { min: 60, max: 900 },
  tabs: { min: 60, max: 900 },
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, value)));

/** Read stored sizes, keeping only sane numbers. */
export function parsePanelSizes(raw: string | null): PanelSizes {
  try {
    const value = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    if (!value || typeof value !== "object") return {};
    const out: { -readonly [K in keyof PanelSizes]: number } = {};
    for (const key of ["width", "properties", "tabs"] as const) {
      const n = value[key];
      if (typeof n === "number" && Number.isFinite(n)) {
        out[key] = clamp(n, PANEL_LIMITS[key].min, PANEL_LIMITS[key].max);
      }
    }
    return out;
  } catch {
    return {};
  }
}

const NO_SIZES: PanelSizes = {};
let stored: PanelSizes | null = null;
const listeners = new Set<() => void>();

const panelSizes = {
  get(): PanelSizes {
    if (stored === null) {
      try {
        stored = parsePanelSizes(window.localStorage.getItem(PANEL_SIZES_KEY));
      } catch {
        stored = NO_SIZES;
      }
    }
    return stored;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  update(patch: PanelSizes) {
    stored = { ...panelSizes.get(), ...patch };
    try {
      window.localStorage.setItem(PANEL_SIZES_KEY, JSON.stringify(stored));
    } catch {
      // Not remembered; still applied for this visit.
    }
    listeners.forEach((l) => l());
  },
};

export function usePanelSizes(): [PanelSizes, (patch: PanelSizes) => void, CSSProperties] {
  // The server render (and hydration) uses the defaults; the stored sizes apply right after.
  const sizes = useSyncExternalStore(panelSizes.subscribe, panelSizes.get, () => NO_SIZES);
  const update = panelSizes.update;
  const style = {
    ...(sizes.width ? { "--panels-width": `${sizes.width}px` } : {}),
    ...(sizes.properties ? { "--properties-height": `${sizes.properties}px` } : {}),
    ...(sizes.tabs ? { "--tabs-height": `${sizes.tabs}px` } : {}),
  } as CSSProperties;
  return [sizes, update, style];
}

/**
 * A drag handle that resizes the element before it (rows) or the column (`edge`). Arrow keys
 * resize by 16 px; it is announced as a separator with its current size.
 */
export function PanelSplitter({
  label,
  orientation,
  measure,
  min,
  max,
  invert = false,
  onResize,
}: {
  label: string;
  /** "horizontal" splits rows (drag up/down); "vertical" resizes a column (drag left/right). */
  orientation: "horizontal" | "vertical";
  /** Current size in px of what is being resized. */
  measure: () => number;
  min: number;
  max: number;
  /** Dragging towards the start grows it (the column's left edge). */
  invert?: boolean;
  onResize: (size: number) => void;
}) {
  const drag = useRef<{ start: number; size: number } | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const axis = (e: { clientX: number; clientY: number }) =>
    orientation === "vertical" ? e.clientX : e.clientY;
  const apply = (size: number) => {
    const next = clamp(size, min, max);
    setNow(next);
    onResize(next);
  };

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={now ?? undefined}
      tabIndex={0}
      className={orientation === "vertical" ? styles.splitterColumn : styles.splitterRow}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { start: axis(e), size: measure() };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const delta = axis(e) - d.start;
        apply(d.size + (invert ? -delta : delta));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        const grow =
          orientation === "vertical" ? (invert ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
        const shrink =
          orientation === "vertical" ? (invert ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
        if (e.key !== grow && e.key !== shrink) return;
        e.preventDefault();
        e.stopPropagation();
        apply(measure() + (e.key === grow ? 16 : -16));
      }}
    />
  );
}
