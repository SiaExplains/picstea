"use client";

import { useMemo, useSyncExternalStore } from "react";
import { FILTERS, type FilterId } from "@/editor/filters/registry";
import type { AlignEdge } from "@/editor/core/geometry/snapping";
import { ALIGN_LABELS } from "@/editor/controller/editor-controller";
import { deleteLayer, shiftLayer } from "@/editor/core/commands";
import { ADJUSTMENTS } from "@/editor/adjustments/registry";
import { activeLayer } from "@/editor/core/document/queries";
import { flattenTopFirst, locateLayer } from "@/editor/core/document/tree";
import type { SelectionModification } from "@/editor/core/commands";
import type { AdjustmentType, SmartFilter } from "@/editor/core/document/types";
import { isTransformable } from "@/editor/core/geometry/layer-geometry";
import type { ActionId } from "@/editor/core/shortcuts/shortcuts";
import { DEFAULT_COLORS } from "@/editor/core/tool-settings";
import { openWelcome } from "@/components/welcome/welcome";
import type { EditorController } from "@/editor/controller/editor-controller";
import { PROJECT_MIME } from "@/editor/formats/project/project-file";
import { useActiveSession, useController, useEditorState } from "./editor-context";
import { saveFile } from "./save-file";

export type UiActionId =
  | ActionId
  | `adjust.${AdjustmentType}`
  | `filter.${FilterId}`
  | `align.${AlignEdge}`
  | "view.lockGuides"
  | "view.newGuide"
  | "view.clearGuides"
  | "view.gridSettings"
  | "path.vectorMask"
  | "path.shape"
  | "path.delete"
  | "path.fromSelection"
  | "layer.deleteVectorMask"
  | "layer.toSmartObject"
  | "layer.editContents"
  | "layer.rasterize"
  | "file.placeEmbedded"
  | "file.batch"
  | "layer.toggleVectorMask"
  | "layer.newGroup"
  | "layer.addMask"
  | "layer.deleteMask"
  | "layer.toggleMask"
  | "file.place"
  | "file.close"
  | "layer.newFill"
  | "layer.moveUp"
  | "layer.moveDown"
  | "layer.flipH"
  | "layer.flipV"
  | "image.crop"
  | "image.cropToSelection"
  | "edit.paste"
  | "edit.clear"
  | "select.colorRange"
  | "select.expand"
  | "select.contract"
  | "select.transform"
  | "help.welcome"
  | "help.docs"
  | "help.blog";

export interface UiAction {
  readonly label: string;
  readonly enabled: boolean;
  readonly run: () => void;
  /** For on/off settings (View → Rulers…): shown as a checkable menu item. */
  readonly checked?: boolean;
}

export interface ActionHosts {
  openNewDocumentDialog: () => void;
  openExportDialog: () => void;
  openModifySelectionDialog: (kind: SelectionModification) => void;
  openColorRangeDialog: () => void;
  pickImage: (mode: "open" | "place" | "placeEmbedded") => void;
  openFilterDialog: (id: FilterId) => void;
  openGuideDialog: () => void;
  openGridDialog: () => void;
  openWorkPathDialog: () => void;
  openBatchDialog: () => void;
  openSmartFilterDialog: (layerId: string, filter: SmartFilter) => void;
}

/** Download the active document as a portable `.mylper` file (File → Save Project As…). */
async function saveProjectFile(controller: EditorController): Promise<void> {
  const result = await controller.saveProjectFile();
  if (!result.ok) return;
  const saved = await saveFile(result.blob, result.filename, PROJECT_MIME, "MYLPER project");
  if (saved === "saved") controller.notify("info", `Saved ${result.filename}`);
  if (saved === "failed") controller.notify("error", "The project file could not be saved.");
}

/** Every user-invokable editor action, shared by menus, toolbar buttons and shortcuts. */
export function useEditorActions(hosts: ActionHosts): Record<UiActionId, UiAction> {
  const controller = useController();
  const session = useActiveSession();
  const activeTool = useEditorState((s) => s.activeTool);
  const colors = useEditorState((s) => s.colors);
  const view = useSyncExternalStore(
    controller.view.subscribe,
    controller.view.get,
    controller.view.get,
  );
  const lastFilter = useSyncExternalStore(
    controller.lastFilter.subscribe,
    controller.lastFilter.get,
    () => null,
  );

  return useMemo(() => {
    const doc = session?.document;
    const hasDoc = !!doc;
    const layer = doc ? activeLayer(doc) : undefined;
    const activeId = layer?.id ?? null;
    const location = doc && activeId ? locateLayer(doc.layers, activeId) : undefined;
    // Up/down also step out of groups, so they are only disabled at the very top/bottom.
    const canMoveUp =
      !!location && (location.parentId !== null || location.index < location.siblings.length - 1);
    const canMoveDown = !!location && (location.parentId !== null || location.index > 0);
    const visibleRows = doc ? flattenTopFirst(doc.layers) : [];
    const rowIndex = visibleRows.findIndex((r) => r.layer.id === activeId);
    const select = (offset: number) => {
      const row = visibleRows[rowIndex === -1 ? 0 : rowIndex + offset];
      if (row) controller.store.selectLayer(row.layer.id);
    };
    const history = session?.history;
    const undoLabel = history?.past.at(-1)?.label;
    const redoLabel = history?.future[0]?.label;
    const canTransform = !!layer && isTransformable(layer) && !layer.locked;
    const selection = doc?.selection;
    const hasSelection = !!selection;
    const hasWorkPath = !!doc?.workPath;
    const isPathShape = layer?.kind === "shape" && layer.shape === "path";
    const onPixels = hasSelection && layer?.kind === "raster" && !layer.locked;
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
      "file.placeEmbedded": {
        label: "Place Embedded…",
        enabled: hasDoc,
        run: () => hosts.pickImage("placeEmbedded"),
      },
      "file.save": {
        label: "Save to Browser",
        enabled: hasDoc,
        run: () => void controller.save(),
      },
      "file.saveProject": {
        label: "Save Project As…",
        enabled: hasDoc,
        run: () => void saveProjectFile(controller),
      },
      "file.export": { label: "Export As…", enabled: hasDoc, run: hosts.openExportDialog },
      "file.batch": { label: "Batch…", enabled: true, run: hosts.openBatchDialog },
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
      "edit.cut": {
        label: "Cut",
        enabled: !!onPixels,
        run: () => controller.cutSelection(),
      },
      "edit.copy": {
        label: "Copy",
        enabled: hasSelection && !!layer,
        run: () => void controller.copySelection(),
      },
      "edit.paste": {
        // The clipboard is not React state, so Paste stays enabled and explains when it is empty.
        label: "Paste",
        enabled: hasDoc,
        run: () => void controller.pasteClipboard(),
      },
      "edit.clear": {
        label: "Clear",
        enabled: !!onPixels,
        run: () => void controller.clearSelection(),
      },
      "edit.fill": {
        label: "Fill with Foreground",
        enabled: !!onPixels,
        run: () => controller.fillSelection(colors.foreground),
      },
      "select.all": { label: "All", enabled: hasDoc, run: () => controller.selectAll() },
      "select.deselect": {
        label: "Deselect",
        enabled: hasSelection,
        run: () => controller.deselect(),
      },
      "select.reselect": {
        label: "Reselect",
        enabled: hasDoc && !hasSelection && controller.canReselect(),
        run: () => controller.reselect(),
      },
      "select.inverse": {
        label: "Inverse",
        enabled: hasDoc,
        run: () => controller.invertSelection(),
      },
      "select.colorRange": {
        label: "Color Range…",
        enabled: hasDoc,
        run: hosts.openColorRangeDialog,
      },
      "select.feather": {
        label: "Feather…",
        enabled: hasSelection,
        run: () => hosts.openModifySelectionDialog("feather"),
      },
      "select.expand": {
        label: "Expand…",
        enabled: hasSelection,
        run: () => hosts.openModifySelectionDialog("expand"),
      },
      "select.contract": {
        label: "Contract…",
        enabled: hasSelection,
        run: () => hosts.openModifySelectionDialog("contract"),
      },
      "select.transform": {
        label: "Transform Selection",
        enabled: hasSelection,
        run: () => controller.transformSelection(),
      },
      "image.cropToSelection": {
        label: "Crop to Selection",
        enabled: hasSelection,
        run: () => controller.cropToSelection(),
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
      // With a selection, Mod+J copies the selected pixels to a new layer (Layer via Copy).
      "layer.duplicate": {
        label: hasSelection ? "Layer via Copy" : "Duplicate Layer",
        enabled: !!activeId,
        run: () => (hasSelection ? controller.layerViaCopy() : controller.duplicateActiveLayer()),
      },
      // With a selection, Delete/Backspace clears the selected pixels instead of the layer.
      "layer.delete": {
        label: "Delete Layer",
        enabled: !!activeId,
        run: () =>
          hasSelection
            ? void controller.clearSelection()
            : activeId && controller.execute(deleteLayer(activeId)),
      },
      "layer.moveUp": {
        label: "Bring Forward",
        enabled: canMoveUp,
        run: () => doc && activeId && controller.execute(shiftLayer(doc, activeId, 1)),
      },
      "layer.moveDown": {
        label: "Send Backward",
        enabled: canMoveDown,
        run: () => doc && activeId && controller.execute(shiftLayer(doc, activeId, -1)),
      },
      "layer.newGroup": { label: "New Group", enabled: hasDoc, run: () => controller.addGroup() },
      "layer.group": {
        label: "Group Layer",
        enabled: !!layer,
        run: () => controller.groupActiveLayer(),
      },
      "layer.ungroup": {
        label: "Ungroup",
        enabled: layer?.kind === "group",
        run: () => controller.ungroupActiveLayer(),
      },
      "layer.addMask": {
        label: "Add Layer Mask",
        enabled: !!layer && !layer.mask,
        run: () => controller.addMaskToActiveLayer(),
      },
      "layer.deleteMask": {
        label: "Delete Layer Mask",
        enabled: !!layer?.mask,
        run: () => controller.deleteActiveMask(),
      },
      "layer.toggleMask": {
        label: layer?.mask?.enabled === false ? "Enable Layer Mask" : "Disable Layer Mask",
        enabled: !!layer?.mask,
        run: () => controller.toggleActiveMask(),
      },
      "layer.toSmartObject": {
        label: "Convert to Smart Object",
        enabled: !!layer && !layer.locked && layer.kind !== "fill" && layer.kind !== "adjustment",
        run: () => controller.convertToSmartObject(),
      },
      "layer.editContents": {
        label: "Edit Contents",
        enabled: layer?.kind === "smart",
        run: () => controller.editSmartContents(),
      },
      "layer.rasterize": {
        label: "Rasterize Layer",
        enabled:
          !!layer &&
          !layer.locked &&
          (layer.kind === "smart" || layer.kind === "shape" || layer.kind === "text"),
        run: () => controller.rasterizeActiveLayer(),
      },
      "layer.clip": {
        label: layer?.clipped ? "Release Clipping Mask" : "Create Clipping Mask",
        enabled: !!layer && !layer.locked && (!!layer.clipped || (location?.index ?? 0) > 0),
        run: () => controller.toggleClipping(),
      },
      "path.makeSelection": {
        label: "Make Selection from Path",
        enabled: hasWorkPath || isPathShape,
        run: () => controller.selectionFromPath(),
      },
      "path.fromSelection": {
        label: "Make Work Path from Selection…",
        enabled: hasSelection,
        run: hosts.openWorkPathDialog,
      },
      "path.vectorMask": {
        label: "Add Vector Mask from Path",
        enabled: hasWorkPath && !!layer && !layer.locked,
        run: () => controller.vectorMaskFromPath(),
      },
      "path.shape": {
        label: "Shape from Path",
        enabled: hasWorkPath,
        run: () => controller.shapeFromWorkPath(),
      },
      "path.delete": {
        label: "Delete Work Path",
        enabled: hasWorkPath,
        run: () => controller.deleteWorkPath(),
      },
      "layer.deleteVectorMask": {
        label: "Delete Vector Mask",
        enabled: !!layer?.vectorMask && !layer.locked,
        run: () => controller.deleteVectorMask(),
      },
      "layer.toggleVectorMask": {
        label: layer?.vectorMask?.enabled === false ? "Enable Vector Mask" : "Disable Vector Mask",
        enabled: !!layer?.vectorMask && !layer.locked,
        run: () => controller.toggleVectorMask(),
      },
      "layer.selectAbove": {
        label: "Select Layer Above",
        enabled: rowIndex > 0,
        run: () => select(-1),
      },
      "layer.selectBelow": {
        label: "Select Layer Below",
        enabled: rowIndex !== -1 && rowIndex < visibleRows.length - 1,
        run: () => select(1),
      },
      ...(Object.fromEntries(
        ADJUSTMENTS.map((a) => [
          `adjust.${a.type}`,
          {
            label: `${a.label}…`,
            enabled: hasDoc,
            run: () => controller.addAdjustmentLayer(a.type),
          },
        ]),
      ) as Record<`adjust.${AdjustmentType}`, UiAction>),
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
      "view.rulers": {
        label: "Rulers",
        enabled: true,
        checked: view.rulers,
        run: () => controller.setView({ rulers: !view.rulers }),
      },
      "view.guides": {
        label: "Guides",
        enabled: true,
        checked: view.guides,
        run: () => controller.setView({ guides: !view.guides }),
      },
      "view.grid": {
        label: "Grid",
        enabled: true,
        checked: view.grid,
        run: () => controller.setView({ grid: !view.grid }),
      },
      "view.snap": {
        label: "Snap",
        enabled: true,
        checked: view.snap,
        run: () => controller.setView({ snap: !view.snap }),
      },
      "view.lockGuides": {
        label: "Lock Guides",
        enabled: true,
        checked: view.lockGuides,
        run: () => controller.setView({ lockGuides: !view.lockGuides }),
      },
      "view.newGuide": { label: "New Guide…", enabled: hasDoc, run: hosts.openGuideDialog },
      "view.clearGuides": {
        label: "Clear Guides",
        enabled: !!doc?.guides.length,
        run: () => controller.clearGuides(),
      },
      "view.gridSettings": { label: "Grid Size…", enabled: true, run: hosts.openGridDialog },
      ...(Object.fromEntries(
        (Object.keys(ALIGN_LABELS) as AlignEdge[]).map((edge) => [
          `align.${edge}`,
          {
            label: ALIGN_LABELS[edge].replace(
              "Align ",
              hasSelection ? "Align to Selection: " : "Align ",
            ),
            enabled:
              !!layer && layer.kind !== "fill" && layer.kind !== "adjustment" && !layer.locked,
            run: () => controller.alignActiveLayer(edge),
          },
        ]),
      ) as Record<`align.${AlignEdge}`, UiAction>),
      ...(Object.fromEntries(
        FILTERS.map((f) => [
          `filter.${f.id}`,
          {
            label: f.parameters.length ? `${f.name}…` : f.name,
            enabled: (layer?.kind === "raster" || layer?.kind === "smart") && !layer.locked,
            run: () =>
              f.parameters.length
                ? hosts.openFilterDialog(f.id)
                : layer?.kind === "smart"
                  ? void controller.addSmartFilter(f.id, {})
                  : void controller.applyFilter(f.id, {}),
          },
        ]),
      ) as Record<`filter.${FilterId}`, UiAction>),
      "filter.last": {
        label: lastFilter
          ? `Last Filter (${FILTERS.find((f) => f.id === lastFilter.id)?.name})`
          : "Last Filter",
        enabled: !!lastFilter && layer?.kind === "raster" && !layer.locked,
        run: () => void controller.repeatLastFilter(),
      },
      "help.welcome": { label: "Welcome to MYLPER", enabled: true, run: openWelcome },
      // The website opens in a new tab so the editor and its work stay where they are.
      "help.docs": {
        label: "Documentation",
        enabled: true,
        run: () => window.open("/docs", "_blank", "noopener"),
      },
      "help.blog": {
        label: "Blog",
        enabled: true,
        run: () => window.open("/blog", "_blank", "noopener"),
      },
      "tool.move": tool("move", "Move Tool"),
      "tool.transform": { ...tool("move", "Free Transform"), enabled: canTransform },
      "tool.marquee": tool("marquee", "Marquee Tool"),
      "tool.lasso": tool("lasso", "Lasso Tool"),
      "tool.wand": tool("wand", "Magic Wand Tool"),
      "tool.crop": tool("crop", "Crop Tool"),
      "tool.eyedropper": tool("eyedropper", "Eyedropper Tool"),
      "tool.brush": tool("brush", "Brush Tool"),
      "tool.pencil": tool("pencil", "Pencil Tool"),
      "tool.eraser": tool("eraser", "Eraser Tool"),
      "tool.bucket": tool("bucket", "Paint Bucket Tool"),
      "tool.gradient": tool("gradient", "Gradient Tool"),
      "tool.shape": tool("shape", "Shape Tool"),
      "tool.pen": tool("pen", "Pen Tool"),
      "tool.pathSelect": tool("path-select", "Direct Selection Tool"),
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
  }, [controller, session, hosts, activeTool, colors, view, lastFilter]);
}
