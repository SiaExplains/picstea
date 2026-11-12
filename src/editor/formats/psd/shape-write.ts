import type { ShapeLayer } from "../../core/document/types";
import { applyMatrix, fromTransform } from "../../core/geometry/matrix";
import { corner, mapPath, type Anchor, type VectorPath } from "../../core/path/path";
import { ByteWriter } from "../binary/bytes";
import {
  writeVersionedDescriptor,
  type WritableDescriptor,
  type WritableValue,
} from "./descriptor";

/**
 * Editable shapes in PSD export (ADR-0045): the outline as Photoshop vector data (`vsms`), the fill
 * as a solid-colour fill (`SoCo`) and the stroke as `vstk` — the blocks the importer reads.
 */

/** Bézier circle constant: handle length for a quarter arc. */
const KAPPA = 0.5522847498;

const smooth = (x: number, y: number, inX: number, inY: number, outX: number, outY: number) =>
  ({ x, y, in: { x: inX, y: inY }, out: { x: outX, y: outY } }) satisfies Anchor;

/** The shape's outline in its own coordinates (box 0,0 – width × height). */
export function shapeLocalPath(layer: ShapeLayer): VectorPath {
  const { width: w, height: h } = layer;
  switch (layer.shape) {
    case "path":
      return layer.path ?? { subpaths: [] };
    case "line":
      return { subpaths: [{ closed: false, anchors: [corner(0, 0), corner(w, h)] }] };
    case "ellipse": {
      const rx = w / 2;
      const ry = h / 2;
      const kx = rx * KAPPA;
      const ky = ry * KAPPA;
      return {
        subpaths: [
          {
            closed: true,
            anchors: [
              smooth(rx, 0, rx - kx, 0, rx + kx, 0),
              smooth(w, ry, w, ry - ky, w, ry + ky),
              smooth(rx, h, rx + kx, h, rx - kx, h),
              smooth(0, ry, 0, ry + ky, 0, ry - ky),
            ],
          },
        ],
      };
    }
    case "rect": {
      const r = Math.max(0, Math.min(layer.cornerRadius, w / 2, h / 2));
      if (r === 0) {
        return {
          subpaths: [
            { closed: true, anchors: [corner(0, 0), corner(w, 0), corner(w, h), corner(0, h)] },
          ],
        };
      }
      const k = r * KAPPA;
      // Each corner is two anchors: where the straight edge ends and where the next begins.
      return {
        subpaths: [
          {
            closed: true,
            anchors: [
              smooth(r, 0, r - k, 0, r, 0),
              smooth(w - r, 0, w - r, 0, w - r + k, 0),
              smooth(w, r, w, r - k, w, r),
              smooth(w, h - r, w, h - r, w, h - r + k),
              smooth(w - r, h, w - r + k, h, w - r, h),
              smooth(r, h, r, h, r - k, h),
              smooth(0, h - r, 0, h - r + k, 0, h - r),
              smooth(0, r, 0, r, 0, r - k),
            ],
          },
        ],
      };
    }
  }
}

/** The shape's outline in document coordinates (through its layer transform). */
export function shapeOutline(layer: ShapeLayer): VectorPath {
  const m = fromTransform(layer.transform);
  return mapPath(shapeLocalPath(layer), (p) => applyMatrix(m, p));
}

const rgb = (hex: string): WritableValue => {
  const n = Number.parseInt(hex.slice(1), 16);
  return {
    type: "Objc",
    descriptor: {
      classId: "RGBC",
      items: [
        ["Rd  ", { type: "doub", value: (n >> 16) & 255 }],
        ["Grn ", { type: "doub", value: (n >> 8) & 255 }],
        ["Bl  ", { type: "doub", value: n & 255 }],
      ],
    },
  };
};

const versioned = (d: WritableDescriptor): Uint8Array => {
  const w = new ByteWriter();
  writeVersionedDescriptor(w, d);
  return w.toBytes();
};

/** `SoCo`: a solid-colour fill (fill layers and shape fills). */
export function encodeSolidColor(hex: string): { key: string; data: Uint8Array } {
  return { key: "SoCo", data: versioned({ classId: "null", items: [["Clr ", rgb(hex)]] }) };
}

/** `vstk`: whether the shape is filled and its stroke (round caps and joins, centred). */
export function encodeShapeStroke(layer: ShapeLayer): { key: string; data: Uint8Array } {
  const stroke = layer.stroke;
  const enumOf = (type: string, value: string): WritableValue => ({
    type: "enum",
    enumType: type,
    value,
  });
  return {
    key: "vstk",
    data: versioned({
      classId: "strokeStyle",
      items: [
        ["strokeStyleVersion", { type: "long", value: 2 }],
        ["strokeEnabled", { type: "bool", value: !!stroke }],
        ["fillEnabled", { type: "bool", value: !!layer.fill && layer.shape !== "line" }],
        ["strokeStyleLineWidth", { type: "UntF", unit: "#Pxl", value: stroke?.width ?? 1 }],
        ["strokeStyleLineDashOffset", { type: "UntF", unit: "#Pnt", value: 0 }],
        ["strokeStyleMiterLimit", { type: "doub", value: 100 }],
        ["strokeStyleLineCapType", enumOf("strokeStyleLineCapType", "strokeStyleRoundCap")],
        ["strokeStyleLineJoinType", enumOf("strokeStyleLineJoinType", "strokeStyleRoundJoin")],
        ["strokeStyleLineAlignment", enumOf("strokeStyleLineAlignment", "strokeStyleAlignCenter")],
        ["strokeStyleScaleLock", { type: "bool", value: false }],
        ["strokeStyleStrokeAdjust", { type: "bool", value: false }],
        ["strokeStyleLineDashSet", { type: "VlLs", values: [] }],
        ["strokeStyleBlendMode", enumOf("BlnM", "Nrml")],
        ["strokeStyleOpacity", { type: "UntF", unit: "#Prc", value: 100 }],
        [
          "strokeStyleContent",
          {
            type: "Objc",
            descriptor: {
              classId: "solidColorLayer",
              items: [["Clr ", rgb(stroke?.color ?? "#000000")]],
            },
          },
        ],
        ["strokeStyleResolution", { type: "doub", value: 72 }],
      ],
    }),
  };
}
