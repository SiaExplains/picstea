"use client";

import { useMemo } from "react";
import { deleteLayer, duplicateLayer, shiftLayer } from "@/editor/core/commands";
import { createId } from "@/editor/core/ids";
import type { ActionId } from "@/editor/core/shortcuts/shortcuts";
import { useActiveSession, useController } from "./editor-context";

export type UiActionId = ActionId | "file.place" | "file.close" | "layer.moveUp" | "layer.moveDown";

export interface UiAction {
  readonly label: string;
  readonly enabled: boolean;
  readonly run: () => void;
}

export interface ActionHosts {
  openNewDocumentDialog: () => void;
  pickImage: (mode: "open" | "place") => void;
}

/** Every user-invokable editor action, shared by menus, toolbar buttons and shortcuts. */
export function useEditorActions(hosts: ActionHosts): Record<UiActionId, UiAction> {
  const controller = useController();
  const session = useActiveSession();

  return useMemo(() => {
    const doc = session?.document;
    const hasDoc = !!doc;
    const activeId = doc?.activeLayerId ?? null;
    const activeIndex = doc && activeId ? doc.layers.findIndex((l) => l.id === activeId) : -1;
    const history = session?.history;
    const undoLabel = history?.past.at(-1)?.label;
    const redoLabel = history?.future[0]?.label;

    return {
      "file.new": { label: "New…", enabled: true, run: hosts.openNewDocumentDialog },
      "file.open": { label: "Open Image…", enabled: true, run: () => hosts.pickImage("open") },
      "file.place": {
        label: "Place Image as Layer…",
        enabled: hasDoc,
        run: () => hosts.pickImage("place"),
      },
      "file.save": {
        label: "Save to Browser",
        enabled: hasDoc,
        run: () => void controller.save(),
      },
      "file.close": {
        label: "Close",
        enabled: hasDoc,
        run: () => doc && void controller.closeDocument(doc.id),
      },
      "edit.undo": {
        label: undoLabel ? `Undo ${undoLabel}` : "Undo",
        enabled: !!undoLabel,
        run: () => controller.undo(),
      },
      "edit.redo": {
        label: redoLabel ? `Redo ${redoLabel}` : "Redo",
        enabled: !!redoLabel,
        run: () => controller.redo(),
      },
      "layer.new": {
        label: "New Fill Layer",
        enabled: hasDoc,
        run: () => controller.addFillLayer(),
      },
      "layer.duplicate": {
        label: "Duplicate Layer",
        enabled: !!activeId,
        run: () => activeId && controller.execute(duplicateLayer(activeId, createId("layer"))),
      },
      "layer.delete": {
        label: "Delete Layer",
        enabled: !!activeId,
        run: () => activeId && controller.execute(deleteLayer(activeId)),
      },
      "layer.moveUp": {
        label: "Bring Forward",
        enabled: !!doc && activeIndex !== -1 && activeIndex < doc.layers.length - 1,
        run: () => doc && activeId && controller.execute(shiftLayer(doc, activeId, 1)),
      },
      "layer.moveDown": {
        label: "Send Backward",
        enabled: activeIndex > 0,
        run: () => doc && activeId && controller.execute(shiftLayer(doc, activeId, -1)),
      },
      "view.zoomIn": { label: "Zoom In", enabled: hasDoc, run: () => controller.zoomStep(1) },
      "view.zoomOut": { label: "Zoom Out", enabled: hasDoc, run: () => controller.zoomStep(-1) },
      "view.fit": { label: "Fit on Screen", enabled: hasDoc, run: () => controller.fitToScreen() },
      "view.actualPixels": {
        label: "100%",
        enabled: hasDoc,
        run: () => controller.actualPixels(),
      },
      "tool.hand": {
        label: "Hand Tool",
        enabled: true,
        run: () => controller.store.setActiveTool("hand"),
      },
      "tool.zoom": {
        label: "Zoom Tool",
        enabled: true,
        run: () => controller.store.setActiveTool("zoom"),
      },
    };
  }, [controller, session, hosts]);
}
