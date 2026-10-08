import { createId } from "../ids";
import { checkDimensions } from "./limits";
import type {
  EditorDocument,
  FillLayer,
  FontFamily,
  Layer,
  RasterLayer,
  ShapeKind,
  ShapeLayer,
  StrokeStyle,
  TextLayer,
  Transform,
} from "./types";

export const IDENTITY_TRANSFORM: Transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

export const DEFAULT_RESOLUTION = 72;

export type BackgroundOption = { kind: "transparent" } | { kind: "color"; color: string };

export interface NewDocumentOptions {
  name: string;
  width: number;
  height: number;
  resolution?: number;
  background?: BackgroundOption;
  now?: Date;
}

export class DocumentError extends Error {
  override name = "DocumentError";
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

export function createFillLayer(color: string, name = "Color Fill"): FillLayer {
  if (!isHexColor(color)) throw new DocumentError(`Invalid colour "${color}".`);
  return {
    id: createId("layer"),
    kind: "fill",
    name,
    color: color.toLowerCase(),
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: IDENTITY_TRANSFORM,
  };
}

export function createRasterLayer(params: {
  assetId: string | null;
  width: number;
  height: number;
  name: string;
  x?: number;
  y?: number;
}): RasterLayer {
  return {
    id: createId("layer"),
    kind: "raster",
    name: params.name,
    assetId: params.assetId,
    width: params.width,
    height: params.height,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: { ...IDENTITY_TRANSFORM, x: params.x ?? 0, y: params.y ?? 0 },
  };
}

/** A transparent pixel layer covering the document, ready to paint on. */
export function createEmptyRasterLayer(doc: EditorDocument, name: string): RasterLayer {
  return createRasterLayer({ assetId: null, width: doc.width, height: doc.height, name });
}

export function createShapeLayer(params: {
  shape: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string | null;
  stroke: StrokeStyle | null;
  name: string;
  cornerRadius?: number;
  scaleX?: number;
  scaleY?: number;
}): ShapeLayer {
  return {
    id: createId("layer"),
    kind: "shape",
    name: params.name,
    shape: params.shape,
    width: params.width,
    height: params.height,
    fill: params.shape === "line" ? null : params.fill,
    stroke: params.stroke,
    cornerRadius: params.cornerRadius ?? 0,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: {
      ...IDENTITY_TRANSFORM,
      x: params.x,
      y: params.y,
      scaleX: params.scaleX ?? 1,
      scaleY: params.scaleY ?? 1,
    },
  };
}

export interface TextStyle {
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: 400 | 700;
  italic: boolean;
  color: string;
  align: TextLayer["align"];
  lineHeight: number;
  letterSpacing: number;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Arial",
  fontSize: 48,
  fontWeight: 400,
  italic: false,
  color: "#000000",
  align: "left",
  lineHeight: 1.2,
  letterSpacing: 0,
};

export function createTextLayer(params: {
  text: string;
  x: number;
  y: number;
  style: TextStyle;
}): TextLayer {
  const firstLine = params.text.split("\n")[0].trim();
  return {
    id: createId("layer"),
    kind: "text",
    name: firstLine.slice(0, 40) || "Text",
    text: params.text,
    ...params.style,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: { ...IDENTITY_TRANSFORM, x: params.x, y: params.y },
  };
}

export function createDocument(options: NewDocumentOptions): EditorDocument {
  const check = checkDimensions(options.width, options.height);
  if (!check.ok) throw new DocumentError(check.reason);

  const now = (options.now ?? new Date()).toISOString();
  const background = options.background ?? { kind: "color", color: "#ffffff" };
  const layers: Layer[] = [];
  if (background.kind === "color") {
    layers.push({ ...createFillLayer(background.color, "Background"), locked: true });
  }

  return {
    id: createId("doc"),
    name: options.name.trim() || "Untitled",
    width: options.width,
    height: options.height,
    resolution: options.resolution ?? DEFAULT_RESOLUTION,
    colorSpace: "srgb",
    layers,
    activeLayerId: layers.at(-1)?.id ?? null,
    guides: [],
    metadata: { createdAt: now, modifiedAt: now },
  };
}

/** Next free "Layer N" name, matching how professional editors number new layers. */
export function nextLayerName(doc: EditorDocument, base = "Layer"): string {
  const pattern = new RegExp(`^${base} (\\d+)$`);
  let max = 0;
  for (const layer of doc.layers) {
    const match = pattern.exec(layer.name);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${base} ${max + 1}`;
}
