import type { FontMime } from "../assets/asset-store";

/**
 * Font files the user uploads (ADR-0040): identified by their first bytes, never by name or by
 * the type the browser reports. TrueType/OpenType names are read from the `name` table; WOFF and
 * WOFF2 are compressed, so their family comes from the file name.
 */

export const MAX_FONT_FILE_BYTES = 10 * 1024 * 1024;
export const FONT_FILE_ACCEPT = ".ttf,.otf,.woff,.woff2";

export function sniffFont(bytes: Uint8Array): FontMime | null {
  if (bytes.length < 12) return null;
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (tag === "wOF2") return "font/woff2";
  if (tag === "wOFF") return "font/woff";
  if (tag === "OTTO") return "font/otf";
  if (tag === "true" || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)) {
    return "font/ttf";
  }
  return null;
}

export interface FontNames {
  readonly family: string;
  readonly subfamily: string;
  readonly postscriptName?: string;
}

/** Family, style and PostScript name from a TrueType/OpenType `name` table, if readable. */
export function readFontNames(bytes: Uint8Array): FontNames | null {
  const mime = sniffFont(bytes);
  if (mime !== "font/ttf" && mime !== "font/otf") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    const numTables = view.getUint16(4);
    let nameOffset = -1;
    for (let i = 0; i < Math.min(numTables, 256); i++) {
      const record = 12 + i * 16;
      const tag = String.fromCharCode(...bytes.subarray(record, record + 4));
      if (tag === "name") {
        nameOffset = view.getUint32(record + 8);
        break;
      }
    }
    if (nameOffset < 0 || nameOffset + 6 > bytes.length) return null;
    const count = view.getUint16(nameOffset + 2);
    const storage = nameOffset + view.getUint16(nameOffset + 4);
    const names = new Map<number, string>();
    for (let i = 0; i < Math.min(count, 1024); i++) {
      const r = nameOffset + 6 + i * 12;
      if (r + 12 > bytes.length) break;
      const platform = view.getUint16(r);
      const nameId = view.getUint16(r + 6);
      const length = view.getUint16(r + 8);
      const offset = storage + view.getUint16(r + 10);
      if (![1, 2, 4, 6, 16, 17].includes(nameId) || offset + length > bytes.length) continue;
      const raw = bytes.subarray(offset, offset + length);
      // Windows (3) and Unicode (0) names are UTF-16BE; Mac (1) names are single-byte.
      let text = "";
      if (platform === 3 || platform === 0) {
        for (let j = 0; j + 1 < raw.length; j += 2)
          text += String.fromCharCode((raw[j] << 8) | raw[j + 1]);
      } else if (platform === 1) {
        text = String.fromCharCode(...raw);
      } else {
        continue;
      }
      if (!names.has(nameId) || platform === 3) names.set(nameId, text);
    }
    const family = names.get(16) ?? names.get(1);
    if (!family) return null;
    return {
      family,
      subfamily: names.get(17) ?? names.get(2) ?? "Regular",
      postscriptName: names.get(6),
    };
  } catch {
    return null;
  }
}

/** Weight and italic from a style name such as "Bold Italic" or "SemiBold". */
export function styleFromName(name: string): { weight: 400 | 700; italic: boolean } {
  return {
    weight: /bold|black|heavy|semibold|demibold|extrabold/i.test(name) ? 700 : 400,
    italic: /italic|oblique/i.test(name),
  };
}

/** A family name from a file name ("Brand-Sans_Bold.woff2" → "Brand Sans"). */
export function familyFromFileName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "");
  const withoutStyle = stem.replace(
    /[-_ ]?(regular|bold|italic|oblique|light|medium|semibold|black|thin|extrabold|heavy)+$/i,
    "",
  );
  return (withoutStyle || stem).replace(/[-_]+/g, " ").trim().slice(0, 100) || "Uploaded font";
}
