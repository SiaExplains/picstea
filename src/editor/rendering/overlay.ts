import type { Rect } from "../core/geometry/layer-geometry";
import type { SnapLine } from "../core/geometry/snapping";
import type { Guide } from "../core/document/types";
import type { VectorPath } from "../core/path/path";
import type { Point } from "../core/viewport/viewport";

/**
 * Tool feedback drawn above the document in screen space, so lines and handles stay one CSS
 * pixel thick at every zoom level. All coordinates here are in document space.
 */
export type Overlay =
  | {
      readonly kind: "transform";
      /** nw, ne, se, sw */
      readonly corners: readonly [Point, Point, Point, Point];
      readonly handles: boolean;
    }
  | { readonly kind: "crop"; readonly rect: Rect }
  | { readonly kind: "brush"; readonly center: Point; readonly radius: number }
  /** Clone/heal source position: a crosshair. */
  | { readonly kind: "source"; readonly center: Point }
  /** A Color Sampler point, numbered like Photoshop's (ADR-0027). */
  | { readonly kind: "sampler"; readonly center: Point; readonly label: string }
  /** A selection being drawn (marquee, lasso), shown as a dashed path. */
  | { readonly kind: "path"; readonly points: readonly Point[]; readonly closed: boolean }
  /** Smart guides: the lines a drag snapped to, across the whole canvas. */
  | { readonly kind: "snap"; readonly lines: readonly SnapLine[] }
  /**
   * Paths being drawn or edited (document space): the outline, and optionally the anchors and
   * handles. `selected` highlights one anchor; `rubberBand` previews the next pen segment.
   */
  | {
      readonly kind: "vector-path";
      readonly path: VectorPath;
      readonly anchors: boolean;
      readonly selected?: { readonly subpath: number; readonly anchor: number } | null;
      readonly rubberBand?: { readonly from: Point; readonly to: Point } | null;
    }
  /** A guide being created or dragged. */
  | {
      readonly kind: "guide";
      readonly orientation: Guide["orientation"];
      readonly position: number;
    };

export const HANDLE_SIZE_PX = 8;
