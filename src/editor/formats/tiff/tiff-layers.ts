import { ByteWriter } from "../binary/bytes";

/**
 * Photoshop's layered TIFF (ADR-0045): tag 37724 holds "Adobe Photoshop Document Data Block"
 * followed by the same tagged blocks a PSD's layer section has (`Layr` with the layer records and
 * channels, plus `lnk2` and others). We wrap them, with the TIFF's flattened image, into a
 * minimal PSD so the PSD reader rebuilds the layers. Null when the data isn't in that shape.
 */
export function photoshopLayersToPsd(
  data: Uint8Array,
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
): Uint8Array | null {
  const SIGNATURE = "Adobe Photoshop Document Data Block\0";
  if (data.length < SIGNATURE.length + 12) return null;
  if (String.fromCharCode(...data.subarray(0, SIGNATURE.length)) !== SIGNATURE) return null;
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const le = false;
  const blocks: { key: string; body: Uint8Array }[] = [];
  let at = SIGNATURE.length;
  while (at + 12 <= data.length) {
    const sig = String.fromCharCode(...data.subarray(at, at + 4));
    if (sig !== "8BIM" && sig !== "8B64") return blocks.length ? build() : null;
    const key = String.fromCharCode(...data.subarray(at + 4, at + 8));
    const length = dv.getUint32(at + 8, le);
    const start = at + 12;
    if (start + length > data.length) return null;
    blocks.push({ key, body: data.subarray(start, start + length) });
    at = start + length + ((4 - (length % 4)) % 4);
  }
  return build();

  function build(): Uint8Array | null {
    const layers = blocks.find((b) => b.key === "Layr");
    if (!layers) return null;
    const w = new ByteWriter();
    w.ascii("8BPS").u16(1).bytes(new Uint8Array(6)).u16(4).u32(height).u32(width);
    w.u16(8).u16(3);
    w.u32(0); // colour mode data
    w.u32(0); // image resources
    const section = new ByteWriter();
    const info = layers.body;
    const padded = info.length % 2 ? Uint8Array.from([...info, 0]) : info;
    section.u32(padded.length).bytes(padded);
    section.u32(0); // global layer mask
    for (const b of blocks) {
      if (b.key === "Layr") continue;
      section.ascii("8BIM").ascii(b.key).u32(b.body.length).bytes(b.body);
      if (b.body.length % 4) section.bytes(new Uint8Array(4 - (b.body.length % 4)));
    }
    const sectionBytes = section.toBytes();
    w.u32(sectionBytes.length).bytes(sectionBytes);
    // Flattened image, uncompressed, one plane per channel.
    w.u16(0);
    const plane = new Uint8Array(width * height);
    for (let c = 0; c < 4; c++) {
      for (let i = 0; i < plane.length; i++) plane[i] = rgba[i * 4 + c];
      w.bytes(plane);
    }
    return w.toBytes();
  }
}
