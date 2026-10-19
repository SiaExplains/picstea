import { createGroup } from "../../core/commands/group-commands";
import { layerBlendingOf, psdBlendingOf } from "./psd-blending";
import {
  createAdjustmentLayer,
  createDocument,
  createFillLayer,
  createPathShapeLayer,
  createRasterLayer,
  createTextLayer,
} from "../../core/document/factory";
import { effectReach as effectReachOf, hasActiveEffects } from "../../core/effects/model";
import {
  LAYER_LABELS,
  type EditorDocument,
  type GroupBlendMode,
  type Layer,
  type LayerMask,
  type SmartObjectLayer,
  type Transform,
} from "../../core/document/types";
import { createId } from "../../core/ids";
import type { RasterMime } from "../../assets/asset-store";
import type { PsdPlaced } from "./psd-extras";
import { encodeAdjustment } from "./psd-adjustments";
import { encodeVectorMask } from "./psd-paths";
import { context2d, releaseSurface, type PixelEnv } from "../../pixels/layer-pixels";
import { boundsOf, layerCorners } from "../../core/geometry/layer-geometry";
import { renderBitmap, rgbaToSurface } from "../layer-render";
import type { DraftMask, DraftNode, PsdDraft } from "./psd-draft";
import { blendKey, blendModeFromKey } from "./blend-keys";
import {
  rectHeight,
  rectWidth,
  type PsdFile,
  type PsdMask,
  type PsdNode,
  type PsdPixelLayer,
} from "./psd-model";

/**
 * Bridges between editor documents and the PSD model (ADR-0011/0012). Export turns every leaf layer
 * into pixels (shapes and text are rasterised, effects merged in); import turns PSD layers into
 * pixel layers, groups and masks.
 */

const hasEffects = (layer: Layer) => hasActiveEffects(layer.effects);

/** A layer mask as a document-sized bitmap whose alpha is the mask (drawn like the compositor). */
async function maskDraft(env: PixelEnv, doc: EditorDocument, mask: LayerMask): Promise<DraftMask> {
  const surface = env.createSurface(doc.width, doc.height);
  const ctx = context2d(surface);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, doc.width, doc.height);
  if (mask.assetId) {
    const bitmap = env.assets.getBitmap(mask.assetId);
    if (bitmap) {
      ctx.clearRect(mask.x, mask.y, mask.width, mask.height);
      ctx.drawImage(bitmap, mask.x, mask.y, mask.width, mask.height);
    }
  }
  const bitmap =
    "transferToImageBitmap" in surface
      ? surface.transferToImageBitmap()
      : await createImageBitmap(surface);
  releaseSurface(surface);
  return { bitmap, disabled: !mask.enabled };
}

/** How far a layer's effects reach beyond its content, in document pixels. */
const effectReach = (layer: Layer) => effectReachOf(layer.effects) || 2;

/** The document region a leaf layer can draw into (its box, plus effects, within the canvas). */
function leafRegion(env: PixelEnv, doc: EditorDocument, layer: Layer) {
  const box = boundsOf(layerCorners(layer, doc, env.sizer));
  const reach = effectReach(layer);
  const x = Math.max(0, Math.floor(box.x - reach));
  const y = Math.max(0, Math.floor(box.y - reach));
  const right = Math.min(doc.width, Math.ceil(box.x + box.width + reach));
  const bottom = Math.min(doc.height, Math.ceil(box.y + box.height + reach));
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

export interface PsdDraftExport {
  readonly draft: PsdDraft;
  readonly warnings: readonly string[];
}

/**
 * Render a document for PSD export (ADR-0011/0012): every leaf layer becomes a bitmap of just its
 * own region (shapes and text rasterised, effects merged in). Reading the pixels back and encoding
 * the file happen in the worker.
 */
export async function documentToPsdDraft(
  env: PixelEnv,
  doc: EditorDocument,
): Promise<PsdDraftExport> {
  const warnings = new Set<string>();
  const convert = async (layers: readonly Layer[]): Promise<DraftNode[]> => {
    const out: DraftNode[] = [];
    for (const layer of layers) {
      // Adjustment layers with a Photoshop equivalent are written as adjustment layers.
      const adjustmentBlock =
        layer.kind === "adjustment" ? encodeAdjustment(layer.adjustment) : null;
      if (layer.kind === "adjustment" && !adjustmentBlock) {
        warnings.add(
          "Temperature/Tint, Black & White, Photo Filter and Gradient Map adjustments are included in the flattened image only.",
        );
        continue;
      }
      const base = {
        name: layer.name,
        opacity: Math.round(layer.opacity * 255),
        visible: layer.visible,
        blendKey: blendKey(layer.blendMode),
        mask: layer.mask ? await maskDraft(env, doc, layer.mask) : undefined,
        ...(layer.clipped ? { clipping: true } : {}),
        ...(layer.label ? { colorLabel: LAYER_LABELS.indexOf(layer.label) + 1 } : {}),
        ...(psdBlendingOf(layer) ? { blending: psdBlendingOf(layer) } : {}),
      };
      if (adjustmentBlock) {
        out.push({
          ...base,
          kind: "pixels",
          region: null,
          bitmap: null,
          blocks: [adjustmentBlock],
        });
        continue;
      }
      if (layer.kind === "group") {
        if (hasEffects(layer)) {
          warnings.add("Effects on groups are included in the flattened image only.");
        }
        if (layer.vectorMask?.enabled) {
          warnings.add("Vector masks on groups are included in the flattened image only.");
        }
        out.push({
          ...base,
          kind: "group",
          open: layer.expanded,
          children: await convert(layer.children),
        });
        continue;
      }
      if (hasEffects(layer)) warnings.add("Layer effects were merged into the layer pixels.");
      if (layer.kind === "text" || layer.kind === "shape") {
        warnings.add("Shapes and text were converted to pixels.");
      }
      if (layer.kind === "smart") warnings.add("Smart objects were converted to pixels.");
      // The layer's own look, without its opacity, blend mode or mask (stored separately).
      const plain = {
        ...layer,
        opacity: 1,
        blendMode: "normal",
        visible: true,
        mask: undefined,
        // The vector mask is written as Photoshop vector data, not merged into the pixels.
        vectorMask: undefined,
        // Blend If and channels are written in the record and need the layers below.
        blendIf: undefined,
        channels: undefined,
        clipped: false,
      } as Layer;
      const vectorBlock = layer.vectorMask
        ? { key: "vmsk", data: encodeVectorMask(layer.vectorMask, doc.width, doc.height) }
        : null;
      const region = leafRegion(env, doc, layer);
      out.push({
        ...base,
        kind: "pixels",
        region: region ? { x: region.x, y: region.y } : null,
        bitmap: region ? await renderBitmap(env, doc, [plain], region) : null,
        ...(vectorBlock ? { blocks: [vectorBlock] } : {}),
      });
    }
    return out;
  };
  const layers = await convert(doc.layers);
  return {
    draft: {
      width: doc.width,
      height: doc.height,
      resolution: doc.resolution,
      layers,
      composite: await renderBitmap(env, doc),
    },
    warnings: [...warnings],
  };
}

export interface PsdImport {
  readonly document: EditorDocument;
  readonly warnings: readonly string[];
}

/** Build an editor document from a parsed PSD, adding its pixels as new assets. */
export function psdToDocument(
  env: PixelEnv,
  psd: PsdFile,
  name: string,
  readWarnings: readonly string[] = [],
): PsdImport {
  const warnings = new Set(readWarnings);
  const document = convertPsdFile(env, psd, name, warnings);
  return { document, warnings: [...warnings] };
}

/** Position, scale, rotation and flip that map a w × h box onto four placement corners. */
export function transformFromCorners(corners: readonly number[], w: number, h: number): Transform {
  const [x0, y0, x1, y1, , , x3, y3] = corners;
  const ux = x1 - x0;
  const uy = y1 - y0;
  const vx = x3 - x0;
  const vy = y3 - y0;
  const flipped = ux * vy - uy * vx < 0;
  return {
    x: x0,
    y: y0,
    scaleX: Math.hypot(ux, uy) / Math.max(1, w),
    scaleY: (flipped ? -1 : 1) * (Math.hypot(vx, vy) / Math.max(1, h)),
    rotation: (Math.atan2(uy, ux) * 180) / Math.PI,
  };
}

function convertPsdFile(
  env: PixelEnv,
  psd: PsdFile,
  name: string,
  warnings: Set<string>,
): EditorDocument {
  const doc = createDocument({
    name,
    width: psd.width,
    height: psd.height,
    resolution: psd.resolution,
    background: { kind: "transparent" },
  });
  const linked = new Map((psd.linked ?? []).map((f) => [f.id, f]));

  const blend = (key: string, group: boolean): GroupBlendMode => {
    const mode = blendModeFromKey(key);
    if (mode === "pass-through" && group) return mode;
    if (mode && mode !== "pass-through") return mode;
    warnings.add("Some blend modes are not available in Picstea and were set to Normal.");
    return group ? "pass-through" : "normal";
  };

  const toMask = (mask: PsdMask | undefined): LayerMask | undefined => {
    if (!mask) return undefined;
    const w = rectWidth(mask.rect);
    const h = rectHeight(mask.rect);
    if (mask.defaultColor === 255 && w * h === 0) return undefined;
    // Outside its box a Picstea mask reveals; a PSD mask hiding outside its box is widened to
    // cover the canvas so the hidden area stays hidden.
    const left = mask.defaultColor === 255 ? mask.rect.left : Math.min(0, mask.rect.left);
    const top = mask.defaultColor === 255 ? mask.rect.top : Math.min(0, mask.rect.top);
    const right =
      mask.defaultColor === 255 ? mask.rect.right : Math.max(psd.width, mask.rect.right);
    const bottom =
      mask.defaultColor === 255 ? mask.rect.bottom : Math.max(psd.height, mask.rect.bottom);
    const width = right - left;
    const height = bottom - top;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4] = 255;
      rgba[i * 4 + 1] = 255;
      rgba[i * 4 + 2] = 255;
      rgba[i * 4 + 3] = mask.defaultColor;
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dst = ((mask.rect.top - top + y) * width + (mask.rect.left - left + x)) * 4;
        rgba[dst + 3] = mask.data[y * w + x];
      }
    }
    const surface = rgbaToSurface(env, rgba, width, height);
    const asset = env.assets.addBitmap(surface, width, height);
    return {
      assetId: asset.id,
      enabled: !mask.disabled,
      x: left,
      y: top,
      width,
      height,
      linked: true,
    };
  };

  /** The layer's own pixels (also the fallback when its structure can't be imported). */
  const pixelLayer = (node: PsdPixelLayer): Layer => {
    const w = rectWidth(node.rect);
    const h = rectHeight(node.rect);
    let assetId: string | null = null;
    if (node.rgba && w > 0 && h > 0) {
      assetId = env.assets.addBitmap(rgbaToSurface(env, node.rgba, w, h), w, h).id;
    }
    return createRasterLayer({
      assetId,
      width: Math.max(1, w),
      height: Math.max(1, h),
      name: node.name || "Layer",
      x: node.rect.left,
      y: node.rect.top,
    });
  };

  /** A smart object from its embedded file, or null to fall back to pixels. */
  const smartLayer = (node: PsdPixelLayer, placed: PsdPlaced): Layer | null => {
    const file = linked.get(placed.id);
    if (!file || file.kind === "unsupported") return null;
    let content: EditorDocument;
    if (file.kind === "psd") {
      content = convertPsdFile(env, file.file, node.name || "Smart Object", warnings);
    } else {
      const asset = env.assets.add({
        mime: file.mime as RasterMime,
        width: file.width,
        height: file.height,
        blob: new Blob([file.bytes as BlobPart], { type: file.mime }),
      });
      const raster = createRasterLayer({
        assetId: asset.id,
        width: file.width,
        height: file.height,
        name: node.name || "Layer",
      });
      content = {
        ...createDocument({
          name: node.name || "Smart Object",
          width: file.width,
          height: file.height,
          background: { kind: "transparent" },
        }),
        layers: [raster],
        activeLayerId: raster.id,
      };
    }
    const smart: SmartObjectLayer = {
      id: createId("layer"),
      kind: "smart",
      name: node.name || "Smart Object",
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      transform: transformFromCorners(placed.corners, content.width, content.height),
      content,
    };
    return smart;
  };

  /** What a Photoshop leaf layer becomes in Picstea (ADR-0017). */
  const leaf = (node: PsdPixelLayer): Layer => {
    const x = node.extras;
    if (x?.adjustment) return createAdjustmentLayer(doc, x.adjustment, node.name || "Adjustment");
    if (x?.text) {
      const t = x.text;
      const empty = rectWidth(node.rect) * rectHeight(node.rect) === 0;
      return {
        ...createTextLayer({
          text: t.text,
          x: empty ? 0 : node.rect.left,
          y: empty ? 0 : node.rect.top,
          style: {
            fontFamily: t.fontFamily,
            fontSize: t.fontSize,
            fontWeight: t.bold ? 700 : 400,
            italic: t.italic,
            color: t.color,
            align: t.align,
            lineHeight: t.lineHeight,
            letterSpacing: t.letterSpacing,
          },
        }),
        name: node.name || "Text",
      };
    }
    if (x?.fill && x.vectorMask) {
      const shape = createPathShapeLayer({
        path: x.vectorMask.path,
        fill: x.fillDisabled ? null : x.fill,
        stroke: x.stroke ?? null,
        name: node.name || "Shape",
      });
      if (shape) return shape;
    }
    if (x?.fill) return createFillLayer(x.fill, node.name || "Color Fill");
    if (x?.placed) {
      const smart = smartLayer(node, x.placed);
      if (smart) return smart;
    }
    if (node.source === "text") {
      warnings.add("Some text layers were imported as pixels (their text is not editable).");
    } else if (node.source === "smart-object") {
      warnings.add("Some smart objects were imported as pixels.");
    }
    return pixelLayer(node);
  };

  const convert = (nodes: readonly PsdNode[]): Layer[] =>
    nodes.map((node): Layer => {
      const common = {
        opacity: Math.round((node.opacity / 255) * 100) / 100,
        visible: node.visible,
        ...(node.clipping ? { clipped: true } : {}),
        // Photoshop's colours are numbered in the same order as LAYER_LABELS, from 1.
        ...(node.colorLabel ? { label: LAYER_LABELS[node.colorLabel - 1] } : {}),
        ...layerBlendingOf(node.blending),
      };
      const mask = toMask(node.mask);
      if (node.kind === "group") {
        const group = createGroup(node.name || "Group", convert(node.children));
        return {
          ...group,
          ...common,
          expanded: node.open,
          blendMode: blend(node.blendKey, true),
          ...(mask ? { mask } : {}),
        };
      }
      const layer = leaf(node);
      const x = node.extras;
      // A shape layer's path is its outline, not a mask.
      const shapeUsesPath = layer.kind === "shape" && layer.shape === "path" && !!x?.fill;
      const vectorMask =
        x?.vectorMask && !shapeUsesPath
          ? { path: x.vectorMask.path, enabled: x.vectorMask.enabled, linked: x.vectorMask.linked }
          : undefined;
      return {
        ...layer,
        ...common,
        blendMode: blend(node.blendKey, false) as Exclude<GroupBlendMode, "pass-through">,
        ...(mask ? { mask } : {}),
        ...(vectorMask ? { vectorMask } : {}),
        ...(x?.effects && layer.kind !== "adjustment" ? { effects: x.effects } : {}),
        ...(x?.fillOpacity !== undefined && layer.kind !== "adjustment"
          ? { fillOpacity: x.fillOpacity }
          : {}),
      } as Layer;
    });

  let layers = convert(psd.layers);
  if (layers.length === 0 && psd.composite) {
    const asset = env.assets.addBitmap(
      rgbaToSurface(env, psd.composite, psd.width, psd.height),
      psd.width,
      psd.height,
    );
    layers = [
      createRasterLayer({
        assetId: asset.id,
        width: psd.width,
        height: psd.height,
        name: "Background",
      }),
    ];
  }
  const active = layers.at(-1)?.id ?? null;
  return {
    ...doc,
    layers,
    activeLayerId: active,
    ...(psd.globalLight ? { globalLight: psd.globalLight } : {}),
  };
}
