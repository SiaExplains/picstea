import type { Guide } from "../document/types";
import { applyMatrix, type Matrix } from "./matrix";

/**
 * Whole-image transforms (ADR-0033): Image → Image Size, Image Rotation and Flip Canvas. Each is
 * a matrix from old document coordinates to new ones plus the new canvas size; every layer, mask,
 * path and guide is moved through the same matrix.
 */
export type CanvasOp =
  | { readonly kind: "rotate"; readonly turns: 1 | 2 | 3 }
  | { readonly kind: "flip"; readonly axis: "horizontal" | "vertical" }
  | { readonly kind: "scale"; readonly width: number; readonly height: number }
  /**
   * Any angle (degrees, clockwise; ADR-0044): Image Rotation → Arbitrary… and Straighten. The
   * canvas grows to hold the rotated image; the new corners are empty.
   */
  | { readonly kind: "angle"; readonly degrees: number; readonly label?: "Straighten" };

export const CANVAS_OP_LABELS = {
  rotate: { 1: "Rotate 90° Clockwise", 2: "Rotate 180°", 3: "Rotate 90° Counter-Clockwise" },
  flip: { horizontal: "Flip Canvas Horizontal", vertical: "Flip Canvas Vertical" },
  scale: "Image Size",
  angle: "Rotate Canvas",
} as const;

export function canvasOpLabel(op: CanvasOp): string {
  if (op.kind === "rotate") return CANVAS_OP_LABELS.rotate[op.turns];
  if (op.kind === "flip") return CANVAS_OP_LABELS.flip[op.axis];
  if (op.kind === "angle") return op.label ?? CANVAS_OP_LABELS.angle;
  return CANVAS_OP_LABELS.scale;
}

/** The matrix (old → new document coordinates) and the new canvas size. */
export function canvasTransform(
  op: CanvasOp,
  width: number,
  height: number,
): { matrix: Matrix; width: number; height: number } {
  switch (op.kind) {
    case "rotate":
      // Quarter turns clockwise (y points down).
      if (op.turns === 1) return { matrix: [0, 1, -1, 0, height, 0], width: height, height: width };
      if (op.turns === 2) return { matrix: [-1, 0, 0, -1, width, height], width, height };
      return { matrix: [0, -1, 1, 0, 0, width], width: height, height: width };
    case "flip":
      return op.axis === "horizontal"
        ? { matrix: [-1, 0, 0, 1, width, 0], width, height }
        : { matrix: [1, 0, 0, -1, 0, height], width, height };
    case "scale":
      return {
        matrix: [op.width / width, 0, 0, op.height / height, 0, 0],
        width: op.width,
        height: op.height,
      };
    case "angle": {
      const r = (op.degrees * Math.PI) / 180;
      const cos = Math.cos(r);
      const sin = Math.sin(r);
      const w = Math.ceil(Math.abs(width * cos) + Math.abs(height * sin) - 1e-6);
      const h = Math.ceil(Math.abs(width * sin) + Math.abs(height * cos) - 1e-6);
      // Rotate about the old centre, then centre on the new canvas.
      const cx = width / 2;
      const cy = height / 2;
      return {
        matrix: [cos, sin, -sin, cos, w / 2 - (cos * cx - sin * cy), h / 2 - (sin * cx + cos * cy)],
        width: w,
        height: h,
      };
    }
  }
}

/**
 * The largest rectangle with the image's own proportions that fits inside a w × h image rotated
 * by `degrees` (centred on the rotated canvas of `canvasW × canvasH`): what Straighten crops to.
 */
export function straightenedCrop(
  w: number,
  h: number,
  degrees: number,
  canvasW: number,
  canvasH: number,
): { x: number; y: number; width: number; height: number } {
  const a = Math.abs((degrees * Math.PI) / 180) % Math.PI;
  const sin = Math.abs(Math.sin(a));
  const cos = Math.abs(Math.cos(a));
  // Scale k so that a k·w × k·h box rotated back fits in w × h.
  const k = Math.min(w / (w * cos + h * sin), h / (w * sin + h * cos));
  const width = Math.floor(w * k);
  const height = Math.floor(h * k);
  return {
    x: Math.round((canvasW - width) / 2),
    y: Math.round((canvasH - height) / 2),
    width,
    height,
  };
}

/** A guide through the matrix: guides stay axis-aligned under these transforms. */
export function transformGuide(guide: Guide, m: Matrix): Guide {
  const a =
    guide.orientation === "vertical" ? { x: guide.position, y: 0 } : { x: 0, y: guide.position };
  const b =
    guide.orientation === "vertical" ? { x: guide.position, y: 1 } : { x: 1, y: guide.position };
  const p = applyMatrix(m, a);
  const q = applyMatrix(m, b);
  return Math.abs(p.x - q.x) < 1e-9
    ? { ...guide, orientation: "vertical", position: p.x }
    : { ...guide, orientation: "horizontal", position: p.y };
}

/** Axis-aligned bounds of a rectangle through the matrix. */
export function transformRect(
  rect: { x: number; y: number; width: number; height: number },
  m: Matrix,
): { x: number; y: number; width: number; height: number } {
  const pts = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height],
  ].map(([x, y]) => applyMatrix(m, { x, y }));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
