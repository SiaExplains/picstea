import { FormatError } from "../binary/bytes";

/**
 * Photoshop text "EngineData" (ADR-0017): a PostScript-like syntax with dictionaries
 * (`<< /Key value >>`), arrays (`[ … ]`), names (`/Name`), numbers, booleans and strings in
 * parentheses (UTF-16BE with a byte-order mark). Parsing is bounded in depth, size and items;
 * dictionaries have no prototype.
 */

export type EngineValue =
  number | boolean | string | EngineValue[] | { [key: string]: EngineValue } | null;

export type EngineDict = { [key: string]: EngineValue };

const MAX_DEPTH = 64;
const MAX_ITEMS = 200_000;
const MAX_BYTES = 8 * 1024 * 1024;

const isSpace = (c: number) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d || c === 0x00;
const isDelimiter = (c: number) =>
  isSpace(c) || c === 0x2f || c === 0x5b || c === 0x5d || c === 0x3c || c === 0x3e || c === 0x28;

export function parseEngineData(bytes: Uint8Array): EngineDict {
  if (bytes.length > MAX_BYTES) throw new FormatError("The text in this file is too large.");
  let i = 0;
  let items = 0;
  const fail = (): never => {
    throw new FormatError("The text in this file is damaged.");
  };
  const skipSpace = () => {
    while (i < bytes.length && isSpace(bytes[i])) i++;
  };
  const name = (): string => {
    i++; // "/"
    const start = i;
    while (i < bytes.length && !isDelimiter(bytes[i])) i++;
    if (i - start > 256) fail();
    return String.fromCharCode(...bytes.subarray(start, i));
  };
  const string = (): string => {
    i++; // "("
    const raw: number[] = [];
    while (i < bytes.length && bytes[i] !== 0x29) {
      if (bytes[i] === 0x5c && i + 1 < bytes.length) i++; // escaped byte
      raw.push(bytes[i++]);
      if (raw.length > MAX_BYTES) fail();
    }
    if (i >= bytes.length) fail();
    i++; // ")"
    if (raw[0] === 0xfe && raw[1] === 0xff) {
      let s = "";
      for (let k = 2; k + 1 < raw.length; k += 2)
        s += String.fromCharCode((raw[k] << 8) | raw[k + 1]);
      return s;
    }
    let s = "";
    for (const b of raw) s += String.fromCharCode(b);
    return s;
  };
  const value = (depth: number): EngineValue => {
    if (depth > MAX_DEPTH || ++items > MAX_ITEMS) fail();
    skipSpace();
    if (i >= bytes.length) fail();
    const c = bytes[i];
    if (c === 0x3c && bytes[i + 1] === 0x3c) return dict(depth + 1);
    if (c === 0x5b) {
      i++;
      const list: EngineValue[] = [];
      for (;;) {
        skipSpace();
        if (i >= bytes.length) fail();
        if (bytes[i] === 0x5d) {
          i++;
          return list;
        }
        list.push(value(depth + 1));
      }
    }
    if (c === 0x28) return string();
    if (c === 0x2f) return name();
    const start = i;
    while (i < bytes.length && !isDelimiter(bytes[i])) i++;
    if (i - start > 64) fail();
    const word = String.fromCharCode(...bytes.subarray(start, i));
    if (word === "true") return true;
    if (word === "false") return false;
    if (word === "null") return null;
    const n = Number(word);
    if (word === "" || !Number.isFinite(n)) fail();
    return n;
  };
  const dict = (depth: number): EngineDict => {
    i += 2; // "<<"
    const out = Object.create(null) as EngineDict;
    for (;;) {
      skipSpace();
      if (i >= bytes.length) fail();
      if (bytes[i] === 0x3e && bytes[i + 1] === 0x3e) {
        i += 2;
        return out;
      }
      if (bytes[i] !== 0x2f) fail();
      const key = name();
      out[key] = value(depth + 1);
    }
  };
  skipSpace();
  if (bytes[i] !== 0x3c || bytes[i + 1] !== 0x3c) fail();
  return dict(0);
}

/** Follow a path of keys and array indexes; undefined when anything is missing. */
export function enginePath(
  root: EngineValue,
  ...path: (string | number)[]
): EngineValue | undefined {
  let v: EngineValue | undefined = root;
  for (const p of path) {
    if (v === null || v === undefined) return undefined;
    if (typeof p === "number") {
      if (!Array.isArray(v)) return undefined;
      v = v[p];
    } else {
      if (typeof v !== "object" || Array.isArray(v)) return undefined;
      v = Object.prototype.hasOwnProperty.call(v, p) ? (v as EngineDict)[p] : undefined;
    }
  }
  return v;
}
