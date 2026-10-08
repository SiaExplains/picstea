/** Minimal image headers for tests. Only the bytes the header parser reads are meaningful. */

export function pngHeader(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

export function jpegHeader(
  width: number,
  height: number,
  exifPadding = 0,
): Uint8Array<ArrayBuffer> {
  const app1Length = 2 + exifPadding;
  const bytes = new Uint8Array(2 + 4 + exifPadding + 11);
  const view = new DataView(bytes.buffer);
  let o = 0;
  bytes.set([0xff, 0xd8], o); // SOI
  o += 2;
  bytes.set([0xff, 0xe1], o); // APP1
  view.setUint16(o + 2, app1Length);
  o += 2 + app1Length;
  bytes.set([0xff, 0xc0], o); // SOF0
  view.setUint16(o + 2, 11);
  bytes[o + 4] = 8; // precision
  view.setUint16(o + 5, height);
  view.setUint16(o + 7, width);
  return bytes;
}

export function webpVp8xHeader(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(30);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  bytes.set([0x56, 0x50, 0x38, 0x58], 12); // VP8X
  const w = width - 1;
  const h = height - 1;
  bytes.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24);
  bytes.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27);
  return bytes;
}

export function webpLosslessHeader(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(25);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x4c], 12); // VP8L
  bytes[20] = 0x2f;
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  new DataView(bytes.buffer).setUint32(21, bits, true);
  return bytes;
}

/** A decoder stand-in that reports the size it was told, like createImageBitmap would. */
export function fakeDecoder(width: number, height: number) {
  const closed: number[] = [];
  const decode = async () => ({
    width,
    height,
    close: () => closed.push(1),
  });
  return { decode: decode as unknown as import("../assets/asset-store").BitmapDecoder, closed };
}
