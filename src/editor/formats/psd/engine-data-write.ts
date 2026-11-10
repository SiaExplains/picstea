import { paragraphRanges, paragraphStyleAt, styledSegments } from "../../core/document/text";
import type { CharStyle, TextAlign, TextLayer } from "../../core/document/types";
import { ByteWriter } from "../binary/bytes";
import { writeVersionedDescriptor, type WritableValue } from "./descriptor";

/**
 * Writing Photoshop text (ADR-0041): EngineData — the PostScript-like text description inside a
 * `TySh` block — and the block itself, so text layers stay editable when a PSD is exported. The
 * inverse of `parseEngineData`; values are explicitly typed because the format tells names,
 * strings, integers and decimals apart.
 */

export type EngineOut =
  | { readonly int: number }
  | { readonly float: number }
  | { readonly name: string }
  | { readonly str: string }
  | boolean
  | readonly EngineOut[]
  | { readonly [key: string]: EngineOut };

const int = (n: number): EngineOut => ({ int: Math.round(n) });
const float = (n: number): EngineOut => ({ float: n });
const str = (s: string): EngineOut => ({ str: s });

function isTagged(v: object, key: string): boolean {
  return Object.keys(v).length === 1 && key in v;
}

function formatFloat(n: number): string {
  if (!Number.isFinite(n)) return "0.0";
  const fixed = Number(n.toFixed(5)).toString();
  return fixed.includes(".") || fixed.includes("e") ? fixed : `${fixed}.0`;
}

/** EngineData strings: UTF-16BE with a byte-order mark, with ( ) \ escaped. */
function encodeString(s: string, out: number[]): void {
  out.push(0x28, 0xfe, 0xff);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const hi = c >> 8;
    const lo = c & 0xff;
    for (const byte of [hi, lo]) {
      if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out.push(0x5c);
      out.push(byte);
    }
  }
  out.push(0x29);
}

export function writeEngineData(root: { readonly [key: string]: EngineOut }): Uint8Array {
  const out: number[] = [];
  const ascii = (s: string) => {
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  };
  const value = (v: EngineOut, indent: string): void => {
    if (typeof v === "boolean") ascii(v ? "true" : "false");
    else if (Array.isArray(v)) {
      ascii("[");
      for (const item of v) {
        ascii(" ");
        value(item, indent);
      }
      ascii(" ]");
    } else if (isTagged(v as object, "int")) ascii(String((v as { int: number }).int));
    else if (isTagged(v as object, "float")) ascii(formatFloat((v as { float: number }).float));
    else if (isTagged(v as object, "name")) ascii(`/${(v as { name: string }).name}`);
    else if (isTagged(v as object, "str")) encodeString((v as { str: string }).str, out);
    else dict(v as { readonly [key: string]: EngineOut }, indent);
  };
  const dict = (d: { readonly [key: string]: EngineOut }, indent: string) => {
    ascii("<<");
    const inner = `${indent}\t`;
    for (const [key, v] of Object.entries(d)) {
      ascii(`\n${inner}/${key} `);
      value(v, inner);
    }
    ascii(`\n${indent}>>`);
  };
  ascii("\n\n");
  dict(root, "");
  return Uint8Array.from(out);
}

const JUSTIFICATION: Record<TextAlign, number> = { left: 0, right: 1, center: 2, justify: 3 };

const color = (hex: string): EngineOut => {
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return { Type: int(1), Values: [float(1), float(n(1)), float(n(3)), float(n(5))] };
};

function styleSheetData(style: CharStyle, fontIndex: number): EngineOut {
  const autoLeading = Math.abs(style.lineHeight - 1.2) < 1e-6;
  return {
    Font: int(fontIndex),
    FontSize: float(style.fontSize),
    FauxBold: style.fontWeight === 700,
    FauxItalic: style.italic,
    AutoLeading: autoLeading,
    Leading: float(style.fontSize * style.lineHeight),
    HorizontalScale: float(1),
    VerticalScale: float(1),
    Tracking: int((style.letterSpacing / style.fontSize) * 1000),
    AutoKerning: style.kerning,
    Kerning: int(0),
    BaselineShift: float(style.baselineShift),
    FontCaps: int(style.caps === "small-caps" ? 1 : style.caps === "all-caps" ? 2 : 0),
    FontBaseline: int(0),
    Underline: false,
    Strikethrough: false,
    Ligatures: true,
    DLigatures: false,
    NoBreak: false,
    FillColor: color(style.color),
    StrokeColor: color("#000000"),
    FillFlag: true,
    StrokeFlag: false,
    FillFirst: true,
  };
}

const ADJUSTMENTS: EngineOut = {
  Axis: [float(1), float(0), float(1)],
  XY: [float(0), float(0)],
};

const KINSOKU_SET: EngineOut = [
  {
    Name: str("PhotoshopKinsokuHard"),
    NoStart: str(
      "、。，．・：；？！ー―’”）〕］｝〉》」』】ヽヾゝゞ々ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ゛゜?!)]},.:;℃℉¢％‰",
    ),
    NoEnd: str("‘“（〔［｛〈《「『【([{￥＄£＠§〒＃"),
    Keep: str("―‥"),
    Hanging: str("、。.,"),
  },
];

/** One style for a text layer's characters and paragraphs, as Photoshop resources need. */
function resources(fontNames: readonly string[]): EngineOut {
  return {
    KinsokuSet: KINSOKU_SET,
    MojiKumiSet: [{ InternalName: str("Photoshop6MojiKumiSet1") }],
    TheNormalStyleSheet: int(0),
    TheNormalParagraphSheet: int(0),
    ParagraphSheetSet: [
      {
        Name: str("Normal RGB"),
        DefaultStyleSheet: int(0),
        Properties: {
          Justification: int(0),
          FirstLineIndent: float(0),
          StartIndent: float(0),
          EndIndent: float(0),
          SpaceBefore: float(0),
          SpaceAfter: float(0),
          AutoHyphenate: true,
          HyphenatedWordSize: int(6),
          PreHyphen: int(2),
          PostHyphen: int(2),
          ConsecutiveHyphens: int(8),
          Zone: float(36),
          WordSpacing: [float(0.8), float(1), float(1.33)],
          LetterSpacing: [float(0), float(0), float(0)],
          GlyphSpacing: [float(1), float(1), float(1)],
          AutoLeading: float(1.2),
          LeadingType: int(0),
          Hanging: false,
          Burasagari: false,
          KinsokuOrder: int(0),
          EveryLineComposer: false,
        },
      },
    ],
    StyleSheetSet: [
      {
        Name: str("Normal RGB"),
        StyleSheetData: styleSheetData(
          {
            fontFamily: "",
            fontSize: 12,
            fontWeight: 400,
            italic: false,
            color: "#000000",
            lineHeight: 1.2,
            letterSpacing: 0,
            baselineShift: 0,
            caps: "normal",
            kerning: true,
          },
          0,
        ),
      },
    ],
    FontSet: fontNames.map((name) => ({
      Name: str(name),
      Script: int(0),
      FontType: int(name === "AdobeInvisFont" ? 0 : 1),
      Synthetic: int(0),
    })),
    SuperscriptSize: float(0.583),
    SuperscriptPosition: float(0.333),
    SubscriptSize: float(0.583),
    SubscriptPosition: float(0.333),
    SmallCapSize: float(0.7),
  };
}

/**
 * EngineData for `layer`. `postscript` names the font for a style. Units are layer pixels (the
 * same convention the importer reads).
 */
export function textEngineData(
  layer: TextLayer,
  postscript: (style: CharStyle) => string,
): Uint8Array {
  const text = `${layer.text.replace(/\n/g, "\r")}\r`;
  const fontNames: string[] = [];
  const fontIndex = (style: CharStyle) => {
    const name = postscript(style);
    let i = fontNames.indexOf(name);
    if (i < 0) i = fontNames.push(name) - 1;
    return i;
  };
  const segments = styledSegments(layer).filter((s) => s.end > s.start);
  const styleRuns =
    segments.length > 0 ? segments : [{ start: 0, end: 0, style: segments[0]?.style ?? layer }];
  const styleArray = styleRuns.map((s) => ({
    StyleSheet: {
      StyleSheetData: styleSheetData(s.style as CharStyle, fontIndex(s.style as CharStyle)),
    },
  }));
  // The final "\r" belongs to the last run.
  const styleLengths = styleRuns.map((s, i) =>
    int(s.end - s.start + (i === styleRuns.length - 1 ? text.length - layer.text.length : 0)),
  );
  const paragraphs = paragraphRanges(layer.text).map((range, i) => ({
    range,
    style: paragraphStyleAt(layer, i),
  }));
  const paragraphArray = paragraphs.map(({ style }) => ({
    ParagraphSheet: {
      DefaultStyleSheet: int(0),
      Properties: {
        Justification: int(JUSTIFICATION[style.align]),
        FirstLineIndent: float(style.indentFirst),
        StartIndent: float(style.indentLeft),
        EndIndent: float(style.indentRight),
        SpaceBefore: float(style.spaceBefore),
        SpaceAfter: float(style.spaceAfter),
        AutoHyphenate: false,
        AutoLeading: float(1.2),
        LeadingType: int(0),
        Hanging: false,
        Burasagari: false,
        KinsokuOrder: int(0),
        EveryLineComposer: false,
      },
    },
    Adjustments: ADJUSTMENTS,
  }));
  const paragraphLengths = paragraphs.map(({ range }) => int(range.end - range.start + 1));
  if (!fontNames.includes("AdobeInvisFont")) fontNames.push("AdobeInvisFont");
  const box = layer.box;
  const shapeType = box ? 1 : 0;
  const photoshop: EngineOut = box
    ? {
        ShapeType: int(1),
        BoxBounds: [float(0), float(0), float(box.width), float(box.height)],
        Base: {
          ShapeType: int(1),
          TransformPoint0: [float(1), float(0)],
          TransformPoint1: [float(0), float(1)],
          TransformPoint2: [float(0), float(0)],
        },
      }
    : {
        ShapeType: int(0),
        PointBase: [float(0), float(0)],
        Base: {
          ShapeType: int(0),
          TransformPoint0: [float(1), float(0)],
          TransformPoint1: [float(0), float(1)],
          TransformPoint2: [float(0), float(0)],
        },
      };
  const res = resources(fontNames);
  return writeEngineData({
    EngineDict: {
      Editor: { Text: str(text) },
      ParagraphRun: {
        DefaultRunData: {
          ParagraphSheet: { DefaultStyleSheet: int(0), Properties: {} },
          Adjustments: ADJUSTMENTS,
        },
        RunArray: paragraphArray,
        RunLengthArray: paragraphLengths,
        IsJoinable: int(1),
      },
      StyleRun: {
        DefaultRunData: { StyleSheet: { StyleSheetData: {} } },
        RunArray: styleArray,
        RunLengthArray: styleLengths,
        IsJoinable: int(2),
      },
      GridInfo: {
        GridIsOn: false,
        ShowGrid: false,
        GridSize: float(18),
        GridLeading: float(22),
        GridColor: { Type: int(1), Values: [float(0), float(0), float(0), float(1)] },
        GridLeadingFillColor: { Type: int(1), Values: [float(0), float(0), float(0), float(1)] },
        AlignLineHeightToGridFlags: false,
      },
      AntiAlias: int(4),
      UseFractionalGlyphWidths: true,
      Rendered: {
        Version: int(1),
        Shapes: {
          WritingDirection: int(0),
          Children: [
            {
              ShapeType: int(shapeType),
              Procession: int(0),
              Lines: { WritingDirection: int(0), Children: [] },
              Cookie: { Photoshop: photoshop },
            },
          ],
        },
      },
    },
    ResourceDict: res,
    DocumentResources: res,
  });
}

/**
 * A `TySh` block: the text's transform (anchored at the layer's top-left for paragraph text, at
 * the first baseline for point text), the text descriptor with its EngineData, and an empty warp.
 */
export function encodeTextBlock(
  layer: TextLayer,
  postscript: (style: CharStyle) => string,
  /** Distance from the block's top to the first baseline, for point text. */
  firstBaseline: number,
): Uint8Array {
  const w = new ByteWriter();
  const t = layer.transform;
  const rad = (t.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const xx = cos * t.scaleX;
  const xy = sin * t.scaleX;
  const yx = -sin * t.scaleY;
  const yy = cos * t.scaleY;
  // Point text is anchored on its first baseline; paragraph text at its box's top-left.
  const dy = layer.box ? 0 : firstBaseline;
  const tx = t.x + yx * dy;
  const ty = t.y + yy * dy;
  w.u16(1);
  for (const v of [xx, xy, yx, yy, tx, ty]) w.f64(v);
  w.u16(50);
  const box = layer.box;
  const bounds = (l: number, top: number, r: number, b: number): WritableValue => ({
    type: "Objc",
    descriptor: {
      classId: "bounds",
      items: [
        ["Left", { type: "UntF", unit: "#Pnt", value: l }],
        ["Top ", { type: "UntF", unit: "#Pnt", value: top }],
        ["Rght", { type: "UntF", unit: "#Pnt", value: r }],
        ["Btom", { type: "UntF", unit: "#Pnt", value: b }],
      ],
    },
  });
  writeVersionedDescriptor(w, {
    classId: "TxLr",
    items: [
      ["Txt ", { type: "TEXT", value: `${layer.text.replace(/\n/g, "\r")}` }],
      ["textGridding", { type: "enum", enumType: "textGridding", value: "None" }],
      ["Ornt", { type: "enum", enumType: "Ornt", value: "Hrzn" }],
      ["AntA", { type: "enum", enumType: "Annt", value: "antiAliasSharp" }],
      ...(box ? ([["bounds", bounds(0, 0, box.width, box.height)]] as const) : []),
      ["TextIndex", { type: "long", value: 0 }],
      ["EngineData", { type: "tdta", value: textEngineData(layer, postscript) }],
    ],
  });
  w.u16(1);
  writeVersionedDescriptor(w, {
    classId: "warp",
    items: [
      ["warpStyle", { type: "enum", enumType: "warpStyle", value: "warpNone" }],
      ["warpValue", { type: "doub", value: 0 }],
      ["warpPerspective", { type: "doub", value: 0 }],
      ["warpPerspectiveOther", { type: "doub", value: 0 }],
      ["warpRotate", { type: "enum", enumType: "Ornt", value: "Hrzn" }],
    ],
  });
  // Left, top, right, bottom: recomputed by Photoshop; zero in both of the layouts in use.
  for (let i = 0; i < 4; i++) w.u32(0);
  return w.toBytes();
}
