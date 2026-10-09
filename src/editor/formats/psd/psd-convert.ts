import { createGroup } from "../../core/commands/group-commands";
import { createDocument, createRasterLayer } from "../../core/document/factory";
import type { EditorDocument, GroupBlendMode, Layer, LayerMask } from "../../core/document/types";
import { context2d, releaseSurface, type PixelEnv } from "../../pixels/layer-pixels";
import { boundsOf, layerCorners } from "../../core/geometry/layer-geometry";
import { renderBitmap, rgbaToSurface } from "../layer-render";
import type { DraftMask, DraftNode, PsdDraft } from "./psd-draft";
import { blendKey, blendModeFromKey } from "./blend-keys";
import { rectHeight, rectWidth, type PsdFile, type PsdMask, type PsdNode } from "./psd-model";

/**
 * Bridges between editor documents and the PSD model (ADR-0011/0012). Export turns every leaf layer
 * into pixels (shapes and text are rasterised, effects merged in); import turns PSD layers into
 * pixel layers, groups and masks.
 */

const hasEffects = (layer: Layer) =>
  !!layer.effects && Object.values(layer.effects).some((e) => e?.enabled);

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
function effectReach(layer: Layer): number {
  const e = layer.effects;
  if (!e) return 0;
  let reach = 0;
  if (e.dropShadow?.enabled) reach = Math.max(reach, e.dropShadow.distance + e.dropShadow.blur * 2);
  if (e.outerGlow?.enabled) reach = Math.max(reach, e.outerGlow.size * 2);
  if (e.stroke?.enabled) reach = Math.max(reach, e.stroke.size);
  return Math.ceil(reach) + 2;
}

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
      if (layer.kind === "adjustment") {
        warnings.add("Adjustment layers are included in the flattened image only.");
        continue;
      }
      const base = {
        name: layer.name,
        opacity: Math.round(layer.opacity * 255),
        visible: layer.visible,
        blendKey: blendKey(layer.blendMode),
        mask: layer.mask ? await maskDraft(env, doc, layer.mask) : undefined,
        ...(layer.clipped ? { clipping: true } : {}),
      };
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
      if (layer.vectorMask?.enabled)
        warnings.add("Vector masks were merged into the layer pixels.");
      if (layer.kind === "smart") warnings.add("Smart objects were converted to pixels.");
      // The layer's own look, without its opacity, blend mode or mask (stored separately).
      const plain = {
        ...layer,
        opacity: 1,
        blendMode: "normal",
        visible: true,
        mask: undefined,
        clipped: false,
      } as Layer;
      const region = leafRegion(env, doc, layer);
      out.push({
        ...base,
        kind: "pixels",
        region: region ? { x: region.x, y: region.y } : null,
        bitmap: region ? await renderBitmap(env, doc, [plain], region) : null,
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
  const doc = createDocument({
    name,
    width: psd.width,
    height: psd.height,
    resolution: psd.resolution,
    background: { kind: "transparent" },
  });

  const blend = (key: string, group: boolean): GroupBlendMode => {
    const mode = blendModeFromKey(key);
    if (mode === "pass-through" && group) return mode;
    if (mode && mode !== "pass-through") return mode;
    warnings.add("Some blend modes are not available in MYLPER and were set to Normal.");
    return group ? "pass-through" : "normal";
  };

  const toMask = (mask: PsdMask | undefined): LayerMask | undefined => {
    if (!mask) return undefined;
    const w = rectWidth(mask.rect);
    const h = rectHeight(mask.rect);
    if (mask.defaultColor === 255 && w * h === 0) return undefined;
    // Outside its box a MYLPER mask reveals; a PSD mask hiding outside its box is widened to
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

  const convert = (nodes: readonly PsdNode[]): Layer[] =>
    nodes.map((node): Layer => {
      const common = {
        opacity: Math.round((node.opacity / 255) * 100) / 100,
        visible: node.visible,
        ...(node.clipping ? { clipped: true } : {}),
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
      const w = rectWidth(node.rect);
      const h = rectHeight(node.rect);
      let assetId: string | null = null;
      if (node.rgba && w > 0 && h > 0) {
        assetId = env.assets.addBitmap(rgbaToSurface(env, node.rgba, w, h), w, h).id;
      }
      const raster = createRasterLayer({
        assetId,
        width: Math.max(1, w),
        height: Math.max(1, h),
        name: node.name || "Layer",
        x: node.rect.left,
        y: node.rect.top,
      });
      return {
        ...raster,
        ...common,
        blendMode: blend(node.blendKey, false) as Exclude<GroupBlendMode, "pass-through">,
        ...(mask ? { mask } : {}),
      };
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
  return { document: { ...doc, layers, activeLayerId: active }, warnings: [...warnings] };
}
