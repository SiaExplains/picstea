"use client";

import { useSyncExternalStore } from "react";
import { FONT_FAMILIES, type FontFamily, type ShapeKind } from "@/editor/core/document/types";
import { isDirty, type ToolId } from "@/editor/core/editor-store";
import { primaryBinding, type ActionId } from "@/editor/core/shortcuts/shortcuts";
import { useActiveSession, useController, useEditorState, useIsMac } from "./editor-context";
import styles from "./editor.module.css";
import {
  BrushIcon,
  CloseIcon,
  CropIcon,
  EraserIcon,
  HandIcon,
  MoveIcon,
  ShapeIcon,
  SwapIcon,
  TextIcon,
  ZoomIcon,
} from "./icons";
import type { UiAction, UiActionId } from "./use-editor-actions";

const TOOLS: { id: ToolId; label: string; action: ActionId; icon: React.ReactNode }[] = [
  { id: "move", label: "Move", action: "tool.move", icon: <MoveIcon size={18} /> },
  { id: "crop", label: "Crop", action: "tool.crop", icon: <CropIcon size={18} /> },
  { id: "brush", label: "Brush", action: "tool.brush", icon: <BrushIcon size={18} /> },
  { id: "eraser", label: "Eraser", action: "tool.eraser", icon: <EraserIcon size={18} /> },
  { id: "shape", label: "Shape", action: "tool.shape", icon: <ShapeIcon size={18} /> },
  { id: "text", label: "Text", action: "tool.text", icon: <TextIcon size={18} /> },
  { id: "hand", label: "Hand", action: "tool.hand", icon: <HandIcon size={18} /> },
  { id: "zoom", label: "Zoom", action: "tool.zoom", icon: <ZoomIcon size={18} /> },
];

/** Only implemented tools are shown — no placeholder buttons (docs/15 rule 6). */
export function Toolbar({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const controller = useController();
  const activeTool = useEditorState((s) => s.activeTool);
  const colors = useEditorState((s) => s.colors);
  const isMac = useIsMac();
  return (
    <nav className={styles.toolbar} aria-label="Tools">
      {TOOLS.map((tool) => {
        const shortcut = primaryBinding(tool.action, isMac);
        return (
          <button
            key={tool.id}
            type="button"
            className={styles.toolButton}
            aria-pressed={activeTool === tool.id}
            aria-label={`${tool.label} tool`}
            aria-keyshortcuts={shortcut}
            title={`${tool.label} (${shortcut})`}
            onClick={() => controller.store.setActiveTool(tool.id)}
          >
            {tool.icon}
          </button>
        );
      })}
      <div className={styles.toolSeparator} role="separator" />
      <div className={styles.swatches}>
        <label
          className={`${styles.swatch} ${styles.swatchForeground}`}
          style={{ background: colors.foreground }}
          title="Foreground colour"
        >
          <input
            type="color"
            aria-label="Foreground colour"
            value={colors.foreground}
            onChange={(e) => controller.store.setColors({ foreground: e.target.value })}
          />
        </label>
        <label
          className={`${styles.swatch} ${styles.swatchBackground}`}
          style={{ background: colors.background }}
          title="Background colour"
        >
          <input
            type="color"
            aria-label="Background colour"
            value={colors.background}
            onChange={(e) => controller.store.setColors({ background: e.target.value })}
          />
        </label>
      </div>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={`${actions["colors.swap"].label} (X)`}
        title="Swap colours (X)"
        onClick={actions["colors.swap"].run}
      >
        <SwapIcon size={14} />
      </button>
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

function BrushOptions({ tool }: { tool: "brush" | "eraser" }) {
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
      <NumberOption
        label="Hardness"
        value={Math.round(settings.hardness * 100)}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => set({ hardness: v / 100 })}
      />
      <NumberOption
        label="Opacity"
        value={Math.round(settings.opacity * 100)}
        min={1}
        max={100}
        suffix="%"
        onChange={(v) => set({ opacity: v / 100 })}
      />
      <span>[ and ] change size</span>
    </>
  );
}

function ShapeOptions() {
  const controller = useController();
  const settings = useEditorState((s) => s.toolSettings.shape);
  const set = (patch: Partial<typeof settings>) =>
    controller.store.updateToolSettings("shape", patch);
  const kinds: { id: ShapeKind; label: string }[] = [
    { id: "rect", label: "Rectangle" },
    { id: "ellipse", label: "Ellipse" },
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
      <span>Drag handles to scale (Shift keeps ratio) · drag outside a corner to rotate</span>
    </>
  );
}

const TOOL_LABELS: Record<ToolId, string> = {
  move: "Move",
  crop: "Crop",
  brush: "Brush",
  eraser: "Eraser",
  shape: "Shape",
  text: "Text",
  hand: "Hand",
  zoom: "Zoom",
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
      {(activeTool === "brush" || activeTool === "eraser") && <BrushOptions tool={activeTool} />}
      {activeTool === "shape" && <ShapeOptions />}
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
          <span className={styles.statusSpacer} />
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
