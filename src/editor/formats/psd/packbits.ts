import { FormatError } from "../binary/bytes";

/** PackBits run-length encoding of one row (PSD "RLE" compression). */
export function packBits(row: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < row.length) {
    // Run of identical bytes (2–128).
    let run = 1;
    while (run < 128 && i + run < row.length && row[i + run] === row[i]) run++;
    if (run >= 2) {
      out.push(257 - run, row[i]);
      i += run;
      continue;
    }
    // Literal bytes until the next run of 2+ (at most 128).
    const start = i;
    while (i < row.length && i - start < 128 && !(i + 1 < row.length && row[i] === row[i + 1])) {
      i++;
    }
    out.push(i - start - 1);
    for (let k = start; k < i; k++) out.push(row[k]);
  }
  return Uint8Array.from(out);
}

/**
 * Decode one PackBits row into `out[offset, offset + length)`. Refuses input that would write
 * past the row or that ends early (untrusted data).
 */
export function unpackBits(
  input: Uint8Array,
  out: Uint8Array,
  offset: number,
  length: number,
): void {
  let i = 0;
  let o = 0;
  while (o < length) {
    if (i >= input.length) throw new FormatError("Compressed image data ends early.");
    const n = input[i++];
    if (n < 128) {
      const count = n + 1;
      if (o + count > length || i + count > input.length) {
        throw new FormatError("Compressed image data is damaged.");
      }
      out.set(input.subarray(i, i + count), offset + o);
      i += count;
      o += count;
    } else if (n > 128) {
      const count = 257 - n;
      if (o + count > length || i >= input.length) {
        throw new FormatError("Compressed image data is damaged.");
      }
      out.fill(input[i++], offset + o, offset + o + count);
      o += count;
    }
    // n === 128 is a no-op.
  }
}
