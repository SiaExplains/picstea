import type { TextLayer } from "../../core/document/types";
import type { ContentSizer } from "../../core/geometry/layer-geometry";
import type { Size } from "../../core/viewport/viewport";

/** Canvas text helpers shared by the compositor, the sizer and the text-editing overlay. */

type TextContext = Pick<CanvasRenderingContext2D, "font" | "measureText"> & {
  letterSpacing?: string;
};

export function cssFont(
  layer: Pick<TextLayer, "fontFamily" | "fontSize" | "fontWeight" | "italic">,
): string {
  const family = layer.fontFamily === "system-ui" ? "system-ui" : `"${layer.fontFamily}"`;
  return `${layer.italic ? "italic " : ""}${layer.fontWeight} ${layer.fontSize}px ${family}, sans-serif`;
}

export function textLines(text: string): string[] {
  return text.split("\n");
}

export function lineAdvance(layer: Pick<TextLayer, "fontSize" | "lineHeight">): number {
  return layer.fontSize * layer.lineHeight;
}

export function applyTextStyle(ctx: TextContext, layer: TextLayer): void {
  ctx.font = cssFont(layer);
  // letterSpacing is not in every engine; without it spacing is simply ignored.
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${layer.letterSpacing}px`;
}

export function measureTextBlock(ctx: TextContext, layer: TextLayer): Size {
  applyTextStyle(ctx, layer);
  const lines = textLines(layer.text);
  let width = 0;
  for (const line of lines) width = Math.max(width, ctx.measureText(line).width);
  // Keep empty text grabbable and visible while editing.
  const minWidth = layer.fontSize * 0.5;
  return {
    width: Math.ceil(Math.max(width, minWidth)),
    height: Math.ceil(lines.length * lineAdvance(layer)),
  };
}

/**
 * A ContentSizer backed by a scratch canvas context. Measurements are cached per layer object;
 * layers are immutable, so a changed layer is a new key.
 */
export function createCanvasTextSizer(createContext: () => TextContext | null): ContentSizer {
  let ctx: TextContext | null = null;
  const cache = new WeakMap<TextLayer, Size>();
  return {
    measureText(layer) {
      const cached = cache.get(layer);
      if (cached) return cached;
      ctx ??= createContext();
      // Without a canvas (SSR/tests) fall back to a rough estimate.
      const size = ctx
        ? measureTextBlock(ctx, layer)
        : {
            width: Math.ceil(
              Math.max(...textLines(layer.text).map((l) => l.length), 1) * layer.fontSize * 0.6,
            ),
            height: Math.ceil(textLines(layer.text).length * lineAdvance(layer)),
          };
      cache.set(layer, size);
      return size;
    },
  };
}

/** Rough sizer without a canvas, for tests and non-browser use. */
export const estimateTextSizer: ContentSizer = createCanvasTextSizer(() => null);
