import { ByteReader, ByteWriter, FormatError } from "../binary/bytes";

/**
 * Photoshop action descriptors (ADR-0017): the structured data inside layer styles, text, smart
 * objects and newer adjustments. The reader is hardened like the rest of the PSD parser — depth,
 * item counts and string lengths are bounded, and objects have no prototype, so keys such as
 * `__proto__` are plain data.
 */

/** A number with a unit (`UntF`): class instances, so file keys can never imitate them. */
export class UnitValue {
  constructor(
    readonly unit: string,
    readonly value: number,
  ) {}
}

export class EnumValue {
  constructor(
    readonly enumType: string,
    readonly value: string,
  ) {}
}

export type DescriptorValue =
  | number
  | string
  | boolean
  | Uint8Array
  | Descriptor
  | DescriptorValue[]
  | UnitValue
  | EnumValue
  | null;

/** Items by key; `_class` holds the class id. Created with a null prototype. */
export type Descriptor = { [key: string]: DescriptorValue } & { _class?: string };

const MAX_DEPTH = 32;
const MAX_ITEMS = 10_000;
const MAX_TOTAL_VALUES = 500_000;
const MAX_STRING = 1_000_000;

interface Budget {
  values: number;
}

function count(r: ByteReader, max = MAX_ITEMS): number {
  const n = r.u32();
  if (n > max) throw new FormatError("A layer description in this file is too large.");
  return n;
}

export function readUnicodeString(r: ByteReader): string {
  const n = count(r, MAX_STRING);
  let s = "";
  for (let i = 0; i < n; i++) s += String.fromCharCode(r.u16());
  return s.replace(/\0+$/, "");
}

/** A 4-character key, or a longer id when the length is non-zero. */
function readId(r: ByteReader): string {
  const n = r.u32();
  if (n > 1024) throw new FormatError("A layer description in this file is damaged.");
  return r.ascii(n === 0 ? 4 : n);
}

function spend(budget: Budget): void {
  if (++budget.values > MAX_TOTAL_VALUES) {
    throw new FormatError("A layer description in this file is too large.");
  }
}

function readReference(r: ByteReader): null {
  const n = count(r);
  for (let i = 0; i < n; i++) {
    const type = r.ascii(4);
    switch (type) {
      case "prop":
        readUnicodeString(r);
        readId(r);
        readId(r);
        break;
      case "Clss":
        readUnicodeString(r);
        readId(r);
        break;
      case "Enmr":
        readUnicodeString(r);
        readId(r);
        readId(r);
        readId(r);
        break;
      case "rele":
        readUnicodeString(r);
        readId(r);
        r.u32();
        break;
      case "Idnt":
      case "indx":
        r.u32();
        break;
      case "name":
        readUnicodeString(r);
        readId(r);
        readUnicodeString(r);
        break;
      default:
        throw new FormatError("A layer description in this file uses an unknown reference.");
    }
  }
  return null;
}

function readValue(r: ByteReader, type: string, depth: number, budget: Budget): DescriptorValue {
  spend(budget);
  if (depth > MAX_DEPTH)
    throw new FormatError("A layer description in this file is nested too deeply.");
  switch (type) {
    case "obj ":
      return readReference(r);
    case "Objc":
    case "GlbO":
      return readDescriptorBody(r, depth + 1, budget);
    case "VlLs": {
      const n = count(r);
      const list: DescriptorValue[] = [];
      for (let i = 0; i < n; i++) list.push(readValue(r, r.ascii(4), depth + 1, budget));
      return list;
    }
    case "doub":
      return r.f64();
    case "UntF":
      return new UnitValue(r.ascii(4), r.f64());
    case "UnFl": {
      const unit = r.ascii(4);
      const n = count(r);
      const values: DescriptorValue[] = [];
      for (let i = 0; i < n; i++) values.push(new UnitValue(unit, r.f64()));
      return values;
    }
    case "TEXT":
      return readUnicodeString(r);
    case "enum":
      return new EnumValue(readId(r), readId(r));
    case "long":
      return r.i32();
    case "comp":
      return r.i32() * 2 ** 32 + r.u32();
    case "bool":
      return r.u8() !== 0;
    case "type":
    case "GlbC":
      readUnicodeString(r);
      return readId(r);
    case "alis":
    case "tdta":
    case "Pth ":
      return r.bytesView(r.u32());
    case "ObAr": {
      // Object array: a class with lists of unit doubles (warp meshes).
      r.u32();
      readUnicodeString(r);
      readId(r);
      const n = count(r);
      const out = Object.create(null) as Descriptor;
      for (let i = 0; i < n; i++) {
        const key = readId(r);
        const itemType = r.ascii(4);
        if (itemType !== "UnFl")
          throw new FormatError("A layer description in this file is damaged.");
        out[key] = readValue(r, itemType, depth + 1, budget);
      }
      return out;
    }
    default:
      throw new FormatError("A layer description in this file uses an unknown value type.");
  }
}

function readDescriptorBody(r: ByteReader, depth: number, budget: Budget): Descriptor {
  readUnicodeString(r);
  const out = Object.create(null) as Descriptor;
  out._class = readId(r);
  const n = count(r);
  for (let i = 0; i < n; i++) {
    const key = readId(r);
    out[key] = readValue(r, r.ascii(4), depth + 1, budget);
  }
  return out;
}

/** A descriptor preceded by its version (16). */
export function readVersionedDescriptor(r: ByteReader): Descriptor {
  const version = r.u32();
  if (version !== 16)
    throw new FormatError("A layer description in this file has an unknown version.");
  return readDescriptorBody(r, 0, { values: 0 });
}

// -------------------------------------------------------------------------------------------
// Typed access (values from files are untrusted: every getter checks the type).

export const getNumber = (d: Descriptor | undefined, key: string): number | undefined => {
  const v = d?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v instanceof UnitValue && Number.isFinite(v.value)) return v.value;
  return undefined;
};

export const getBool = (d: Descriptor | undefined, key: string): boolean | undefined => {
  const v = d?.[key];
  return typeof v === "boolean" ? v : undefined;
};

export const getString = (d: Descriptor | undefined, key: string): string | undefined => {
  const v = d?.[key];
  return typeof v === "string" ? v : undefined;
};

export const getEnum = (d: Descriptor | undefined, key: string): string | undefined => {
  const v = d?.[key];
  return v instanceof EnumValue ? v.value : undefined;
};

export const getDescriptor = (d: Descriptor | undefined, key: string): Descriptor | undefined => {
  const v = d?.[key];
  return v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    !(v instanceof Uint8Array) &&
    !(v instanceof UnitValue) &&
    !(v instanceof EnumValue)
    ? (v as Descriptor)
    : undefined;
};

export const getList = (d: Descriptor | undefined, key: string): DescriptorValue[] | undefined => {
  const v = d?.[key];
  return Array.isArray(v) ? v : undefined;
};

export const getBytes = (d: Descriptor | undefined, key: string): Uint8Array | undefined => {
  const v = d?.[key];
  return v instanceof Uint8Array ? v : undefined;
};

/** `#rrggbb` from an RGBC colour descriptor (`Rd  `, `Grn `, `Bl  ` in 0…255). */
export function getColor(d: Descriptor | undefined, key = "Clr "): string | undefined {
  const c = getDescriptor(d, key);
  const r = getNumber(c, "Rd  ");
  const g = getNumber(c, "Grn ");
  const b = getNumber(c, "Bl  ") ?? getNumber(c, "Bl ");
  if (r === undefined || g === undefined || b === undefined) return undefined;
  if (![r, g, b].every(Number.isFinite)) return undefined;
  const hex = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// -------------------------------------------------------------------------------------------
// Writing (export): only the value types MYLPER writes.

export type WritableValue =
  | { readonly type: "doub"; readonly value: number }
  | { readonly type: "UntF"; readonly unit: string; readonly value: number }
  | { readonly type: "long"; readonly value: number }
  | { readonly type: "bool"; readonly value: boolean }
  | { readonly type: "enum"; readonly enumType: string; readonly value: string }
  | { readonly type: "TEXT"; readonly value: string }
  | { readonly type: "tdta"; readonly value: Uint8Array }
  | { readonly type: "VlLs"; readonly values: readonly WritableValue[] }
  | { readonly type: "Objc"; readonly descriptor: WritableDescriptor };

export interface WritableDescriptor {
  readonly classId: string;
  readonly items: readonly (readonly [string, WritableValue])[];
}

export function writeUnicodeString(w: ByteWriter, s: string): void {
  w.u32(s.length + 1);
  for (let i = 0; i < s.length; i++) w.u16(s.charCodeAt(i));
  w.u16(0);
}

function writeId(w: ByteWriter, id: string): void {
  if (id.length === 4) w.u32(0).ascii(id);
  else w.u32(id.length).ascii(id);
}

function writeValue(w: ByteWriter, value: WritableValue): void {
  w.ascii(value.type);
  switch (value.type) {
    case "doub":
      w.f64(value.value);
      break;
    case "UntF":
      w.ascii(value.unit).f64(value.value);
      break;
    case "long":
      w.i32(value.value);
      break;
    case "bool":
      w.u8(value.value ? 1 : 0);
      break;
    case "enum":
      writeId(w, value.enumType);
      writeId(w, value.value);
      break;
    case "TEXT":
      writeUnicodeString(w, value.value);
      break;
    case "tdta":
      w.u32(value.value.length).bytes(value.value);
      break;
    case "VlLs":
      w.u32(value.values.length);
      for (const v of value.values) writeValue(w, v);
      break;
    case "Objc":
      writeDescriptorBody(w, value.descriptor);
      break;
  }
}

function writeDescriptorBody(w: ByteWriter, d: WritableDescriptor): void {
  writeUnicodeString(w, "");
  writeId(w, d.classId);
  w.u32(d.items.length);
  for (const [key, value] of d.items) {
    writeId(w, key);
    writeValue(w, value);
  }
}

export function writeVersionedDescriptor(w: ByteWriter, d: WritableDescriptor): void {
  w.u32(16);
  writeDescriptorBody(w, d);
}
