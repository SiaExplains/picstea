/**
 * A plain model of the subset of PSD that MYLPER reads and writes (ADR-0011): 8-bit RGB pixel
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
}

export interface PsdPixelLayer extends PsdNodeBase {
  readonly kind: "pixels";
  readonly rect: PsdRect;
  /** RGBA, `width × height × 4` for `rect`; null for an empty layer. */
  readonly rgba: Uint8ClampedArray | null;
  /** What the layer was in Photoshop when it is more than pixels (we import its preview). */
  readonly source?: "text" | "smart-object" | "adjustment" | "fill";
}

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
}
