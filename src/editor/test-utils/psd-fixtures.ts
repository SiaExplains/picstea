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
  // Warp (none) and bounds follow; MYLPER doesn't need them.
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
