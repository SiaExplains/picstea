import { ByteReader, ByteWriter, FormatError } from "../binary/bytes";
import { deflate, inflate } from "../binary/compression";
import { crc32 } from "./crc32";

/**
 * Minimal ZIP (PKWARE APPNOTE) writer and hardened reader for Picstea project files (ADR-0011).
 * Stored and deflated entries only; no ZIP64, encryption or multi-disk archives.
 */

export interface ZipInput {
  readonly name: string;
  readonly data: Uint8Array;
  /** Deflate this entry (skip for data that is already compressed, like PNG/JPEG). */
  readonly compress?: boolean;
}

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;
const UTF8_FLAG = 0x0800;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

export async function writeZip(
  entries: readonly ZipInput[],
  now = new Date(),
): Promise<Uint8Array> {
  const w = new ByteWriter(true);
  const stamp = dosDateTime(now);
  const central: {
    name: Uint8Array;
    method: number;
    crc: number;
    compressed: number;
    size: number;
    offset: number;
  }[] = [];

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    let method = 0;
    let body = entry.data;
    if (entry.compress) {
      const deflated = await deflate(entry.data, "raw");
      if (deflated.length < entry.data.length) {
        method = 8;
        body = deflated;
      }
    }
    const offset = w.position;
    w.u32(LOCAL).u16(20).u16(UTF8_FLAG).u16(method).u16(stamp.time).u16(stamp.date);
    w.u32(crc).u32(body.length).u32(entry.data.length).u16(name.length).u16(0);
    w.bytes(name).bytes(body);
    central.push({ name, method, crc, compressed: body.length, size: entry.data.length, offset });
  }

  const cdStart = w.position;
  for (const e of central) {
    w.u32(CENTRAL).u16(20).u16(20).u16(UTF8_FLAG).u16(e.method).u16(stamp.time).u16(stamp.date);
    w.u32(e.crc).u32(e.compressed).u32(e.size).u16(e.name.length).u16(0).u16(0);
    w.u16(0).u16(0).u32(0).u32(e.offset).bytes(e.name);
  }
  const cdSize = w.position - cdStart;
  w.u32(END).u16(0).u16(0).u16(central.length).u16(central.length);
  w.u32(cdSize).u32(cdStart).u16(0);
  return w.toBytes();
}

export interface ZipLimits {
  readonly maxEntries: number;
  /** Largest uncompressed size of one entry. */
  readonly maxEntryBytes: number;
  /** Largest uncompressed size of all entries read. */
  readonly maxTotalBytes: number;
}

export interface ZipEntry {
  readonly name: string;
  /** Declared uncompressed size. */
  readonly size: number;
  read(): Promise<Uint8Array>;
}

/**
 * List a ZIP archive's entries. Data is only inflated when an entry is read, with the declared
 * size, the per-entry and the running total limits enforced while decompressing, and the CRC
 * checked afterwards.
 */
export function readZip(bytes: Uint8Array, limits: ZipLimits): Map<string, ZipEntry> {
  // The end record is in the last 22 + 65535 (comment) bytes.
  let endAt = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      endAt = i;
      break;
    }
  }
  if (endAt < 0) throw new FormatError("This is not a valid Picstea project file.");
  const end = new ByteReader(bytes, true, endAt);
  end.skip(4);
  const disk = end.u16();
  const cdDisk = end.u16();
  end.u16();
  const count = end.u16();
  const cdSize = end.u32();
  const cdOffset = end.u32();
  if (disk !== 0 || cdDisk !== 0) throw new FormatError("Split archives are not supported.");
  if (count > limits.maxEntries) throw new FormatError("The project file has too many entries.");

  const cd = new ByteReader(bytes, true, cdOffset, Math.min(bytes.length, cdOffset + cdSize));
  const entries = new Map<string, ZipEntry>();
  let totalRead = 0;
  for (let i = 0; i < count; i++) {
    if (cd.u32() !== CENTRAL) throw new FormatError("The project file is damaged.");
    cd.skip(4); // versions
    const flags = cd.u16();
    const method = cd.u16();
    cd.skip(4); // time, date
    const crc = cd.u32();
    const compressed = cd.u32();
    const size = cd.u32();
    const nameLength = cd.u16();
    const extraLength = cd.u16();
    const commentLength = cd.u16();
    cd.skip(8); // disk, internal and external attributes
    const localOffset = cd.u32();
    let name: string;
    try {
      name = decoder.decode(cd.bytesView(nameLength));
    } catch {
      throw new FormatError("The project file contains an invalid name.");
    }
    cd.skip(extraLength + commentLength);

    if (flags & 0x0001) throw new FormatError("Encrypted project files are not supported.");
    if (method !== 0 && method !== 8) {
      throw new FormatError("The project file uses an unsupported compression method.");
    }
    if (size > limits.maxEntryBytes)
      throw new FormatError("A file inside the project is too large.");
    if (method === 0 && compressed !== size) throw new FormatError("The project file is damaged.");
    if (entries.has(name)) throw new FormatError("The project file contains duplicate entries.");

    entries.set(name, {
      name,
      size,
      read: async () => {
        const local = new ByteReader(bytes, true, localOffset);
        if (local.u32() !== LOCAL) throw new FormatError("The project file is damaged.");
        local.skip(22);
        const localName = local.u16();
        const localExtra = local.u16();
        local.skip(localName + localExtra);
        const body = local.bytesView(compressed);
        if (totalRead + size > limits.maxTotalBytes) {
          throw new FormatError("The project file expands to more data than allowed.");
        }
        const data = method === 0 ? body.slice() : await inflate(body, "raw", size);
        if (data.length !== size || crc32(data) !== crc) {
          throw new FormatError("The project file is damaged (checksum mismatch).");
        }
        totalRead += size;
        return data;
      },
    });
  }
  return entries;
}
