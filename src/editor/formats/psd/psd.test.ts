import { describe, expect, it } from "vitest";
import { FormatError } from "../binary/bytes";
import { blendKey, blendModeFromKey } from "./blend-keys";
import { packBits, unpackBits } from "./packbits";
import type { PsdFile, PsdGroup, PsdPixelLayer } from "./psd-model";
import { readPsd } from "./psd-read";
import { writePsd } from "./psd-write";

function solid(w: number, h: number, rgba: number[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) out.set(rgba, i * 4);
  return out;
}

function sample(): PsdFile {
  const photo: PsdPixelLayer = {
    kind: "pixels",
    name: "Photo — été",
    opacity: 200,
    visible: true,
    blendKey: "mul ",
    rect: { top: 2, left: 3, bottom: 6, right: 8 },
    rgba: solid(5, 4, [255, 0, 0, 255]),
    mask: {
      rect: { top: 0, left: 0, bottom: 10, right: 12 },
      data: new Uint8Array(120).map((_, i) => (i % 2 ? 255 : 0)),
      defaultColor: 255,
      disabled: false,
    },
  };
  const hidden: PsdPixelLayer = {
    kind: "pixels",
    name: "Hidden",
    opacity: 255,
    visible: false,
    blendKey: "scrn",
    rect: { top: 0, left: 0, bottom: 1, right: 1 },
    rgba: solid(1, 1, [1, 2, 3, 4]),
  };
  const group: PsdGroup = {
    kind: "group",
    name: "Group 1",
    opacity: 128,
    visible: true,
    blendKey: "pass",
    open: false,
    children: [photo, hidden],
  };
  const background: PsdPixelLayer = {
    kind: "pixels",
    name: "Background",
    opacity: 255,
    visible: true,
    blendKey: "norm",
    rect: { top: 0, left: 0, bottom: 10, right: 12 },
    rgba: solid(12, 10, [255, 255, 255, 255]),
  };
  return {
    width: 12,
    height: 10,
    resolution: 150,
    layers: [background, group],
    composite: solid(12, 10, [9, 8, 7, 255]),
  };
}

describe("PackBits", () => {
  it("round-trips runs and literals", () => {
    const row = Uint8Array.from([1, 1, 1, 1, 2, 3, 4, 4, 5, ...new Array(300).fill(9)]);
    const packed = packBits(row);
    expect(packed.length).toBeLessThan(row.length);
    const out = new Uint8Array(row.length);
    unpackBits(packed, out, 0, row.length);
    expect(out).toEqual(row);
  });

  it("refuses data that overruns the row or ends early", () => {
    expect(() => unpackBits(Uint8Array.from([0xfd, 7]), new Uint8Array(2), 0, 2)).toThrow(
      FormatError,
    );
    expect(() => unpackBits(Uint8Array.from([3, 1]), new Uint8Array(4), 0, 4)).toThrow(FormatError);
  });
});

describe("blend keys", () => {
  it("maps every Picstea mode both ways and rejects unknown keys", () => {
    expect(blendKey("multiply")).toBe("mul ");
    expect(blendModeFromKey("pass")).toBe("pass-through");
    expect(blendModeFromKey("lbrn")).toBeNull();
  });
});

describe("PSD write → read", () => {
  it("keeps layers, names, groups, opacity, visibility, blend, masks and the composite", async () => {
    const bytes = writePsd(sample());
    expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe("8BPS");
    const { file, warnings } = await readPsd(bytes);
    expect(warnings).toEqual([]);
    expect([file.width, file.height, file.resolution]).toEqual([12, 10, 150]);
    expect(file.layers.map((l) => l.name)).toEqual(["Background", "Group 1"]);

    const group = file.layers[1] as PsdGroup;
    expect(group).toMatchObject({ kind: "group", opacity: 128, blendKey: "pass", open: false });
    const [photo, hidden] = group.children as PsdPixelLayer[];
    expect(photo).toMatchObject({
      name: "Photo — été",
      opacity: 200,
      blendKey: "mul ",
      visible: true,
      rect: { top: 2, left: 3, bottom: 6, right: 8 },
    });
    expect(Array.from(photo.rgba!.slice(0, 4))).toEqual([255, 0, 0, 255]);
    const original = (sample().layers[1] as PsdGroup).children[0];
    expect(photo.mask).toEqual(original.mask);
    expect(hidden).toMatchObject({ visible: false, blendKey: "scrn" });
    expect(Array.from(hidden.rgba!)).toEqual([1, 2, 3, 4]);
    expect(Array.from(file.composite!.slice(0, 4))).toEqual([9, 8, 7, 255]);
  });
});

describe("PSD reader hardening", () => {
  const valid = writePsd(sample());

  it("refuses non-PSD data, PSB, 16-bit and CMYK files", async () => {
    await expect(readPsd(new TextEncoder().encode("hello world, not a psd"))).rejects.toThrow(
      /not a Photoshop/,
    );
    const psb = valid.slice();
    psb[5] = 2;
    await expect(readPsd(psb)).rejects.toThrow(/PSB/);
    const deep = valid.slice();
    deep[23] = 16;
    await expect(readPsd(deep)).rejects.toThrow(/16-bit/);
    const cmyk = valid.slice();
    cmyk[25] = 4;
    await expect(readPsd(cmyk)).rejects.toThrow(/CMYK/);
  });

  it("refuses absurd dimensions before allocating anything", async () => {
    const huge = valid.slice();
    new DataView(huge.buffer).setUint32(14, 100_000);
    await expect(readPsd(huge)).rejects.toThrow(/at most/);
  });

  it("fails cleanly on every truncation", async () => {
    for (const cut of [10, 30, 60, 120, 200, valid.length - 40]) {
      await expect(readPsd(valid.slice(0, cut))).rejects.toThrow(FormatError);
    }
  });

  it("never crashes on corrupted bytes", async () => {
    let seed = 42;
    const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
    for (let run = 0; run < 200; run++) {
      const bytes = valid.slice();
      for (let k = 0; k < 8; k++) bytes[26 + (random() % (bytes.length - 26))] = random() & 0xff;
      try {
        await readPsd(bytes);
      } catch (error) {
        expect(error).toBeInstanceOf(FormatError);
      }
    }
  });
});

describe("PSD clipping masks", () => {
  it("writes and reads the clipping flag", async () => {
    const file = sample();
    const clipped: PsdPixelLayer = {
      kind: "pixels",
      name: "Clipped",
      opacity: 255,
      visible: true,
      blendKey: "norm",
      clipping: true,
      rect: { top: 0, left: 0, bottom: 2, right: 2 },
      rgba: solid(2, 2, [0, 0, 255, 255]),
    };
    const result = await readPsd(writePsd({ ...file, layers: [...file.layers, clipped] }));
    const top = result.file.layers.at(-1)!;
    expect(top.name).toBe("Clipped");
    expect(top.clipping).toBe(true);
    expect(result.file.layers[0].clipping).toBeUndefined();
    expect([...result.warnings].join(" ")).not.toMatch(/Clipping/);
  });
});
