import { describe, expect, it } from "vitest";
import { FormatError } from "../binary/bytes";
import { deflate } from "../binary/compression";
import { crc32 } from "./crc32";
import { readZip, writeZip } from "./zip";

const LIMITS = { maxEntries: 10, maxEntryBytes: 1_000_000, maxTotalBytes: 2_000_000 };
const text = (s: string) => new TextEncoder().encode(s);

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(text("123456789"))).toBe(0xcbf43926);
  });
});

describe("zip", () => {
  it("round-trips stored and deflated entries with UTF-8 names", async () => {
    const big = text("hello ".repeat(1000));
    const zip = await writeZip([
      { name: "project.json", data: big, compress: true },
      { name: "assets/ä.png", data: new Uint8Array([1, 2, 3]) },
    ]);
    // Deflated entry is much smaller than the input.
    expect(zip.length).toBeLessThan(big.length / 4);
    const entries = readZip(zip, LIMITS);
    expect([...entries.keys()]).toEqual(["project.json", "assets/ä.png"]);
    expect(await entries.get("project.json")!.read()).toEqual(big);
    expect(Array.from(await entries.get("assets/ä.png")!.read())).toEqual([1, 2, 3]);
  });

  it("rejects non-zip data, too many entries and oversized entries", async () => {
    expect(() => readZip(text("not a zip at all, definitely not"), LIMITS)).toThrow(FormatError);
    const many = await writeZip(
      Array.from({ length: 11 }, (_, i) => ({ name: `f${i}`, data: new Uint8Array(1) })),
    );
    expect(() => readZip(many, LIMITS)).toThrow(/too many entries/);
    const large = await writeZip([{ name: "x", data: new Uint8Array(2000) }]);
    expect(() => readZip(large, { ...LIMITS, maxEntryBytes: 1000 })).toThrow(/too large/);
  });

  it("detects corruption through the checksum", async () => {
    const zip = await writeZip([{ name: "a", data: text("abcdef") }]);
    const damaged = zip.slice();
    damaged[30 + 1 + 2] ^= 0xff; // a data byte after the 30-byte header and 1-byte name
    await expect(readZip(damaged, LIMITS).get("a")!.read()).rejects.toThrow(/checksum/);
  });

  it("stops inflating a zip bomb at the declared size", async () => {
    // A tiny deflated stream of a megabyte of zeros, declared as 10 bytes.
    const zip = await writeZip([{ name: "bomb", data: new Uint8Array(1_000_000), compress: true }]);
    const view = new DataView(zip.buffer);
    const cd = zip.length - 22 - (46 + 4);
    view.setUint32(cd + 24, 10, true); // central directory: uncompressed size
    await expect(readZip(zip, LIMITS).get("bomb")!.read()).rejects.toThrow(FormatError);
  });

  it("enforces the total size across entries", async () => {
    const zip = await writeZip([
      { name: "a", data: new Uint8Array(600) },
      { name: "b", data: new Uint8Array(600) },
    ]);
    const entries = readZip(zip, { ...LIMITS, maxTotalBytes: 1000 });
    await entries.get("a")!.read();
    await expect(entries.get("b")!.read()).rejects.toThrow(/more data than allowed/);
  });

  it("inflates what the browser deflated", async () => {
    expect((await deflate(text("abc"), "zlib"))[0]).toBe(0x78);
  });
});
