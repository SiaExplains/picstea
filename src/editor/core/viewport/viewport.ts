/**
 * Viewport maths (docs/04_RENDERING_ENGINE.md, "Viewport").
 *
 * Screen space is CSS pixels relative to the viewport element's top-left corner:
 *   screen = document * zoom + pan
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Viewport {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 64;
/** Preset zoom stops used by zoom in/out, like professional editors. */
export const ZOOM_STEPS = [
  0.01, 0.02, 0.03, 0.05, 0.0625, 0.0833, 0.125, 0.1667, 0.25, 0.3333, 0.5, 0.6667, 1, 1.5, 2, 3, 4,
  5, 6, 7, 8, 12, 16, 24, 32, 48, 64,
] as const;

export const DEFAULT_VIEWPORT: Viewport = { zoom: 1, panX: 0, panY: 0 };

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function documentToScreen(viewport: Viewport, point: Point): Point {
  return { x: point.x * viewport.zoom + viewport.panX, y: point.y * viewport.zoom + viewport.panY };
}

export function screenToDocument(viewport: Viewport, point: Point): Point {
  return {
    x: (point.x - viewport.panX) / viewport.zoom,
    y: (point.y - viewport.panY) / viewport.zoom,
  };
}

/** Zoom to `zoom` keeping the document point under `anchor` (screen space) fixed. */
export function zoomAt(viewport: Viewport, zoom: number, anchor: Point): Viewport {
  const next = clampZoom(zoom);
  const docPoint = screenToDocument(viewport, anchor);
  return { zoom: next, panX: anchor.x - docPoint.x * next, panY: anchor.y - docPoint.y * next };
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, panX: viewport.panX + dx, panY: viewport.panY + dy };
}

export function nextZoomStep(zoom: number, direction: 1 | -1): number {
  // Small epsilon so 0.3333 counts as "at" the 1/3 stop rather than below it.
  const epsilon = 1e-3;
  if (direction > 0) {
    return ZOOM_STEPS.find((step) => step > zoom * (1 + epsilon)) ?? MAX_ZOOM;
  }
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) {
    if (ZOOM_STEPS[i] < zoom * (1 - epsilon)) return ZOOM_STEPS[i];
  }
  return MIN_ZOOM;
}

/** Centre the document at the given zoom. */
export function centered(documentSize: Size, screen: Size, zoom: number): Viewport {
  const z = clampZoom(zoom);
  return {
    zoom: z,
    panX: Math.round((screen.width - documentSize.width * z) / 2),
    panY: Math.round((screen.height - documentSize.height * z) / 2),
  };
}

/** Largest zoom (never above 100%) that shows the whole document with `padding` CSS px around it. */
export function fitToScreen(documentSize: Size, screen: Size, padding = 32): Viewport {
  const availableW = Math.max(1, screen.width - padding * 2);
  const availableH = Math.max(1, screen.height - padding * 2);
  const zoom = Math.min(1, availableW / documentSize.width, availableH / documentSize.height);
  return centered(documentSize, screen, zoom);
}

export function actualPixels(documentSize: Size, screen: Size): Viewport {
  return centered(documentSize, screen, 1);
}

/** Zoom by an exponential factor of a wheel delta — smooth for both mice and trackpads. */
export function zoomFactorFromWheel(deltaY: number): number {
  return Math.exp(-deltaY * 0.0015);
}
