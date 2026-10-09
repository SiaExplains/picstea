import { describe, expect, it } from "vitest";
import { adjustmentDefinition } from "../adjustments/registry";
import {
  ActionsFormatError,
  MAX_ACTION_STEPS,
  MAX_ACTIONS,
  parseActionsFile,
  parseStoredActions,
  serializeActions,
  type Action,
} from "./actions";
import { parseStep, stepLabel, type ActionStep } from "./steps";

let n = 0;
const newId = () => `act-${++n}`;

const STEPS: ActionStep[] = [
  { type: "filter", filterId: "gaussian-blur", values: { radius: 2 } },
  { type: "adjustment", adjustment: adjustmentDefinition("invert").defaults },
  { type: "flip", axis: "horizontal" },
  { type: "align", edge: "center-x" },
  { type: "select", op: "inverse" },
  { type: "modifySelection", kind: "feather", radius: 4 },
  { type: "fill", color: "#ff0000" },
  { type: "clear" },
  { type: "newLayer" },
  { type: "duplicateLayer" },
  { type: "fillLayer", color: "#00ff00" },
  { type: "cropToSelection" },
];

describe("action steps", () => {
  it("accepts every step type unchanged and labels it", () => {
    for (const step of STEPS) {
      expect(parseStep(JSON.parse(JSON.stringify(step)))).toEqual(step);
      expect(stepLabel(step)).not.toBe("");
    }
    expect(stepLabel(STEPS[0])).toBe("Gaussian Blur");
    expect(stepLabel(STEPS[1])).toBe("Invert Adjustment Layer");
  });

  it("rejects unknown types and invalid values", () => {
    for (const bad of [
      null,
      [],
      "filter",
      { type: "eval" },
      { type: "filter", filterId: "nope", values: {} },
      { type: "filter", filterId: "gaussian-blur", values: { radius: 9999 } },
      { type: "filter", filterId: "gaussian-blur", values: { radius: Number.NaN } },
      { type: "adjustment", adjustment: { type: "levels" } },
      { type: "flip", axis: "diagonal" },
      { type: "align", edge: "toString" },
      { type: "select", op: "constructor" },
      { type: "modifySelection", kind: "feather", radius: 0 },
      { type: "modifySelection", kind: "expand", radius: 10_000 },
      { type: "fill", color: "javascript:alert(1)" },
      { type: "fillLayer" },
    ]) {
      expect(parseStep(bad)).toBeNull();
    }
  });

  it("ignores inherited keys", () => {
    const proto = JSON.parse('{"__proto__": {"type": "clear"}}');
    expect(parseStep(proto)).toBeNull();
    expect(parseStep(Object.create({ type: "clear" }))).toBeNull();
    // Unknown extra keys are dropped.
    expect(parseStep({ type: "clear", __proto__: { evil: 1 }, extra: 1 })).toEqual({
      type: "clear",
    });
  });
});

describe("actions", () => {
  const action: Action = { id: "a1", name: "Everything", steps: STEPS };

  it("round-trips through an exported file with fresh ids", () => {
    const [imported] = parseActionsFile(serializeActions([action]), newId);
    expect(imported.steps).toEqual(STEPS);
    expect(imported.name).toBe("Everything");
    expect(imported.id).not.toBe("a1");
  });

  it("explains why a file is refused", () => {
    const file = (actions: unknown, extra: object = {}) =>
      JSON.stringify({ format: "mylper-actions", version: 1, actions, ...extra });
    const cases: [string, RegExp][] = [
      ["not json", /not a MYLPER actions file/],
      [JSON.stringify({ format: "other", version: 1, actions: [] }), /not a MYLPER/],
      [file([], { version: 2 }), /newer version/],
      [file([{ name: "x", steps: [{ type: "eval" }] }]), /Step 1 of "x"/],
      [file([{ name: "  ", steps: [] }]), /no name/],
      [file([{ name: "x" }]), /no steps/],
      [
        file([{ name: "x", steps: Array(MAX_ACTION_STEPS + 1).fill({ type: "clear" }) }]),
        /more than/,
      ],
      [file(Array(MAX_ACTIONS + 1).fill({ name: "x", steps: [] })), /more than 100/],
      ["x".repeat(3 * 1024 * 1024), /too large/],
    ];
    for (const [text, message] of cases) {
      expect(() => parseActionsFile(text, newId)).toThrow(ActionsFormatError);
      expect(() => parseActionsFile(text, newId)).toThrow(message);
    }
  });

  it("keeps the valid stored actions and fixes ids", () => {
    const stored = parseStoredActions(
      [
        action,
        { id: "a1", name: "Copy", steps: [] },
        { id: "../../x", name: "Odd id", steps: [{ type: "newLayer" }] },
        { name: "Broken", steps: [{ type: "nope" }] },
        42,
      ],
      newId,
    );
    expect(stored.map((a) => a.name)).toEqual(["Everything", "Copy", "Odd id"]);
    expect(new Set(stored.map((a) => a.id)).size).toBe(3);
    expect(stored[2].id).toMatch(/^act-/);
    expect(parseStoredActions({ length: 3 }, newId)).toEqual([]);
  });

  it("normalises names", () => {
    const [a] = parseStoredActions(
      [{ name: `  Two\n  words ${"x".repeat(200)}`, steps: [] }],
      newId,
    );
    expect(a.name.startsWith("Two words x")).toBe(true);
    expect(a.name).toHaveLength(100);
  });
});
