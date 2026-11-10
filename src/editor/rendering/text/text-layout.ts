import { layoutText, type TextLayout } from "../../core/document/text-layout";
import type { CharStyle, TextLayer } from "../../core/document/types";
import type { ContentSizer } from "../../core/geometry/layer-geometry";

/** Canvas text helpers shared by the compositor, the sizer and the text-editing overlay. */

type TextContext = Pick<CanvasRenderingContext2D, "font" | "measureText"> & {
  letterSpacing?: string;
  fontKerning?: CanvasFontKerning;
};

/** A CSS font family list for `family`, with a generic fallback. */
export function cssFamily(family: string): string {
  return family === "system-ui" ? "system-ui, sans-serif" : `"${family}", sans-serif`;
}

export function cssFont(
  style: Pick<CharStyle, "fontFamily" | "fontSize" | "fontWeight" | "italic">,
  size = style.fontSize,
): string {
  return `${style.italic ? "italic " : ""}${style.fontWeight} ${size}px ${cssFamily(style.fontFamily)}`;
}

/** Set font, tracking and kerning for drawing or measuring `style` at `size`. */
export function applyCharStyle(ctx: TextContext, style: CharStyle, size = style.fontSize): void {
  ctx.font = cssFont(style, size);
  // letterSpacing and fontKerning are not in every engine; without them they are ignored.
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${style.letterSpacing}px`;
  if ("fontKerning" in ctx) ctx.fontKerning = style.kerning ? "normal" : "none";
}

/** A measure function backed by a canvas context. */
function canvasMeasure(ctx: TextContext) {
  return (text: string, style: CharStyle, size: number) => {
    applyCharStyle(ctx, style, size);
    return ctx.measureText(text).width;
  };
}

/** Rough widths without a canvas (SSR, tests): 0.6 em per character plus tracking. */
export function estimateWidth(text: string, style: CharStyle, size: number): number {
  return [...text].length * (size * 0.6 + style.letterSpacing);
}

/**
 * A ContentSizer backed by a scratch canvas context. Layouts are cached per layer object; layers
 * are immutable, so a changed layer is a new key. `fontsVersion` invalidates the cache when a
 * font finishes loading (metrics change).
 */
export function createCanvasTextSizer(
  createContext: () => TextContext | null,
): ContentSizer & { fontsChanged(): void } {
  let ctx: TextContext | null = null;
  let cache = new WeakMap<TextLayer, TextLayout>();
  const layout = (layer: TextLayer) => {
    const cached = cache.get(layer);
    if (cached) return cached;
    ctx ??= createContext();
    const result = layoutText(layer, ctx ? canvasMeasure(ctx) : estimateWidth);
    cache.set(layer, result);
    return result;
  };
  return {
    layoutText: layout,
    measureText(layer) {
      const { width, height } = layout(layer);
      return { width, height };
    },
    fontsChanged() {
      cache = new WeakMap();
    },
  };
}

/** Rough sizer without a canvas, for tests and non-browser use. */
export const estimateTextSizer: ContentSizer = createCanvasTextSizer(() => null);
