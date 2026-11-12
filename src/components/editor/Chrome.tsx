"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
  PerspectiveCropIcon,
  CustomShapeIcon,
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
import { useT } from "./i18n";
import { N_ } from "@/i18n/editor/catalog";

/** Icon for every toolbar group member (ADR-0027). */
const MEMBER_ICONS: Record<string, React.ReactNode> = {
  move: <MoveIcon size={18} />,
  "marquee-rect": <MarqueeIcon size={18} />,
  "marquee-ellipse": <EllipseMarqueeIcon size={18} />,
  lasso: <LassoIcon size={18} />,
  "lasso-polygonal": <PolygonLassoIcon size={18} />,
  wand: <WandIcon size={18} />,
  crop: <CropIcon size={18} />,
  "perspective-crop": <PerspectiveCropIcon size={18} />,
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
  "shape-custom": <CustomShapeIcon size={18} />,
  hand: <HandIcon size={18} />,
  zoom: <ZoomIcon size={18} />,
};

/** Hold the pointer this long on a group to open its flyout (as in Photoshop). */
const LONG_PRESS_MS = 450;

function ToolGroupButton({ group }: { group: ToolGroup }) {
  const controller = useController();
  const state = useEditorState((s) => s);
  const isMac = useIsMac();
  const t = useT();
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
        aria-label={t("{label} tool", { label: t(member.label) })}
        aria-haspopup={many ? "menu" : undefined}
        aria-expanded={many ? !!flyout : undefined}
        aria-keyshortcuts={shortcut || undefined}
        title={
          many
            ? t("{label} ({shortcut}) · right-click or hold for more", {
                label: t(member.label),
                shortcut,
              })
            : `${t(member.label)} (${shortcut})`
        }
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
          label={t("{label} tools", { label: t(member.label) })}
          onClose={closeFlyout}
          items={group.members.map((m): ContextMenuEntry => ({
            kind: "item",
            label: t(m.label),
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
  const t = useT();
  return (
    <nav className={styles.toolbar} aria-label={t("Tools")}>
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
            aria-label={which === "foreground" ? t("Foreground colour") : t("Background colour")}
            title={
              which === "foreground"
                ? t("Foreground colour {color}", { color: colors[which] })
                : t("Background colour {color}", { color: colors[which] })
            }
            data-color={colors[which]}
            onClick={() => onEditColor(which)}
          />
        ))}
      </div>
      <div className={styles.swatchButtons}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`${t(actions["colors.reset"].label)} (D)`}
          title={`${t("Default colours: black and white")} (D)`}
          onClick={actions["colors.reset"].run}
        >
          <ResetColorsIcon size={12} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`${t(actions["colors.swap"].label)} (X)`}
          title={`${t("Swap colours")} (X)`}
          onClick={actions["colors.swap"].run}
        >
          <SwapIcon size={14} />
        </button>
      </div>
    </nav>
  );
}

function MoveOptions({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const controller = useController();
  const autoSelect = useEditorState((s) => s.toolSettings.move.autoSelect);
  const scaleStyles = useEditorState((s) => s.toolSettings.move.scaleStyles);
  const t = useT();
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
        {t("Auto-select layer")}
      </label>
      <label
        className={styles.optionGroup}
        title={t("Scaling a shape also scales its stroke and layer effects")}
      >
        <input
          type="checkbox"
          checked={scaleStyles}
          onChange={(e) =>
            controller.store.updateToolSettings("move", { scaleStyles: e.target.checked })
          }
        />
        {t("Scale strokes & effects")}
      </label>
      <button
        type="button"
        className={styles.button}
        disabled={!actions["layer.flipH"].enabled}
        onClick={actions["layer.flipH"].run}
      >
        {t("Flip H")}
      </button>
      <button
        type="button"
        className={styles.button}
        disabled={!actions["layer.flipV"].enabled}
        onClick={actions["layer.flipV"].run}
      >
        {t("Flip V")}
      </button>
      {count > 1 ? (
        <ArrangeButtons count={count} />
      ) : (
        <span>
          {t(
            "Drag handles to scale (Shift keeps ratio) · drag outside a corner to rotate · Shift-click adds a layer",
          )}
        </span>
      )}
    </>
  );
}

/** Work-path actions shared by the Pen and Direct Selection options. */
const TOOL_LABELS: Record<ToolId, string> = {
  move: N_("Move"),
  marquee: N_("Marquee"),
  lasso: N_("Lasso"),
  wand: N_("Magic Wand"),
  crop: N_("Crop"),
  "perspective-crop": N_("Perspective Crop"),
  eyedropper: N_("Eyedropper"),
  brush: N_("Brush"),
  pencil: N_("Pencil"),
  eraser: N_("Eraser"),
  clone: N_("Clone Stamp"),
  heal: N_("Healing Brush"),
  tone: N_("Dodge · Burn · Sponge"),
  focus: N_("Blur · Sharpen · Smudge"),
  bucket: N_("Paint Bucket"),
  gradient: N_("Gradient"),
  shape: N_("Shape"),
  pen: N_("Pen"),
  "path-select": N_("Direct Selection"),
  text: N_("Text"),
  hand: N_("Hand"),
  zoom: N_("Zoom"),
  "spot-heal": N_("Spot Healing Brush"),
  "red-eye": N_("Red Eye"),
  "bg-eraser": N_("Background Eraser"),
  "magic-eraser": N_("Magic Eraser"),
  "color-replace": N_("Color Replacement"),
  "color-sampler": N_("Color Sampler"),
  ruler: N_("Ruler"),
  "path-move": N_("Path Selection"),
  "anchor-add": N_("Add Anchor Point"),
  "anchor-delete": N_("Delete Anchor Point"),
  "anchor-convert": N_("Convert Point"),
};

// Every tool's options but the Move tool's load when that tool is first picked (ADR-0044).
const ToolOptions = lazy(() => import("./ToolOptions").then((m) => ({ default: m.ToolOptions })));
const DistortOptions = lazy(() =>
  import("./ToolOptions").then((m) => ({ default: m.DistortOptions })),
);

export function OptionsBar({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const activeTool = useEditorState((s) => s.activeTool);
  const t = useT();
  const controller = useController();
  // Fetch the other tools' options soon after the editor opens, so switching tools is instant.
  useEffect(() => {
    const timer = window.setTimeout(() => void import("./ToolOptions"), 1500);
    return () => window.clearTimeout(timer);
  }, []);
  const distort = useSyncExternalStore(
    controller.tools.distort.subscribe,
    controller.tools.distort.get,
    () => null,
  );
  if (distort) {
    return (
      <div
        className={styles.options}
        role="toolbar"
        aria-label={t("Tool options")}
        data-keep-text-edit
      >
        <Suspense fallback={null}>
          <DistortOptions state={distort} />
        </Suspense>
      </div>
    );
  }
  const button = (id: UiActionId, label?: string) => (
    <button
      type="button"
      className={styles.button}
      disabled={!actions[id].enabled}
      onClick={actions[id].run}
    >
      {label ?? t(actions[id].label)}
    </button>
  );
  return (
    // data-keep-text-edit: focusing these controls must not end on-canvas text editing.
    <div
      className={styles.options}
      role="toolbar"
      aria-label={t("Tool options")}
      data-keep-text-edit
    >
      <span className={styles.optionsLabel}>{t(TOOL_LABELS[activeTool])}</span>
      {activeTool === "move" && <MoveOptions actions={actions} />}
      {activeTool !== "move" && (
        <Suspense fallback={null}>
          <ToolOptions activeTool={activeTool} actions={actions} />
        </Suspense>
      )}
      <span style={{ flex: 1 }} />
      {button("view.fit", t("Fit screen"))}
      {button("view.actualPixels", "100%")}
    </div>
  );
}

export function DocumentTabs() {
  const controller = useController();
  const sessions = useEditorState((s) => s.sessions);
  const activeId = useEditorState((s) => s.activeDocumentId);
  const t = useT();
  if (sessions.length === 0) return null;
  return (
    <div className={styles.tabs} role="tablist" aria-label={t("Open documents")}>
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
              title={`${doc.name} (${doc.width} × ${doc.height})${dirty ? ` — ${t("unsaved changes")}` : ""}`}
              onClick={() => controller.store.setActiveDocument(doc.id)}
            >
              {doc.name}
            </button>
            {dirty && (
              <span className={styles.dirtyDot} aria-label={t("Unsaved changes")} role="img" />
            )}
            <button
              type="button"
              className={styles.iconButton}
              aria-label={t("Close {name}", { name: doc.name })}
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
  const t = useT();
  const saveState = !session
    ? ""
    : session.savedRevision === null
      ? t("Not saved yet")
      : isDirty(session)
        ? t("Unsaved changes")
        : persistent
          ? t("Saved in this browser")
          : t("Saved for this session only");

  return (
    <footer className={styles.status} aria-label={t("Status")}>
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
              {t("Selection")} {doc.selection.bounds.width} × {doc.selection.bounds.height}
            </span>
          )}
          <span className={styles.statusSpacer} />
          {refining && (
            <span className={styles.muted} data-testid="refining">
              {t("Rendering…")}
            </span>
          )}
          <span aria-live="polite" data-testid="save-state">
            {saveState}
          </span>
        </>
      ) : (
        <span>{t("Your images stay on this device — nothing is uploaded.")}</span>
      )}
    </footer>
  );
}
