import { describe, expect, it } from "vitest";
import { deflate } from "../binary/compression";
import { decodeTiff, isCameraRaw, isTiffHeader, lzwDecode, unpackBits } from "./tiff-read";

/** Build a minimal single-image TIFF: tags + one strip or a grid of tiles. */
function tiff(options: {
  width: number;
  height: number;
  spp: number;
  bits?: number;
  photometric?: number;
  compression?: number;
  le?: boolean;
  chunks: Uint8Array[];
  tile?: [number, number];
  rowsPerStrip?: number;
  extra?: [number, number, number[]][];
}): Uint8Array {
  const le = options.le ?? true;
  const bits = options.bits ?? 8;
  const tags: [number, number, number[]][] = [
    [256, 4, [options.width]],
    [257, 4, [options.height]],
    [258, 3, Array(options.spp).fill(bits)],
    [259, 3, [options.compression ?? 1]],
    [262, 3, [options.photometric ?? (options.spp >= 3 ? 2 : 1)]],
    [277, 3, [options.spp]],
    ...(options.extra ?? []),
  ];
  const dataStart = 8;
  const chunkOffsets: number[] = [];
  let at = dataStart;
  for (const c of options.chunks) {
    chunkOffsets.push(at);
    at += c.length + (c.length % 2);
  }
  if (options.tile) {
    tags.push([322, 3, [options.tile[0]]], [323, 3, [options.tile[1]]]);
    tags.push([324, 4, chunkOffsets], [325, 4, options.chunks.map((c) => c.length)]);
  } else {
    tags.push([273, 4, chunkOffsets], [278, 4, [options.rowsPerStrip ?? options.height]]);
    tags.push([279, 4, options.chunks.map((c) => c.length)]);
  }
  tags.sort((a, b) => a[0] - b[0]);
  // Out-of-line values after the IFD.
  const ifdAt = at;
  const valuesAt = ifdAt + 2 + tags.length * 12 + 4;
  const size = { 3: 2, 4: 4 } as Record<number, number>;
  let valuesSize = 0;
  for (const [, type, values] of tags) {
    const n = size[type] * values.length;
    if (n > 4) valuesSize += n;
  }
  const buf = new Uint8Array(valuesAt + valuesSize);
  const dv = new DataView(buf.buffer);
  buf.set(le ? [0x49, 0x49] : [0x4d, 0x4d]);
  dv.setUint16(2, 42, le);
  dv.setUint32(4, ifdAt, le);
  options.chunks.forEach((c, i) => buf.set(c, chunkOffsets[i]));
  dv.setUint16(ifdAt, tags.length, le);
  let next = valuesAt;
  tags.forEach(([tag, type, values], i) => {
    const e = ifdAt + 2 + i * 12;
    dv.setUint16(e, tag, le);
    dv.setUint16(e + 2, type, le);
    dv.setUint32(e + 4, values.length, le);
    const n = size[type] * values.length;
    const write = (o: number) =>
      values.forEach((v, k) =>
        type === 3 ? dv.setUint16(o + k * 2, v, le) : dv.setUint32(o + k * 4, v, le),
      );
    if (n <= 4) write(e + 8);
    else {
      dv.setUint32(e + 8, next, le);
      write(next);
      next += n;
    }
  });
  return buf;
}

/** TIFF LZW encoder (for testing the decoder). */
function lzwEncode(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let acc = 0;
  let accBits = 0;
  let bits = 9;
  const put = (code: number) => {
    acc = (acc << bits) | code;
    accBits += bits;
    while (accBits >= 8) {
      out.push((acc >> (accBits - 8)) & 255);
      accBits -= 8;
    }
  };
  let dict = new Map<string, number>();
  let next = 258;
  const reset = () => {
    dict = new Map();
    for (let i = 0; i < 256; i++) dict.set(String(i), i);
    next = 258;
    bits = 9;
  };
  reset();
  put(256);
  let w = "";
  for (const byte of data) {
    const wc = w ? `${w},${byte}` : String(byte);
    if (dict.has(wc)) {
      w = wc;
      continue;
    }
    put(dict.get(w)!);
    dict.set(wc, next++);
    if (next + 1 >= 1 << bits && bits < 12) bits++;
    if (next >= 4094) {
      put(256);
      reset();
    }
    w = String(byte);
  }
  if (w) put(dict.get(w)!);
  put(257);
  if (accBits > 0) out.push((acc << (8 - accBits)) & 255);
  return Uint8Array.from(out);
}

const rgb = (w: number, h: number) => {
  const d = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) d.set([i * 10, 255 - i * 10, (i * 37) & 255], i * 3);
  return d;
};

describe("TIFF import (ADR-0045)", () => {
  it("decodes uncompressed RGB, both byte orders", async () => {
    for (const le of [true, false]) {
      const out = await decodeTiff(tiff({ width: 3, height: 2, spp: 3, le, chunks: [rgb(3, 2)] }));
      expect([out.width, out.height]).toEqual([3, 2]);
      expect([...out.rgba.subarray(4, 8)]).toEqual([10, 245, 37, 255]);
    }
  });

  it("decodes PackBits, LZW and Deflate the same", async () => {
    const pixels = rgb(4, 4);
    const expected = await decodeTiff(tiff({ width: 4, height: 4, spp: 3, chunks: [pixels] }));
    for (const [compression, data] of [
      [32773, Uint8Array.from([pixels.length - 1, ...pixels])],
      [5, lzwEncode(pixels)],
      [8, await deflate(pixels, "zlib")],
    ] as const) {
      const out = await decodeTiff(
        tiff({ width: 4, height: 4, spp: 3, compression, chunks: [data] }),
      );
      expect(out.rgba, String(compression)).toEqual(expected.rgba);
    }
  });

  it("decodes tiles, 16-bit grey with alpha and a predictor, palette and 1-bit", async () => {
    const tile = (v: number) => new Uint8Array(2 * 2).fill(v);
    const tiled = await decodeTiff(
      tiff({
        width: 3,
        height: 3,
        spp: 1,
        tile: [2, 2],
        chunks: [tile(10), tile(20), tile(30), tile(40)],
      }),
    );
    expect([0, 2, 6, 8].map((p) => tiled.rgba[p * 4])).toEqual([10, 20, 30, 40]);

    // Two 16-bit grey+alpha pixels, little-endian, horizontal differencing.
    const grey16 = new Uint8Array(new Uint16Array([0x1000, 0xffff, 0x2000, 0x0000]).buffer);
    const out16 = await decodeTiff(
      tiff({
        width: 2,
        height: 1,
        spp: 2,
        bits: 16,
        chunks: [grey16],
        extra: [
          [317, 3, [2]],
          [338, 3, [2]],
        ],
      }),
    );
    expect([...out16.rgba]).toEqual([16, 16, 16, 255, 48, 48, 48, 255]);

    const palette = Array(3 * 256).fill(0);
    palette[1] = 0xff00; // index 1 red
    const pal = await decodeTiff(
      tiff({
        width: 2,
        height: 1,
        spp: 1,
        photometric: 3,
        chunks: [Uint8Array.of(0, 1)],
        extra: [[320, 3, palette]],
      }),
    );
    expect([...pal.rgba.subarray(4, 8)]).toEqual([255, 0, 0, 255]);

    const bilevel = await decodeTiff(
      tiff({ width: 8, height: 1, spp: 1, bits: 1, chunks: [Uint8Array.of(0b10100000)] }),
    );
    expect([0, 1, 2].map((p) => bilevel.rgba[p * 4])).toEqual([255, 0, 255]);
  });

  it("refuses CMYK, floating point, BigTIFF and camera RAW with clear messages", async () => {
    await expect(
      decodeTiff(
        tiff({ width: 1, height: 1, spp: 4, photometric: 5, chunks: [new Uint8Array(4)] }),
      ),
    ).rejects.toThrow(/CMYK/);
    await expect(
      decodeTiff(
        tiff({ width: 1, height: 1, spp: 1, chunks: [new Uint8Array(4)], extra: [[339, 3, [3]]] }),
      ),
    ).rejects.toThrow(/Floating-point/);
    await expect(decodeTiff(Uint8Array.of(0x49, 0x49, 0x2b, 0, 8, 0, 0, 0))).rejects.toThrow(
      /BigTIFF/,
    );
    const dng = tiff({
      width: 1,
      height: 1,
      spp: 1,
      chunks: [new Uint8Array(1)],
      extra: [[50706, 3, [1, 4]]],
    });
    expect(isCameraRaw(dng)).toBe(true);
    await expect(decodeTiff(dng)).rejects.toThrow(/Camera RAW/);
    expect(isTiffHeader(dng)).toBe(true);
    await expect(
      decodeTiff(tiff({ width: 50_000, height: 1, spp: 1, chunks: [new Uint8Array(1)] })),
    ).rejects.toThrow();
  });

  it("PackBits and LZW stop at the expected size on damaged data", () => {
    expect(unpackBits(Uint8Array.of(127, 1), 4)).toHaveLength(4);
    expect(lzwDecode(Uint8Array.of(0x80, 0x00, 0x00), 8)).toHaveLength(8);
  });
});
