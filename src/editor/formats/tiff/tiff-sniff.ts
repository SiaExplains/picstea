/**
 * Telling TIFF from camera RAW by their first bytes (ADR-0045). Kept separate and tiny because
 * file sniffing loads with the editor; the decoder itself loads only when a TIFF is opened.
 */

/** True when the bytes start like a TIFF (or a raw format built on TIFF). */
export function isTiffHeader(b: Uint8Array): boolean {
  return (
    b.length >= 8 &&
    ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a))
  );
}

/** Camera RAW files share TIFF's header: DNG has a DNGVersion tag, Canon CR2 "CR" at byte 8. */
export function isCameraRaw(b: Uint8Array): boolean {
  if (!isTiffHeader(b)) return false;
  if (b.length >= 10 && b[8] === 0x43 && b[9] === 0x52) return true;
  const le = b[0] === 0x49;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const offset = dv.getUint32(4, le);
  if (offset + 2 > b.length) return false;
  const count = dv.getUint16(offset, le);
  let make = "";
  let subIfds = false;
  for (let i = 0; i < count && offset + 2 + (i + 1) * 12 <= b.length; i++) {
    const e = offset + 2 + i * 12;
    const tag = dv.getUint16(e, le);
    if (tag === 50706) return true; // DNGVersion
    if (tag === 330) subIfds = true;
    if (tag === 271) {
      const n = dv.getUint32(e + 4, le);
      const at = n <= 4 ? e + 8 : dv.getUint32(e + 8, le);
      if (at + n <= b.length) make = String.fromCharCode(...b.subarray(at, at + Math.min(n, 64)));
    }
  }
  // Nikon NEF, Sony ARW and others: a camera maker plus sub-images with the raw data.
  return subIfds && /nikon|sony|pentax|olympus|fuji|panasonic|leica/i.test(make);
}
