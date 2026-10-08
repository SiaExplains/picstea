import { describe, expect, it } from "vitest";
import { MAX_DIMENSION, MAX_IMPORT_FILE_BYTES } from "../../core/document/limits";
import {
  fakeDecoder,
  jpegHeader,
  pngHeader,
  webpLosslessHeader,
  webpVp8xHeader,
} from "../../test-utils/image-bytes";
import { readImageHeader, sniffMime } from "./image-header";
import { baseName, importRasterFile } from "./raster-import";

describe("image headers", () => {
  it("reads PNG dimensions", () => {
    expect(readImageHeader(pngHeader(640, 480))).toEqual({
      mime: "image/png",
      width: 640,
      height: 480,
    });
  });

  it("reads JPEG dimensions past APP segments", () => {
    expect(readImageHeader(jpegHeader(1920, 1080, 5000))).toEqual({
      mime: "image/jpeg",
      width: 1920,
      height: 1080,
    });
  });

  it("reads WebP extended and lossless dimensions", () => {
    expect(readImageHeader(webpVp8xHeader(3000, 2000))).toEqual({
      mime: "image/webp",
      width: 3000,
      height: 2000,
    });
    expect(readImageHeader(webpLosslessHeader(300, 200))).toEqual({
      mime: "image/webp",
      width: 300,
      height: 200,
    });
  });

  it("rejects unknown and truncated data", () => {
    expect(sniffMime(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(readImageHeader(pngHeader(1, 1).subarray(0, 16))).toBeNull();
    expect(readImageHeader(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    expect(readImageHeader(new Uint8Array())).toBeNull();
  });
});

describe("importRasterFile", () => {
  it("imports a valid image and re-labels it with the sniffed type", async () => {
    const { decode } = fakeDecoder(640, 480);
    const file = new Blob([pngHeader(640, 480)], { type: "image/jpeg" });
    const result = await importRasterFile(file, decode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image).toMatchObject({ mime: "image/png", width: 640, height: 480 });
    expect(result.image.blob.type).toBe("image/png");
  });

  it("rejects non-images regardless of declared MIME type", async () => {
    const { decode } = fakeDecoder(1, 1);
    const file = new Blob(["<svg/>"], { type: "image/png" });
    expect(await importRasterFile(file, decode)).toEqual({
      ok: false,
      error: expect.stringContaining("not a PNG"),
    });
  });

  it("rejects oversized dimensions before decoding (decompression bomb guard)", async () => {
    let decoded = false;
    const decode = async () => {
      decoded = true;
      throw new Error("should not decode");
    };
    const file = new Blob([pngHeader(MAX_DIMENSION + 1, 10)]);
    const result = await importRasterFile(file, decode);
    expect(result.ok).toBe(false);
    expect(decoded).toBe(false);
  });

  it("rejects empty and oversized files", async () => {
    const { decode } = fakeDecoder(1, 1);
    expect((await importRasterFile(new Blob([]), decode)).ok).toBe(false);
    const huge = { size: MAX_IMPORT_FILE_BYTES + 1 } as Blob;
    expect((await importRasterFile(huge, decode)).ok).toBe(false);
  });

  it("reports decode failures", async () => {
    const decode = async () => {
      throw new Error("bad");
    };
    const result = await importRasterFile(new Blob([pngHeader(10, 10)]), decode);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("could not be decoded") });
  });

  it("re-checks limits on the decoded size and releases the bitmap", async () => {
    const { decode, closed } = fakeDecoder(MAX_DIMENSION + 5, 10);
    const result = await importRasterFile(new Blob([pngHeader(10, 10)]), decode);
    expect(result.ok).toBe(false);
    expect(closed).toHaveLength(1);
  });
});

describe("baseName", () => {
  it("strips the extension", () => {
    expect(baseName("holiday.photo.JPG")).toBe("holiday.photo");
    expect(baseName(".png")).toBe("Untitled");
    expect(baseName("noext")).toBe("noext");
  });
});
