import { describe, expect, it } from "vitest";
import { addLayer, DEFAULT_EFFECTS, setLayerEffect } from "../core/commands";
import { EffectError, parseEffect } from "../core/effects/parse";
import { createAdjustmentLayer, createDocument, createRasterLayer } from "../core/document/factory";
import type { Adjustment, EditorDocument } from "../core/document/types";
import { EditorStore } from "../core/editor-store";
import { deserializeProject, serializeDocument } from "../serialization/serialization";
import { channelMixer, colorBalance, gradientMap, photoFilter, vibrance } from "./color-ops";
import { gradientColor, gradientLut, parseGradientStops } from "./gradient";
import { applyAdjustment } from "./pixel-ops";
import { adjustmentDefinition, parseAdjustment } from "./registry";

const px = (...rgba: number[]) => new Uint8ClampedArray(rgba);
const luma = (d: Uint8ClampedArray, i = 0) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const SAMPLE = [200, 40, 60, 255, 30, 30, 30, 128, 128, 140, 120, 255, 9, 8, 7, 0];

describe("Gate 9h adjustments", () => {
  it("defaults leave pixels unchanged (except Gradient Map, which maps by design)", () => {
    for (const type of ["vibrance", "color-balance", "photo-filter", "channel-mixer"] as const) {
      const d = px(...SAMPLE);
      const defaults =
        type === "photo-filter"
          ? { ...adjustmentDefinition(type).defaults, density: 1 }
          : adjustmentDefinition(type).defaults;
      applyAdjustment(d, defaults);
      [...d].forEach((v, i) =>
        expect(Math.abs(v - SAMPLE[i])).toBeLessThanOrEqual(type === "photo-filter" ? 3 : 0),
      );
      // Alpha never changes.
      expect([d[3], d[7], d[11], d[15]]).toEqual([255, 128, 255, 0]);
    }
  });

  it("vibrance boosts muted colours more than vivid ones", () => {
    const muted = px(140, 120, 120, 255);
    const vivid = px(250, 20, 20, 255);
    vibrance(muted, 100, 0);
    vibrance(vivid, 100, 0);
    expect(muted[0] - muted[1]).toBeGreaterThan(30);
    expect(vivid[0] - vivid[1]).toBeLessThanOrEqual(255);
    const grey = px(100, 100, 100, 255);
    vibrance(grey, 100, -100);
    expect([...grey]).toEqual([100, 100, 100, 255]);
    const desat = px(200, 40, 60, 255);
    vibrance(desat, 0, -100);
    expect(desat[0]).toBe(desat[1]);
  });

  it("color balance shifts the chosen range and can preserve luminosity", () => {
    const zero = { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
    const dark = px(30, 30, 30, 255, 230, 230, 230, 255);
    colorBalance(
      dark,
      { shadows: { ...zero, cyanRed: 100 }, midtones: zero, highlights: zero },
      false,
    );
    expect(dark[0]).toBeGreaterThan(80);
    expect(dark[4]).toBeLessThan(235);
    const kept = px(100, 100, 100, 255);
    const before = luma(kept);
    colorBalance(
      kept,
      { shadows: zero, midtones: { ...zero, yellowBlue: 100 }, highlights: zero },
      true,
    );
    expect(kept[2]).toBeGreaterThan(kept[0]);
    expect(Math.abs(luma(kept) - before)).toBeLessThanOrEqual(1);
  });

  it("photo filter tints and can keep the brightness", () => {
    const d = px(200, 200, 200, 255);
    photoFilter(d, "#ff0000", 100, false);
    expect([...d]).toEqual([200, 0, 0, 255]);
    const kept = px(200, 200, 200, 255);
    photoFilter(kept, "#ec8a00", 50, true);
    expect(kept[0]).toBeGreaterThan(kept[2]);
    expect(Math.abs(luma(kept) - 200)).toBeLessThanOrEqual(1);
  });

  it("channel mixer swaps channels, adds constants and does monochrome", () => {
    const zero = { red: 0, green: 0, blue: 0, constant: 0 };
    const d = px(200, 50, 10, 255);
    channelMixer(
      d,
      {
        red: { ...zero, blue: 100 },
        green: { ...zero, green: 100, constant: 10 },
        blue: { ...zero, red: 100 },
      },
      false,
    );
    expect([...d]).toEqual([10, 76, 200, 255]);
    const mono = px(200, 50, 10, 255);
    channelMixer(
      mono,
      { red: { ...zero, red: 40, green: 40, blue: 20 }, green: zero, blue: zero },
      true,
    );
    expect(mono[0]).toBe(mono[1]);
    expect(mono[1]).toBe(mono[2]);
  });

  it("gradient map maps shadows to the first stop and highlights to the last", () => {
    const stops = [
      { position: 0, color: "#ff0000" },
      { position: 1, color: "#0000ff" },
    ];
    const d = px(0, 0, 0, 255, 255, 255, 255, 255, 128, 128, 128, 255);
    gradientMap(d, stops, false);
    expect([...d.subarray(0, 8)]).toEqual([255, 0, 0, 255, 0, 0, 255, 255]);
    expect(d[8]).toBeGreaterThan(100);
    expect(d[10]).toBeGreaterThan(100);
    const r = px(0, 0, 0, 255);
    gradientMap(r, stops, true);
    expect([...r]).toEqual([0, 0, 255, 255]);
  });
});

describe("gradients", () => {
  it("parses (keeping the order) and rejects bad stops", () => {
    expect(
      parseGradientStops([
        { position: 1, color: "#FFF" },
        { position: 0.25, color: "000000" },
      ]),
    ).toEqual([
      { position: 1, color: "#ffffff" },
      { position: 0.25, color: "#000000" },
    ]);
    for (const bad of [
      null,
      [],
      [{ position: 0, color: "#000" }],
      [
        { position: 0, color: "#000" },
        { position: 2, color: "#fff" },
      ],
      [
        { position: 0, color: "red" },
        { position: 1, color: "#fff" },
      ],
      Array(17).fill({ position: 0.5, color: "#000" }),
      JSON.parse(
        '[{"__proto__": {"position": 0, "color": "#000"}}, {"position": 1, "color": "#fff"}]',
      ),
    ]) {
      expect(parseGradientStops(bad)).toBeNull();
    }
  });

  it("orders unsorted stops by position when sampling", () => {
    const stops = [
      { position: 1, color: "#ffffff" },
      { position: 0, color: "#000000" },
    ];
    expect(gradientColor(stops, 0)).toEqual([0, 0, 0]);
    expect(gradientLut(stops)[0][255]).toBe(255);
  });

  it("interpolates between stops and clamps outside them", () => {
    const stops = [
      { position: 0.25, color: "#000000" },
      { position: 0.75, color: "#ffffff" },
    ];
    expect(gradientColor(stops, 0)).toEqual([0, 0, 0]);
    expect(gradientColor(stops, 0.5)).toEqual([127.5, 127.5, 127.5]);
    expect(gradientColor(stops, 1)).toEqual([255, 255, 255]);
    expect(gradientLut(stops)[0][255]).toBe(255);
  });
});

describe("registry parsing of the new adjustments", () => {
  it("accepts valid settings and rejects out-of-range or hostile ones", () => {
    const valid: Adjustment[] = [
      { type: "vibrance", vibrance: 20, saturation: -10 },
      adjustmentDefinition("color-balance").defaults,
      { type: "photo-filter", color: "#00ff00", density: 60, preserveLuminosity: false },
      adjustmentDefinition("channel-mixer").defaults,
      adjustmentDefinition("gradient-map").defaults,
    ];
    for (const a of valid) expect(parseAdjustment(JSON.parse(JSON.stringify(a)))).toEqual(a);
    const bad = [
      { type: "vibrance", vibrance: 101, saturation: 0 },
      { ...adjustmentDefinition("color-balance").defaults, preserveLuminosity: "yes" },
      { type: "photo-filter", color: "url(x)", density: 10, preserveLuminosity: true },
      { type: "photo-filter", color: "#000000", density: 0, preserveLuminosity: true },
      {
        ...adjustmentDefinition("channel-mixer").defaults,
        red: { red: 300, green: 0, blue: 0, constant: 0 },
      },
      { type: "gradient-map", stops: [], reverse: false },
      JSON.parse('{"__proto__": {"type": "vibrance"}, "vibrance": 0, "saturation": 0}'),
    ];
    for (const b of bad) expect(parseAdjustment(b)).toBeNull();
  });
});

describe("Gate 9h effects", () => {
  it("validates and normalises the new effects", () => {
    for (const kind of ["innerShadow", "bevel", "gradientOverlay"] as const) {
      expect(parseEffect(kind, DEFAULT_EFFECTS[kind])).toEqual(DEFAULT_EFFECTS[kind]);
    }
    expect(() => parseEffect("bevel", { ...DEFAULT_EFFECTS.bevel, direction: "sideways" })).toThrow(
      /one of up, down/,
    );
    expect(() =>
      parseEffect("gradientOverlay", { ...DEFAULT_EFFECTS.gradientOverlay, stops: [] }),
    ).toThrow(EffectError);
    expect(() => parseEffect("innerShadow", { ...DEFAULT_EFFECTS.innerShadow, size: 999 })).toThrow(
      EffectError,
    );
  });

  it("survive a save and load, with the new adjustments (schema v7)", () => {
    const store = new EditorStore(() => 0);
    const doc = createDocument({ name: "Doc", width: 50, height: 50 });
    store.openDocument(doc);
    const raster = createRasterLayer({ assetId: null, width: 10, height: 10, name: "Box" });
    store.dispatch(addLayer(raster));
    store.dispatch(
      setLayerEffect(raster.id, "gradientOverlay", {
        ...DEFAULT_EFFECTS.gradientOverlay,
        stops: [
          { position: 1, color: "#FF0000" },
          { position: 0, color: "#0000ff" },
        ],
      }),
    );
    store.dispatch(setLayerEffect(raster.id, "bevel", DEFAULT_EFFECTS.bevel));
    for (const type of [
      "vibrance",
      "color-balance",
      "photo-filter",
      "channel-mixer",
      "gradient-map",
    ] as const) {
      const current = store.getSession()!.document;
      store.dispatch(
        addLayer(createAdjustmentLayer(current, adjustmentDefinition(type).defaults, type)),
      );
    }
    const saved = store.getSession()!.document;
    const project = serializeDocument(saved);
    expect(project.schemaVersion).toBe(7);
    const loaded = deserializeProject(JSON.parse(JSON.stringify(project)));
    expect(loaded.ok).toBe(true);
    const back = (loaded as { ok: true; document: EditorDocument }).document;
    expect(back.layers).toEqual(saved.layers);
    const box = back.layers.find((l) => l.id === raster.id)!;
    // Stored lower-cased, in the order given.
    expect(box.effects?.gradientOverlay?.[0].stops[0]).toEqual({ position: 1, color: "#ff0000" });
  });

  it("opens v5 projects", () => {
    const doc = createDocument({ name: "Old", width: 10, height: 10 });
    const project = { ...serializeDocument(doc), schemaVersion: 5 };
    expect(deserializeProject(JSON.parse(JSON.stringify(project))).ok).toBe(true);
  });
});
