import { checkDimensions } from "../../core/document/limits";
import { msg } from "../../core/message";
import { FormatError } from "../binary/bytes";
import { inflate } from "../binary/compression";

/**
 * TIFF decoding in the browser (ADR-0045), no dependency: the first image of the file, in strips
 * or tiles; uncompressed, PackBits, LZW, Deflate or JPEG; 1, 8 or 16 bits; grey, RGB or palette,
 * with or without alpha. Photoshop's layer data (tag 37724) is returned as is, so the PSD reader
 * can rebuild the layers. CMYK, floating point, BigTIFF and camera RAW files are refused clearly.
 */

export interface DecodedTiff {
  readonly width: number;
  readonly height: number;
  /** Straight (not premultiplied) RGBA. */
  readonly rgba: Uint8ClampedArray;
  /** Photoshop's layers (ImageSourceData), when the file has them. */
  readonly photoshopLayers?: Uint8Array;
  /** Pixels per inch, if stored. */
  readonly resolution?: number;
}

/** Decodes one JPEG strip or tile to RGBA (the browser's decoder; injected for testing). */
export type JpegDecoder = (
  bytes: Uint8Array,
) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>;

type Values = number[];

interface Ifd {
  readonly get: (tag: number) => Values | undefined;
  readonly bytes: (tag: number) => Uint8Array | undefined;
}

const TYPE_SIZES: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  6: 1,
  7: 1,
  8: 2,
  9: 4,
  10: 8,
  11: 4,
  12: 8,
  13: 4,
};

const MAX_ENTRIES = 4096;
const MAX_CHUNKS = 1_000_000;

export { isCameraRaw, isTiffHeader } from "./tiff-sniff";
import { isCameraRaw, isTiffHeader } from "./tiff-sniff";

function view(b: Uint8Array) {
  return new DataView(b.buffer, b.byteOffset, b.byteLength);
}

function firstIfdOffset(b: Uint8Array): number {
  return view(b).getUint32(4, b[0] === 0x49);
}

function readIfd(b: Uint8Array, offset: number, le: boolean): Ifd {
  const dv = view(b);
  const need = (at: number, n: number) => {
    if (at < 0 || at + n > b.length) throw new FormatError("The TIFF file is damaged.");
  };
  need(offset, 2);
  const count = dv.getUint16(offset, le);
  if (count === 0 || count > MAX_ENTRIES) throw new FormatError("The TIFF file is damaged.");
  need(offset + 2, count * 12);
  const entries = new Map<number, { type: number; count: number; at: number }>();
  for (let i = 0; i < count; i++) {
    const e = offset + 2 + i * 12;
    const tag = dv.getUint16(e, le);
    const type = dv.getUint16(e + 2, le);
    const n = dv.getUint32(e + 4, le);
    const size = (TYPE_SIZES[type] ?? 0) * n;
    if (!TYPE_SIZES[type]) continue;
    const at = size <= 4 ? e + 8 : dv.getUint32(e + 8, le);
    need(at, size);
    entries.set(tag, { type, count: n, at });
  }
  const read = (type: number, at: number): number => {
    switch (type) {
      case 1:
      case 2:
      case 7:
        return dv.getUint8(at);
      case 6:
        return dv.getInt8(at);
      case 3:
        return dv.getUint16(at, le);
      case 8:
        return dv.getInt16(at, le);
      case 4:
      case 13:
        return dv.getUint32(at, le);
      case 9:
        return dv.getInt32(at, le);
      case 5:
        return dv.getUint32(at, le) / (dv.getUint32(at + 4, le) || 1);
      case 10:
        return dv.getInt32(at, le) / (dv.getInt32(at + 4, le) || 1);
      case 11:
        return dv.getFloat32(at, le);
      case 12:
        return dv.getFloat64(at, le);
      default:
        return 0;
    }
  };
  return {
    get(tag) {
      const e = entries.get(tag);
      if (!e) return undefined;
      if (e.count > MAX_CHUNKS) throw new FormatError("The TIFF file is damaged.");
      const size = TYPE_SIZES[e.type];
      return Array.from({ length: e.count }, (_, i) => read(e.type, e.at + i * size));
    },
    bytes(tag) {
      const e = entries.get(tag);
      if (!e) return undefined;
      return b.subarray(e.at, e.at + e.count * TYPE_SIZES[e.type]);
    },
  };
}

/** PackBits (Apple run-length). */
export function unpackBits(src: Uint8Array, expected: number): Uint8Array {
  const out = new Uint8Array(expected);
  let i = 0;
  let o = 0;
  while (i < src.length && o < expected) {
    const n = (src[i++] << 24) >> 24;
    if (n >= 0) {
      const len = Math.min(n + 1, expected - o, src.length - i);
      out.set(src.subarray(i, i + len), o);
      i += n + 1;
      o += len;
    } else if (n !== -128) {
      const len = Math.min(1 - n, expected - o);
      out.fill(src[i++] ?? 0, o, o + len);
      o += len;
    }
  }
  return out;
}

/** TIFF's LZW (MSB first, with the early code-size change). */
export function lzwDecode(src: Uint8Array, expected: number): Uint8Array {
  const out = new Uint8Array(expected);
  let o = 0;
  const prefix = new Int32Array(4096);
  const suffix = new Uint8Array(4096);
  const length = new Uint16Array(4096);
  for (let i = 0; i < 256; i++) {
    prefix[i] = -1;
    suffix[i] = i;
    length[i] = 1;
  }
  let next = 258;
  let bits = 9;
  let bitPos = 0;
  let previous = -1;
  const totalBits = src.length * 8;
  const readCode = () => {
    if (bitPos + bits > totalBits) return 257;
    let code = 0;
    for (let k = 0; k < bits; k++) {
      const bit = (src[(bitPos + k) >> 3] >> (7 - ((bitPos + k) & 7))) & 1;
      code = (code << 1) | bit;
    }
    bitPos += bits;
    return code;
  };
  const emit = (code: number) => {
    const len = length[code];
    let at = o + len - 1;
    let c = code;
    while (c >= 0 && at >= o) {
      if (at < expected) out[at] = suffix[c];
      c = prefix[c];
      at--;
    }
    o += len;
  };
  const first = (code: number) => {
    let c = code;
    while (prefix[c] >= 0) c = prefix[c];
    return suffix[c];
  };
  while (o < expected) {
    const code = readCode();
    if (code === 257) break;
    if (code === 256) {
      next = 258;
      bits = 9;
      previous = -1;
      continue;
    }
    if (previous === -1) {
      if (code > 255) throw new FormatError("Compressed data in the file is damaged.");
      emit(code);
      previous = code;
      continue;
    }
    if (code < next) {
      emit(code);
      if (next < 4096) {
        prefix[next] = previous;
        suffix[next] = first(code);
        length[next] = length[previous] + 1;
        next++;
      }
    } else if (code === next && next < 4096) {
      prefix[next] = previous;
      suffix[next] = first(previous);
      length[next] = length[previous] + 1;
      next++;
      emit(code);
    } else {
      throw new FormatError("Compressed data in the file is damaged.");
    }
    previous = code;
    if (next + 1 >= 1 << bits && bits < 12) bits++;
  }
  return out;
}

const tag1 = (ifd: Ifd, tag: number, fallback: number) => ifd.get(tag)?.[0] ?? fallback;

export async function decodeTiff(
  bytes: Uint8Array,
  decodeJpeg?: JpegDecoder,
): Promise<DecodedTiff> {
  if (bytes.length >= 4 && (bytes[2] === 0x2b || bytes[3] === 0x2b)) {
    throw new FormatError("BigTIFF files are not supported yet.");
  }
  if (!isTiffHeader(bytes)) throw new FormatError("This is not a TIFF file.");
  if (isCameraRaw(bytes)) throw new FormatError("Camera RAW files can't be opened yet.");
  const le = bytes[0] === 0x49;
  const ifd = readIfd(bytes, firstIfdOffset(bytes), le);
  const width = tag1(ifd, 256, 0);
  const height = tag1(ifd, 257, 0);
  const size = checkDimensions(width, height);
  if (!size.ok) throw new FormatError(size.template ?? size.reason);

  const compression = tag1(ifd, 259, 1);
  const photometric = tag1(ifd, 262, 2);
  const spp = tag1(ifd, 277, 1);
  const bitsList = ifd.get(258) ?? [1];
  const bits = bitsList[0];
  const planar = tag1(ifd, 284, 1);
  const predictor = tag1(ifd, 317, 1);
  const format = tag1(ifd, 339, 1);
  const extra = ifd.get(338) ?? [];
  if (photometric === 5) {
    throw new FormatError("CMYK TIFF files are not supported yet. Save the image as RGB.");
  }
  if (format === 3) throw new FormatError("Floating-point TIFF files are not supported yet.");
  if (![1, 8, 16].includes(bits) || bitsList.some((b) => b !== bits)) {
    throw new FormatError(msg("{bits}-bit TIFF files are not supported.", { bits }));
  }
  if (planar !== 1 && spp > 1) {
    throw new FormatError("TIFF files with separate colour planes are not supported yet.");
  }
  if (spp < 1 || spp > 8) throw new FormatError("The TIFF file is damaged.");
  if (photometric === 6 && compression !== 7) {
    throw new FormatError("YCbCr TIFF files are only supported with JPEG compression.");
  }
  if (![0, 1, 2, 3, 6].includes(photometric)) {
    throw new FormatError("This TIFF colour mode is not supported.");
  }
  if (![1, 5, 7, 8, 32946, 32773].includes(compression)) {
    throw new FormatError("This TIFF compression is not supported.");
  }

  const tiled = !!ifd.get(322);
  const tileW = tiled ? tag1(ifd, 322, 0) : width;
  const tileH = tiled ? tag1(ifd, 323, 0) : Math.min(height, tag1(ifd, 278, height));
  if (tileW < 1 || tileH < 1) throw new FormatError("The TIFF file is damaged.");
  const offsets = ifd.get(tiled ? 324 : 273) ?? [];
  const counts = ifd.get(tiled ? 325 : 279) ?? [];
  const across = Math.ceil(width / tileW);
  const down = Math.ceil(height / tileH);
  if (offsets.length < across * down) throw new FormatError("The TIFF file is damaged.");

  const rgba = new Uint8ClampedArray(width * height * 4);
  const bps = bits / 8;
  // Bytes per row of one chunk (1-bit rows round up to whole bytes).
  const chunkRow = bits === 1 ? Math.ceil((tileW * spp) / 8) : tileW * spp * bps;
  const palette = photometric === 3 ? ifd.get(320) : undefined;
  if (photometric === 3 && (!palette || palette.length < 3 * (1 << bits))) {
    throw new FormatError("The TIFF file is damaged.");
  }
  const alphaIndex =
    spp > (photometric <= 1 || photometric === 3 ? 1 : 3)
      ? photometric <= 1 || photometric === 3
        ? 1
        : 3
      : -1;
  const premultiplied = extra[0] === 1;
  const jpegTables = ifd.bytes(347);

  for (let ty = 0; ty < down; ty++) {
    for (let tx = 0; tx < across; tx++) {
      const index = ty * across + tx;
      const start = offsets[index];
      const length = counts[index] ?? bytes.length - start;
      if (start + length > bytes.length) throw new FormatError("The TIFF file is damaged.");
      const raw = bytes.subarray(start, start + length);
      const x0 = tx * tileW;
      const y0 = ty * tileH;
      const rows = Math.min(tileH, height - y0);

      if (compression === 7) {
        if (!decodeJpeg) throw new FormatError("This TIFF compression is not supported.");
        // Abbreviated JPEG: the shared tables go before the strip's own data.
        const data =
          jpegTables && jpegTables.length > 4
            ? Uint8Array.from([
                ...jpegTables.subarray(0, jpegTables.length - 2),
                ...raw.subarray(2),
              ])
            : raw;
        const jpeg = await decodeJpeg(data);
        for (let y = 0; y < rows && y < jpeg.height; y++) {
          for (let x = 0; x < tileW && x0 + x < width && x < jpeg.width; x++) {
            const s = (y * jpeg.width + x) * 4;
            const d = ((y0 + y) * width + x0 + x) * 4;
            rgba[d] = jpeg.data[s];
            rgba[d + 1] = jpeg.data[s + 1];
            rgba[d + 2] = jpeg.data[s + 2];
            rgba[d + 3] = 255;
          }
        }
        continue;
      }

      const expected = chunkRow * (tiled ? tileH : rows);
      let chunk: Uint8Array;
      if (compression === 1) chunk = raw;
      else if (compression === 32773) chunk = unpackBits(raw, expected);
      else if (compression === 5) chunk = lzwDecode(raw, expected);
      else chunk = await inflate(raw, "zlib", expected + 1024);
      if (chunk.length < chunkRow * rows) throw new FormatError("The TIFF file is damaged.");

      const sample = (row: Uint8Array, i: number): number => {
        if (bits === 8) return row[i];
        if (bits === 16) return (le ? row[i * 2 + 1] : row[i * 2]) ?? 0;
        return (row[i >> 3] >> (7 - (i & 7))) & 1 ? 255 : 0;
      };
      for (let y = 0; y < rows; y++) {
        let row = chunk.subarray(y * chunkRow, (y + 1) * chunkRow);
        if (predictor === 2 && bits >= 8) row = undoPredictor(row, tileW, spp, bits, le);
        for (let x = 0; x < tileW && x0 + x < width; x++) {
          const d = ((y0 + y) * width + x0 + x) * 4;
          const base = x * spp;
          let r: number;
          let g: number;
          let b: number;
          if (photometric === 3) {
            const v =
              bits === 16
                ? le
                  ? row[base * 2] | (row[base * 2 + 1] << 8)
                  : (row[base * 2] << 8) | row[base * 2 + 1]
                : bits === 8
                  ? row[base]
                  : (row[base >> 3] >> (7 - (base & 7))) & 1;
            const n = 1 << bits;
            r = palette![v] >> 8;
            g = palette![n + v] >> 8;
            b = palette![2 * n + v] >> 8;
          } else if (photometric <= 1) {
            const v = sample(row, base);
            r = g = b = photometric === 0 ? 255 - v : v;
          } else {
            r = sample(row, base);
            g = sample(row, base + 1);
            b = sample(row, base + 2);
          }
          let a = alphaIndex >= 0 ? sample(row, base + alphaIndex) : 255;
          if (premultiplied && a > 0 && a < 255) {
            r = Math.min(255, Math.round((r * 255) / a));
            g = Math.min(255, Math.round((g * 255) / a));
            b = Math.min(255, Math.round((b * 255) / a));
          }
          if (alphaIndex < 0) a = 255;
          rgba[d] = r;
          rgba[d + 1] = g;
          rgba[d + 2] = b;
          rgba[d + 3] = a;
        }
      }
    }
  }

  const xRes = ifd.get(282)?.[0];
  const unit = tag1(ifd, 296, 2);
  const resolution =
    xRes && Number.isFinite(xRes) && xRes > 0
      ? Math.round(unit === 3 ? xRes * 2.54 : xRes)
      : undefined;
  const layers = ifd.bytes(37724);
  return {
    width,
    height,
    rgba,
    ...(resolution ? { resolution } : {}),
    ...(layers && layers.length > 64 ? { photoshopLayers: layers.slice() } : {}),
  };
}

/** Horizontal differencing (predictor 2): each sample adds the one to its left. */
function undoPredictor(
  row: Uint8Array,
  w: number,
  spp: number,
  bits: number,
  le: boolean,
): Uint8Array {
  const out = row.slice();
  if (bits === 8) {
    for (let i = spp; i < w * spp; i++) out[i] = (out[i] + out[i - spp]) & 255;
    return out;
  }
  const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
  for (let i = spp; i < w * spp; i++) {
    dv.setUint16(i * 2, (dv.getUint16(i * 2, le) + dv.getUint16((i - spp) * 2, le)) & 0xffff, le);
  }
  return out;
}
