import { FormatError } from "../binary/bytes";
import { cropToContent } from "../crop";
import type { RgbaPixels } from "../../selection/flood";
import type { PsdBlending } from "./psd-blending";
import type { PsdBlock, PsdFile, PsdMask, PsdNode } from "./psd-model";

/**
 * A PSD export whose pixels are still ImageBitmaps rendered on the main thread (ADR-0012). The
 * worker reads them back, crops them and encodes the file, so none of that blocks the UI.
 */

export interface DraftMask {
  /** Document-sized; its alpha is the mask value (255 reveals). */
  readonly bitmap: ImageBitmap;
  readonly disabled: boolean;
}

interface DraftBase {
  readonly name: string;
  readonly opacity: number;
  readonly visible: boolean;
  readonly blendKey: string;
  readonly mask?: DraftMask;
  readonly clipping?: boolean;
  readonly colorLabel?: number;
  readonly blending?: PsdBlending;
  /** Photoshop tagged blocks written as they are (adjustment and vector mask data). */
  readonly blocks?: readonly PsdBlock[];
}

export type DraftNode =
  | (DraftBase & {
      readonly kind: "pixels";
      /** Rendered region in document space; null when the layer has nothing to show. */
      readonly region: { x: number; y: number } | null;
      readonly bitmap: ImageBitmap | null;
    })
  | (DraftBase & {
      readonly kind: "group";
      readonly open: boolean;
      readonly children: DraftNode[];
    });

export interface PsdDraft {
  readonly width: number;
  readonly height: number;
  readonly resolution?: number;
  readonly layers: readonly DraftNode[];
  readonly composite: ImageBitmap;
}

/** Read an ImageBitmap's pixels with an OffscreenCanvas (main thread or worker). */
export function bitmapPixels(bitmap: ImageBitmap): RgbaPixels {
  if (typeof OffscreenCanvas === "undefined") {
    throw new FormatError("This browser cannot read image pixels in the background.");
  }
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new FormatError("2D canvas is not available.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const data = ctx.getImageData(0, 0, width, height).data;
  canvas.width = 0;
  canvas.height = 0;
  return { width, height, data };
}

export function draftBitmaps(draft: PsdDraft): ImageBitmap[] {
  const out: ImageBitmap[] = [draft.composite];
  const visit = (nodes: readonly DraftNode[]) => {
    for (const node of nodes) {
      if (node.mask) out.push(node.mask.bitmap);
      if (node.kind === "group") visit(node.children);
      else if (node.bitmap) out.push(node.bitmap);
    }
  };
  visit(draft.layers);
  return out;
}

function toMask(mask: DraftMask | undefined): PsdMask | undefined {
  if (!mask) return undefined;
  const { width, height, data } = bitmapPixels(mask.bitmap);
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = data[i * 4 + 3];
  return {
    rect: { top: 0, left: 0, bottom: height, right: width },
    data: gray,
    defaultColor: 255,
    disabled: mask.disabled,
  };
}

/** Turn a draft into the PSD model: read pixels, crop each layer to its visible content. */
export function resolveDraft(draft: PsdDraft): PsdFile {
  const convert = (nodes: readonly DraftNode[]): PsdNode[] =>
    nodes.map((node): PsdNode => {
      const base = {
        name: node.name,
        opacity: node.opacity,
        visible: node.visible,
        blendKey: node.blendKey,
        mask: toMask(node.mask),
        ...(node.clipping ? { clipping: true } : {}),
        ...(node.colorLabel ? { colorLabel: node.colorLabel } : {}),
        ...(node.blending ? { blending: node.blending } : {}),
      };
      if (node.kind === "group") {
        return { ...base, kind: "group", open: node.open, children: convert(node.children) };
      }
      const blocks = node.blocks?.length ? { blocks: node.blocks } : {};
      const empty = {
        ...base,
        ...blocks,
        kind: "pixels" as const,
        rect: { top: 0, left: 0, bottom: 0, right: 0 },
        rgba: null,
      };
      if (!node.bitmap || !node.region) return empty;
      const pixels = bitmapPixels(node.bitmap);
      const cropped = cropToContent(pixels.data, pixels.width, pixels.height);
      if (!cropped) return empty;
      const left = node.region.x + cropped.x;
      const top = node.region.y + cropped.y;
      return {
        ...base,
        ...blocks,
        kind: "pixels",
        rect: { top, left, bottom: top + cropped.height, right: left + cropped.width },
        rgba: cropped.rgba,
      };
    });
  return {
    width: draft.width,
    height: draft.height,
    resolution: draft.resolution,
    layers: convert(draft.layers),
    composite: bitmapPixels(draft.composite).data,
  };
}
