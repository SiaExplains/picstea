/**
 * Where a composite is rendered (ADR-0012): a surface of `width × height` pixels showing the
 * document region starting at (`x`, `y`) at `scale` surface pixels per document pixel. The
 * identity space (whole document at 1:1) is what export and pixel tools use; the canvas renders
 * only the visible region at screen resolution.
 */
export interface RenderSpace {
  readonly width: number;
  readonly height: number;
  /** Document coordinates of the surface's top-left corner. */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export function identitySpace(doc: { width: number; height: number }): RenderSpace {
  return { width: doc.width, height: doc.height, x: 0, y: 0, scale: 1 };
}

export const isIdentitySpace = (space: RenderSpace, doc: { width: number; height: number }) =>
  space.scale === 1 &&
  space.x === 0 &&
  space.y === 0 &&
  space.width === doc.width &&
  space.height === doc.height;

export const sameSpace = (a: RenderSpace | null | undefined, b: RenderSpace) =>
  !!a &&
  a.width === b.width &&
  a.height === b.height &&
  a.x === b.x &&
  a.y === b.y &&
  a.scale === b.scale;

/** Canvas transform mapping document coordinates into the space's surface pixels. */
export function spaceTransform(
  space: RenderSpace,
): [number, number, number, number, number, number] {
  return [space.scale, 0, 0, space.scale, -space.x * space.scale, -space.y * space.scale];
}

/**
 * Mip level for a zoom: the smallest power of two ≥ `zoom × dpr`, at most 1 (never render more
 * pixels than the document has). Rendering at a level instead of the exact zoom lets the cached
 * render be reused across nearby zoom steps.
 */
export function renderScale(zoom: number, dpr: number): number {
  const wanted = zoom * dpr;
  if (!(wanted > 0)) return 1;
  if (wanted >= 1) return 1;
  return Math.max(1 / 64, 2 ** Math.ceil(Math.log2(wanted)));
}

export interface DocRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The document region to render for a view: the visible part grown by `margin` (a fraction of
 * the visible size) on every side, clipped to the document and snapped to whole pixels.
 */
export function viewRegion(
  doc: { width: number; height: number },
  view: { panX: number; panY: number; zoom: number },
  screen: { width: number; height: number },
  margin = 0.25,
): DocRect | null {
  const x0 = -view.panX / view.zoom;
  const y0 = -view.panY / view.zoom;
  const w = screen.width / view.zoom;
  const h = screen.height / view.zoom;
  const left = Math.max(0, Math.floor(x0 - w * margin));
  const top = Math.max(0, Math.floor(y0 - h * margin));
  const right = Math.min(doc.width, Math.ceil(x0 + w * (1 + margin)));
  const bottom = Math.min(doc.height, Math.ceil(y0 + h * (1 + margin)));
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Is `inner` (the visible part, unclipped) covered by `outer` within the document? */
export function covers(
  outer: DocRect,
  doc: { width: number; height: number },
  view: { panX: number; panY: number; zoom: number },
  screen: { width: number; height: number },
): boolean {
  const visible = viewRegion(doc, view, screen, 0);
  if (!visible) return true;
  return (
    visible.x >= outer.x &&
    visible.y >= outer.y &&
    visible.x + visible.width <= outer.x + outer.width &&
    visible.y + visible.height <= outer.y + outer.height
  );
}

export function spaceFor(region: DocRect, scale: number): RenderSpace {
  return {
    width: Math.max(1, Math.ceil(region.width * scale)),
    height: Math.max(1, Math.ceil(region.height * scale)),
    x: region.x,
    y: region.y,
    scale,
  };
}
