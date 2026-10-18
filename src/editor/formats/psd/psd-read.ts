import { checkDimensions, MAX_DIMENSION, MAX_PIXELS } from "../../core/document/limits";
import { ByteReader, FormatError } from "../binary/bytes";
import { inflate } from "../binary/compression";
import { unpackBits } from "./packbits";
import { decodeExtras, EXTRA_KEYS } from "./psd-extras";
import { readUnicodeString, readVersionedDescriptor } from "./descriptor";
import { readImageHeader } from "../raster/image-header";
import {
  rectHeight,
  rectWidth,
  type PsdFile,
  type PsdGroup,
  type PsdMask,
  type PsdNode,
  type PsdLinkedFile,
  type PsdPixelLayer,
  type PsdRect,
} from "./psd-model";

/**
 * Hardened PSD reader for the subset in `psd-model.ts` (docs/12 "PSD parsing"): every length is
 * bounds-checked, dimensions and the total pixel allocation are validated before decoding, layer
 * count and group depth are limited, unknown blocks are skipped by length, and anything we cannot
 * represent faithfully is either refused with a clear message or reported as a warning.
 */

export const MAX_PSD_LAYERS = 2_000;
export const MAX_PSD_GROUP_DEPTH = 32;
/** Decoded RGBA bytes across all layers, masks and the composite. */
export const MAX_PSD_DECODED_BYTES = 1024 * 1024 * 1024;

export interface PsdReadResult {
  readonly file: PsdFile;
  /** Things that were simplified, for a user-facing notice. */
  readonly warnings: readonly string[];
}

const RGB = 3;
const GRAYSCALE = 1;
const MODE_NAMES: Record<number, string> = {
  0: "Bitmap",
  2: "Indexed colour",
  4: "CMYK",
  7: "Multichannel",
  8: "Duotone",
  9: "Lab",
};

interface ChannelInfo {
  readonly id: number;
  readonly length: number;
}

interface RawRecord {
  readonly rect: PsdRect;
  readonly channels: readonly ChannelInfo[];
  readonly blendKey: string;
  readonly opacity: number;
  readonly visible: boolean;
  readonly clipping: boolean;
  readonly name: string;
  readonly mask?: { rect: PsdRect; defaultColor: number; disabled: boolean };
  readonly section?: { type: number; blendKey?: string };
  readonly source?: PsdPixelLayer["source"];
  /** Bodies of the tagged blocks `decodeExtras` understands (ADR-0017). */
  readonly blocks: Map<string, Uint8Array>;
  /** The layer mask was rendered from a vector mask (flag bit 3). */
  readonly maskFromVector: boolean;
}

function readRect(r: ByteReader): PsdRect {
  const top = r.i32();
  const left = r.i32();
  const bottom = r.i32();
  const right = r.i32();
  if (bottom < top || right < left) throw new FormatError("A layer has invalid bounds.");
  const w = right - left;
  const h = bottom - top;
  if (w > MAX_DIMENSION * 2 || h > MAX_DIMENSION * 2 || w * h > MAX_PIXELS) {
    throw new FormatError("A layer in this file is too large.");
  }
  return { top, left, bottom, right };
}

function pascal(r: ByteReader, padTo: number): string {
  const length = r.u8();
  const name = r.ascii(length);
  const consumed = length + 1;
  r.skip((padTo - (consumed % padTo)) % padTo);
  return name;
}

function readRecord(r: ByteReader): RawRecord {
  const rect = readRect(r);
  const channelCount = r.u16();
  if (channelCount > 56) throw new FormatError("A layer has too many channels.");
  const channels: ChannelInfo[] = [];
  for (let i = 0; i < channelCount; i++) channels.push({ id: r.i16(), length: r.u32() });
  if (r.ascii(4) !== "8BIM") throw new FormatError("A layer record is damaged.");
  const blendKey = r.ascii(4);
  const opacity = r.u8();
  const clipping = r.u8();
  const flags = r.u8();
  r.skip(1);

  const extra = r.sub(r.u32());
  let mask: RawRecord["mask"];
  let maskFromVector = false;
  const blocks = new Map<string, Uint8Array>();
  const maskLength = extra.u32();
  if (maskLength > 0) {
    const m = extra.sub(maskLength);
    const maskRect = readRect(m);
    const defaultColor = m.u8() >= 128 ? 255 : 0;
    const maskFlags = m.u8();
    mask = { rect: maskRect, defaultColor, disabled: (maskFlags & 2) !== 0 };
    maskFromVector = (maskFlags & 8) !== 0;
  }
  extra.skip(extra.u32()); // blending ranges
  let name = pascal(extra, 4);
  let section: RawRecord["section"];
  let source: RawRecord["source"];
  while (extra.remaining >= 12) {
    const signature = extra.ascii(4);
    if (signature !== "8BIM" && signature !== "8B64") break;
    const key = extra.ascii(4);
    const raw = extra.bytesView(Math.min(extra.u32(), extra.remaining));
    const body = new ByteReader(raw);
    if (EXTRA_KEYS.has(key) && !blocks.has(key)) blocks.set(key, raw.slice());
    switch (key) {
      case "luni": {
        const count = body.u32();
        if (count <= 1024 && count * 2 <= body.remaining) {
          let s = "";
          for (let i = 0; i < count; i++) s += String.fromCharCode(body.u16());
          name = s.replace(/\0+$/, "");
        }
        break;
      }
      case "lsct":
      case "lsdk": {
        const type = body.u32();
        let sectionBlend: string | undefined;
        if (body.remaining >= 8 && body.ascii(4) === "8BIM") sectionBlend = body.ascii(4);
        section = { type, blendKey: sectionBlend };
        break;
      }
      case "TySh":
      case "tySh":
        source = "text";
        break;
      case "SoLd":
      case "SoLE":
      case "PlLd":
        source = "smart-object";
        break;
      case "SoCo":
      case "GdFl":
      case "PtFl":
        source = "fill";
        break;
      case "brit":
      case "levl":
      case "curv":
      case "expA":
      case "vibA":
      case "hue ":
      case "hue2":
      case "blnc":
      case "blwh":
      case "phfl":
      case "mixr":
      case "clrL":
      case "nvrt":
      case "post":
      case "thrs":
      case "grdm":
      case "selc":
        source = "adjustment";
        break;
      case "lrFX":
        // Old-style effects; files with them also carry lfx2, which is what Picstea reads.
        break;
      default:
        break;
    }
  }
  return {
    rect,
    channels,
    blendKey,
    opacity,
    visible: (flags & 2) === 0,
    clipping: clipping !== 0,
    name,
    mask,
    section,
    source,
    blocks,
    maskFromVector,
  };
}

/** Decode one channel's pixel data (compression 0 raw, 1 RLE, 2 zip, 3 zip with prediction). */
async function readChannel(
  r: ByteReader,
  width: number,
  height: number,
  out: Uint8Array,
): Promise<void> {
  const compression = r.u16();
  const size = width * height;
  if (size === 0) {
    r.skip(r.remaining);
    return;
  }
  switch (compression) {
    case 0:
      out.set(r.bytesView(size));
      return;
    case 1: {
      const counts: number[] = [];
      for (let y = 0; y < height; y++) counts.push(r.u16());
      for (let y = 0; y < height; y++) unpackBits(r.bytesView(counts[y]), out, y * width, width);
      return;
    }
    case 2:
    case 3: {
      const data = await inflate(r.bytesView(r.remaining), "zlib", size);
      if (data.length !== size) throw new FormatError("Compressed image data is damaged.");
      if (compression === 3) {
        // Prediction: each byte stores the difference from the previous one in the row.
        for (let y = 0; y < height; y++) {
          for (let x = 1; x < width; x++) data[y * width + x] += data[y * width + x - 1];
        }
      }
      out.set(data);
      return;
    }
    default:
      throw new FormatError("The file uses an unknown image compression.");
  }
}

function checkHeader(r: ByteReader) {
  if (r.ascii(4) !== "8BPS") throw new FormatError("This is not a Photoshop (PSD) file.");
  const version = r.u16();
  if (version === 2) {
    throw new FormatError("Large Document Format (PSB) files are not supported yet.");
  }
  if (version !== 1) throw new FormatError("This Photoshop file version is not supported.");
  r.skip(6);
  const channels = r.u16();
  const height = r.u32();
  const width = r.u32();
  const depth = r.u16();
  const mode = r.u16();
  if (channels < 1 || channels > 56) throw new FormatError("The PSD file header is damaged.");
  const check = checkDimensions(width, height);
  if (!check.ok) throw new FormatError(check.reason);
  if (depth !== 8) {
    throw new FormatError(
      `This file uses ${depth}-bit colour. Only 8-bit PSD files can be opened for now.`,
    );
  }
  if (mode !== RGB && mode !== GRAYSCALE) {
    throw new FormatError(
      `This file uses ${MODE_NAMES[mode] ?? "an unsupported"} colour mode. Convert it to RGB first.`,
    );
  }
  return { channels, width, height, mode };
}

/** Grey or RGB channels into RGBA. */
function toRgba(planes: Map<number, Uint8Array>, count: number, gray: boolean): Uint8ClampedArray {
  const out = new Uint8ClampedArray(count * 4);
  const r = planes.get(0);
  const g = gray ? r : planes.get(1);
  const b = gray ? r : planes.get(2);
  const a = planes.get(-1);
  for (let i = 0; i < count; i++) {
    out[i * 4] = r ? r[i] : 0;
    out[i * 4 + 1] = g ? g[i] : 0;
    out[i * 4 + 2] = b ? b[i] : 0;
    out[i * 4 + 3] = a ? a[i] : 255;
  }
  return out;
}

/** PSD files embedded in smart objects are read this many levels deep. */
const MAX_EMBED_DEPTH = 2;

export async function readPsd(bytes: Uint8Array): Promise<PsdReadResult> {
  const budget = { left: MAX_PSD_DECODED_BYTES };
  const warnings = new Set<string>();
  const file = await readPsdFile(bytes, 0, budget, warnings);
  return { file, warnings: [...warnings] };
}

async function readPsdFile(
  bytes: Uint8Array,
  depth: number,
  budget: { left: number },
  warnings: Set<string>,
): Promise<PsdFile> {
  const r = new ByteReader(bytes);
  const header = checkHeader(r);
  const gray = header.mode === GRAYSCALE;
  const spend = (n: number) => {
    budget.left -= n;
    if (budget.left < 0) throw new FormatError("This file is too large to open in the browser.");
  };
  let globalAngle = 30;

  r.skip(r.u32()); // colour mode data

  // Image resources: only the resolution is used.
  let resolution: number | undefined;
  const resources = r.sub(r.u32());
  while (resources.remaining >= 12) {
    if (resources.ascii(4) !== "8BIM") break;
    const id = resources.u16();
    pascal(resources, 2);
    const size = resources.u32();
    const body = resources.sub(Math.min(size, resources.remaining));
    if (size % 2 === 1 && resources.remaining > 0) resources.skip(1);
    if (id === 1037 && body.remaining >= 4) {
      const angle = body.i32();
      if (Math.abs(angle) <= 360) globalAngle = angle;
    }
    if (id === 1005 && body.remaining >= 4) {
      const ppi = body.u32() / 65536;
      if (ppi >= 1 && ppi <= 10_000) resolution = Math.round(ppi * 100) / 100;
    }
  }

  // Layers.
  const layerSection = r.sub(r.u32());
  const nodes: PsdNode[] = [];
  if (layerSection.remaining >= 4) {
    const info = layerSection.sub(Math.min(layerSection.u32(), layerSection.remaining));
    if (info.remaining >= 2) {
      const count = Math.abs(info.i16());
      if (count > MAX_PSD_LAYERS) throw new FormatError("This file has too many layers.");
      const records: RawRecord[] = [];
      for (let i = 0; i < count; i++) records.push(readRecord(info));

      const decoded: (PsdNode | Divider)[] = [];
      const ctx = { width: header.width, height: header.height, globalAngle };
      for (const rec of records) {
        const extras = rec.blocks.size > 0 ? decodeExtras(rec.blocks, ctx, warnings) : undefined;
        const hasExtras = !!extras && Object.keys(extras).length > 0;
        const w = rectWidth(rec.rect);
        const h = rectHeight(rec.rect);
        const planes = new Map<number, Uint8Array>();
        let maskData: Uint8Array | undefined;
        for (const channel of rec.channels) {
          const data = info.sub(channel.length);
          if (channel.id === -2 && rec.mask) {
            const mw = rectWidth(rec.mask.rect);
            const mh = rectHeight(rec.mask.rect);
            spend(mw * mh);
            maskData = new Uint8Array(mw * mh);
            await readChannel(data, mw, mh, maskData);
          } else if (channel.id >= -1 && channel.id <= 2) {
            spend(w * h);
            const plane = new Uint8Array(w * h);
            await readChannel(data, w, h, plane);
            planes.set(channel.id, plane);
          }
          // Other channels (real user masks -3, spot channels) are skipped by length.
        }
        // A layer mask rendered from a vector mask is replaced by the vector mask itself.
        const mask: PsdMask | undefined =
          rec.mask && maskData && !(rec.maskFromVector && extras?.vectorMask)
            ? { ...rec.mask, data: maskData }
            : undefined;
        const base = {
          name: rec.name,
          opacity: rec.opacity,
          visible: rec.visible,
          blendKey: rec.section?.blendKey ?? rec.blendKey,
          mask,
          ...(rec.clipping ? { clipping: true } : {}),
        };
        if (rec.section?.type === 3) {
          decoded.push({ kind: "divider" });
          continue;
        }
        if (rec.section && (rec.section.type === 1 || rec.section.type === 2)) {
          decoded.push({
            ...base,
            kind: "group",
            open: rec.section.type === 1,
            children: [],
          } satisfies PsdGroup);
          continue;
        }
        if (rec.source === "adjustment" && !extras?.adjustment) continue;
        const pixels = !extras?.adjustment && w * h > 0;
        if (pixels) spend(w * h * 4);
        decoded.push({
          ...base,
          kind: "pixels",
          rect: rec.rect,
          rgba: pixels ? toRgba(planes, w * h, gray) : null,
          source: rec.source,
          ...(hasExtras ? { extras } : {}),
        } satisfies PsdPixelLayer);
      }
      nodes.push(...assembleGroups(decoded, warnings));
    }
  }
  // Global layer information: files embedded for smart objects.
  let linked: PsdLinkedFile[] = [];
  if (layerSection.remaining >= 4) {
    layerSection.skip(Math.min(layerSection.u32(), layerSection.remaining)); // global mask info
    while (layerSection.remaining >= 12) {
      const signature = layerSection.ascii(4);
      if (signature !== "8BIM" && signature !== "8B64") break;
      const key = layerSection.ascii(4);
      const body = layerSection.sub(Math.min(layerSection.u32(), layerSection.remaining));
      if (key === "lnk2" || key === "lnkD" || key === "lnk3") {
        try {
          linked = linked.concat(await readLinkedFiles(body, depth, budget, warnings));
        } catch (error) {
          if (!(error instanceof FormatError)) throw error;
          warnings.add("Some smart object contents could not be read and were imported as pixels.");
        }
      }
    }
  }

  // Merged image.
  let composite: Uint8ClampedArray | null = null;
  if (r.remaining >= 2) {
    const count = header.width * header.height;
    spend(count * (header.channels + 4));
    const compression = r.u16();
    const used = Math.min(header.channels, gray ? 2 : 4);
    const planes = new Map<number, Uint8Array>();
    const ids = gray ? [0, -1] : [0, 1, 2, -1];
    if (compression === 1) {
      const counts: number[] = [];
      for (let i = 0; i < header.channels * header.height; i++) counts.push(r.u16());
      let row = 0;
      for (let c = 0; c < header.channels; c++) {
        const plane = new Uint8Array(count);
        for (let y = 0; y < header.height; y++) {
          unpackBits(r.bytesView(counts[row++]), plane, y * header.width, header.width);
        }
        if (c < used) planes.set(ids[c], plane);
      }
    } else if (compression === 0) {
      for (let c = 0; c < header.channels; c++) {
        const plane = r.bytesView(count).slice();
        if (c < used) planes.set(ids[c], plane);
      }
    }
    if (planes.size > 0) composite = toRgba(planes, count, gray);
  }

  return {
    width: header.width,
    height: header.height,
    resolution,
    layers: nodes,
    composite,
    ...(linked.length ? { linked } : {}),
  };
}

/**
 * Files embedded for smart objects. Each entry: length (64-bit), type (`liFD` embedded data),
 * version, id, name, file type, creator, data length (64-bit), open descriptor flag, then data.
 * Embedded PSDs are read recursively; images are passed on to be decoded by the browser.
 */
async function readLinkedFiles(
  r: ByteReader,
  depth: number,
  budget: { left: number },
  warnings: Set<string>,
): Promise<PsdLinkedFile[]> {
  const out: PsdLinkedFile[] = [];
  while (r.remaining >= 8) {
    const high = r.u32();
    const length = r.u32();
    if (high !== 0 || length > r.remaining) throw new FormatError("Smart object data is damaged.");
    const entry = r.sub(length);
    // Entries are padded to a multiple of 4.
    r.skip(Math.min((4 - (length % 4)) % 4, r.remaining));
    const type = entry.ascii(4);
    entry.u32(); // version
    const id = entry.ascii(entry.u8());
    readUnicodeString(entry); // original file name
    entry.ascii(4); // file type
    entry.ascii(4); // creator
    const dataHigh = entry.u32();
    const dataLength = entry.u32();
    if (type !== "liFD") {
      out.push({ id, kind: "unsupported" });
      warnings.add("Linked (external) smart objects were imported as pixels.");
      continue;
    }
    // The optional "file open" descriptor is skipped by reading it.
    if (entry.u8() !== 0) readVersionedDescriptor(entry);
    if (dataHigh !== 0 || dataLength > entry.remaining)
      throw new FormatError("Smart object data is damaged.");
    const data = entry.bytesView(dataLength);
    const image = readImageHeader(data);
    if (image && !checkDimensions(image.width, image.height).ok) {
      out.push({ id, kind: "unsupported" });
      warnings.add("A smart object's image is too large and was imported as pixels.");
    } else if (image) {
      out.push({
        id,
        kind: "raster",
        bytes: data.slice(),
        mime: image.mime,
        width: image.width,
        height: image.height,
      });
    } else if (
      data.length >= 4 &&
      String.fromCharCode(...data.subarray(0, 4)) === "8BPS" &&
      depth < MAX_EMBED_DEPTH
    ) {
      try {
        out.push({ id, kind: "psd", file: await readPsdFile(data, depth + 1, budget, warnings) });
      } catch (error) {
        if (!(error instanceof FormatError)) throw error;
        out.push({ id, kind: "unsupported" });
        warnings.add(`A smart object's PSD contents could not be opened (${error.message}).`);
      }
    } else {
      out.push({ id, kind: "unsupported" });
      warnings.add("Smart objects containing PDF, vector or other files were imported as pixels.");
    }
  }
  return out;
}

/** The record that marks the bottom of a group ("</Layer group>"). */
interface Divider {
  readonly kind: "divider";
}

/** Rebuild the group tree from the flat bottom-to-top record list (dividers open groups). */
function assembleGroups(flat: readonly (PsdNode | Divider)[], warnings: Set<string>): PsdNode[] {
  const stack: PsdNode[][] = [[]];
  for (const node of flat) {
    if (node.kind === "divider") {
      if (stack.length > MAX_PSD_GROUP_DEPTH) {
        throw new FormatError("Groups in this file are nested too deeply.");
      }
      stack.push([]);
    } else if (node.kind === "group") {
      if (stack.length === 1) {
        warnings.add("Some groups in this file were damaged and have been flattened.");
        continue;
      }
      const children = stack.pop()!;
      stack[stack.length - 1].push({ ...node, children });
    } else {
      stack[stack.length - 1].push(node);
    }
  }
  // Unclosed groups: keep their layers at the outer level.
  while (stack.length > 1) {
    warnings.add("Some groups in this file were damaged and have been flattened.");
    const orphans = stack.pop()!;
    stack[stack.length - 1].push(...orphans);
  }
  return stack[0];
}
