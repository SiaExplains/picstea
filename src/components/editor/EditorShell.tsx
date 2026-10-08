"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createShortcutMatcher } from "@/editor/core/shortcuts/shortcuts";
import { isDirty } from "@/editor/core/editor-store";
import { IMPORT_ACCEPT } from "@/editor/formats/raster/raster-import";
import { CanvasViewport } from "./CanvasViewport";
import { DocumentTabs, OptionsBar, StatusBar, Toolbar } from "./Chrome";
import { useActiveSession, useController, useIsMac } from "./editor-context";
import styles from "./editor.module.css";
import { LayersPanel } from "./LayersPanel";
import { ExportDialog } from "./ExportDialog";
import { MenuBar } from "./MenuBar";
import { NewDocumentDialog } from "./NewDocumentDialog";
import { Notices } from "./Notices";
import { PropertiesPanel } from "./PropertiesPanel";
import { StartScreen } from "./StartScreen";
import { useEditorActions, type ActionHosts } from "./use-editor-actions";

const matchShortcut = createShortcutMatcher();

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function imageFiles(list: FileList | null | undefined): File[] {
  return [...(list ?? [])].filter((file) => file.type.startsWith("image/") || file.type === "");
}

export function EditorShell() {
  const controller = useController();
  const session = useActiveSession();
  const isMac = useIsMac();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickModeRef = useRef<"open" | "place">("open");

  const hosts = useMemo<ActionHosts>(
    () => ({
      openNewDocumentDialog: () => setNewDialogOpen(true),
      openExportDialog: () => setExportDialogOpen(true),
      pickImage: (mode) => {
        pickModeRef.current = mode;
        fileInputRef.current?.click();
      },
    }),
    [],
  );
  const actions = useEditorActions(hosts);

  const importFiles = useCallback(
    async (files: File[], mode: "open" | "place") => {
      for (const file of files) {
        if (mode === "place") await controller.placeImageFile(file, file.name);
        else await controller.openImageFile(file, file.name);
      }
    },
    [controller],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Check the DOM rather than React state, which can lag a frame behind a closing dialog.
      if (event.defaultPrevented || document.querySelector("dialog[open]")) return;
      if (isTypingTarget(event.target)) return;
      // The active tool gets first refusal on plain keys (arrows, Enter, Esc, [ ]).
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      if (
        controller.tools.keyDown({
          key: event.key,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          modKey,
        })
      ) {
        event.preventDefault();
        return;
      }
      const action = matchShortcut(event, isMac);
      if (!action) return;
      event.preventDefault();
      if (actions[action].enabled) actions[action].run();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, controller, isMac]);

  // Paste an image: into the open document as a layer, otherwise as a new document.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const files = imageFiles(event.clipboardData?.files);
      if (files.length === 0) return;
      event.preventDefault();
      void importFiles(files, controller.store.getSession() ? "place" : "open");
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [controller, importFiles]);

  // Warn before leaving with changes that have not reached local storage yet.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (controller.store.getState().sessions.some(isDirty)) {
        void controller.saveAllDirty();
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [controller]);

  const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

  return (
    <div
      className={styles.root}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragging(false);
        void importFiles(imageFiles(e.dataTransfer.files), "open");
      }}
    >
      <MenuBar actions={actions} />
      <OptionsBar actions={actions} />
      <Toolbar actions={actions} />
      <main className={styles.main} aria-label="Workspace">
        <DocumentTabs />
        {session ? <CanvasViewport /> : <StartScreen actions={actions} />}
        {dragging && <div className={styles.dropOverlay}>Drop an image to open it</div>}
      </main>
      <aside className={styles.panels} aria-label="Panels">
        <PropertiesPanel />
        <LayersPanel actions={actions} />
      </aside>
      <StatusBar />
      <NewDocumentDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} />
      <ExportDialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />
      <Notices />
      <input
        ref={fileInputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        multiple
        hidden
        data-testid="file-input"
        onChange={(e) => {
          const files = imageFiles(e.target.files);
          e.target.value = "";
          void importFiles(files, pickModeRef.current);
        }}
      />
    </div>
  );
}
