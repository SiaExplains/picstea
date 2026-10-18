import { describe, expect, it } from "vitest";
import { EditorStore } from "./editor-store";
import {
  activateMember,
  groupOfTool,
  isMemberActive,
  nextMember,
  rememberedTool,
  shownMember,
  TOOL_GROUPS,
} from "./tool-groups";
import { measureLine } from "../tools/measure/measure-tools";
import { polygonPath } from "../tools/shape/shape-tool";

const group = (id: string) => TOOL_GROUPS.find((g) => g.id === id)!;

describe("toolbar groups", () => {
  it("cover every tool once, with unique member ids", () => {
    const ids = TOOL_GROUPS.flatMap((g) => g.members.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(groupOfTool("bucket")?.id).toBe("gradient");
    expect(groupOfTool("anchor-convert")?.id).toBe("pen");
  });

  it("presets switch settings: Burn is the tone tool in burn mode", () => {
    const store = new EditorStore();
    const tone = group("tone");
    const burn = tone.members.find((m) => m.id === "burn")!;
    activateMember(store, burn);
    const state = store.getState();
    expect(state.activeTool).toBe("tone");
    expect(state.toolSettings.tone.mode).toBe("burn");
    expect(isMemberActive(burn, state)).toBe(true);
    expect(shownMember(tone, state, rememberedTool(tone, state)).id).toBe("burn");
  });

  it("the group key returns to the last tool used; Shift cycles in order", () => {
    const store = new EditorStore();
    const heal = group("heal");
    // Until another member is used, J keeps selecting the Healing Brush.
    expect(rememberedTool(heal, store.getState())).toBe("heal");
    store.setActiveTool("red-eye");
    store.setActiveTool("move");
    expect(rememberedTool(heal, store.getState())).toBe("red-eye");
    const next = nextMember(heal, store.getState(), rememberedTool(heal, store.getState()));
    expect(next.id).toBe("spot-heal");
  });

  it("Rounded Rectangle keeps a custom radius and Rectangle resets it", () => {
    const store = new EditorStore();
    const shapes = group("shape");
    activateMember(
      store,
      shapes.members.find((m) => m.id === "shape-rounded")!,
    );
    expect(store.getState().toolSettings.shape.cornerRadius).toBe(16);
    store.updateToolSettings("shape", { cornerRadius: 30 });
    activateMember(
      store,
      shapes.members.find((m) => m.id === "shape-rounded")!,
    );
    expect(store.getState().toolSettings.shape.cornerRadius).toBe(30);
    activateMember(
      store,
      shapes.members.find((m) => m.id === "shape-rect")!,
    );
    expect(store.getState().toolSettings.shape.cornerRadius).toBe(0);
  });
});

describe("Ruler and Polygon geometry", () => {
  it("measures length and a counter-clockwise angle", () => {
    const m = measureLine({ x: 0, y: 0 }, { x: 30, y: -40 });
    expect(m.length).toBe(50);
    expect(m.angle).toBeCloseTo(53.13, 1);
    expect(measureLine({ x: 0, y: 0 }, { x: -10, y: 0 }).angle).toBe(180);
  });

  it("builds a closed regular polygon inside its box, first corner at the top", () => {
    const path = polygonPath({ x: 0, y: 0, width: 100, height: 100 }, 5);
    const anchors = path.subpaths[0].anchors;
    expect(path.subpaths[0].closed).toBe(true);
    expect(anchors).toHaveLength(5);
    expect(anchors[0]).toMatchObject({ x: 50, y: 0 });
    for (const a of anchors) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(100);
      expect(a.y).toBeLessThanOrEqual(100);
    }
    expect(polygonPath({ x: 0, y: 0, width: 10, height: 10 }, 1).subpaths[0].anchors).toHaveLength(
      3,
    );
  });
});
