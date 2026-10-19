import { describe, expect, it } from "vitest";
import {
  addEffectCopy,
  moveEffectCopy,
  setFillOpacity,
  setGlobalLight,
  setLayerEffect,
  setLayerStyle,
} from "../commands/effect-commands";
import { CommandError } from "../commands/command";
import { createDocument, createShapeLayer } from "../document/factory";
import { findLayerDeep } from "../document/tree";
import type { EditorDocument, Layer } from "../document/types";
import { createGroup } from "../commands/group-commands";
import {
  MIGRATIONS,
  deserializeProject,
  serializeDocument,
} from "../../serialization/serialization";
import {
  CONTOUR_PRESETS,
  DEFAULT_EFFECTS,
  LINEAR_CONTOUR,
  MAX_EFFECT_COPIES,
  contourPreset,
  effectAngle,
  effectReach,
  evaluateContour,
  hasActiveEffects,
  upgradeLegacyEffects,
} from "./model";
import { EffectError, parseGlobalLight, parseLayerEffects } from "./parse";
import { BUILT_IN_STYLES, MAX_STYLE_NAME_LENGTH, parseStylePresets } from "./presets";

function doc(): EditorDocument {
  const base = createDocument({ name: "Doc", width: 100, height: 100 });
  const shape = {
    ...createShapeLayer({
      shape: "rect",
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      fill: "#3366cc",
      stroke: null,
      name: "Box",
    }),
    id: "a",
  };
  return { ...base, layers: [...base.layers, shape], activeLayerId: "a" };
}

const layerA = (d: EditorDocument) => findLayerDeep(d.layers, "a") as Layer;

/** A version-6 layer style, before effects became lists. */
const LEGACY = {
  dropShadow: { enabled: true, color: "#000000", opacity: 0.6, angle: 135, distance: 10, blur: 4 },
  outerGlow: { enabled: false, color: "#ffff00", opacity: 0.5, size: 8 },
  stroke: { enabled: true, color: "#ff0000", opacity: 1, size: 3 },
  colorOverlay: { enabled: true, color: "#00ff00", opacity: 0.3 },
  innerShadow: { enabled: true, color: "#000000", opacity: 0.5, angle: 90, distance: 3, blur: 2 },
  bevel: {
    enabled: true,
    color: "#ffffff",
    opacity: 0.7,
    shadowColor: "#111111",
    shadowOpacity: 0.4,
    angle: 45,
    size: 6,
    direction: "down",
  },
  gradientOverlay: {
    enabled: true,
    opacity: 1,
    angle: 30,
    stops: [
      { position: 0, color: "#000000" },
      { position: 1, color: "#ffffff" },
    ],
    reverse: true,
  },
};

describe("layer style model", () => {
  it("evaluates contours piecewise and keeps presets in range", () => {
    expect(evaluateContour(LINEAR_CONTOUR, 0.3)).toBeCloseTo(0.3);
    expect(evaluateContour(contourPreset("cone"), 0.5)).toBe(1);
    expect(evaluateContour(contourPreset("cone"), 1)).toBe(0);
    expect(evaluateContour(LINEAR_CONTOUR, -1)).toBe(0);
    for (const points of Object.values(CONTOUR_PRESETS)) {
      expect(points[0].x).toBe(0);
      expect(points[points.length - 1].x).toBe(1);
      expect(points.every((p, i) => i === 0 || p.x >= points[i - 1].x)).toBe(true);
    }
  });

  it("uses the global light only when asked", () => {
    const light = { angle: 30, altitude: 20 };
    expect(effectAngle({ angle: 90, useGlobalLight: true }, light)).toBe(30);
    expect(effectAngle({ angle: 90, useGlobalLight: false }, light)).toBe(90);
    expect(effectAngle({ angle: 90, useGlobalLight: true }, undefined)).toBe(120);
  });

  it("measures how far effects reach", () => {
    expect(effectReach(undefined)).toBe(0);
    expect(
      effectReach({ dropShadow: [{ ...DEFAULT_EFFECTS.dropShadow, distance: 10, size: 5 }] }),
    ).toBe(22);
    expect(
      effectReach({ stroke: [{ ...DEFAULT_EFFECTS.stroke, position: "inside", size: 9 }] }),
    ).toBe(0);
    expect(effectReach({ dropShadow: [{ ...DEFAULT_EFFECTS.dropShadow, enabled: false }] })).toBe(
      0,
    );
  });

  it("upgrades version-6 effects to lists that look the same", () => {
    const up = parseLayerEffects(upgradeLegacyEffects(LEGACY));
    expect(up.dropShadow).toEqual([
      {
        ...DEFAULT_EFFECTS.dropShadow,
        blendMode: "normal",
        color: "#000000",
        opacity: 0.6,
        angle: 135,
        useGlobalLight: false,
        distance: 10,
        size: 4,
        knockout: false,
      },
    ]);
    expect(up.outerGlow?.[0]).toMatchObject({
      enabled: false,
      fill: { kind: "color", color: "#ffff00" },
      size: 8,
      blendMode: "normal",
    });
    expect(up.stroke?.[0]).toMatchObject({
      position: "outside",
      fill: { kind: "color", color: "#ff0000" },
      size: 3,
    });
    expect(up.bevel?.[0]).toMatchObject({
      style: "inner",
      highlightColor: "#ffffff",
      highlightOpacity: 0.7,
      shadowColor: "#111111",
      direction: "down",
      useGlobalLight: false,
    });
    expect(up.gradientOverlay?.[0]).toMatchObject({
      style: "linear",
      reverse: true,
      angle: 30,
      scale: 1,
    });
    expect(hasActiveEffects(up)).toBe(true);
  });
});

describe("layer style validation", () => {
  it("accepts every default and built-in style", () => {
    const all = Object.fromEntries(Object.entries(DEFAULT_EFFECTS).map(([k, v]) => [k, [v]]));
    expect(parseLayerEffects(all)).toEqual(all);
    for (const preset of BUILT_IN_STYLES) {
      expect(parseLayerEffects(preset.effects)).toEqual(preset.effects);
    }
  });

  it("rejects too many copies, unknown values and bad contours", () => {
    const shadow = DEFAULT_EFFECTS.dropShadow;
    expect(() =>
      parseLayerEffects({ dropShadow: Array(MAX_EFFECT_COPIES + 1).fill(shadow) }),
    ).toThrow(EffectError);
    expect(() =>
      parseLayerEffects({ satin: [DEFAULT_EFFECTS.satin, DEFAULT_EFFECTS.satin] }),
    ).toThrow(EffectError);
    expect(() => parseLayerEffects({ dropShadow: [{ ...shadow, blendMode: "dissolve" }] })).toThrow(
      EffectError,
    );
    expect(() =>
      parseLayerEffects({
        dropShadow: [{ ...shadow, contour: { preset: "custom", points: [{ x: 0.5, y: 0 }] } }],
      }),
    ).toThrow(EffectError);
    expect(() =>
      parseLayerEffects({
        dropShadow: [
          {
            ...shadow,
            contour: {
              preset: "custom",
              points: [
                { x: 0, y: 0 },
                { x: 0.8, y: 1 },
                { x: 0.2, y: 0.5 },
                { x: 1, y: 1 },
              ],
            },
          },
        ],
      }),
    ).toThrow(EffectError);
    expect(() =>
      parseLayerEffects({
        patternOverlay: [{ ...DEFAULT_EFFECTS.patternOverlay, pattern: "../../etc" }],
      }),
    ).toThrow(EffectError);
  });

  it("ignores inherited properties and drops empty lists", () => {
    const sneaky = JSON.parse(
      `{"__proto__": {"dropShadow": [${JSON.stringify(DEFAULT_EFFECTS.dropShadow)}]}, "stroke": []}`,
    );
    expect(parseLayerEffects(sneaky)).toEqual({});
    const withExtra = { ...DEFAULT_EFFECTS.stroke, onclick: "alert(1)" };
    expect(Object.keys(parseLayerEffects({ stroke: [withExtra] }).stroke![0])).not.toContain(
      "onclick",
    );
  });

  it("validates the global light", () => {
    expect(parseGlobalLight({ angle: 45, altitude: 60 })).toEqual({ angle: 45, altitude: 60 });
    expect(() => parseGlobalLight({ angle: 45, altitude: 120 })).toThrow(EffectError);
  });
});

describe("layer style commands", () => {
  it("adds, reorders and removes copies of an effect", () => {
    let d = setLayerEffect("a", "dropShadow", DEFAULT_EFFECTS.dropShadow).apply(doc());
    d = addEffectCopy("a", "dropShadow", 0).apply(d);
    d = setLayerEffect(
      "a",
      "dropShadow",
      { ...DEFAULT_EFFECTS.dropShadow, color: "#ff0000" },
      1,
    ).apply(d);
    expect(layerA(d).effects?.dropShadow?.map((e) => e.color)).toEqual(["#000000", "#ff0000"]);
    d = moveEffectCopy("a", "dropShadow", 1, 0).apply(d);
    expect(layerA(d).effects?.dropShadow?.map((e) => e.color)).toEqual(["#ff0000", "#000000"]);
    d = setLayerEffect("a", "dropShadow", null, 0).apply(d);
    expect(layerA(d).effects?.dropShadow?.map((e) => e.color)).toEqual(["#000000"]);
    d = setLayerEffect("a", "dropShadow", null, 0).apply(d);
    expect(layerA(d).effects).toBeUndefined();
  });

  it("limits copies and refuses missing ones", () => {
    let d = setLayerEffect("a", "satin", DEFAULT_EFFECTS.satin).apply(doc());
    expect(() => addEffectCopy("a", "satin", 0).apply(d)).toThrow(CommandError);
    expect(() => setLayerEffect("a", "satin", DEFAULT_EFFECTS.satin, 1).apply(d)).toThrow(
      CommandError,
    );
    expect(() => setLayerEffect("a", "stroke", DEFAULT_EFFECTS.stroke, 3).apply(d)).toThrow(
      CommandError,
    );
    for (let i = 0; i < MAX_EFFECT_COPIES; i++) d = addEffectCopy("a", "stroke", i - 1).apply(d);
    expect(layerA(d).effects?.stroke).toHaveLength(MAX_EFFECT_COPIES);
    expect(() => addEffectCopy("a", "stroke", 0).apply(d)).toThrow(CommandError);
  });

  it("merges slider drags per copy", () => {
    expect(setLayerEffect("a", "stroke", DEFAULT_EFFECTS.stroke, 0).mergeKey).not.toBe(
      setLayerEffect("a", "stroke", DEFAULT_EFFECTS.stroke, 1).mergeKey,
    );
  });

  it("sets and clears a whole style, fill and the global light", () => {
    const style = BUILT_IN_STYLES.find((s) => s.id === "builtin-neon")!;
    let d = setLayerStyle("a", style.effects).apply(doc());
    expect(layerA(d).effects).toEqual(style.effects);
    d = setLayerStyle("a", null).apply(d);
    expect(layerA(d).effects).toBeUndefined();
    d = setFillOpacity("a", 0.25).apply(d);
    expect(layerA(d).fillOpacity).toBe(0.25);
    d = setFillOpacity("a", 1).apply(d);
    expect("fillOpacity" in layerA(d)).toBe(false);
    expect(() => setFillOpacity("a", 2).apply(d)).toThrow(CommandError);
    d = setGlobalLight({ angle: 60, altitude: 40 }).apply(d);
    expect(d.globalLight).toEqual({ angle: 60, altitude: 40 });
    expect(() => setGlobalLight({ angle: 60, altitude: -1 }).apply(d)).toThrow(CommandError);
  });
});

describe("schema v7", () => {
  it("migrates v6 effects everywhere, including groups and smart objects", () => {
    const base = doc();
    const shape = layerA(base);
    const inner = createDocument({ name: "Inner", width: 10, height: 10 });
    const v6 = JSON.parse(JSON.stringify(serializeDocument(base)));
    v6.schemaVersion = 6;
    const legacyShape = { ...JSON.parse(JSON.stringify(shape)), effects: LEGACY };
    const nested = {
      ...JSON.parse(JSON.stringify(createGroup("G", []))),
      id: "g",
      children: [legacyShape],
    };
    const smart = {
      ...JSON.parse(JSON.stringify(shape)),
      id: "s",
      kind: "smart",
      content: {
        ...JSON.parse(JSON.stringify(inner)),
        layers: [{ ...JSON.parse(JSON.stringify(shape)), id: "deep", effects: LEGACY }],
        activeLayerId: "deep",
      },
    };
    delete smart.shape;
    v6.document.layers = [v6.document.layers[0], nested];
    const result = deserializeProject(v6);
    expect(result).toMatchObject({ ok: true, migratedFrom: 6 });
    if (!result.ok) return;
    const migrated = findLayerDeep(result.document.layers, "a")!;
    expect(migrated.effects?.dropShadow?.[0]).toMatchObject({ size: 4, blendMode: "normal" });
    expect(Array.isArray(migrated.effects?.bevel)).toBe(true);
    // Saved again, it is a version-7 project that loads unchanged.
    const again = JSON.parse(JSON.stringify(serializeDocument(result.document)));
    expect(again.schemaVersion).toBe(7);
    expect(deserializeProject(again)).toMatchObject({ ok: true, migratedFrom: null });
    // Smart object contents are upgraded by the same step.
    const step = MIGRATIONS[6]({ layers: [smart] }) as {
      layers: { content: { layers: { effects: unknown }[] } }[];
    };
    expect(step.layers[0].content.layers[0].effects).toMatchObject({ dropShadow: [{ size: 4 }] });
  });

  it("round-trips fill opacity and the global light", () => {
    let d = setFillOpacity("a", 0.4).apply(doc());
    d = setGlobalLight({ angle: -30, altitude: 70 }).apply(d);
    const result = deserializeProject(JSON.parse(JSON.stringify(serializeDocument(d))));
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document.globalLight).toEqual({ angle: -30, altitude: 70 });
    expect(layerA(result.document).fillOpacity).toBe(0.4);
  });

  it("rejects out-of-range fill and light", () => {
    const raw = JSON.parse(JSON.stringify(serializeDocument(doc())));
    raw.document.globalLight = { angle: 0, altitude: 400 };
    expect(deserializeProject(raw).ok).toBe(false);
    const raw2 = JSON.parse(JSON.stringify(serializeDocument(doc())));
    raw2.document.layers[1].fillOpacity = -0.5;
    expect(deserializeProject(raw2).ok).toBe(false);
  });
});

describe("saved layer styles", () => {
  let n = 0;
  const id = () => `style_${++n}`;

  it("keeps valid styles and drops malformed ones", () => {
    const good = { id: "mine", name: "  Mine  ", effects: { stroke: [DEFAULT_EFFECTS.stroke] } };
    const parsed = parseStylePresets(
      [
        good,
        { ...good, id: "mine" },
        { name: "", effects: {} },
        { name: "Bad", effects: { stroke: [{ size: 1 }] } },
        { name: "x".repeat(200), effects: {}, fillOpacity: 0.5 },
        null,
        "nope",
      ],
      id,
    );
    expect(parsed.map((p) => p.name)).toEqual(["Mine", "Mine", "x".repeat(MAX_STYLE_NAME_LENGTH)]);
    expect(parsed[0].id).toBe("mine");
    expect(parsed[1].id).not.toBe("mine");
    expect(parsed[2].fillOpacity).toBe(0.5);
    expect(parseStylePresets({}, id)).toEqual([]);
  });
});
