import { ByteWriter } from "../formats/binary/bytes";
import {
  writeUnicodeString,
  writeVersionedDescriptor,
  type WritableDescriptor,
  type WritableValue,
} from "../formats/psd/descriptor";

/**
 * Builders for Photoshop tagged-block bodies, so tests can produce PSD files with text, styles,
 * fills and smart objects without shipping binary fixtures (ADR-0017). Pure, used by unit and
 * end-to-end tests.
 */

const doub = (value: number): WritableValue => ({ type: "doub", value });
const untf = (unit: string, value: number): WritableValue => ({ type: "UntF", unit, value });
const bool = (value: boolean): WritableValue => ({ type: "bool", value });
const objc = (descriptor: WritableDescriptor): WritableValue => ({ type: "Objc", descriptor });

export function rgbColor(hex: string): WritableValue {
  const n = Number.parseInt(hex.slice(1), 16);
  return objc({
    classId: "RGBC",
    items: [
      ["Rd  ", doub((n >> 16) & 255)],
      ["Grn ", doub((n >> 8) & 255)],
      ["Bl  ", doub(n & 255)],
    ],
  });
}

/** `lfx2` with a drop shadow. */
export function dropShadowBlock(options: {
  color: string;
  distance: number;
  blur: number;
  angle: number;
}): Uint8Array {
  const w = new ByteWriter();
  w.u32(0);
  writeVersionedDescriptor(w, {
    classId: "null",
    items: [
      ["masterFXSwitch", bool(true)],
      [
        "DrSh",
        objc({
          classId: "DrSh",
          items: [
            ["enab", bool(true)],
            ["Clr ", rgbColor(options.color)],
            ["Opct", untf("#Prc", 75)],
            ["uglg", bool(false)],
            ["lagl", untf("#Ang", options.angle)],
            ["Dstn", untf("#Pxl", options.distance)],
            ["blur", untf("#Pxl", options.blur)],
          ],
        }),
      ],
    ],
  });
  return w.toBytes();
}

/** `SoCo`: a solid colour fill. */
export function solidColorBlock(hex: string): Uint8Array {
  const w = new ByteWriter();
  writeVersionedDescriptor(w, { classId: "null", items: [["Clr ", rgbColor(hex)]] });
  return w.toBytes();
}

function engineString(s: string): number[] {
  const out = [0x28, 0xfe, 0xff];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    for (const b of [c >> 8, c & 255]) {
      if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c);
      out.push(b);
    }
  }
  out.push(0x29);
  return out;
}

/** `TySh`: a text layer with one style run, positioned by its transform. */
export function textBlock(options: {
  text: string;
  fontSize: number;
  color: [number, number, number];
  font: string;
  x: number;
  y: number;
}): Uint8Array {
  const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
  const [r, g, b] = options.color.map((v) => v / 255);
  const engine = Uint8Array.from([
    ...ascii("\n\n<<\n\t/EngineDict\n\t<<\n\t\t/Editor << /Text "),
    ...engineString(`${options.text}\r`),
    ...ascii(
      " >>\n\t\t/ParagraphRun << /RunArray [ << /ParagraphSheet << /Properties << /Justification 0 >> >> >> ] >>",
    ),
    ...ascii(
      `\n\t\t/StyleRun << /RunArray [ << /StyleSheet << /StyleSheetData << /Font 0 /FontSize ${options.fontSize} /FauxBold true /AutoLeading true /FillColor << /Type 1 /Values [ 1.0 ${r} ${g} ${b} ] >> >> >> >> ] >>`,
    ),
    ...ascii("\n\t>>\n\t/ResourceDict << /FontSet [ << /Name "),
    ...engineString(options.font),
    ...ascii(" >> ] >>\n>>"),
  ]);
  const w = new ByteWriter();
  w.u16(1);
  for (const v of [1, 0, 0, 1, options.x, options.y]) w.f64(v);
  w.u16(50);
  writeVersionedDescriptor(w, {
    classId: "TxLr",
    items: [
      ["Txt ", { type: "TEXT", value: options.text }],
      ["EngineData", { type: "tdta", value: engine }],
    ],
  });
  // Warp (none) and bounds follow; Picstea doesn't need them.
  w.u16(1);
  writeVersionedDescriptor(w, {
    classId: "warp",
    items: [["warpStyle", { type: "enum", enumType: "warpStyle", value: "warpNone" }]],
  });
  for (let i = 0; i < 4; i++) w.f64(0);
  return w.toBytes();
}

/** `SoLd`: a smart object placement referring to an embedded file. */
export function placedBlock(id: string, corners: readonly number[]): Uint8Array {
  const w = new ByteWriter();
  w.ascii("soLD").u32(4);
  writeVersionedDescriptor(w, {
    classId: "null",
    items: [
      ["Idnt", { type: "TEXT", value: id }],
      ["Trnf", { type: "VlLs", values: corners.map(doub) }],
    ],
  });
  return w.toBytes();
}

/** `lnk2` with one embedded file (`liFD`). */
export function linkedFilesBlock(
  id: string,
  name: string,
  fileType: string,
  data: Uint8Array,
): Uint8Array {
  const entry = new ByteWriter();
  entry.ascii("liFD").u32(2).u8(id.length).ascii(id);
  writeUnicodeString(entry, name);
  entry.ascii(fileType.padEnd(4)).ascii("    ");
  entry.u32(0).u32(data.length);
  entry.u8(0);
  entry.bytes(data);
  const bytes = entry.toBytes();
  const w = new ByteWriter();
  w.u32(0).u32(bytes.length).bytes(bytes);
  for (let i = bytes.length; i % 4 !== 0; i++) w.u8(0);
  return w.toBytes();
}

const long = (value: number): WritableValue => ({ type: "long", value });
const enm = (enumType: string, value: string): WritableValue => ({ type: "enum", enumType, value });

/** A PSD colour record: RGB colour space and 16-bit channels. */
function colorRecord(w: ByteWriter, hex: string): void {
  const n = Number.parseInt(hex.slice(1), 16);
  w.u16(0)
    .u16(((n >> 16) & 255) * 257)
    .u16(((n >> 8) & 255) * 257)
    .u16((n & 255) * 257)
    .u16(0);
}

/** `phfl` version 2 (RGB colour record). */
export function photoFilterBlock(color: string, density: number, preserve: boolean): Uint8Array {
  const w = new ByteWriter();
  w.u16(2);
  colorRecord(w, color);
  w.u32(density).u8(preserve ? 1 : 0);
  return w.toBytes();
}

/** `grdm` with RGB colour stops (location 0…4096). */
export function gradientMapBlock(
  stops: readonly { position: number; color: string }[],
  reverse: boolean,
): Uint8Array {
  const w = new ByteWriter();
  w.u16(1)
    .u8(reverse ? 1 : 0)
    .u8(0);
  writeUnicodeString(w, "Custom");
  w.u16(stops.length);
  for (const s of stops) {
    w.u32(Math.round(s.position * 4096)).u32(50);
    colorRecord(w, s.color);
    w.u16(0);
  }
  // Opacity stops and the rest of the gradient, which Picstea doesn't read.
  w.u16(2).u32(0).u32(50).u16(255).u32(4096).u32(50).u16(255);
  return w.toBytes();
}

/** `lfx2` with an inner shadow, an inner bevel and a linear gradient overlay. */
export function innerStylesBlock(options: {
  shadow: string;
  bevelHighlight: string;
  gradient: readonly { position: number; color: string }[];
}): Uint8Array {
  const w = new ByteWriter();
  w.u32(0);
  writeVersionedDescriptor(w, {
    classId: "null",
    items: [
      ["masterFXSwitch", bool(true)],
      [
        "IrSh",
        objc({
          classId: "IrSh",
          items: [
            ["enab", bool(true)],
            ["Clr ", rgbColor(options.shadow)],
            ["Opct", untf("#Prc", 50)],
            ["uglg", bool(false)],
            ["lagl", untf("#Ang", 90)],
            ["Dstn", untf("#Pxl", 4)],
            ["blur", untf("#Pxl", 6)],
          ],
        }),
      ],
      [
        "ebbl",
        objc({
          classId: "ebbl",
          items: [
            ["enab", bool(true)],
            ["bvlS", enm("BESl", "InrB")],
            ["bvlD", enm("BESs", "In  ")],
            ["hglC", rgbColor(options.bevelHighlight)],
            ["hglO", untf("#Prc", 80)],
            ["sdwC", rgbColor("#000000")],
            ["sdwO", untf("#Prc", 60)],
            ["uglg", bool(false)],
            ["lagl", untf("#Ang", 135)],
            ["blur", untf("#Pxl", 7)],
          ],
        }),
      ],
      [
        "GrFl",
        objc({
          classId: "GrFl",
          items: [
            ["enab", bool(true)],
            ["Opct", untf("#Prc", 100)],
            ["Angl", untf("#Ang", 0)],
            ["Type", enm("GrdT", "Lnr ")],
            ["Rvrs", bool(false)],
            [
              "Grad",
              objc({
                classId: "Grdn",
                items: [
                  ["GrdF", enm("GrdF", "CstS")],
                  [
                    "Clrs",
                    {
                      type: "VlLs",
                      values: options.gradient.map((s) =>
                        objc({
                          classId: "Clrt",
                          items: [
                            ["Clr ", rgbColor(s.color)],
                            ["Lctn", long(Math.round(s.position * 4096))],
                            ["Mdpn", long(50)],
                          ],
                        }),
                      ),
                    },
                  ],
                ],
              }),
            ],
          ],
        }),
      ],
    ],
  });
  return w.toBytes();
}

const text = (value: string): WritableValue => ({ type: "TEXT", value });
const list = (values: readonly WritableValue[]): WritableValue => ({ type: "VlLs", values });
const point = (h: number, v: number): WritableValue =>
  objc({
    classId: "CrPt",
    items: [
      ["Hrzn", doub(h)],
      ["Vrtc", doub(v)],
    ],
  });
const contour = (name: string, points: readonly [number, number][]): WritableValue =>
  objc({
    classId: "ShpC",
    items: [
      ["Nm  ", text(name)],
      ["Crv ", list(points.map(([h, v]) => point(h, v)))],
    ],
  });
const gradient = (colors: readonly string[]): WritableValue =>
  objc({
    classId: "Grdn",
    items: [
      ["GrdF", enm("GrdF", "CstS")],
      [
        "Clrs",
        list(
          colors.map((c, i) =>
            objc({
              classId: "Clrt",
              items: [
                ["Clr ", rgbColor(c)],
                ["Lctn", long(Math.round((i / (colors.length - 1)) * 4096))],
                ["Mdpn", long(50)],
              ],
            }),
          ),
        ),
      ],
    ],
  });
const pattern = (name: string): WritableValue =>
  objc({
    classId: "Ptrn",
    items: [
      ["Nm  ", text(name)],
      ["Idnt", text("x")],
    ],
  });
const offset = (h: number, v: number): WritableValue =>
  objc({
    classId: "Pnt ",
    items: [
      ["Hrzn", doub(h)],
      ["Vrtc", doub(v)],
    ],
  });

/** `lfx2` using the full Layer Style option set (ADR-0030): copies, contours, every effect. */
export function proStylesBlock(): Uint8Array {
  const shadow = (color: string, distance: number) =>
    objc({
      classId: "DrSh",
      items: [
        ["enab", bool(true)],
        ["Md  ", enm("BlnM", "Scrn")],
        ["Clr ", rgbColor(color)],
        ["Opct", untf("#Prc", 40)],
        ["uglg", bool(true)],
        ["lagl", untf("#Ang", 10)],
        ["Dstn", untf("#Pxl", distance)],
        ["Ckmt", untf("#Pxl", 20)],
        ["blur", untf("#Pxl", 9)],
        ["Nose", untf("#Prc", 10)],
        ["AntA", bool(true)],
        ["TrnS", contour("Cone", [])],
        ["layerConceals", bool(false)],
      ],
    });
  const w = new ByteWriter();
  w.u32(0);
  writeVersionedDescriptor(w, {
    classId: "null",
    items: [
      ["masterFXSwitch", bool(true)],
      ["dropShadowMulti", list([shadow("#ff0000", 4), shadow("#00ff00", 12)])],
      [
        "OrGl",
        objc({
          classId: "OrGl",
          items: [
            ["enab", bool(true)],
            ["Md  ", enm("BlnM", "Nrml")],
            ["Opct", untf("#Prc", 60)],
            ["Grad", gradient(["#ffffff", "#0000ff"])],
            ["GlwT", enm("BETE", "PrBL")],
            ["Ckmt", untf("#Pxl", 30)],
            ["blur", untf("#Pxl", 12)],
            [
              "TrnS",
              contour("Custom", [
                [0, 0],
                [128, 200],
                [255, 64],
              ]),
            ],
            ["Inpr", untf("#Prc", 70)],
            ["ShdN", untf("#Prc", 15)],
          ],
        }),
      ],
      [
        "IrGl",
        objc({
          classId: "IrGl",
          items: [
            ["enab", bool(true)],
            ["Md  ", enm("BlnM", "Ovrl")],
            ["Clr ", rgbColor("#ffcc00")],
            ["glwS", enm("IGSr", "SrcC")],
            ["blur", untf("#Pxl", 7)],
          ],
        }),
      ],
      [
        "ChFX",
        objc({
          classId: "ChFX",
          items: [
            ["enab", bool(true)],
            ["Md  ", enm("BlnM", "Mltp")],
            ["Clr ", rgbColor("#220044")],
            ["Opct", untf("#Prc", 50)],
            ["lagl", untf("#Ang", 45)],
            ["Dstn", untf("#Pxl", 6)],
            ["blur", untf("#Pxl", 8)],
            ["MpgS", contour("Gaussian", [])],
            ["Invr", bool(false)],
          ],
        }),
      ],
      [
        "patternFill",
        objc({
          classId: "patternFill",
          items: [
            ["enab", bool(true)],
            ["Md  ", enm("BlnM", "Nrml")],
            ["Opct", untf("#Prc", 100)],
            ["Ptrn", pattern("Diagonal Stripes 2")],
            ["Scl ", untf("#Prc", 200)],
            ["Algn", bool(false)],
            ["phase", offset(5, -3)],
          ],
        }),
      ],
      [
        "frameFXMulti",
        list([
          objc({
            classId: "FrFX",
            items: [
              ["enab", bool(true)],
              ["Styl", enm("FStl", "InsF")],
              ["PntT", enm("FrFl", "GrFl")],
              ["Md  ", enm("BlnM", "Nrml")],
              ["Opct", untf("#Prc", 100)],
              ["Sz  ", untf("#Pxl", 6)],
              ["Grad", gradient(["#000000", "#ffffff"])],
              ["Type", enm("GrdT", "Rdl ")],
              ["Angl", untf("#Ang", 30)],
              ["Scl ", untf("#Prc", 80)],
            ],
          }),
        ]),
      ],
      [
        "GrFl",
        objc({
          classId: "GrFl",
          items: [
            ["enab", bool(true)],
            ["Md  ", enm("BlnM", "SftL")],
            ["Opct", untf("#Prc", 90)],
            ["Grad", gradient(["#ff0000", "#00ff00", "#0000ff"])],
            ["Type", enm("GrdT", "Dmnd")],
            ["Angl", untf("#Ang", 45)],
            ["Scl ", untf("#Prc", 120)],
            ["Ofst", offset(10, -20)],
            ["Dthr", bool(true)],
            ["gradientsInterpolationMethod", enm("gradientInterpolationMethodType", "Perc")],
          ],
        }),
      ],
      [
        "ebbl",
        objc({
          classId: "ebbl",
          items: [
            ["enab", bool(true)],
            ["bvlS", enm("BESl", "Embs")],
            ["bvlT", enm("bvlT", "Slmt")],
            ["bvlD", enm("BESs", "Out ")],
            ["srgR", untf("#Prc", 250)],
            ["blur", untf("#Pxl", 9)],
            ["Sftn", untf("#Pxl", 3)],
            ["uglg", bool(false)],
            ["lagl", untf("#Ang", 60)],
            ["Lald", untf("#Ang", 45)],
            ["hglM", enm("BlnM", "CDdg")],
            ["hglC", rgbColor("#ffffee")],
            ["hglO", untf("#Prc", 90)],
            ["sdwM", enm("BlnM", "linearBurn")],
            ["sdwO", untf("#Prc", 40)],
            ["useShape", bool(true)],
            ["MpgS", contour("Ring", [])],
            ["Inpr", untf("#Prc", 80)],
            ["useTexture", bool(true)],
            ["Ptrn", pattern("Bricks")],
            ["textureDepth", untf("#Prc", -150)],
            ["InvT", bool(true)],
          ],
        }),
      ],
    ],
  });
  return w.toBytes();
}
