"use client";

import { useMemo, useSyncExternalStore } from "react";
import { FILTERS, type FilterId } from "@/editor/filters/registry";
import type { AlignEdge } from "@/editor/core/geometry/snapping";
import { ALIGN_LABELS } from "@/editor/controller/editor-controller";
import { mergeTarget, shiftLayer } from "@/editor/core/commands";
import { selectedLayerIds } from "@/editor/core/editor-store";
import { DISTRIBUTE_LABELS, type DistributeMode } from "@/editor/core/geometry/multi-transform";
import { ADJUSTMENTS } from "@/editor/adjustments/registry";
import { activeLayer } from "@/editor/core/document/queries";
import { flattenTopFirst, locateLayer } from "@/editor/core/document/tree";
import type { SelectionModification } from "@/editor/core/commands";
import {
  LAYER_LABELS,
  type AdjustmentType,
  type LayerLabel,
  type SmartFilter,
} from "@/editor/core/document/types";
import { showPanel, type PanelName } from "./show-panel";
import { isTransformable } from "@/editor/core/geometry/layer-geometry";
import type { ActionId } from "@/editor/core/shortcuts/shortcuts";
import { DEFAULT_COLORS } from "@/editor/core/tool-settings";
import { activateMember, nextMember, rememberedTool, TOOL_GROUPS } from "@/editor/core/tool-groups";
import { openWelcome } from "@/components/welcome/welcome";
import { PRIVACY_SETTINGS_URL } from "@/lib/consent/consent";
import { promptInstall } from "@/lib/pwa/pwa";
import { useInstallState } from "@/components/pwa/PwaStart";
import type { EditorController } from "@/editor/controller/editor-controller";
import { PROJECT_MIME } from "@/editor/formats/project/project-file";
import { useActiveSession, useController, useEditorState } from "./editor-context";
import { saveFile } from "./save-file";

export type UiActionId =
  | ActionId
  | `adjust.${AdjustmentType}`
  | `filter.${FilterId}`
  | "filter.liquify"
  | "filter.vanishingPoint"
  | `align.${AlignEdge}`
  | `distribute.${DistributeMode}`
  | "select.deselectLayers"
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
  | "layer.rasterizeStyle"
  | "layer.flatten"
  | "layer.selectPixels"
  | "layer.style"
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
  | "help.blog"
  | "help.shortcuts"
  | "help.privacy"
  | "help.install"
  | "help.about"
  | "layer.viaCopy"
  | `label.${LayerLabel | "none"}`
  | "edit.copyMerged"
  | "edit.stroke"
  | "select.grow"
  | "select.similar"
  | `window.${PanelName}`
  | "image.size"
  | "image.canvasSize"
  | "image.rotateCw"
  | "image.rotateCcw"
  | "image.rotate180"
  | "image.flipH"
  | "image.flipV"
  | "image.trim"
  | "image.revealAll"
  | "image.autoColor"
  | "image.duplicate";

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
  /** Filter → Liquify… / Vanishing Point…: interactive editors with their own dialogs. */
  openPixelEditor: (kind: "liquify" | "vanishingPoint") => void;
  openGuideDialog: () => void;
  openGridDialog: () => void;
  openWorkPathDialog: () => void;
  openBatchDialog: () => void;
  openSmartFilterDialog: (layerId: string, filter: SmartFilter) => void;
  /** Layer → Blending Options… / double-click a layer: the Layer Style dialog. */
  openLayerStyle: () => void;
  /** Help → Install Picstea… when the browser has no install prompt to show. */
  openInstallDialog: () => void;
  openStrokeDialog: () => void;
  openImageSizeDialog: () => void;
  openCanvasSizeDialog: () => void;
  openTrimDialog: () => void;
}

/** Download the active document as a portable `.picstea` file (File → Save Project As…). */
async function saveProjectFile(controller: EditorController): Promise<void> {
  const result = await controller.saveProjectFile();
  if (!result.ok) return;
  const saved = await saveFile(result.blob, result.filename, PROJECT_MIME, "Picstea project");
  if (saved === "saved") controller.notify("info", `Saved ${result.filename}`);
  if (saved === "failed") controller.notify("error", "The project file could not be saved.");
}

/** Every user-invokable editor action, shared by menus, toolbar buttons and shortcuts. */
export function useEditorActions(hosts: ActionHosts): Record<UiActionId, UiAction> {
  const controller = useController();
  const { installed } = useInstallState();
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
    const selectedCount = selectedLayerIds(session).length;
    const multiSelected = selectedCount > 1;
    // Several layers, or a group, flip together about their shared centre.
    const canTransform =
      !!layer &&
      (isTransformable(layer) || multiSelected || layer.kind === "group") &&
      !layer.locked;
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
    // A toolbar group's key: the last tool used in it; Shift + key: the next one (ADR-0027).
    const groupTool = (groupId: string, label: string) => {
      const group = TOOL_GROUPS.find((g) => g.id === groupId)!;
      return {
        label,
        enabled: true,
        run: () =>
          controller.store.setActiveTool(rememberedTool(group, controller.store.getState())),
      };
    };
    const nextTool = (groupId: string, label: string) => {
      const group = TOOL_GROUPS.find((g) => g.id === groupId)!;
      return {
        label,
        enabled: true,
        run: () => {
          const state = controller.store.getState();
          activateMember(controller.store, nextMember(group, state, rememberedTool(group, state)));
        },
      };
    };

    // Layer → Colour Label: tags the selected layers in the Layers panel.
    const labelActions = () =>
      Object.fromEntries(
        (["none", ...LAYER_LABELS] as const).map((label) => [
          `label.${label}`,
          {
            label: label === "none" ? "No Colour" : label[0].toUpperCase() + label.slice(1),
            enabled: selectedCount > 0,
            checked: (layer?.label ?? "none") === label,
            run: () => controller.setSelectedLayersLabel(label === "none" ? null : label),
          },
        ]),
      ) as Record<`label.${LayerLabel | "none"}`, UiAction>;

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
      "image.size": { label: "Image Size…", enabled: hasDoc, run: hosts.openImageSizeDialog },
      "image.canvasSize": {
        label: "Canvas Size…",
        enabled: hasDoc,
        run: hosts.openCanvasSizeDialog,
      },
      "image.rotateCw": {
        label: "90° Clockwise",
        enabled: hasDoc,
        run: () => void controller.transformImage({ kind: "rotate", turns: 1 }),
      },
      "image.rotateCcw": {
        label: "90° Counter-Clockwise",
        enabled: hasDoc,
        run: () => void controller.transformImage({ kind: "rotate", turns: 3 }),
      },
      "image.rotate180": {
        label: "180°",
        enabled: hasDoc,
        run: () => void controller.transformImage({ kind: "rotate", turns: 2 }),
      },
      "image.flipH": {
        label: "Flip Canvas Horizontal",
        enabled: hasDoc,
        run: () => void controller.transformImage({ kind: "flip", axis: "horizontal" }),
      },
      "image.flipV": {
        label: "Flip Canvas Vertical",
        enabled: hasDoc,
        run: () => void controller.transformImage({ kind: "flip", axis: "vertical" }),
      },
      "image.trim": { label: "Trim…", enabled: hasDoc, run: hosts.openTrimDialog },
      "image.revealAll": {
        label: "Reveal All",
        enabled: hasDoc,
        run: () => controller.revealAll(),
      },
      "image.autoTone": {
        label: "Auto Tone",
        enabled: hasDoc,
        run: () => controller.autoAdjust("tone"),
      },
      "image.autoContrast": {
        label: "Auto Contrast",
        enabled: hasDoc,
        run: () => controller.autoAdjust("contrast"),
      },
      "image.autoColor": {
        label: "Auto Color",
        enabled: hasDoc,
        run: () => controller.autoAdjust("color"),
      },
      "image.duplicate": {
        label: "Duplicate",
        enabled: hasDoc,
        run: () => controller.duplicateDocument(),
      },
      "edit.copyMerged": {
        label: "Copy Merged",
        enabled: hasSelection,
        run: () => void controller.copyMerged(),
      },
      "edit.stroke": {
        label: "Stroke…",
        enabled: !!onPixels,
        run: hosts.openStrokeDialog,
      },
      "select.grow": {
        label: "Grow",
        enabled: hasSelection,
        run: () => controller.growSelection(true),
      },
      "select.similar": {
        label: "Similar",
        enabled: hasSelection,
        run: () => controller.growSelection(false),
      },
      "layer.viaCopy": {
        label: "Layer via Copy",
        enabled: hasSelection && !!layer && layer.kind !== "adjustment" && layer.kind !== "group",
        run: () => controller.layerViaCopy(),
      },
      ...labelActions(),
      "window.layers": { label: "Layers", enabled: true, run: () => showPanel("layers") },
      "window.properties": {
        label: "Properties",
        enabled: true,
        run: () => showPanel("properties"),
      },
      "window.history": { label: "History", enabled: true, run: () => showPanel("history") },
      "window.swatches": { label: "Swatches", enabled: true, run: () => showPanel("swatches") },
      "window.actions": { label: "Actions", enabled: true, run: () => showPanel("actions") },
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
        label: multiSelected ? "Delete Layers" : "Delete Layer",
        enabled: !!activeId,
        run: () =>
          hasSelection ? void controller.clearSelection() : controller.deleteSelectedLayers(),
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
      "select.allLayers": {
        label: "All Layers",
        enabled: hasDoc,
        run: () => controller.store.selectAllLayers(),
      },
      "select.deselectLayers": {
        label: "Deselect Layers",
        enabled: multiSelected,
        run: () => activeId && controller.store.selectLayer(activeId),
      },
      "layer.group": {
        label: multiSelected ? "Group Layers" : "Group Layer",
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
      "layer.mergeDown": {
        label: "Merge Down",
        enabled: !!doc && !!layer && !layer.locked && !!mergeTarget(doc, layer.id),
        run: () => controller.mergeActiveDown(),
      },
      "layer.flatten": {
        label: "Flatten Image",
        enabled: !!doc && doc.layers.length > 0,
        run: () => controller.flattenImage(),
      },
      "layer.rasterizeStyle": {
        label: "Rasterize Layer Style",
        enabled:
          !!layer &&
          !layer.locked &&
          !!layer.effects &&
          layer.kind !== "group" &&
          layer.kind !== "adjustment",
        run: () => controller.rasterizeActiveLayerStyle(),
      },
      "layer.selectPixels": {
        label: "Select Pixels",
        enabled: !!layer && layer.kind !== "adjustment",
        run: () => controller.selectLayerPixels(),
      },
      "layer.style": {
        label: "Blending Options…",
        enabled: !!layer && !layer.locked && layer.kind !== "adjustment",
        run: () => hosts.openLayerStyle(),
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
            run: () =>
              a.type === "gradient-map"
                ? // A new Gradient Map runs from the foreground to the background colour.
                  controller.addAdjustmentLayer(a.type, {
                    type: "gradient-map",
                    stops: [
                      { position: 0, color: colors.foreground },
                      { position: 1, color: colors.background },
                    ],
                    reverse: false,
                  })
                : controller.addAdjustmentLayer(a.type),
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
        (Object.keys(DISTRIBUTE_LABELS) as DistributeMode[]).map((mode) => [
          `distribute.${mode}`,
          {
            label: DISTRIBUTE_LABELS[mode],
            enabled: selectedCount >= 3,
            run: () => controller.distributeSelectedLayers(mode),
          },
        ]),
      ) as Record<`distribute.${DistributeMode}`, UiAction>),
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
      "filter.liquify": {
        label: "Liquify…",
        enabled: layer?.kind === "raster" && !layer.locked,
        run: () => hosts.openPixelEditor("liquify"),
      },
      "filter.vanishingPoint": {
        label: "Vanishing Point…",
        enabled: layer?.kind === "raster" && !layer.locked,
        run: () => hosts.openPixelEditor("vanishingPoint"),
      },
      "filter.last": {
        label: lastFilter
          ? `Last Filter (${FILTERS.find((f) => f.id === lastFilter.id)?.name})`
          : "Last Filter",
        enabled: !!lastFilter && layer?.kind === "raster" && !layer.locked,
        run: () => void controller.repeatLastFilter(),
      },
      "help.welcome": { label: "Welcome to Picstea", enabled: true, run: openWelcome },
      "help.about": {
        label: "About Picstea",
        enabled: true,
        run: () => window.open("/about", "_blank", "noopener"),
      },
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
      "help.shortcuts": {
        label: "Keyboard Shortcuts",
        enabled: true,
        run: () => window.open("/docs/keyboard-shortcuts", "_blank", "noopener"),
      },
      // The editor loads no consent vendors; the choices apply to the website, managed there.
      "help.install": {
        label: installed ? "Installed as an App" : "Install Picstea…",
        enabled: !installed,
        run: () => {
          void promptInstall().then((shown) => {
            if (!shown) hosts.openInstallDialog();
          });
        },
      },
      "help.privacy": {
        label: "Privacy Settings…",
        enabled: true,
        run: () => window.open(PRIVACY_SETTINGS_URL, "_blank", "noopener"),
      },
      "tool.move": tool("move", "Move Tool"),
      "tool.transform": { ...tool("move", "Free Transform"), enabled: canTransform },
      "tool.marquee": groupTool("marquee", "Marquee Tool"),
      "tool.lasso": groupTool("lasso", "Lasso Tool"),
      "tool.wand": tool("wand", "Magic Wand Tool"),
      "tool.crop": tool("crop", "Crop Tool"),
      "tool.eyedropper": groupTool("eyedropper", "Eyedropper Tool"),
      "tool.brush": groupTool("brush", "Brush Tool"),
      "tool.pencil": tool("pencil", "Pencil Tool"),
      "tool.eraser": groupTool("eraser", "Eraser Tool"),
      "tool.clone": tool("clone", "Clone Stamp Tool"),
      "tool.heal": groupTool("heal", "Healing Brush Tool"),
      "tool.tone": groupTool("tone", "Dodge, Burn and Sponge Tool"),
      "tool.focus": groupTool("focus", "Blur, Sharpen and Smudge Tool"),
      "tool.bucket": tool("bucket", "Paint Bucket Tool"),
      "tool.gradient": groupTool("gradient", "Gradient Tool"),
      "tool.shape": groupTool("shape", "Shape Tool"),
      "tool.pen": groupTool("pen", "Pen Tool"),
      "tool.pathSelect": groupTool("path-select", "Path and Direct Selection Tools"),
      "tool.text": tool("text", "Text Tool"),
      "tool.hand": tool("hand", "Hand Tool"),
      "tool.zoom": tool("zoom", "Zoom Tool"),
      "tool.next.marquee": nextTool("marquee", "Next Marquee Tool"),
      "tool.next.lasso": nextTool("lasso", "Next Lasso Tool"),
      "tool.next.eyedropper": nextTool("eyedropper", "Next Eyedropper, Sampler or Ruler"),
      "tool.next.heal": nextTool("heal", "Next Healing Tool"),
      "tool.next.brush": nextTool("brush", "Next Brush Tool"),
      "tool.next.eraser": nextTool("eraser", "Next Eraser Tool"),
      "tool.next.gradient": nextTool("gradient", "Gradient or Paint Bucket"),
      "tool.next.focus": nextTool("focus", "Next of Blur, Sharpen, Smudge"),
      "tool.next.tone": nextTool("tone", "Next of Dodge, Burn, Sponge"),
      "tool.next.pen": nextTool("pen", "Next Pen Tool"),
      "tool.next.pathSelect": nextTool("path-select", "Path or Direct Selection"),
      "tool.next.shape": nextTool("shape", "Next Shape Tool"),
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
  }, [controller, session, hosts, activeTool, colors, view, lastFilter, installed]);
}
