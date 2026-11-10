import { EMPTY_PATH, pathToSvgD } from "../../core/path/path";
import { hasActiveEffects } from "../../core/effects/model";
import { allLayers } from "../../core/document/tree";
import type {
  EditorDocument,
  GroupLayer,
  Layer,
  ShapeLayer,
  TextLayer,
  Transform,
} from "../../core/document/types";
import type { ContentSizer } from "../../core/geometry/layer-geometry";
import { fromTransform } from "../../core/geometry/matrix";
import { cssFamily } from "../../rendering/text/text-layout";

/**
 * SVG export (ADR-0011). Shapes, text and colour fills become real SVG elements so they stay
 * editable in vector tools; pixel layers and anything SVG cannot express faithfully (masks,
 * effects) become embedded PNG images of that layer. Documents with adjustment layers are
 * exported as one flattened image, since an adjustment changes everything below it.
 */

export interface RasterizedLayers {
  /** `data:image/png;base64,…` */
  readonly href: string;
  /** Document-space box of the image. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Render layers (as they look, ignoring their own opacity/blend) to a cropped PNG. */
export type Rasterize = (layers: readonly Layer[]) => Promise<RasterizedLayers | null>;

export interface SvgExportResult {
  readonly svg: string;
  /** True when the whole document had to become one image. */
  readonly flattened: boolean;
  /** Layers exported as embedded images rather than vector elements. */
  readonly imageLayers: number;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const num = (n: number) => String(Math.round(n * 1000) / 1000);

function matrix(t: Transform): string {
  const m = fromTransform(t);
  const identity = m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1;
  if (identity)
    return m[4] === 0 && m[5] === 0 ? "" : ` transform="translate(${num(m[4])} ${num(m[5])})"`;
  return ` transform="matrix(${m.map(num).join(" ")})"`;
}

function common(layer: Layer, isolate = false): string {
  const parts: string[] = [];
  if (!layer.visible) parts.push(` display="none"`);
  if (layer.opacity < 1) parts.push(` opacity="${num(layer.opacity)}"`);
  const styles: string[] = [];
  if (layer.blendMode !== "normal" && layer.blendMode !== "pass-through") {
    styles.push(`mix-blend-mode:${layer.blendMode}`);
  }
  if (isolate) styles.push("isolation:isolate");
  if (styles.length) parts.push(` style="${styles.join(";")}"`);
  return `${parts.join("")} data-name="${escapeXml(layer.name)}"`;
}

function shapeElement(layer: ShapeLayer): string {
  const fill = layer.fill && layer.shape !== "line" ? escapeXml(layer.fill) : "none";
  const stroke = layer.stroke
    ? ` stroke="${escapeXml(layer.stroke.color)}" stroke-width="${num(layer.stroke.width)}" stroke-linejoin="round" stroke-linecap="round"`
    : "";
  const paint = ` fill="${fill}"${stroke}`;
  const { width: w, height: h } = layer;
  switch (layer.shape) {
    case "rect": {
      const r = Math.min(layer.cornerRadius, w / 2, h / 2);
      const rx = r > 0 ? ` rx="${num(r)}"` : "";
      return `<rect width="${num(w)}" height="${num(h)}"${rx}${paint}/>`;
    }
    case "ellipse":
      return `<ellipse cx="${num(w / 2)}" cy="${num(h / 2)}" rx="${num(w / 2)}" ry="${num(h / 2)}"${paint}/>`;
    case "line":
      return `<line x1="0" y1="0" x2="${num(w)}" y2="${num(h)}"${paint}/>`;
    case "path":
      return `<path d="${pathToSvgD(layer.path ?? EMPTY_PATH)}" fill-rule="evenodd"${paint}/>`;
  }
}

/** One `<text>` per line, one `<tspan>` per styled fragment, positioned from the layout. */
function textElement(layer: TextLayer, sizer: ContentSizer, clipId: string): string {
  const layout = sizer.layoutText(layer);
  const lines = layout.lines
    .filter((line) => line.fragments.length > 0)
    .map((line) => {
      const spans = line.fragments
        .map((f) => {
          const s = f.style;
          return (
            `<tspan x="${num(f.x)}" y="${num(f.y)}"` +
            ` font-family="${escapeXml(cssFamily(s.fontFamily).replaceAll('"', "'"))}"` +
            ` font-size="${num(f.size)}" font-weight="${s.fontWeight}"` +
            (s.italic ? ` font-style="italic"` : "") +
            (s.letterSpacing ? ` letter-spacing="${num(s.letterSpacing)}"` : "") +
            (s.kerning ? "" : ` font-kerning="none"`) +
            ` fill="${escapeXml(s.color)}">${escapeXml(f.text)}</tspan>`
          );
        })
        .join("");
      return `<text xml:space="preserve" dominant-baseline="middle">${spans}</text>`;
    })
    .join("");
  if (!layer.box || !layout.overflow) return lines;
  return (
    `<clipPath id="${clipId}"><rect width="${num(layer.box.width)}" height="${num(layer.box.height)}"/></clipPath>` +
    `<g clip-path="url(#${clipId})">${lines}</g>`
  );
}

/** Can this layer be written as plain SVG without changing how it looks? */
function isVector(layer: Layer): boolean {
  if (layer.mask && layer.mask.enabled) return false;
  if (layer.vectorMask?.enabled) return false;
  if (hasActiveEffects(layer.effects) || (layer.fillOpacity ?? 1) < 1) return false;
  return layer.kind === "shape" || layer.kind === "text" || layer.kind === "fill";
}

export async function buildSvg(
  doc: EditorDocument,
  sizer: ContentSizer,
  rasterize: Rasterize,
): Promise<SvgExportResult> {
  let imageLayers = 0;
  const image = async (layers: readonly Layer[], attrs: string) => {
    const r = await rasterize(layers);
    if (!r) return "";
    imageLayers++;
    return `<image x="${num(r.x)}" y="${num(r.y)}" width="${num(r.width)}" height="${num(r.height)}" href="${r.href}"${attrs}/>`;
  };

  // Adjustments and clipping masks depend on the layers beneath, so the image is flattened.
  const flattened = allLayers(doc).some((l) => (l.kind === "adjustment" || l.clipped) && l.visible);
  let body: string;
  if (flattened) {
    body = await image(doc.layers, "");
  } else {
    const emit = async (layers: readonly Layer[]): Promise<string> => {
      const out: string[] = [];
      for (const layer of layers) out.push(await element(layer));
      return out.join("\n");
    };
    let clips = 0;
    const element = async (layer: Layer): Promise<string> => {
      if (layer.kind === "group") {
        const group = layer as GroupLayer;
        if (isVectorGroup(group)) {
          const isolate = group.blendMode !== "pass-through" || group.opacity < 1;
          return `<g${common(group, isolate)}>\n${await emit(group.children)}\n</g>`;
        }
        const flat = { ...group, opacity: 1, blendMode: "pass-through" as const, visible: true };
        return image([flat], common(group));
      }
      if (layer.kind === "adjustment") return "";
      if (isVector(layer)) {
        const attrs = common(layer);
        if (layer.kind === "fill") {
          return `<rect width="${doc.width}" height="${doc.height}" fill="${escapeXml(layer.color)}"${attrs}/>`;
        }
        const inner =
          layer.kind === "shape"
            ? shapeElement(layer)
            : textElement(layer as TextLayer, sizer, `text-clip-${++clips}`);
        return `<g${matrix((layer as ShapeLayer | TextLayer).transform)}${attrs}>${inner}</g>`;
      }
      const flat = { ...layer, opacity: 1, blendMode: "normal" as const, visible: true } as Layer;
      return image([flat], common(layer));
    };
    body = await emit(doc.layers);
  }

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">\n` +
    `<title>${escapeXml(doc.name)}</title>\n${body}\n</svg>\n`;
  return { svg, flattened, imageLayers };
}

function isVectorGroup(group: GroupLayer): boolean {
  if (group.mask && group.mask.enabled) return false;
  if (group.vectorMask?.enabled) return false;
  return !hasActiveEffects(group.effects) && (group.fillOpacity ?? 1) === 1;
}
