"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { SELECTION_MODES, type SelectionMode } from "@/editor/selection/ops";
import { FONT_FAMILIES, type FontFamily, type ShapeKind } from "@/editor/core/document/types";
import { isDirty, selectedLayerIds, type ToolId } from "@/editor/core/editor-store";
import { primaryBinding } from "@/editor/core/shortcuts/shortcuts";
import {
  activateMember,
  isMemberActive,
  rememberedTool,
  shownMember,
  TOOL_GROUPS,
  type ToolGroup,
} from "@/editor/core/tool-groups";
import { ContextMenu, type ContextMenuEntry } from "./ContextMenu";
import { measureLine } from "@/editor/tools/measure/measure-tools";
import { useActiveSession, useController, useEditorState, useIsMac } from "./editor-context";
import styles from "./editor.module.css";
import {
  BucketIcon,
  EyedropperIcon,
  GradientIcon,
  LassoIcon,
  MarqueeIcon,
  PencilIcon,
  WandIcon,
  BrushIcon,
  CloseIcon,
  CropIcon,
  EraserIcon,
  CloneIcon,
  HealIcon,
  ToneIcon,
  HandIcon,
  MoveIcon,
  PathSelectIcon,
  PenIcon,
  SwapIcon,
  TextIcon,
  ZoomIcon,
  EllipseMarqueeIcon,
  PolygonLassoIcon,
  SamplerIcon,
  RulerIcon,
  SpotHealIcon,
  RedEyeIcon,
  ColorReplaceIcon,
  BackgroundEraserIcon,
  MagicEraserIcon,
  FocusIcon,
  SharpenIcon,
  SmudgeIcon,
  BurnIcon,
  SpongeIcon,
  PenAddIcon,
  PenDeleteIcon,
  ConvertPointIcon,
  PathMoveIcon,
  RectShapeIcon,
  RoundedRectIcon,
  EllipseShapeIcon,
  PolygonShapeIcon,
  LineShapeIcon,
  ResetColorsIcon,
} from "./icons";
import type { UiAction, UiActionId } from "./use-editor-actions";
import { ArrangeButtons } from "./ArrangeButtons";

/** Icon for every toolbar group member (ADR-0027). */
const MEMBER_ICONS: Record<string, React.ReactNode> = {
  move: <MoveIcon size={18} />,
  "marquee-rect": <MarqueeIcon size={18} />,
  "marquee-ellipse": <EllipseMarqueeIcon size={18} />,
  lasso: <LassoIcon size={18} />,
  "lasso-polygonal": <PolygonLassoIcon size={18} />,
  wand: <WandIcon size={18} />,
  crop: <CropIcon size={18} />,
  eyedropper: <EyedropperIcon size={18} />,
  "color-sampler": <SamplerIcon size={18} />,
  ruler: <RulerIcon size={18} />,
  "spot-heal": <SpotHealIcon size={18} />,
  heal: <HealIcon size={18} />,
  "red-eye": <RedEyeIcon size={18} />,
  brush: <BrushIcon size={18} />,
  pencil: <PencilIcon size={18} />,
  "color-replace": <ColorReplaceIcon size={18} />,
  clone: <CloneIcon size={18} />,
  eraser: <EraserIcon size={18} />,
  "bg-eraser": <BackgroundEraserIcon size={18} />,
  "magic-eraser": <MagicEraserIcon size={18} />,
  gradient: <GradientIcon size={18} />,
  bucket: <BucketIcon size={18} />,
  blur: <FocusIcon size={18} />,
  sharpen: <SharpenIcon size={18} />,
  smudge: <SmudgeIcon size={18} />,
  dodge: <ToneIcon size={18} />,
  burn: <BurnIcon size={18} />,
  sponge: <SpongeIcon size={18} />,
  text: <TextIcon size={18} />,
  pen: <PenIcon size={18} />,
  "anchor-add": <PenAddIcon size={18} />,
  "anchor-delete": <PenDeleteIcon size={18} />,
  "anchor-convert": <ConvertPointIcon size={18} />,
  "path-move": <PathMoveIcon size={18} />,
  "path-select": <PathSelectIcon size={18} />,
  "shape-rect": <RectShapeIcon size={18} />,
  "shape-rounded": <RoundedRectIcon size={18} />,
  "shape-ellipse": <EllipseShapeIcon size={18} />,
  "shape-polygon": <PolygonShapeIcon size={18} />,
  "shape-line": <LineShapeIcon size={18} />,
  hand: <HandIcon size={18} />,
  zoom: <ZoomIcon size={18} />,
};

/** Hold the pointer this long on a group to open its flyout (as in Photoshop). */
const LONG_PRESS_MS = 450;

function ToolGroupButton({ group }: { group: ToolGroup }) {
  const controller = useController();
  const state = useEditorState((s) => s);
  const isMac = useIsMac();
  const [flyout, setFlyout] = useState<{ x: number; y: number } | null>(null);
  const press = useRef<number | null>(null);
  const opened = useRef(false);
  const member = shownMember(group, state, rememberedTool(group, state));
  const shortcut = primaryBinding(group.action, isMac);
  const many = group.members.length > 1;
  const closeFlyout = useCallback(() => setFlyout(null), []);

  const open = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setFlyout({ x: r.right + 4, y: r.top });
  };
  const clearPress = () => {
    if (press.current !== null) window.clearTimeout(press.current);
    press.current = null;
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.toolButton} ${many ? styles.toolGroup : ""}`}
        aria-pressed={isMemberActive(member, state)}
        aria-label={`${member.label} tool`}
        aria-haspopup={many ? "menu" : undefined}
        aria-expanded={many ? !!flyout : undefined}
        aria-keyshortcuts={shortcut || undefined}
        title={`${member.label} (${shortcut})${many ? " · right-click or hold for more" : ""}`}
        data-tool-group={group.id}
        onPointerDown={(e) => {
          if (!many || e.button !== 0) return;
          opened.current = false;
          const el = e.currentTarget;
          press.current = window.setTimeout(() => {
            opened.current = true;
            open(el);
          }, LONG_PRESS_MS);
        }}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onClick={() => {
          // A long press opened the flyout instead.
          if (opened.current) return;
          activateMember(controller.store, member);
        }}
        onContextMenu={(e) => {
          if (!many) return;
          e.preventDefault();
          open(e.currentTarget);
        }}
        onKeyDown={(e) => {
          if (!many) return;
          if (
            e.key === "ArrowRight" ||
            e.key === "ContextMenu" ||
            (e.shiftKey && e.key === "F10")
          ) {
            e.preventDefault();
            e.stopPropagation();
            open(e.currentTarget);
          }
        }}
      >
        {MEMBER_ICONS[member.id]}
      </button>
      {flyout && (
        <ContextMenu
          x={flyout.x}
          y={flyout.y}
          label={`${member.label} tools`}
          onClose={closeFlyout}
          items={group.members.map((m): ContextMenuEntry => ({
            kind: "item",
            label: m.label,
            enabled: true,
            checked: m === member,
            icon: <span className={styles.flyoutIcon}>{MEMBER_ICONS[m.id]}</span>,
            shortcut,
            run: () => activateMember(controller.store, m),
          }))}
        />
      )}
    </>
  );
}

/** Only implemented tools are shown — no placeholder buttons (docs/15 rule 6). */
export function Toolbar({
  actions,
  onEditColor,
}: {
  actions: Record<UiActionId, UiAction>;
  onEditColor: (which: "foreground" | "background") => void;
}) {
  const colors = useEditorState((s) => s.colors);
  return (
    <nav className={styles.toolbar} aria-label="Tools">
      {TOOL_GROUPS.map((group) => (
        <ToolGroupButton key={group.id} group={group} />
      ))}
      <div className={styles.toolSeparator} role="separator" />
      <div className={styles.swatches}>
        {(["foreground", "background"] as const).map((which) => (
          <button
            key={which}
            type="button"
            className={`${styles.swatch} ${which === "foreground" ? styles.swatchForeground : styles.swatchBackground}`}
            style={{ background: colors[which] }}
            aria-label={which === "foreground" ? "Foreground colour" : "Background colour"}
            title={`${which === "foreground" ? "Foreground" : "Background"} colour ${colors[which]}`}
            data-color={colors[which]}
            onClick={() => onEditColor(which)}
          />
        ))}
      </div>
      <div className={styles.swatchButtons}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`${actions["colors.reset"].label} (D)`}
          title="Default colours: black and white (D)"
          onClick={actions["colors.reset"].run}
        >
          <ResetColorsIcon size={12} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`${actions["colors.swap"].label} (X)`}
          title="Swap colours (X)"
          onClick={actions["colors.swap"].run}
        >
          <SwapIcon size={14} />
        </button>
      </div>
    </nav>
  );
}

function NumberOption({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.optionGroup}>
      {label}
      <input
        className={`${styles.input} ${styles.numberInput}`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n))
            onChange(Math.min(max, Math.max(min, n)));
        }}
      />
      {suffix}
    </label>
  );
}

function BrushOptions({ tool }: { tool: "brush" | "pencil" | "eraser" }) {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings[tool]);
  const set = (patch: Partial<typeof settings>) => controller.store.updateToolSettings(tool, patch);
  return (
    <>
      <NumberOption
        label="Size"
        value={settings.size}
        min={1}
        max={1000}
        suffix="px"
        onChange={(size) => set({ size })}
      />
      {tool !== "pencil" && (
        <NumberOption
          label="Hardness"
          value={Math.round(settings.hardness * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(v) => set({ hardness: v / 100 })}
        />
      )}
      <NumberOption
        label="Opacity"
        value={Math.round(settings.opacity * 100)}
        min={1}
        max={100}
        suffix="%"
        onChange={(v) => set({ opacity: v / 100 })}
      />
      <span>
        {tool === "eraser"
          ? "[ and ] change size"
          : "[ and ] change size · Alt-click picks a colour"}
      </span>
    </>
  );
}

/** Size and hardness, shared by the retouching tools. */
function TipOptions({
  tool,
}: {
  tool: "clone" | "heal" | "tone" | "focus" | "spot-heal" | "bg-eraser" | "color-replace";
}) {
  const controller = useController();
  const size = useEditorState((s) => s.toolSettings[tool].size);
  const hardness = useEditorState((s) => s.toolSettings[tool].hardness);
  return (
    <>
      <NumberOption
        label="Size"
        value={size}
        min={1}
        max={1000}
        suffix="px"
        onChange={(v) => controller.store.updateToolSettings(tool, { size: v })}
      />
      <NumberOption
        label="Hardness"
        value={Math.round(hardness * 100)}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => controller.store.updateToolSettings(tool, { hardness: v / 100 })}
      />
    </>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function SourceBrushOptions({ tool }: { tool: "clone" | "heal" }) {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings[tool]);
  const set = (patch: Partial<typeof settings>) => controller.store.updateToolSettings(tool, patch);
  return (
    <>
      <TipOptions tool={tool} />
      {tool === "clone" && (
        <NumberOption
          label="Opacity"
          value={Math.round(settings.opacity * 100)}
          min={1}
          max={100}
          suffix="%"
          onChange={(v) => set({ opacity: v / 100 })}
        />
      )}
      <label className={styles.optionGroup}>
        <input
          type="checkbox"
          checked={settings.aligned}
          onChange={(e) => set({ aligned: e.target.checked })}
        />
        Aligned
      </label>
      <label className={styles.optionGroup}>
        Sample
        <select
          className={styles.input}
          value={settings.sample}
          onChange={(e) => set({ sample: e.target.value === "all" ? "all" : "current" })}
        >
          <option value="current">Current layer</option>
          <option value="all">All layers</option>
        </select>
      </label>
      <span>Alt-click sets the source · [ and ] change size</span>
    </>
  );
}

function ToneOptions() {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings.tone);
  const set = (patch: Partial<typeof settings>) =>
    controller.store.updateToolSettings("tone", patch);
  return (
    <>
      <Segmented
        label="Tone mode"
        value={settings.mode}
        options={[
          ["dodge", "Dodge"],
          ["burn", "Burn"],
          ["sponge", "Sponge"],
        ]}
        onChange={(mode) => set({ mode })}
      />
      <TipOptions tool="tone" />
      {settings.mode === "sponge" ? (
        <>
          <label className={styles.optionGroup}>
            Mode
            <select
              className={styles.input}
              value={settings.sponge}
              onChange={(e) =>
                set({ sponge: e.target.value === "saturate" ? "saturate" : "desaturate" })
              }
            >
              <option value="desaturate">Desaturate</option>
              <option value="saturate">Saturate</option>
            </select>
          </label>
          <NumberOption
            label="Flow"
            value={Math.round(settings.flow * 100)}
            min={1}
            max={100}
            suffix="%"
            onChange={(v) => set({ flow: v / 100 })}
          />
        </>
      ) : (
        <>
          <label className={styles.optionGroup}>
            Range
            <select
              className={styles.input}
              value={settings.range}
              onChange={(e) =>
                set({
                  range:
                    e.target.value === "shadows"
                      ? "shadows"
                      : e.target.value === "highlights"
                        ? "highlights"
                        : "midtones",
                })
              }
            >
              <option value="shadows">Shadows</option>
              <option value="midtones">Midtones</option>
              <option value="highlights">Highlights</option>
            </select>
          </label>
          <NumberOption
            label="Exposure"
            value={Math.round(settings.exposure * 100)}
            min={1}
            max={100}
            suffix="%"
            onChange={(v) => set({ exposure: v / 100 })}
          />
        </>
      )}
    </>
  );
}

function FocusOptions() {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings.focus);
  const set = (patch: Partial<typeof settings>) =>
    controller.store.updateToolSettings("focus", patch);
  return (
    <>
      <Segmented
        label="Focus mode"
        value={settings.mode}
        options={[
          ["blur", "Blur"],
          ["sharpen", "Sharpen"],
          ["smudge", "Smudge"],
        ]}
        onChange={(mode) => set({ mode })}
      />
      <TipOptions tool="focus" />
      <NumberOption
        label="Strength"
        value={Math.round(settings.strength * 100)}
        min={1}
        max={100}
        suffix="%"
        onChange={(v) => set({ strength: v / 100 })}
      />
    </>
  );
}

const MODE_LABELS: Record<SelectionMode, string> = {
  replace: "New",
  add: "Add",
  subtract: "Subtract",
  intersect: "Intersect",
};

function SelectionModeOption({ tool }: { tool: "marquee" | "lasso" | "wand" }) {
  const controller = useController();
  const mode = useEditorState((s) => s.toolSettings[tool].mode);
  return (
    <div className={styles.segmented} role="group" aria-label="Selection mode">
      {SELECTION_MODES.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => controller.store.updateToolSettings(tool, { mode: m })}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

function SegmentedOption<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.optionGroup}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function MarqueeOptions() {
  const controller = useController();
  const shape = useEditorState((s) => s.toolSettings.marquee.shape);
  return (
    <>
      <SegmentedOption
        label="Marquee shape"
        value={shape}
        options={[
          { id: "rect", label: "Rectangle" },
          { id: "ellipse", label: "Ellipse" },
        ]}
        onChange={(v) => controller.store.updateToolSettings("marquee", { shape: v })}
      />
      <SelectionModeOption tool="marquee" />
      <span>Shift adds · Alt subtracts · drag inside to move</span>
    </>
  );
}

function LassoOptions() {
  const controller = useController();
  const kind = useEditorState((s) => s.toolSettings.lasso.kind);
  return (
    <>
      <SegmentedOption
        label="Lasso type"
        value={kind}
        options={[
          { id: "freehand", label: "Freehand" },
          { id: "polygonal", label: "Polygonal" },
        ]}
        onChange={(v) => controller.store.updateToolSettings("lasso", { kind: v })}
      />
      <SelectionModeOption tool="lasso" />
      <span>
        {kind === "polygonal"
          ? "Click to add points · double-click or Enter closes"
          : "Drag around an area"}
      </span>
    </>
  );
}

function FloodOptions({ tool }: { tool: "wand" | "bucket" | "magic-eraser" }) {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings[tool]);
  const set = (patch: Partial<typeof settings>) => controller.store.updateToolSettings(tool, patch);
  return (
    <>
      <NumberOption
        label="Tolerance"
        value={settings.tolerance}
        min={0}
        max={255}
        onChange={(tolerance) => set({ tolerance })}
      />
      <CheckOption
        label="Contiguous"
        checked={settings.contiguous}
        onChange={(contiguous) => set({ contiguous })}
      />
      <CheckOption
        label="Sample all layers"
        checked={settings.sampleAll}
        onChange={(sampleAll) => set({ sampleAll })}
      />
      {tool === "wand" && <SelectionModeOption tool="wand" />}
    </>
  );
}

/** Background Eraser and Color Replacement: brush tip plus colour tolerance. */
function SampledBrushOptions({ tool }: { tool: "bg-eraser" | "color-replace" }) {
  const controller = useController();
  const tolerance = useEditorState((s) => s.toolSettings[tool].tolerance);
  return (
    <>
      <TipOptions tool={tool} />
      <NumberOption
        label="Tolerance"
        value={tolerance}
        min={0}
        max={255}
        onChange={(v) => controller.store.updateToolSettings(tool, { tolerance: v })}
      />
      <span>
        {tool === "bg-eraser"
          ? "Erases colours like the one under the first dab"
          : "Paints the foreground colour over colours like the one under the first dab, keeping their shading"}
      </span>
    </>
  );
}

function RedEyeOptions() {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings["red-eye"]);
  const set = (patch: Partial<typeof settings>) =>
    controller.store.updateToolSettings("red-eye", patch);
  return (
    <>
      <NumberOption
        label="Pupil size"
        value={settings.size}
        min={2}
        max={500}
        suffix="px"
        onChange={(size) => set({ size })}
      />
      <NumberOption
        label="Darken"
        value={Math.round(settings.darken * 100)}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => set({ darken: v / 100 })}
      />
      <span>Click or paint over red pupils</span>
    </>
  );
}

const hex2 = (n: number) => n.toString(16).padStart(2, "0");

/** Color Sampler readout: each point's current colour, kept live while you edit. */
function SamplerOptions() {
  const controller = useController();
  const samplers = useEditorState((s) => s.measure.samplers);
  // Re-read the colours whenever the document changes.
  useActiveSession();
  return (
    <>
      {samplers.length === 0 && <span>Click to place up to four colour sample points</span>}
      <ul className={styles.samplerList} aria-label="Colour samples">
        {samplers.map((p, i) => {
          const c = controller.sampleColor(p.x, p.y);
          const label = c ? `#${hex2(c[0])}${hex2(c[1])}${hex2(c[2])}` : "…";
          return (
            <li key={i}>
              <span
                className={styles.samplerSwatch}
                style={{ background: c ? label : "transparent" }}
              />
              <strong>#{i + 1}</strong> {c ? `R ${c[0]} G ${c[1]} B ${c[2]}` : "loading"}{" "}
              <code>{label}</code>
            </li>
          );
        })}
      </ul>
      {samplers.length > 0 && (
        <button
          type="button"
          className={styles.button}
          onClick={() => controller.store.setMeasure({ samplers: [] })}
        >
          Clear
        </button>
      )}
      {samplers.length > 0 && <span>Drag a point to move it · Alt-click removes it</span>}
    </>
  );
}

function RulerOptions() {
  const controller = useController();
  const ruler = useEditorState((s) => s.measure.ruler);
  if (!ruler) return <span>Drag to measure a distance and an angle · Shift snaps to 45°</span>;
  const m = measureLine(ruler.from, ruler.to);
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  return (
    <>
      <output className={styles.rulerReadout} aria-label="Measurement">
        X {f(m.x)} · Y {f(m.y)} · W {f(m.width)} · H {f(m.height)} · A {f(m.angle)}° · L{" "}
        {f(m.length)} px
      </output>
      <button
        type="button"
        className={styles.button}
        onClick={() => controller.store.setMeasure({ ruler: null })}
      >
        Clear
      </button>
    </>
  );
}

function GradientOptions() {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings.gradient);
  const set = (patch: Partial<typeof settings>) =>
    controller.store.updateToolSettings("gradient", patch);
  return (
    <>
      <SegmentedOption
        label="Gradient type"
        value={settings.kind}
        options={[
          { id: "linear", label: "Linear" },
          { id: "radial", label: "Radial" },
        ]}
        onChange={(kind) => set({ kind })}
      />
      <SegmentedOption
        label="Gradient colours"
        value={settings.to}
        options={[
          { id: "background", label: "To background" },
          { id: "transparent", label: "To transparent" },
        ]}
        onChange={(to) => set({ to })}
      />
      <NumberOption
        label="Opacity"
        value={Math.round(settings.opacity * 100)}
        min={1}
        max={100}
        suffix="%"
        onChange={(v) => set({ opacity: v / 100 })}
      />
      <span>Drag to draw · Shift snaps to 45°</span>
    </>
  );
}

function EyedropperOptions() {
  const controller = useController();
  const sampleAll = useEditorState((s) => s.toolSettings.eyedropper.sampleAll);
  return (
    <>
      <CheckOption
        label="Sample all layers"
        checked={sampleAll}
        onChange={(v) => controller.store.updateToolSettings("eyedropper", { sampleAll: v })}
      />
      <span>Click sets the foreground colour · Alt-click the background colour</span>
    </>
  );
}

function ShapeOptions() {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings.shape);
  const set = (patch: Partial<typeof settings>) =>
    controller.store.updateToolSettings("shape", patch);
  const kinds: { id: Exclude<ShapeKind, "path"> | "polygon"; label: string }[] = [
    { id: "rect", label: "Rectangle" },
    { id: "ellipse", label: "Ellipse" },
    { id: "polygon", label: "Polygon" },
    { id: "line", label: "Line" },
  ];
  return (
    <>
      <div className={styles.segmented} role="group" aria-label="Shape">
        {kinds.map((k) => (
          <button
            key={k.id}
            type="button"
            aria-pressed={settings.kind === k.id}
            onClick={() => set({ kind: k.id })}
          >
            {k.label}
          </button>
        ))}
      </div>
      {settings.kind !== "line" && (
        <label className={styles.optionGroup}>
          <input
            type="checkbox"
            checked={settings.fillEnabled}
            onChange={(e) => set({ fillEnabled: e.target.checked })}
          />
          Fill
          <input
            type="color"
            aria-label="Fill colour"
            value={settings.fill}
            onChange={(e) => set({ fill: e.target.value })}
          />
        </label>
      )}
      <label className={styles.optionGroup}>
        <input
          type="checkbox"
          checked={settings.strokeEnabled || settings.kind === "line"}
          disabled={settings.kind === "line"}
          onChange={(e) => set({ strokeEnabled: e.target.checked })}
        />
        Stroke
        <input
          type="color"
          aria-label="Stroke colour"
          value={settings.stroke}
          onChange={(e) => set({ stroke: e.target.value, strokeEnabled: true })}
        />
      </label>
      <NumberOption
        label="Width"
        value={settings.strokeWidth}
        min={1}
        max={500}
        suffix="px"
        onChange={(strokeWidth) => set({ strokeWidth })}
      />
      {settings.kind === "polygon" && (
        <NumberOption
          label="Sides"
          value={settings.sides}
          min={3}
          max={64}
          onChange={(sides) => set({ sides })}
        />
      )}
      {settings.kind === "rect" && (
        <NumberOption
          label="Radius"
          value={settings.cornerRadius}
          min={0}
          max={5000}
          suffix="px"
          onChange={(cornerRadius) => set({ cornerRadius })}
        />
      )}
      <span>Shift: square · Alt: from centre</span>
    </>
  );
}

function TextOptions() {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings.text);
  const edit = useSyncExternalStore(
    controller.textEdit.subscribe,
    controller.textEdit.get,
    () => null,
  );
  // While typing, options change the text being edited; otherwise they set the defaults.
  const style = edit ? edit.style : settings;
  const set = (patch: Partial<typeof settings>) => {
    controller.store.updateToolSettings("text", patch);
    if (edit) controller.updateTextDraft({ style: patch });
  };
  return (
    <>
      <label className={styles.optionGroup}>
        Font
        <select
          className={styles.select}
          value={style.fontFamily}
          onChange={(e) => set({ fontFamily: e.target.value as FontFamily })}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f === "system-ui" ? "System" : f}
            </option>
          ))}
        </select>
      </label>
      <NumberOption
        label="Size"
        value={style.fontSize}
        min={1}
        max={2000}
        suffix="px"
        onChange={(fontSize) => set({ fontSize })}
      />
      <div className={styles.segmented} role="group" aria-label="Style">
        <button
          type="button"
          aria-pressed={style.fontWeight === 700}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => set({ fontWeight: style.fontWeight === 700 ? 400 : 700 })}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          aria-pressed={style.italic}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => set({ italic: !style.italic })}
        >
          <i>I</i>
        </button>
      </div>
      <div className={styles.segmented} role="group" aria-label="Alignment">
        {(["left", "center", "right"] as const).map((align) => (
          <button
            key={align}
            type="button"
            aria-pressed={style.align === align}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => set({ align })}
          >
            {align[0].toUpperCase() + align.slice(1)}
          </button>
        ))}
      </div>
      <span>
        {edit
          ? "⌘/Ctrl+Enter or click outside to finish · Esc cancels"
          : "Click on the canvas to add text"}
      </span>
    </>
  );
}

function CropOptions() {
  const controller = useController();
  return (
    <>
      <span>Drag the handles or draw a new box</span>
      <button
        type="button"
        className={`${styles.button} ${styles.primary}`}
        onClick={() => controller.tools.applyCrop()}
      >
        Apply crop
      </button>
      <button type="button" className={styles.button} onClick={() => controller.tools.resetCrop()}>
        Reset
      </button>
      <span>Enter applies · Esc resets</span>
    </>
  );
}

function MoveOptions({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const controller = useController();
  const autoSelect = useEditorState((s) => s.toolSettings.move.autoSelect);
  const count = selectedLayerIds(useActiveSession()).length;
  return (
    <>
      <label className={styles.optionGroup}>
        <input
          type="checkbox"
          checked={autoSelect}
          onChange={(e) =>
            controller.store.updateToolSettings("move", { autoSelect: e.target.checked })
          }
        />
        Auto-select layer
      </label>
      <button
        type="button"
        className={styles.button}
        disabled={!actions["layer.flipH"].enabled}
        onClick={actions["layer.flipH"].run}
      >
        Flip H
      </button>
      <button
        type="button"
        className={styles.button}
        disabled={!actions["layer.flipV"].enabled}
        onClick={actions["layer.flipV"].run}
      >
        Flip V
      </button>
      {count > 1 ? (
        <ArrangeButtons count={count} />
      ) : (
        <span>
          Drag handles to scale (Shift keeps ratio) · drag outside a corner to rotate · Shift-click
          adds a layer
        </span>
      )}
    </>
  );
}

/** Work-path actions shared by the Pen and Direct Selection options. */
function PathButtons({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const ids: UiActionId[] = ["path.makeSelection", "path.vectorMask", "path.shape", "path.delete"];
  const labels: Partial<Record<UiActionId, string>> = {
    "path.makeSelection": "Selection",
    "path.vectorMask": "Mask",
    "path.shape": "Shape",
    "path.delete": "Delete Path",
  };
  return (
    <div className={styles.segmented} role="group" aria-label="Work path">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          disabled={!actions[id].enabled}
          onClick={actions[id].run}
          title={actions[id].label}
        >
          {labels[id]}
        </button>
      ))}
    </div>
  );
}

function PenOptions({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const controller = useController();
  const mode = useEditorState((s) => s.toolSettings.pen.mode);
  return (
    <>
      <div className={styles.segmented} role="group" aria-label="Pen mode">
        {(["shape", "path"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => controller.store.updateToolSettings("pen", { mode: m })}
          >
            {m === "shape" ? "Shape" : "Path"}
          </button>
        ))}
      </div>
      <PathButtons actions={actions} />
      <span>
        Click for corners, drag for curves · click the first point to close · Enter finishes
      </span>
    </>
  );
}

const TOOL_LABELS: Record<ToolId, string> = {
  move: "Move",
  marquee: "Marquee",
  lasso: "Lasso",
  wand: "Magic Wand",
  crop: "Crop",
  eyedropper: "Eyedropper",
  brush: "Brush",
  pencil: "Pencil",
  eraser: "Eraser",
  clone: "Clone Stamp",
  heal: "Healing Brush",
  tone: "Dodge · Burn · Sponge",
  focus: "Blur · Sharpen · Smudge",
  bucket: "Paint Bucket",
  gradient: "Gradient",
  shape: "Shape",
  pen: "Pen",
  "path-select": "Direct Selection",
  text: "Text",
  hand: "Hand",
  zoom: "Zoom",
  "spot-heal": "Spot Healing Brush",
  "red-eye": "Red Eye",
  "bg-eraser": "Background Eraser",
  "magic-eraser": "Magic Eraser",
  "color-replace": "Color Replacement",
  "color-sampler": "Color Sampler",
  ruler: "Ruler",
  "path-move": "Path Selection",
  "anchor-add": "Add Anchor Point",
  "anchor-delete": "Delete Anchor Point",
  "anchor-convert": "Convert Point",
};

export function OptionsBar({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const activeTool = useEditorState((s) => s.activeTool);
  const button = (id: UiActionId, label?: string) => (
    <button
      type="button"
      className={styles.button}
      disabled={!actions[id].enabled}
      onClick={actions[id].run}
    >
      {label ?? actions[id].label}
    </button>
  );
  return (
    // data-keep-text-edit: focusing these controls must not end on-canvas text editing.
    <div className={styles.options} role="toolbar" aria-label="Tool options" data-keep-text-edit>
      <span className={styles.optionsLabel}>{TOOL_LABELS[activeTool]}</span>
      {activeTool === "move" && <MoveOptions actions={actions} />}
      {activeTool === "crop" && <CropOptions />}
      {activeTool === "marquee" && <MarqueeOptions />}
      {activeTool === "lasso" && <LassoOptions />}
      {(activeTool === "wand" || activeTool === "bucket" || activeTool === "magic-eraser") && (
        <FloodOptions tool={activeTool} />
      )}
      {activeTool === "magic-eraser" && <span>Click to erase an area of similar colour</span>}
      {activeTool === "color-sampler" && <SamplerOptions />}
      {activeTool === "ruler" && <RulerOptions />}
      {activeTool === "spot-heal" && (
        <>
          <TipOptions tool="spot-heal" />
          <span>Paint over spots — the texture comes from around them automatically</span>
        </>
      )}
      {activeTool === "red-eye" && <RedEyeOptions />}
      {(activeTool === "bg-eraser" || activeTool === "color-replace") && (
        <SampledBrushOptions tool={activeTool} />
      )}
      {(activeTool === "path-move" ||
        activeTool === "anchor-add" ||
        activeTool === "anchor-delete" ||
        activeTool === "anchor-convert") && (
        <>
          <PathButtons actions={actions} />
          <span>
            {
              {
                "path-move": "Drag a path to move all of it",
                "anchor-add": "Click a path segment to add a point",
                "anchor-delete": "Click a point to delete it",
                "anchor-convert": "Click a point for corner ↔ smooth · drag it to pull out handles",
              }[activeTool]
            }
          </span>
        </>
      )}
      {activeTool === "eyedropper" && <EyedropperOptions />}
      {(activeTool === "brush" || activeTool === "pencil" || activeTool === "eraser") && (
        <BrushOptions tool={activeTool} />
      )}
      {(activeTool === "clone" || activeTool === "heal") && (
        <SourceBrushOptions tool={activeTool} />
      )}
      {activeTool === "tone" && <ToneOptions />}
      {activeTool === "focus" && <FocusOptions />}
      {activeTool === "gradient" && <GradientOptions />}
      {activeTool === "shape" && <ShapeOptions />}
      {activeTool === "pen" && <PenOptions actions={actions} />}
      {activeTool === "path-select" && (
        <>
          <PathButtons actions={actions} />
          <span>
            Drag anchors or handles · Alt-click an anchor for corner/smooth · Delete removes it
          </span>
        </>
      )}
      {activeTool === "text" && <TextOptions />}
      {activeTool === "zoom" && (
        <>
          {button("view.zoomIn", "Zoom in")}
          {button("view.zoomOut", "Zoom out")}
          <span>Click to zoom in · Alt-click to zoom out</span>
        </>
      )}
      {activeTool === "hand" && <span>Drag to pan · Hold Space with any tool to pan</span>}
      <span style={{ flex: 1 }} />
      {button("view.fit", "Fit screen")}
      {button("view.actualPixels", "100%")}
    </div>
  );
}

export function DocumentTabs() {
  const controller = useController();
  const sessions = useEditorState((s) => s.sessions);
  const activeId = useEditorState((s) => s.activeDocumentId);
  if (sessions.length === 0) return null;
  return (
    <div className={styles.tabs} role="tablist" aria-label="Open documents">
      {sessions.map((session) => {
        const { document: doc } = session;
        const active = doc.id === activeId;
        const dirty = isDirty(session);
        return (
          <div key={doc.id} className={`${styles.tab} ${active ? styles.tabActive : ""}`}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
              className={styles.tabLabel}
              title={`${doc.name} (${doc.width} × ${doc.height})${dirty ? " — unsaved changes" : ""}`}
              onClick={() => controller.store.setActiveDocument(doc.id)}
            >
              {doc.name}
            </button>
            {dirty && <span className={styles.dirtyDot} aria-label="Unsaved changes" role="img" />}
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Close ${doc.name}`}
              onClick={() => void controller.closeDocument(doc.id)}
            >
              <CloseIcon size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function StatusBar() {
  const controller = useController();
  const session = useActiveSession();
  const cursor = useSyncExternalStore(
    controller.cursor.subscribe,
    controller.cursor.get,
    () => null,
  );
  const persistent = useSyncExternalStore(
    controller.status.subscribe,
    () => controller.status.get().storagePersistent,
    () => true,
  );
  const refining = useSyncExternalStore(
    controller.refining.subscribe,
    controller.refining.get,
    () => false,
  );
  const doc = session?.document;
  const saveState = !session
    ? ""
    : session.savedRevision === null
      ? "Not saved yet"
      : isDirty(session)
        ? "Unsaved changes"
        : persistent
          ? "Saved in this browser"
          : "Saved for this session only";

  return (
    <footer className={styles.status} aria-label="Status">
      {session && doc ? (
        <>
          <span data-testid="zoom-level">{Math.round(session.viewport.zoom * 1000) / 10}%</span>
          <span>
            {doc.width} × {doc.height} px
          </span>
          {cursor && (
            <span>
              {cursor.x}, {cursor.y}
            </span>
          )}
          {doc.selection?.bounds && (
            <span data-testid="selection-size">
              Selection {doc.selection.bounds.width} × {doc.selection.bounds.height}
            </span>
          )}
          <span className={styles.statusSpacer} />
          {refining && (
            <span className={styles.muted} data-testid="refining">
              Rendering…
            </span>
          )}
          <span aria-live="polite" data-testid="save-state">
            {saveState}
          </span>
        </>
      ) : (
        <span>Your images stay on this device — nothing is uploaded.</span>
      )}
    </footer>
  );
}
