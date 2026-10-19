import { ByteWriter } from "../binary/bytes";
import { encodeRestrictedChannels, writeBlendingRanges, type PsdBlending } from "./psd-blending";
import { packBits } from "./packbits";
import {
  rectHeight,
  rectWidth,
  type PsdBlock,
  type PsdFile,
  type PsdMask,
  type PsdNode,
  type PsdPixelLayer,
  type PsdRect,
} from "./psd-model";

/**
 * Write an 8-bit RGB PSD (Adobe "Photoshop File Formats Specification"): header, resolution
 * resource, layer records with RLE channels, Unicode names and group section dividers, and an
 * RLE merged image so every reader can show the result.
 */

interface Channel {
  readonly id: number;
  readonly data: Uint8Array;
}

/** Compression 1 (RLE): row byte counts, then PackBits rows. */
function rleChannel(plane: Uint8Array, width: number, height: number): Uint8Array {
  const w = new ByteWriter();
  w.u16(1);
  if (width === 0 || height === 0) return w.toBytes();
  const rows: Uint8Array[] = [];
  for (let y = 0; y < height; y++) rows.push(packBits(plane.subarray(y * width, (y + 1) * width)));
  for (const r of rows) w.u16(r.length);
  for (const r of rows) w.bytes(r);
  return w.toBytes();
}

function planes(rgba: Uint8ClampedArray | null, count: number): Uint8Array[] {
  const out = [0, 1, 2, 3].map(() => new Uint8Array(count));
  if (rgba) {
    for (let i = 0; i < count; i++) {
      out[0][i] = rgba[i * 4];
      out[1][i] = rgba[i * 4 + 1];
      out[2][i] = rgba[i * 4 + 2];
      out[3][i] = rgba[i * 4 + 3];
    }
  }
  return out;
}

function pascalName(w: ByteWriter, name: string): void {
  // Legacy name: Pascal string (MacRoman-ish ASCII), padded to a multiple of 4 bytes.
  const ascii = [...name]
    .map((c) => (c.charCodeAt(0) < 128 ? c : "_"))
    .join("")
    .slice(0, 255);
  w.u8(ascii.length).ascii(ascii);
  for (let n = ascii.length + 1; n % 4 !== 0; n++) w.u8(0);
}

function block(w: ByteWriter, key: string, body: Uint8Array): void {
  w.ascii("8BIM").ascii(key);
  const padded = body.length % 2 === 0 ? body : Uint8Array.from([...body, 0]);
  w.u32(padded.length).bytes(padded);
}

function unicodeName(name: string): Uint8Array {
  const w = new ByteWriter();
  const units = [...name].slice(0, 255).join("");
  w.u32(units.length);
  for (let i = 0; i < units.length; i++) w.u16(units.charCodeAt(i));
  return w.toBytes();
}

interface Record {
  readonly name: string;
  readonly rect: PsdRect;
  readonly opacity: number;
  readonly visible: boolean;
  readonly blendKey: string;
  readonly clipping?: boolean;
  readonly colorLabel?: number;
  readonly blending?: PsdBlending;
  readonly channels: readonly Channel[];
  /** Extra tagged blocks (adjustment data, vector masks). */
  readonly blocks?: readonly PsdBlock[];
  readonly mask?: PsdMask;
  /** lsct type: 1 open folder, 2 closed folder, 3 bounding divider. */
  readonly section?: { type: number; blendKey?: string };
}

const EMPTY_RECT: PsdRect = { top: 0, left: 0, bottom: 0, right: 0 };

function pixelRecord(layer: PsdPixelLayer): Record {
  const w = rectWidth(layer.rect);
  const h = rectHeight(layer.rect);
  const [r, g, b, a] = planes(layer.rgba, w * h);
  const channels: Channel[] = [
    { id: -1, data: rleChannel(a, w, h) },
    { id: 0, data: rleChannel(r, w, h) },
    { id: 1, data: rleChannel(g, w, h) },
    { id: 2, data: rleChannel(b, w, h) },
  ];
  return { ...layer, channels: withMask(channels, layer.mask) };
}

function withMask(channels: Channel[], mask: PsdMask | undefined): Channel[] {
  if (!mask) return channels;
  const data = rleChannel(mask.data, rectWidth(mask.rect), rectHeight(mask.rect));
  return [...channels, { id: -2, data }];
}

/** Flatten the tree bottom-to-top; a group is its divider, its children, then itself. */
function records(nodes: readonly PsdNode[], out: Record[] = []): Record[] {
  for (const node of nodes) {
    if (node.kind === "pixels") {
      out.push(pixelRecord(node));
      continue;
    }
    const emptyChannels = (): Channel[] =>
      [-1, 0, 1, 2].map((id) => ({ id, data: rleChannel(new Uint8Array(0), 0, 0) }));
    out.push({
      name: "</Layer group>",
      rect: EMPTY_RECT,
      opacity: 255,
      visible: true,
      blendKey: "norm",
      channels: emptyChannels(),
      section: { type: 3 },
    });
    records(node.children, out);
    out.push({
      name: node.name,
      rect: EMPTY_RECT,
      opacity: node.opacity,
      clipping: node.clipping,
      colorLabel: node.colorLabel,
      blending: node.blending,
      visible: node.visible,
      blendKey: node.blendKey,
      channels: withMask(emptyChannels(), node.mask),
      mask: node.mask,
      section: { type: node.open ? 1 : 2, blendKey: node.blendKey },
    });
  }
  return out;
}

function writeRecord(w: ByteWriter, r: Record): void {
  w.i32(r.rect.top).i32(r.rect.left).i32(r.rect.bottom).i32(r.rect.right);
  w.u16(r.channels.length);
  for (const c of r.channels) w.i16(c.id).u32(c.data.length);
  // A group's own record carries "pass" in its section divider; the record itself uses norm.
  const recordBlend = r.section && r.blendKey === "pass" ? "norm" : r.blendKey;
  w.ascii("8BIM").ascii(recordBlend);
  w.u8(Math.round(r.opacity)).u8(r.clipping ? 1 : 0);
  // Flags: bit 1 = hidden, bit 3 = bit 4 is meaningful.
  w.u8((r.visible ? 0 : 2) | 8).u8(0);

  const extra = new ByteWriter();
  if (r.mask) {
    const m = r.mask;
    extra.u32(20).i32(m.rect.top).i32(m.rect.left).i32(m.rect.bottom).i32(m.rect.right);
    extra
      .u8(m.defaultColor)
      .u8(m.disabled ? 2 : 0)
      .u16(0);
  } else {
    extra.u32(0);
  }
  writeBlendingRanges(extra, r.blending);
  pascalName(extra, r.name);
  block(extra, "luni", unicodeName(r.name));
  // Layers-panel colour: a 2-byte index followed by 6 bytes of padding.
  if (r.colorLabel) block(extra, "lclr", Uint8Array.of(0, r.colorLabel, 0, 0, 0, 0, 0, 0));
  if (r.blending?.restricted.length) {
    const restricted = new ByteWriter();
    encodeRestrictedChannels(r.blending.restricted, restricted);
    block(extra, "brst", restricted.toBytes());
  }
  for (const b of r.blocks ?? []) block(extra, b.key, b.data);
  if (r.section) {
    const s = new ByteWriter();
    s.u32(r.section.type);
    if (r.section.blendKey) s.ascii("8BIM").ascii(r.section.blendKey);
    block(extra, "lsct", s.toBytes());
  }
  const bytes = extra.toBytes();
  w.u32(bytes.length).bytes(bytes);
}

export function writePsd(file: PsdFile): Uint8Array {
  const w = new ByteWriter();
  // Header: 4 channels (RGB + transparency of the merged image), 8 bits, RGB mode.
  w.ascii("8BPS").u16(1).bytes(new Uint8Array(6)).u16(4).u32(file.height).u32(file.width);
  w.u16(8).u16(3);
  w.u32(0); // colour mode data

  // Image resources: resolution (1005).
  const resources = new ByteWriter();
  const ppi = Math.max(1, Math.round(file.resolution ?? 72));
  const res = new ByteWriter();
  res
    .u32(ppi * 65536)
    .u16(1)
    .u16(1)
    .u32(ppi * 65536)
    .u16(1)
    .u16(1);
  resources.ascii("8BIM").u16(1005).u16(0).u32(16).bytes(res.toBytes());
  const resourceBytes = resources.toBytes();
  w.u32(resourceBytes.length).bytes(resourceBytes);

  // Layer and mask information.
  const recs = records(file.layers);
  const info = new ByteWriter();
  // Negative count: the first alpha channel of the merged image is its transparency.
  info.i16(recs.length === 0 ? 0 : -recs.length);
  for (const r of recs) writeRecord(info, r);
  for (const r of recs) for (const c of r.channels) info.bytes(c.data);
  let infoBytes = info.toBytes();
  if (infoBytes.length % 4 !== 0) {
    infoBytes = Uint8Array.from([...infoBytes, ...new Uint8Array(4 - (infoBytes.length % 4))]);
  }
  const layerSection = new ByteWriter();
  layerSection.u32(infoBytes.length).bytes(infoBytes);
  layerSection.u32(0); // global layer mask info
  for (const b of file.globalBlocks ?? []) block(layerSection, b.key, b.data);
  const layerBytes = layerSection.toBytes();
  w.u32(layerBytes.length).bytes(layerBytes);

  // Merged image: RLE, all row counts for every channel first, then the rows.
  const count = file.width * file.height;
  const merged = planes(file.composite, count);
  const rows: Uint8Array[] = [];
  for (const plane of merged) {
    for (let y = 0; y < file.height; y++) {
      rows.push(packBits(plane.subarray(y * file.width, (y + 1) * file.width)));
    }
  }
  w.u16(1);
  for (const r of rows) w.u16(r.length);
  for (const r of rows) w.bytes(r);
  return w.toBytes();
}
