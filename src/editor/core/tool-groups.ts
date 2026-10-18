import type { EditorState, EditorStore } from "./editor-store";
import type { ActionId } from "./shortcuts/shortcuts";
import type { ToolId, ToolSettings } from "./tool-settings";

/**
 * Photoshop-style tool groups (ADR-0027): each toolbar slot holds related tools, shows the last
 * one used, and opens a flyout with the others. A member is a tool, optionally with a settings
 * preset — Burn is the tone tool in burn mode, Rounded Rectangle a rectangle with a radius — so
 * the tools themselves stay as they are.
 */

export interface MemberPreset<K extends keyof ToolSettings = keyof ToolSettings> {
  readonly settings: K;
  /** The settings this member applies when chosen. */
  readonly patch: (current: ToolSettings[K]) => Partial<ToolSettings[K]>;
  /** Whether the current settings are this member's. */
  readonly is: (current: ToolSettings[K]) => boolean;
}

export interface ToolMember {
  readonly id: string;
  readonly label: string;
  readonly tool: ToolId;
  readonly preset?: MemberPreset;
}

export interface ToolGroup {
  readonly id: string;
  /** Plain key: the group's current tool. */
  readonly action: ActionId;
  /** Shift + key: the next tool in the group. */
  readonly next?: ActionId;
  /** The tool the group's key selects until another member is used (default: the first). */
  readonly defaultTool?: ToolId;
  readonly members: readonly ToolMember[];
}

function preset<K extends keyof ToolSettings>(
  settings: K,
  patch: (current: ToolSettings[K]) => Partial<ToolSettings[K]>,
  is: (current: ToolSettings[K]) => boolean,
): MemberPreset {
  return { settings, patch, is } as unknown as MemberPreset;
}

const ROUNDED_RADIUS = 16;

export const TOOL_GROUPS: readonly ToolGroup[] = [
  { id: "move", action: "tool.move", members: [{ id: "move", label: "Move", tool: "move" }] },
  {
    id: "marquee",
    action: "tool.marquee",
    next: "tool.next.marquee",
    members: [
      {
        id: "marquee-rect",
        label: "Rectangular Marquee",
        tool: "marquee",
        preset: preset(
          "marquee",
          () => ({ shape: "rect" as const }),
          (s) => s.shape === "rect",
        ),
      },
      {
        id: "marquee-ellipse",
        label: "Elliptical Marquee",
        tool: "marquee",
        preset: preset(
          "marquee",
          () => ({ shape: "ellipse" as const }),
          (s) => s.shape === "ellipse",
        ),
      },
    ],
  },
  {
    id: "lasso",
    action: "tool.lasso",
    next: "tool.next.lasso",
    members: [
      {
        id: "lasso",
        label: "Lasso",
        tool: "lasso",
        preset: preset(
          "lasso",
          () => ({ kind: "freehand" as const }),
          (s) => s.kind === "freehand",
        ),
      },
      {
        id: "lasso-polygonal",
        label: "Polygonal Lasso",
        tool: "lasso",
        preset: preset(
          "lasso",
          () => ({ kind: "polygonal" as const }),
          (s) => s.kind === "polygonal",
        ),
      },
    ],
  },
  { id: "wand", action: "tool.wand", members: [{ id: "wand", label: "Magic Wand", tool: "wand" }] },
  { id: "crop", action: "tool.crop", members: [{ id: "crop", label: "Crop", tool: "crop" }] },
  {
    id: "eyedropper",
    action: "tool.eyedropper",
    next: "tool.next.eyedropper",
    members: [
      { id: "eyedropper", label: "Eyedropper", tool: "eyedropper" },
      { id: "color-sampler", label: "Color Sampler", tool: "color-sampler" },
      { id: "ruler", label: "Ruler", tool: "ruler" },
    ],
  },
  {
    id: "heal",
    action: "tool.heal",
    next: "tool.next.heal",
    defaultTool: "heal",
    members: [
      { id: "spot-heal", label: "Spot Healing Brush", tool: "spot-heal" },
      { id: "heal", label: "Healing Brush", tool: "heal" },
      { id: "red-eye", label: "Red Eye", tool: "red-eye" },
    ],
  },
  {
    id: "brush",
    action: "tool.brush",
    next: "tool.next.brush",
    members: [
      { id: "brush", label: "Brush", tool: "brush" },
      { id: "pencil", label: "Pencil", tool: "pencil" },
      { id: "color-replace", label: "Color Replacement", tool: "color-replace" },
    ],
  },
  {
    id: "clone",
    action: "tool.clone",
    members: [{ id: "clone", label: "Clone Stamp", tool: "clone" }],
  },
  {
    id: "eraser",
    action: "tool.eraser",
    next: "tool.next.eraser",
    members: [
      { id: "eraser", label: "Eraser", tool: "eraser" },
      { id: "bg-eraser", label: "Background Eraser", tool: "bg-eraser" },
      { id: "magic-eraser", label: "Magic Eraser", tool: "magic-eraser" },
    ],
  },
  {
    id: "gradient",
    action: "tool.gradient",
    next: "tool.next.gradient",
    members: [
      { id: "gradient", label: "Gradient", tool: "gradient" },
      { id: "bucket", label: "Paint Bucket", tool: "bucket" },
    ],
  },
  {
    id: "focus",
    action: "tool.focus",
    next: "tool.next.focus",
    members: (["blur", "sharpen", "smudge"] as const).map((mode) => ({
      id: mode,
      label: { blur: "Blur", sharpen: "Sharpen", smudge: "Smudge" }[mode],
      tool: "focus" as const,
      preset: preset(
        "focus",
        () => ({ mode }),
        (s) => s.mode === mode,
      ),
    })),
  },
  {
    id: "tone",
    action: "tool.tone",
    next: "tool.next.tone",
    members: [
      ...(["dodge", "burn"] as const).map((mode) => ({
        id: mode,
        label: mode === "dodge" ? "Dodge" : "Burn",
        tool: "tone" as const,
        preset: preset(
          "tone",
          () => ({ mode }),
          (s) => s.mode === mode,
        ),
      })),
      {
        id: "sponge",
        label: "Sponge",
        tool: "tone" as const,
        preset: preset(
          "tone",
          () => ({ mode: "sponge" as const }),
          (s) => s.mode === "sponge",
        ),
      },
    ],
  },
  { id: "text", action: "tool.text", members: [{ id: "text", label: "Type", tool: "text" }] },
  {
    id: "pen",
    action: "tool.pen",
    next: "tool.next.pen",
    members: [
      { id: "pen", label: "Pen", tool: "pen" },
      { id: "anchor-add", label: "Add Anchor Point", tool: "anchor-add" },
      { id: "anchor-delete", label: "Delete Anchor Point", tool: "anchor-delete" },
      { id: "anchor-convert", label: "Convert Point", tool: "anchor-convert" },
    ],
  },
  {
    id: "path-select",
    action: "tool.pathSelect",
    next: "tool.next.pathSelect",
    defaultTool: "path-select",
    members: [
      { id: "path-move", label: "Path Selection", tool: "path-move" },
      { id: "path-select", label: "Direct Selection", tool: "path-select" },
    ],
  },
  {
    id: "shape",
    action: "tool.shape",
    next: "tool.next.shape",
    members: [
      {
        id: "shape-rect",
        label: "Rectangle",
        tool: "shape",
        preset: preset(
          "shape",
          () => ({ kind: "rect" as const, cornerRadius: 0 }),
          (s) => s.kind === "rect" && s.cornerRadius === 0,
        ),
      },
      {
        id: "shape-rounded",
        label: "Rounded Rectangle",
        tool: "shape",
        preset: preset(
          "shape",
          (s) => ({
            kind: "rect" as const,
            cornerRadius: s.cornerRadius > 0 ? s.cornerRadius : ROUNDED_RADIUS,
          }),
          (s) => s.kind === "rect" && s.cornerRadius > 0,
        ),
      },
      ...(["ellipse", "polygon", "line"] as const).map((kind) => ({
        id: `shape-${kind}`,
        label: { ellipse: "Ellipse", polygon: "Polygon", line: "Line" }[kind],
        tool: "shape" as const,
        preset: preset(
          "shape",
          () => ({ kind }),
          (s) => s.kind === kind,
        ),
      })),
    ],
  },
  { id: "hand", action: "tool.hand", members: [{ id: "hand", label: "Hand", tool: "hand" }] },
  { id: "zoom", action: "tool.zoom", members: [{ id: "zoom", label: "Zoom", tool: "zoom" }] },
];

export function groupOfTool(tool: ToolId): ToolGroup | undefined {
  return TOOL_GROUPS.find((g) => g.members.some((m) => m.tool === tool));
}

/** The tool a group's key selects: the last one used in it, or its default. */
export function rememberedTool(group: ToolGroup, state: EditorState): ToolId {
  return state.toolMemory[group.id] ?? group.defaultTool ?? group.members[0].tool;
}

/** Whether the editor is currently using this member (its tool, with its preset's settings). */
export function isMemberActive(member: ToolMember, state: EditorState): boolean {
  if (state.activeTool !== member.tool) return false;
  const p = member.preset;
  return !p || p.is(state.toolSettings[p.settings] as never);
}

/** The member a group shows: the active one, else the one its remembered tool and settings match. */
export function shownMember(group: ToolGroup, state: EditorState, remembered: ToolId): ToolMember {
  const active = group.members.find((m) => isMemberActive(m, state));
  if (active) return active;
  const candidates = group.members.filter((m) => m.tool === remembered);
  return (
    candidates.find(
      (m) => !m.preset || m.preset.is(state.toolSettings[m.preset.settings] as never),
    ) ??
    candidates[0] ??
    group.members[0]
  );
}

/** Choose a member: apply its preset, then switch to its tool. */
export function activateMember(store: EditorStore, member: ToolMember): void {
  const p = member.preset;
  if (p) {
    const current = store.getState().toolSettings[p.settings];
    store.updateToolSettings(p.settings, p.patch(current as never) as never);
  }
  store.setActiveTool(member.tool);
}

/** The member after the shown one (Shift + the group's key). */
export function nextMember(group: ToolGroup, state: EditorState, remembered: ToolId): ToolMember {
  const shown = shownMember(group, state, remembered);
  const i = group.members.indexOf(shown);
  return group.members[(i + 1) % group.members.length];
}
