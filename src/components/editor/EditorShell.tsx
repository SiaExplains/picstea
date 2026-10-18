"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createShortcutMatcher } from "@/editor/core/shortcuts/shortcuts";
import type { SelectionModification } from "@/editor/core/commands";
import { isDirty } from "@/editor/core/editor-store";
import { OPEN_ACCEPT } from "@/editor/formats/open-file";
import { CanvasViewport } from "./CanvasViewport";
import { DocumentTabs, OptionsBar, StatusBar, Toolbar } from "./Chrome";
import { useActiveSession, useController, useIsMac } from "./editor-context";
import styles from "./editor.module.css";
import { isTypingTarget } from "./typing-target";
import { LayersPanel } from "./LayersPanel";
import { ExportDialog } from "./ExportDialog";
import { MenuBar } from "./MenuBar";
import { NewDocumentDialog } from "./NewDocumentDialog";
import { BusyOverlay, Notices } from "./Notices";
import { PropertiesPanel } from "./PropertiesPanel";
import { ColorRangeDialog, ModifySelectionDialog, WorkPathDialog } from "./SelectionDialogs";
import { FilterDialog, type SmartFilterTarget } from "./FilterDialog";
import { GridDialog, GuideDialog } from "./ViewDialogs";
import type { FilterId } from "@/editor/filters/registry";
import { activeLayer } from "@/editor/core/document/queries";
import { StartScreen } from "./StartScreen";
import { ColorPickerDialog, type ColorTarget } from "./ColorPickerDialog";
import { BatchDialog } from "./BatchDialog";
import { PanelTabs } from "./PanelTabs";
import { useEditorActions, type ActionHosts } from "./use-editor-actions";

const matchShortcut = createShortcutMatcher();

type PickMode = "open" | "place" | "placeEmbedded";

function imageFiles(list: FileList | null | undefined): File[] {
  return [...(list ?? [])].filter((file) => file.type.startsWith("image/") || file.type === "");
}

export function EditorShell() {
  const controller = useController();
  const session = useActiveSession();
  const isMac = useIsMac();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [modifyKind, setModifyKind] = useState<SelectionModification | null>(null);
  const [colorRangeOpen, setColorRangeOpen] = useState(false);
  const [filterId, setFilterId] = useState<FilterId | null>(null);
  const [smartTarget, setSmartTarget] = useState<SmartFilterTarget | undefined>(undefined);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [gridDialogOpen, setGridDialogOpen] = useState(false);
  const [workPathDialogOpen, setWorkPathDialogOpen] = useState(false);
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickModeRef = useRef<PickMode>("open");

  const hosts = useMemo<ActionHosts>(
    () => ({
      openNewDocumentDialog: () => setNewDialogOpen(true),
      openExportDialog: () => setExportDialogOpen(true),
      openModifySelectionDialog: (kind) => setModifyKind(kind),
      openColorRangeDialog: () => setColorRangeOpen(true),
      // The dialog only opens when the active layer can be filtered (otherwise a notice says why).
      openFilterDialog: (id) => {
        // On a smart object the filter becomes a smart filter (no pixel session needed).
        const doc = controller.store.getSession()?.document;
        const active = doc ? activeLayer(doc) : undefined;
        if (active?.kind === "smart") {
          setSmartTarget({ layerId: active.id });
          setFilterId(id);
          return;
        }
        setSmartTarget(undefined);
        if (controller.beginFilter()) setFilterId(id);
      },
      openSmartFilterDialog: (layerId, entry) => {
        setSmartTarget({ layerId, entryId: entry.id, values: entry.values });
        setFilterId(entry.filterId as FilterId);
      },
      openGuideDialog: () => setGuideDialogOpen(true),
      openGridDialog: () => setGridDialogOpen(true),
      openWorkPathDialog: () => setWorkPathDialogOpen(true),
      openBatchDialog: () => setBatchOpen(true),
      pickImage: (mode) => {
        pickModeRef.current = mode;
        fileInputRef.current?.click();
      },
    }),
    [controller],
  );
  const actions = useEditorActions(hosts);

  const importFiles = useCallback(
    async (files: File[], mode: PickMode) => {
      for (const file of files) {
        if (mode === "place") await controller.placeFile(file, file.name);
        else if (mode === "placeEmbedded") await controller.placeEmbedded(file, file.name);
        else await controller.openFile(file, file.name);
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
      if (files.length === 0) {
        // No image from another app: paste pixels copied in Picstea, if any.
        if (controller.store.getSession() && controller.hasClipboard()) {
          event.preventDefault();
          controller.pasteClipboard();
        }
        return;
      }
      event.preventDefault();
      const hasDocument = !!controller.store.getSession();
      void (async () => {
        if (hasDocument && files.length === 1 && (await controller.isOwnClipboardImage(files[0]))) {
          controller.pasteClipboard();
          return;
        }
        await importFiles(files, hasDocument ? "place" : "open");
      })();
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
        // Every dropped file goes through content detection, which explains unsupported types.
        void importFiles([...e.dataTransfer.files], "open");
      }}
    >
      <MenuBar actions={actions} />
      <OptionsBar actions={actions} />
      <Toolbar actions={actions} onEditColor={setColorTarget} />
      <main className={styles.main} aria-label="Workspace">
        <DocumentTabs />
        {session ? <CanvasViewport /> : <StartScreen actions={actions} />}
        {dragging && <div className={styles.dropOverlay}>Drop an image to open it</div>}
      </main>
      <aside className={styles.panels} aria-label="Panels">
        <PropertiesPanel onEditSmartFilter={hosts.openSmartFilterDialog} />
        <PanelTabs />
        <LayersPanel actions={actions} />
      </aside>
      <StatusBar />
      <NewDocumentDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} />
      <ExportDialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />
      <ModifySelectionDialog kind={modifyKind} onClose={() => setModifyKind(null)} />
      {colorRangeOpen && <ColorRangeDialog open onClose={() => setColorRangeOpen(false)} />}
      {filterId && (
        <FilterDialog
          key={filterId}
          filterId={filterId}
          smart={smartTarget}
          onClose={() => setFilterId(null)}
        />
      )}
      {guideDialogOpen && <GuideDialog onClose={() => setGuideDialogOpen(false)} />}
      {gridDialogOpen && <GridDialog onClose={() => setGridDialogOpen(false)} />}
      {workPathDialogOpen && <WorkPathDialog onClose={() => setWorkPathDialogOpen(false)} />}
      {colorTarget && (
        <ColorPickerDialog target={colorTarget} onClose={() => setColorTarget(null)} />
      )}
      {batchOpen && <BatchDialog onClose={() => setBatchOpen(false)} />}
      <Notices />
      <BusyOverlay />
      <input
        ref={fileInputRef}
        type="file"
        accept={OPEN_ACCEPT}
        multiple
        hidden
        data-testid="file-input"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          void importFiles(files, pickModeRef.current);
        }}
      />
    </div>
  );
}
