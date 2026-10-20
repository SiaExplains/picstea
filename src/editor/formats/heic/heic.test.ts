import { describe, expect, it } from "vitest";
import { detectFileKind } from "../open-file";
import { decodeHeic, looksLikeHeic, type LibheifLoader } from "./heic";

/** An ISO-BMFF `ftyp` box: size, "ftyp", major brand, minor version, compatible brands. */
function ftyp(major: string, compatible: string[] = []): Uint8Array {
  const text = `ftyp${major}\0\0\0\0${compatible.join("")}`;
  const bytes = new Uint8Array(4 + text.length + 8);
  new DataView(bytes.buffer).setUint32(0, 4 + text.length);
  bytes.set(new TextEncoder().encode(text), 4);
  return bytes;
}

describe("looksLikeHeic", () => {
  it("recognises HEIC brands, including iPhone files (major heic, compatible mif1)", () => {
    expect(looksLikeHeic(ftyp("heic", ["mif1", "heic"]))).toBe(true);
    expect(looksLikeHeic(ftyp("heix"))).toBe(true);
    expect(looksLikeHeic(ftyp("mif1", ["heic"]))).toBe(true);
    expect(detectFileKind(ftyp("heic", ["mif1"]))).toEqual({ kind: "heic" });
  });

  it("doesn't mistake AVIF (also mif1) or MP4 for HEIC", () => {
    expect(looksLikeHeic(ftyp("avif", ["mif1", "miaf"]))).toBe(false);
    expect(looksLikeHeic(ftyp("mif1", ["avif", "miaf"]))).toBe(false);
    expect(looksLikeHeic(ftyp("isom", ["mp41"]))).toBe(false);
    expect(looksLikeHeic(new Uint8Array(8))).toBe(false);
  });

  it("ignores a box size that runs past the end of the file", () => {
    const bytes = ftyp("mif1", ["heic"]);
    new DataView(bytes.buffer).setUint32(0, 999);
    expect(looksLikeHeic(bytes)).toBe(false);
  });
});

function fakeLibheif(width: number, height: number, ok = true): LibheifLoader {
  const freed: number[] = [];
  return async () => ({
    HeifDecoder: class {
      decode() {
        return [
          {
            get_width: () => width,
            get_height: () => height,
            display: (
              target: { data: Uint8ClampedArray },
              done: (r: { data: Uint8ClampedArray } | null) => void,
            ) => {
              target.data.fill(7);
              done(ok ? target : null);
            },
            free: () => freed.push(1),
          },
        ];
      }
    },
  });
}

describe("decodeHeic", () => {
  it("returns the primary image as RGBA", async () => {
    const result = await decodeHeic(new Uint8Array(4), fakeLibheif(3, 2));
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
    expect(result.rgba).toHaveLength(24);
    expect(result.rgba[0]).toBe(7);
  });

  it("refuses images over the size limit before decoding the pixels", async () => {
    await expect(decodeHeic(new Uint8Array(4), fakeLibheif(20_000, 10))).rejects.toThrow(
      /at most 12,000 pixels/,
    );
  });

  it("explains damaged files and a decoder that can't load", async () => {
    await expect(decodeHeic(new Uint8Array(4), fakeLibheif(3, 2, false))).rejects.toThrow(
      /could not be decoded/,
    );
    const empty: LibheifLoader = async () => ({
      HeifDecoder: class {
        decode() {
          return [];
        }
      },
    });
    await expect(decodeHeic(new Uint8Array(4), empty)).rejects.toThrow(/damaged/);
    await expect(
      decodeHeic(new Uint8Array(4), () => Promise.reject(new Error("offline"))),
    ).rejects.toThrow(/could not be loaded/);
  });
});
