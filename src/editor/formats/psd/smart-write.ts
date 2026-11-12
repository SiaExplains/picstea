import { ByteWriter } from "../binary/bytes";
import { writeUnicodeString, writeVersionedDescriptor, type WritableValue } from "./descriptor";
import type { PsdBlock } from "./psd-model";

/**
 * Smart objects in PSD export (ADR-0045): each layer gets a placement block (`SoLd`) naming its
 * contents, and the contents themselves — written as a PSD — go into the file's global `lnk2`
 * block. A distortion (ADR-0044) is written as Photoshop's `nonAffineTransform` (perspective) or
 * a custom `warp` mesh. Mirrors the importer (`decodePlaced`, `readLinkedFiles`).
 */

export type PlacedDistortion =
  /** The distorted corners in document space. */
  | { readonly kind: "perspective"; readonly quad: readonly number[] }
  /** 16 control points in the contents' own pixels (0,0 – width × height). */
  | { readonly kind: "warp"; readonly mesh: readonly number[] };

const doubles = (values: readonly number[]): WritableValue => ({
  type: "VlLs",
  values: values.map((value) => ({ type: "doub", value })),
});
const px = (value: number): WritableValue => ({ type: "UntF", unit: "#Pxl", value });

/** `SoLd` for a smart object whose contents are `id`, `width × height`, placed at `corners`. */
export function encodePlaced(
  id: string,
  width: number,
  height: number,
  corners: readonly number[],
  distortion?: PlacedDistortion,
): PsdBlock {
  const mesh = distortion?.kind === "warp" ? distortion.mesh : null;
  const warp: WritableValue = {
    type: "Objc",
    descriptor: {
      classId: "warp",
      items: [
        [
          "warpStyle",
          { type: "enum", enumType: "warpStyle", value: mesh ? "warpCustom" : "warpNone" },
        ],
        ["warpValue", { type: "doub", value: 0 }],
        ["warpPerspective", { type: "doub", value: 0 }],
        ["warpPerspectiveOther", { type: "doub", value: 0 }],
        ["warpRotate", { type: "enum", enumType: "Ornt", value: "Hrzn" }],
        [
          "bounds",
          {
            type: "Objc",
            descriptor: {
              classId: "Rctn",
              items: [
                ["Top ", px(0)],
                ["Left", px(0)],
                ["Btom", px(height)],
                ["Rght", px(width)],
              ],
            },
          },
        ],
        ["uOrder", { type: "long", value: 4 }],
        ["vOrder", { type: "long", value: 4 }],
        ...(mesh
          ? ([
              [
                "customEnvelopeWarp",
                {
                  type: "Objc",
                  descriptor: {
                    classId: "customEnvelopeWarp",
                    items: [
                      [
                        "meshPoints",
                        {
                          type: "ObAr",
                          classId: "rationalPoint",
                          items: [
                            ["Hrzn", { unit: "#Pxl", values: mesh.filter((_, i) => i % 2 === 0) }],
                            ["Vrtc", { unit: "#Pxl", values: mesh.filter((_, i) => i % 2 === 1) }],
                          ],
                        },
                      ],
                    ],
                  },
                },
              ],
            ] as const)
          : []),
      ],
    },
  };
  const w = new ByteWriter();
  w.ascii("soLD").u32(4);
  writeVersionedDescriptor(w, {
    classId: "null",
    items: [
      ["Idnt", { type: "TEXT", value: id }],
      ["placed", { type: "TEXT", value: id }],
      ["PgNm", { type: "long", value: 1 }],
      ["totalPages", { type: "long", value: 1 }],
      ["frameCount", { type: "long", value: 1 }],
      ["Annt", { type: "long", value: 16 }],
      ["Type", { type: "long", value: 2 }],
      ["Trnf", doubles(corners)],
      [
        "nonAffineTransform",
        doubles(distortion?.kind === "perspective" ? distortion.quad : corners),
      ],
      ["warp", warp],
      [
        "Sz  ",
        {
          type: "Objc",
          descriptor: {
            classId: "Pnt ",
            items: [
              ["Wdth", { type: "doub", value: width }],
              ["Hght", { type: "doub", value: height }],
            ],
          },
        },
      ],
      ["Rslt", { type: "UntF", unit: "#Rsl", value: 72 }],
      ["comp", { type: "long", value: -1 }],
      [
        "compInfo",
        {
          type: "Objc",
          descriptor: {
            classId: "null",
            items: [
              ["compID", { type: "long", value: -1 }],
              ["originalCompID", { type: "long", value: -1 }],
            ],
          },
        },
      ],
    ],
  });
  return { key: "SoLd", data: w.toBytes() };
}

/** The global `lnk2` block: every smart object's contents, embedded as PSD files. */
export function encodeLinkedFiles(
  files: readonly { readonly id: string; readonly name: string; readonly data: Uint8Array }[],
): PsdBlock {
  const w = new ByteWriter();
  for (const file of files) {
    const entry = new ByteWriter();
    entry.ascii("liFD").u32(2);
    entry.u8(file.id.length).ascii(file.id);
    writeUnicodeString(entry, file.name);
    entry.ascii("8BPS").ascii("8BIM");
    entry.u32(0).u32(file.data.length);
    entry.u8(0); // no "file open" descriptor
    entry.bytes(file.data);
    const bytes = entry.toBytes();
    w.u32(0).u32(bytes.length).bytes(bytes);
    // Entries are padded to a multiple of 4.
    w.bytes(new Uint8Array((4 - (bytes.length % 4)) % 4));
  }
  return { key: "lnk2", data: w.toBytes() };
}
