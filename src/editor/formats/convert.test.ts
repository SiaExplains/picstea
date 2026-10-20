import { describe, expect, it } from "vitest";
import { fakeDecoder, pngHeader } from "../test-utils/image-bytes";
import {
  ANY_CONVERSION,
  CONVERSIONS,
  convertFile,
  parseConvertParam,
  type ConvertEnv,
} from "./convert";

/** A surface that records drawing and encodes to a Blob of the requested type. */
function fakeSurfaces(encodeAs?: string) {
  const ops: string[] = [];
  const released: number[] = [];
  const createSurface = (width: number, height: number) => {
    const surface = {
      width,
      height,
      getContext: () => ({
        set fillStyle(value: string) {
          ops.push(`fillStyle=${value}`);
        },
        fillRect: (...a: number[]) => ops.push(`fillRect(${a.join(",")})`),
        drawImage: (_image: unknown, ...a: number[]) => ops.push(`drawImage(${a.join(",")})`),
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => ops.push("putImageData"),
      }),
      convertToBlob: async ({ type }: { type: string }) =>
        new Blob([new Uint8Array([1, 2, 3])], { type: encodeAs ?? type }),
    };
    return new Proxy(surface, {
      set(target, prop, value) {
        if (prop === "width" && value === 0) released.push(1);
        return Reflect.set(target, prop, value);
      },
    }) as unknown as OffscreenCanvas;
  };
  return { createSurface, ops, released };
}

function env(overrides: Partial<ConvertEnv> = {}, encodeAs?: string) {
  const surfaces = fakeSurfaces(encodeAs);
  const decoder = fakeDecoder(4, 3);
  const value: ConvertEnv = {
    decode: decoder.decode,
    createSurface: surfaces.createSurface,
    readPsdComposite: async () => ({ width: 2, height: 2, rgba: new Uint8ClampedArray(16) }),
    ...overrides,
  };
  return { env: value, ...surfaces, closed: decoder.closed };
}

const png = () => new Blob([pngHeader(4, 3)], { type: "image/png" });
const psd = () => new Blob([new TextEncoder().encode("8BPS rest of a psd")]);

describe("parseConvertParam", () => {
  it("accepts every listed conversion and nothing else", () => {
    for (const c of CONVERSIONS) expect(parseConvertParam(c.id)).toBe(c);
    expect(parseConvertParam("images")).toBe(ANY_CONVERSION);
    expect(parseConvertParam("png-to-exe")).toBeNull();
    expect(parseConvertParam("")).toBeNull();
    expect(parseConvertParam(null)).toBeNull();
  });
});

describe("convertFile", () => {
  it("converts a PNG to JPEG on a white matte and names the file", async () => {
    const t = env();
    const result = await convertFile(t.env, png(), "holiday photo.png", {
      to: "jpeg",
      quality: 0.8,
    });
    expect(result).toMatchObject({ ok: true, filename: "holiday photo.jpg" });
    if (result.ok) expect(result.blob.type).toBe("image/jpeg");
    expect(t.ops).toEqual(["fillStyle=#ffffff", "fillRect(0,0,4,3)", "drawImage(0,0,4,3)"]);
    expect(t.closed).toHaveLength(1);
    expect(t.released.length).toBeGreaterThan(0);
  });

  it("keeps transparency for PNG and WebP (no matte)", async () => {
    const t = env();
    const result = await convertFile(t.env, png(), "logo.png", { to: "webp", quality: 0.9 });
    expect(result).toMatchObject({ ok: true, filename: "logo.webp" });
    expect(t.ops).toEqual(["drawImage(0,0,4,3)"]);
  });

  it("uses the flattened image stored in a PSD", async () => {
    const t = env();
    const result = await convertFile(t.env, psd(), "poster.psd", { to: "png", quality: 1 });
    expect(result).toMatchObject({ ok: true, filename: "poster.png" });
    expect(t.ops).toContain("putImageData");
  });

  it("explains a PSD saved without a flattened image", async () => {
    const t = env({ readPsdComposite: async () => ({ width: 2, height: 2, rgba: null }) });
    const result = await convertFile(t.env, psd(), "poster.psd", { to: "png", quality: 1 });
    expect(result).toEqual({
      ok: false,
      error: "This PSD has no flattened image. Open it in the editor and export it instead.",
    });
  });

  it("refuses unsupported files and project files with the Open messages", async () => {
    const t = env();
    const tiff = new Blob([new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0, 0, 0, 0])]);
    const result = await convertFile(t.env, tiff, "scan.tif", { to: "png", quality: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/TIFF/);
  });

  it("reports when the browser can't encode the format instead of saving a PNG", async () => {
    const t = env({}, "image/png");
    const result = await convertFile(t.env, png(), "a.png", { to: "webp", quality: 0.9 });
    expect(result).toEqual({ ok: false, error: "This browser cannot create WebP images." });
  });

  it("rejects images over the size limit", async () => {
    const t = env({ decode: fakeDecoder(20_000, 100).decode });
    const big = new Blob([pngHeader(20_000, 100)], { type: "image/png" });
    const result = await convertFile(t.env, big, "wide.png", { to: "png", quality: 1 });
    expect(result.ok).toBe(false);
  });
});
