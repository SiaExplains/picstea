import type { PsdExtras } from "./psd-extras";

/**
 * A plain model of the subset of PSD that Picstea reads and writes (ADR-0011): 8-bit RGB pixel
 * layers, groups, names, opacity, visibility, blend modes and user masks. No canvas here; the
 * converters in `psd-convert.ts` bridge to editor documents.
 */

export interface PsdRect {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

export const rectWidth = (r: PsdRect) => r.right - r.left;
export const rectHeight = (r: PsdRect) => r.bottom - r.top;

export interface PsdMask {
  readonly rect: PsdRect;
  /** One byte per pixel of `rect`: 0 hides, 255 reveals. */
  readonly data: Uint8Array;
  /** Value outside `rect` (0 or 255). */
  readonly defaultColor: number;
  readonly disabled: boolean;
}

interface PsdNodeBase {
  readonly name: string;
  /** 0 … 255 */
  readonly opacity: number;
  readonly visible: boolean;
  /** Photoshop blend key, e.g. "norm", "mul ", "pass". */
  readonly blendKey: string;
  readonly mask?: PsdMask;
  /** Clipped to the layer below (the record's clipping byte). */
  readonly clipping?: boolean;
  /** Layers-panel colour (`lclr`): 1 red … 7 grey; absent or 0 = none. */
  readonly colorLabel?: number;
}

export interface PsdPixelLayer extends PsdNodeBase {
  readonly kind: "pixels";
  readonly rect: PsdRect;
  /** RGBA, `width × height × 4` for `rect`; null for an empty layer. */
  readonly rgba: Uint8ClampedArray | null;
  /** What the layer was in Photoshop when it is more than pixels (we import its preview). */
  readonly source?: "text" | "smart-object" | "adjustment" | "fill";
  /** Structure beyond the pixels (adjustment, styles, vector data, text, placement). */
  readonly extras?: PsdExtras;
  /** Extra tagged blocks to write on export (adjustment and vector mask data). */
  readonly blocks?: readonly PsdBlock[];
}

export interface PsdBlock {
  readonly key: string;
  readonly data: Uint8Array;
}

/** A file embedded in the PSD for its smart objects (`lnk2`/`lnkD`/`lnk3`). */
export type PsdLinkedFile =
  | { readonly id: string; readonly kind: "psd"; readonly file: PsdFile }
  | {
      readonly id: string;
      readonly kind: "raster";
      readonly bytes: Uint8Array;
      readonly mime: string;
      readonly width: number;
      readonly height: number;
    }
  | { readonly id: string; readonly kind: "unsupported" };

export interface PsdGroup extends PsdNodeBase {
  readonly kind: "group";
  readonly open: boolean;
  /** Bottom-most first. */
  readonly children: readonly PsdNode[];
}

export type PsdNode = PsdPixelLayer | PsdGroup;

export interface PsdFile {
  readonly width: number;
  readonly height: number;
  /** Pixels per inch, if stored. */
  readonly resolution?: number;
  /** Bottom-most first. */
  readonly layers: readonly PsdNode[];
  /** Flattened image (RGBA), always written; read when present. */
  readonly composite: Uint8ClampedArray | null;
  /** Files embedded for smart objects, by id. */
  readonly linked?: readonly PsdLinkedFile[];
  /** Global tagged blocks to write (e.g. embedded smart object files `lnk2`). */
  readonly globalBlocks?: readonly PsdBlock[];
}
