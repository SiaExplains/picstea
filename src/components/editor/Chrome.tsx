"use client";

import { useSyncExternalStore } from "react";
import { isDirty, type ToolId } from "@/editor/core/editor-store";
import { primaryBinding } from "@/editor/core/shortcuts/shortcuts";
import { useActiveSession, useController, useEditorState, useIsMac } from "./editor-context";
import styles from "./editor.module.css";
import { CloseIcon, HandIcon, ZoomIcon } from "./icons";
import type { UiAction, UiActionId } from "./use-editor-actions";

const TOOLS: {
  id: ToolId;
  label: string;
  action: "tool.hand" | "tool.zoom";
  icon: React.ReactNode;
}[] = [
  { id: "hand", label: "Hand", action: "tool.hand", icon: <HandIcon size={18} /> },
  { id: "zoom", label: "Zoom", action: "tool.zoom", icon: <ZoomIcon size={18} /> },
];

/** Only implemented tools are shown — no placeholder buttons (docs/15 rule 6). */
export function Toolbar() {
  const controller = useController();
  const activeTool = useEditorState((s) => s.activeTool);
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
            title={`${tool.label} (${shortcut})`}
            onClick={() => controller.store.setActiveTool(tool.id)}
          >
            {tool.icon}
          </button>
        );
      })}
    </nav>
  );
}

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
    <div className={styles.options} role="toolbar" aria-label="Tool options">
      <span className={styles.optionsLabel}>{activeTool === "hand" ? "Hand" : "Zoom"}</span>
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
