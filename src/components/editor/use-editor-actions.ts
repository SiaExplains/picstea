"use client";

import { useMemo } from "react";
import { deleteLayer, duplicateLayer, shiftLayer } from "@/editor/core/commands";
import { activeLayer } from "@/editor/core/document/queries";
import { isTransformable } from "@/editor/core/geometry/layer-geometry";
import { createId } from "@/editor/core/ids";
import type { ActionId } from "@/editor/core/shortcuts/shortcuts";
import { DEFAULT_COLORS } from "@/editor/core/tool-settings";
import { useActiveSession, useController, useEditorState } from "./editor-context";

export type UiActionId =
  | ActionId
  | "file.place"
  | "file.close"
  | "layer.newFill"
  | "layer.moveUp"
  | "layer.moveDown"
  | "layer.flipH"
  | "layer.flipV"
  | "image.crop";

export interface UiAction {
  readonly label: string;
  readonly enabled: boolean;
  readonly run: () => void;
}

export interface ActionHosts {
  openNewDocumentDialog: () => void;
  openExportDialog: () => void;
  pickImage: (mode: "open" | "place") => void;
}

/** Every user-invokable editor action, shared by menus, toolbar buttons and shortcuts. */
export function useEditorActions(hosts: ActionHosts): Record<UiActionId, UiAction> {
  const controller = useController();
  const session = useActiveSession();
  const activeTool = useEditorState((s) => s.activeTool);
  const colors = useEditorState((s) => s.colors);

  return useMemo(() => {
    const doc = session?.document;
    const hasDoc = !!doc;
    const layer = doc ? activeLayer(doc) : undefined;
    const activeId = layer?.id ?? null;
    const activeIndex = doc && activeId ? doc.layers.findIndex((l) => l.id === activeId) : -1;
    const history = session?.history;
    const undoLabel = history?.past.at(-1)?.label;
    const redoLabel = history?.future[0]?.label;
    const canTransform = !!layer && isTransformable(layer) && !layer.locked;
    const tool = (id: Parameters<typeof controller.store.setActiveTool>[0], label: string) => ({
      label,
      enabled: true,
      run: () => controller.store.setActiveTool(id),
    });

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
      "file.export": { label: "Export As…", enabled: hasDoc, run: hosts.openExportDialog },
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
      "image.crop": {
        label: activeTool === "crop" ? "Apply Crop" : "Crop",
        enabled: hasDoc,
        run: () =>
          activeTool === "crop"
            ? controller.tools.applyCrop()
            : controller.store.setActiveTool("crop"),
      },
      "layer.new": { label: "New Layer", enabled: hasDoc, run: () => controller.addPixelLayer() },
      "layer.newFill": {
        label: "New Fill Layer",
        enabled: hasDoc,
        run: () => controller.addFillLayer(colors.foreground),
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
      "layer.flipH": {
        label: "Flip Horizontal",
        enabled: canTransform,
        run: () => controller.flipActiveLayer("horizontal"),
      },
      "layer.flipV": {
        label: "Flip Vertical",
        enabled: canTransform,
        run: () => controller.flipActiveLayer("vertical"),
      },
      "view.zoomIn": { label: "Zoom In", enabled: hasDoc, run: () => controller.zoomStep(1) },
      "view.zoomOut": { label: "Zoom Out", enabled: hasDoc, run: () => controller.zoomStep(-1) },
      "view.fit": { label: "Fit on Screen", enabled: hasDoc, run: () => controller.fitToScreen() },
      "view.actualPixels": {
        label: "100%",
        enabled: hasDoc,
        run: () => controller.actualPixels(),
      },
      "tool.move": tool("move", "Move Tool"),
      "tool.transform": { ...tool("move", "Free Transform"), enabled: canTransform },
      "tool.crop": tool("crop", "Crop Tool"),
      "tool.brush": tool("brush", "Brush Tool"),
      "tool.eraser": tool("eraser", "Eraser Tool"),
      "tool.shape": tool("shape", "Shape Tool"),
      "tool.text": tool("text", "Text Tool"),
      "tool.hand": tool("hand", "Hand Tool"),
      "tool.zoom": tool("zoom", "Zoom Tool"),
      "colors.swap": {
        label: "Swap Colors",
        enabled: true,
        run: () =>
          controller.store.setColors({
            foreground: colors.background,
            background: colors.foreground,
          }),
      },
      "colors.reset": {
        label: "Default Colors",
        enabled: true,
        run: () => controller.store.setColors(DEFAULT_COLORS),
      },
    };
  }, [controller, session, hosts, activeTool, colors]);
}
