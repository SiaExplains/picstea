import { FormatError } from "./bytes";

/**
 * Deflate via the browser's native CompressionStream (no dependency). `zlib` is the "deflate"
 * format (with header and Adler-32, as PDF FlateDecode expects); `raw` has no wrapper (ZIP).
 */
export type DeflateFormat = "zlib" | "raw";

const streamFormat = (format: DeflateFormat) => (format === "zlib" ? "deflate" : "deflate-raw");

async function collect(
  stream: ReadableStream<Uint8Array>,
  maxBytes = Number.POSITIVE_INFINITY,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        // Stop decompressing as soon as the output is larger than allowed (zip bombs).
        await reader.cancel();
        throw new FormatError("The file expands to more data than allowed.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function source(bytes: Uint8Array): ReadableStream<BufferSource> {
  return new Blob([bytes as BlobPart]).stream();
}

export function deflate(bytes: Uint8Array, format: DeflateFormat): Promise<Uint8Array> {
  return collect(source(bytes).pipeThrough(new CompressionStream(streamFormat(format))));
}

/** Inflate, refusing output larger than `maxBytes`. Corrupt data becomes a FormatError. */
export async function inflate(
  bytes: Uint8Array,
  format: DeflateFormat,
  maxBytes: number,
): Promise<Uint8Array> {
  try {
    return await collect(
      source(bytes).pipeThrough(new DecompressionStream(streamFormat(format))),
      maxBytes,
    );
  } catch (error) {
    if (error instanceof FormatError) throw error;
    throw new FormatError("Compressed data in the file is damaged.");
  }
}
