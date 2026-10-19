import { describe, expect, it } from "vitest";
import { setBlendIf, setLayerChannels } from "../commands/effect-commands";
import { CommandError } from "../commands/command";
import { createDocument, createShapeLayer } from "./factory";
import { findLayerDeep } from "./tree";
import type { EditorDocument, Layer } from "./types";
import { deserializeProject, serializeDocument } from "../../serialization/serialization";
import { mixAdvancedBlending } from "../../rendering/compositing/blend-if";
import {
  layerBlendingOf,
  psdBlendingOf,
  readBlendingRanges,
  readRestrictedChannels,
  writeBlendingRanges,
} from "../../formats/psd/psd-blending";
import { ByteReader, ByteWriter } from "../../formats/binary/bytes";
import {
  BlendingError,
  FULL_RANGE,
  grayOf,
  hasAdvancedBlending,
  parseBlendIf,
  parseChannels,
  rangeWeight,
  type BlendIf,
} from "./blending";

function doc(): EditorDocument {
  const base = createDocument({ name: "Doc", width: 20, height: 20 });
  const shape = {
    ...createShapeLayer({
      shape: "rect",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: "#ff0000",
      stroke: null,
      name: "Box",
    }),
    id: "a",
  };
  return { ...base, layers: [...base.layers, shape], activeLayerId: "a" };
}
const layerA = (d: EditorDocument) => findLayerDeep(d.layers, "a") as Layer;

const px = (...v: number[]) => new Uint8ClampedArray(v);

describe("Blend If ranges", () => {
  it("weighs values with split sliders", () => {
    expect(rangeWeight(FULL_RANGE, 0)).toBe(1);
    expect(rangeWeight(FULL_RANGE, 255)).toBe(1);
    const r = [50, 100, 200, 220] as const;
    expect(rangeWeight(r, 40)).toBe(0);
    expect(rangeWeight(r, 75)).toBe(0.5);
    expect(rangeWeight(r, 150)).toBe(1);
    expect(rangeWeight(r, 210)).toBe(0.5);
    expect(rangeWeight(r, 230)).toBe(0);
    expect(rangeWeight([0, 0, 128, 128], 128)).toBe(1);
    expect(grayOf(255, 255, 255)).toBe(255);
  });

  it("validates ranges and channels, dropping full ranges", () => {
    expect(parseBlendIf({ gray: { current: [0, 0, 255, 255], below: [0, 0, 255, 255] } })).toEqual(
      {},
    );
    expect(parseBlendIf({ red: { current: [0, 10, 200, 255], below: [0, 0, 255, 255] } })).toEqual({
      red: { current: [0, 10, 200, 255], below: [0, 0, 255, 255] },
    });
    expect(() =>
      parseBlendIf({ gray: { current: [0, 200, 100, 255], below: FULL_RANGE } }),
    ).toThrow(BlendingError);
    expect(() => parseBlendIf({ gray: { current: [0, 0, 255, 256], below: FULL_RANGE } })).toThrow(
      BlendingError,
    );
    expect(() =>
      parseBlendIf({ gray: { current: [0, 0.5, 255, 255], below: FULL_RANGE } }),
    ).toThrow(BlendingError);
    expect(parseBlendIf(JSON.parse('{"__proto__": {"gray": 1}}'))).toEqual({});
    expect(parseChannels({ r: true, g: false, b: true })).toEqual({ r: true, g: false, b: true });
    expect(() => parseChannels({ r: true, g: "no", b: true })).toThrow(BlendingError);
    expect(hasAdvancedBlending({ channels: { r: true, g: true, b: true } })).toBe(false);
  });
});

describe("Blend If mixing", () => {
  const red = () => px(255, 0, 0, 255);

  it("hides the layer over bright backdrops (Underlying Layer)", () => {
    const blendIf: BlendIf = { gray: { current: FULL_RANGE, below: [0, 0, 100, 150] } };
    const before = px(255, 255, 255, 255, 50, 50, 50, 255);
    const after = px(255, 0, 0, 255, 255, 0, 0, 255);
    mixAdvancedBlending(before, after, px(255, 0, 0, 255, 255, 0, 0, 255), blendIf, undefined);
    expect([...after.slice(0, 4)]).toEqual([255, 255, 255, 255]);
    expect([...after.slice(4)]).toEqual([255, 0, 0, 255]);
  });

  it("fades with split sliders and follows the layer's own colour (This Layer)", () => {
    const blendIf: BlendIf = { red: { current: [0, 0, 100, 255], below: FULL_RANGE } };
    // red 255 is at the very end of the white ramp: hidden; the weight there is 0.
    const before = px(0, 0, 0, 255);
    const after = red();
    mixAdvancedBlending(before, after, red(), blendIf, undefined);
    expect([...after]).toEqual([0, 0, 0, 255]);
    const half: BlendIf = { gray: { current: FULL_RANGE, below: [0, 0, 0, 255] } };
    const b2 = px(128, 128, 128, 255);
    const a2 = px(0, 0, 0, 255);
    mixAdvancedBlending(b2, a2, px(0, 0, 0, 255), half, undefined);
    expect(a2[0]).toBeGreaterThan(60);
    expect(a2[0]).toBeLessThan(70);
  });

  it("mixes alpha with premultiplied colour", () => {
    const blendIf: BlendIf = { gray: { current: FULL_RANGE, below: [0, 0, 0, 255] } };
    const before = px(0, 0, 0, 0); // transparent backdrop: grey 0, weight 1
    const after = px(10, 20, 30, 200);
    mixAdvancedBlending(before, after, after.slice(), blendIf, undefined);
    expect([...after]).toEqual([10, 20, 30, 200]);
  });

  it("keeps the backdrop in channels the layer may not change", () => {
    const before = px(10, 20, 30, 255);
    const after = px(200, 210, 220, 255);
    mixAdvancedBlending(before, after, after.slice(), undefined, { r: true, g: false, b: false });
    expect([...after]).toEqual([200, 20, 30, 255]);
  });
});

describe("Blend If commands and projects", () => {
  it("sets, merges and clears Blend If and channels", () => {
    const bi: BlendIf = { gray: { current: FULL_RANGE, below: [0, 0, 128, 200] } };
    let d = setBlendIf("a", bi).apply(doc());
    expect(layerA(d).blendIf).toEqual(bi);
    expect(setBlendIf("a", bi).mergeKey).toBe(setBlendIf("a", null).mergeKey);
    expect(() =>
      setBlendIf("a", { gray: { current: [9, 0, 255, 255], below: FULL_RANGE } }).apply(d),
    ).toThrow(CommandError);
    d = setBlendIf("a", { gray: { current: FULL_RANGE, below: FULL_RANGE } }).apply(d);
    expect("blendIf" in layerA(d)).toBe(false);
    d = setLayerChannels("a", { r: false, g: true, b: true }).apply(d);
    expect(layerA(d).channels).toEqual({ r: false, g: true, b: true });
    d = setLayerChannels("a", { r: true, g: true, b: true }).apply(d);
    expect("channels" in layerA(d)).toBe(false);
  });

  it("round-trips in projects (schema v8) and rejects bad values", () => {
    let d = setBlendIf("a", { blue: { current: [0, 30, 255, 255], below: FULL_RANGE } }).apply(
      doc(),
    );
    d = setLayerChannels("a", { r: true, g: false, b: true }).apply(d);
    const raw = JSON.parse(JSON.stringify(serializeDocument(d)));
    expect(raw.schemaVersion).toBe(8);
    const back = deserializeProject(raw);
    expect(back).toMatchObject({ ok: true });
    if (back.ok) expect(layerA(back.document)).toEqual(layerA(d));
    raw.document.layers[1].blendIf.blue.current = [0, 300, 255, 255];
    expect(deserializeProject(raw).ok).toBe(false);
    const v7 = JSON.parse(JSON.stringify(serializeDocument(doc())));
    v7.schemaVersion = 7;
    expect(deserializeProject(v7)).toMatchObject({ ok: true, migratedFrom: 7 });
  });
});

describe("PSD blending ranges", () => {
  it("writes and reads ranges and restricted channels", () => {
    const layer = {
      blendIf: {
        gray: { current: FULL_RANGE, below: [10, 20, 200, 240] },
        green: { current: [0, 50, 255, 255], below: FULL_RANGE },
      } as BlendIf,
      channels: { r: true, g: false, b: true },
    };
    const blending = psdBlendingOf(layer)!;
    expect(blending.restricted).toEqual([1]);
    const w = new ByteWriter();
    writeBlendingRanges(w, blending);
    const r = new ByteReader(w.toBytes());
    const ranges = readBlendingRanges(r.sub(r.u32()));
    expect(ranges).toHaveLength(4);
    const brst = new ByteWriter().u32(1).u32(7).toBytes();
    const restricted = readRestrictedChannels(new ByteReader(brst));
    expect(restricted).toEqual([1]);
    expect(layerBlendingOf({ ranges, restricted })).toEqual(layer);
    expect(psdBlendingOf({})).toBeUndefined();
  });

  it("ignores colour ranges in greyscale files and fixes unordered values", () => {
    const ranges = readBlendingRanges(
      new ByteReader(
        Uint8Array.of(0, 0, 255, 255, 200, 255, 10, 0, 0, 0, 255, 255, 0, 0, 255, 255),
      ),
    );
    expect(ranges[0][1]).toEqual([0, 10, 200, 255]);
    expect(layerBlendingOf({ ranges, restricted: [] })).toEqual({
      blendIf: { gray: { current: FULL_RANGE, below: [0, 10, 200, 255] } },
    });
  });
});
