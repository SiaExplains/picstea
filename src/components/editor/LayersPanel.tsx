"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { selectedLayerIds } from "@/editor/core/editor-store";
import {
  moveLayerRelative,
  renameLayer,
  setLayerLocked,
  setLayerVisibility,
  setMaskEnabled,
  type DropPosition,
  setVectorMask,
} from "@/editor/core/commands";
import { flattenTopFirst } from "@/editor/core/document/tree";
import { LAYER_LABELS, type Layer, type LayerLabel } from "@/editor/core/document/types";
import { ContextMenu, type ContextMenuEntry } from "./ContextMenu";
import { hasActiveEffects } from "@/editor/rendering/compositing/effects";
import { useActiveSession, useController, useEditorState } from "./editor-context";
import styles from "./editor.module.css";
import {
  AdjustIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronIcon,
  DuplicateIcon,
  EyeIcon,
  EyeOffIcon,
  FolderIcon,
  ImageIcon,
  LockIcon,
  MaskIcon,
  PlusIcon,
  ShapeIcon,
  TextIcon,
  TrashIcon,
  UnlockIcon,
  PenIcon,
} from "./icons";
import type { UiAction, UiActionId } from "./use-editor-actions";
import { useT } from "./i18n";
import { N_ } from "@/i18n/editor/catalog";

const DRAG_TYPE = "application/x-picstea-layer";

/** Swatches for the colour-label menu; the row tints use the same colours (editor.module.css). */
const LABEL_COLORS: Record<LayerLabel, string> = {
  red: "#d9534f",
  orange: "#e8913a",
  yellow: "#d8c53a",
  green: "#4da26a",
  blue: "#4a86d8",
  violet: "#9a6ad8",
  gray: "#8b8d94",
};

const LABEL_NAMES: Record<LayerLabel, string> = {
  red: N_("Red"),
  orange: N_("Orange"),
  yellow: N_("Yellow"),
  green: N_("Green"),
  blue: N_("Blue"),
  violet: N_("Violet"),
  gray: N_("Grey"),
};

/** Layers that open the Layer Style dialog on double-click. */
const hasLayerStyle = (layer: Layer) => layer.kind !== "group" && layer.kind !== "adjustment";

function LayerThumb({ layer, targeted }: { layer: Layer; targeted: boolean }) {
  const className = `${styles.layerThumb} ${targeted ? styles.thumbTargeted : ""}`;
  switch (layer.kind) {
    case "fill":
      return <span className={className} style={{ background: layer.color }} aria-hidden />;
    case "text":
      return (
        <span className={className} aria-hidden>
          <TextIcon size={12} />
        </span>
      );
    case "shape":
      return (
        <span className={className} aria-hidden>
          <ShapeIcon size={12} />
        </span>
      );
    case "group":
      return (
        <span className={`${className} ${styles.thumbPlain}`} aria-hidden>
          <FolderIcon size={14} />
        </span>
      );
    case "adjustment":
      return (
        <span className={`${className} ${styles.thumbPlain}`} aria-hidden>
          <AdjustIcon size={13} />
        </span>
      );
    case "raster":
      return (
        <span className={className} aria-hidden>
          {layer.assetId && <ImageIcon size={12} />}
        </span>
      );
    case "smart":
      return (
        <span className={`${className} ${styles.thumbSmart}`} aria-hidden>
          <ImageIcon size={12} />
        </span>
      );
  }
}

interface RowProps {
  layer: Layer;
  depth: number;
  clipBase: boolean;
  active: boolean;
  /** Selected together with the active layer (ADR-0020). */
  selected: boolean;
  dimmed: boolean;
  drop: DropPosition | null;
  onDragOverRow: (event: DragEvent<HTMLLIElement>, layer: Layer) => void;
  onDropRow: (event: DragEvent<HTMLLIElement>, layer: Layer) => void;
  onContextMenuRow: (event: MouseEvent<HTMLLIElement>, layer: Layer) => void;
  onOpenStyle: (layer: Layer) => void;
}

function LayerRow({
  layer,
  depth,
  clipBase,
  active,
  selected,
  dimmed,
  drop,
  onDragOverRow,
  onDropRow,
  onContextMenuRow,
  onOpenStyle,
}: RowProps) {
  const controller = useController();
  const editTarget = useEditorState((s) => s.editTarget);
  const t = useT();
  const [editing, setEditing] = useState(false);
  const maskTargeted = active && editTarget === "mask" && !!layer.mask;

  const pointerFocus = useRef(false);

  /** Click selects; Cmd/Ctrl-click adds or removes; Shift-click selects a range. */
  const selectRow = (event: MouseEvent | KeyboardEvent) => {
    if (event.shiftKey) controller.store.selectLayerRange(layer.id);
    else if (event.metaKey || event.ctrlKey) controller.store.toggleLayerSelected(layer.id);
    else controller.store.selectLayer(layer.id);
  };

  const commitRename = (value: string) => {
    setEditing(false);
    if (value.trim() && value !== layer.name) controller.execute(renameLayer(layer.id, value));
  };

  const onNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commitRename(event.currentTarget.value);
    if (event.key === "Escape") setEditing(false);
    event.stopPropagation();
  };

  const classes = [
    styles.layerRow,
    active ? styles.layerRowActive : selected ? styles.layerRowSelected : "",
    dimmed ? styles.layerHidden : "",
    drop === "above" ? styles.dropAbove : "",
    drop === "below" ? styles.dropBelow : "",
    drop === "inside" ? styles.dropInside : "",
  ].join(" ");

  return (
    <li
      className={classes}
      data-testid="layer-row"
      data-layer-name={layer.name}
      data-depth={depth}
      data-clipped={layer.clipped ? "true" : undefined}
      data-selected={selected || active ? "true" : undefined}
      data-label={layer.label}
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, layer.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => onDragOverRow(e, layer)}
      onDrop={(e) => onDropRow(e, layer)}
      onClick={(e) => selectRow(e)}
      onContextMenu={(e) => onContextMenuRow(e, layer)}
      // Double-click a row (not its name, which renames) for the Layer Style dialog.
      onDoubleClick={() => {
        if (!editing && hasLayerStyle(layer)) onOpenStyle(layer);
      }}
      style={{ paddingLeft: 4 + depth * 14 + (layer.clipped ? 14 : 0) }}
    >
      <button
        type="button"
        className={styles.iconButton}
        aria-label={
          layer.visible
            ? t("Hide {name}", { name: layer.name })
            : t("Show {name}", { name: layer.name })
        }
        aria-pressed={!layer.visible}
        title={layer.visible ? t("Hide layer") : t("Show layer")}
        onClick={(e) => {
          e.stopPropagation();
          controller.execute(setLayerVisibility(layer.id, !layer.visible));
        }}
      >
        {layer.visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>
      {layer.clipped && (
        <span className={styles.clipMarker} title={t("Clipped to the layer below")} aria-hidden>
          ↳
        </span>
      )}
      {layer.kind === "group" ? (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={
            layer.expanded
              ? t("Collapse {name}", { name: layer.name })
              : t("Expand {name}", { name: layer.name })
          }
          aria-expanded={layer.expanded}
          onClick={(e) => {
            e.stopPropagation();
            controller.store.setGroupExpanded(layer.id, !layer.expanded);
          }}
        >
          <ChevronIcon open={layer.expanded} size={12} />
        </button>
      ) : null}
      <button
        type="button"
        className={styles.thumbButton}
        aria-label={t("Edit {name} content", { name: layer.name })}
        aria-pressed={active && !maskTargeted}
        title={
          layer.kind === "smart" ? t("Smart object · double-click to edit its contents") : undefined
        }
        onDoubleClick={(e) => {
          if (layer.kind !== "smart") return;
          e.stopPropagation();
          controller.editSmartContents(layer.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          selectRow(e);
          controller.store.setEditTarget("content");
        }}
      >
        <LayerThumb layer={layer} targeted={active && !maskTargeted && !!layer.mask} />
      </button>
      {layer.mask && (
        <button
          type="button"
          className={`${styles.thumbButton} ${styles.maskThumb} ${maskTargeted ? styles.thumbTargeted : ""} ${
            layer.mask.enabled ? "" : styles.maskDisabled
          }`}
          aria-label={
            layer.mask.enabled
              ? t("Edit {name} mask", { name: layer.name })
              : t("Edit {name} mask (disabled)", { name: layer.name })
          }
          aria-pressed={maskTargeted}
          title={t("Click to paint on the mask · Shift-click to enable/disable it")}
          data-testid="mask-thumb"
          onClick={(e) => {
            e.stopPropagation();
            if (e.shiftKey) {
              controller.execute(setMaskEnabled(layer.id, !layer.mask!.enabled));
              return;
            }
            controller.store.selectLayer(layer.id);
            controller.store.setEditTarget("mask");
          }}
        >
          <MaskIcon size={12} />
        </button>
      )}
      {layer.vectorMask && (
        <button
          type="button"
          className={`${styles.thumbButton} ${styles.maskThumb} ${
            layer.vectorMask.enabled ? "" : styles.maskDisabled
          }`}
          aria-label={
            layer.vectorMask.enabled
              ? t("Edit {name} vector mask", { name: layer.name })
              : t("Edit {name} vector mask (disabled)", { name: layer.name })
          }
          title={t("Click to edit the vector mask path · Shift-click to enable/disable it")}
          data-testid="vector-mask-thumb"
          onClick={(e) => {
            e.stopPropagation();
            if (e.shiftKey) {
              controller.execute(
                setVectorMask(
                  layer.id,
                  { ...layer.vectorMask!, enabled: !layer.vectorMask!.enabled },
                  {
                    label: layer.vectorMask!.enabled
                      ? N_("Disable Vector Mask")
                      : N_("Enable Vector Mask"),
                  },
                ),
              );
              return;
            }
            controller.store.selectLayer(layer.id);
            controller.store.setActiveTool("path-select");
          }}
        >
          <PenIcon size={12} />
        </button>
      )}
      {editing ? (
        <input
          className={`${styles.input} ${styles.layerRename}`}
          defaultValue={layer.name}
          aria-label={t("Layer name")}
          maxLength={255}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => commitRename(e.currentTarget.value)}
          onKeyDown={onNameKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        // A span, not a <button>: browsers will not start a drag from a button, and the name is
        // the natural handle for reordering. role/tabIndex/keys keep it a proper button for AT.
        <span
          role="button"
          tabIndex={0}
          className={styles.layerName}
          draggable
          aria-label={layer.name}
          aria-describedby="layer-rename-hint"
          aria-current={active ? "true" : undefined}
          title={t("Double-click the name to rename")}
          onDoubleClick={(e) => {
            // The name renames; the rest of the row opens the Layer Style dialog.
            e.stopPropagation();
            setEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "F2") setEditing(true);
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectRow(e);
            }
          }}
          // Pointer clicks select through the row (with Cmd/Ctrl/Shift); focus selects only when
          // it comes from the keyboard, so a modified click isn't undone by the focus first.
          onPointerDown={() => {
            pointerFocus.current = true;
          }}
          onPointerUp={() => {
            pointerFocus.current = false;
          }}
          onBlur={() => {
            pointerFocus.current = false;
          }}
          onFocus={() => {
            if (!pointerFocus.current) controller.store.selectLayer(layer.id);
            pointerFocus.current = false;
          }}
        >
          <span className={clipBase ? styles.clipBase : undefined}>{layer.name}</span>
          {layer.clipped && <span className={styles.srOnly}> {t("(clipped)")}</span>}
        </span>
      )}
      {hasActiveEffects(layer.effects) && (
        <span
          className={styles.fxBadge}
          title={t("Layer effects")}
          aria-label={t("Has layer effects")}
        >
          fx
        </span>
      )}
      <button
        type="button"
        className={styles.iconButton}
        aria-label={
          layer.locked
            ? t("Unlock {name}", { name: layer.name })
            : t("Lock {name}", { name: layer.name })
        }
        aria-pressed={layer.locked}
        title={layer.locked ? t("Unlock layer") : t("Lock layer")}
        onClick={(e) => {
          e.stopPropagation();
          controller.execute(setLayerLocked(layer.id, !layer.locked));
        }}
      >
        {layer.locked ? <LockIcon /> : <UnlockIcon />}
      </button>
    </li>
  );
}

/** Which part of a row the pointer is over: top quarter = above, bottom = below, middle of a group = inside. */
function dropZone(event: DragEvent<HTMLElement>, layer: Layer): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  const y = (event.clientY - rect.top) / rect.height;
  if (layer.kind === "group") return y < 0.25 ? "above" : y > 0.75 ? "below" : "inside";
  return y < 0.5 ? "above" : "below";
}

export function LayersPanel({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const controller = useController();
  const session = useActiveSession();
  const doc = session?.document;
  const rows = doc ? flattenTopFirst(doc.layers) : [];
  const selectedIds = selectedLayerIds(session);
  const selected = new Set(selectedIds.length > 1 ? selectedIds : []);
  const [drop, setDrop] = useState<{ id: string; position: DropPosition } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [dropOn, setDropOn] = useState<"delete" | "duplicate" | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const t = useT();

  /** Make a dragged layer part of the selection, keeping a multi-selection it already belongs to. */
  const selectDragged = (id: string) => {
    if (!selectedLayerIds(controller.store.getSession()).includes(id)) {
      controller.store.selectLayer(id);
    }
  };

  /** Drop layers on the trash to delete them, or on New layer to duplicate them. */
  const dropHandlers = (kind: "delete" | "duplicate") => ({
    onDragOver: (event: DragEvent<HTMLButtonElement>) => {
      if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = kind === "delete" ? "move" : "copy";
      if (dropOn !== kind) setDropOn(kind);
    },
    onDragLeave: () => setDropOn(null),
    onDrop: (event: DragEvent<HTMLButtonElement>) => {
      const draggedId = event.dataTransfer.getData(DRAG_TYPE);
      setDropOn(null);
      setDrop(null);
      if (!draggedId) return;
      event.preventDefault();
      selectDragged(draggedId);
      if (kind === "delete") controller.deleteSelectedLayers();
      else controller.duplicateActiveLayer();
    },
  });

  const toolbarButton = (
    id: UiActionId,
    icon: React.ReactNode,
    dropKind?: "delete" | "duplicate",
  ) => (
    <button
      type="button"
      className={`${styles.iconButton} ${dropKind && dropOn === dropKind ? styles.dropTarget : ""}`}
      aria-label={t(actions[id].label)}
      title={
        dropKind === "delete"
          ? t("{label} (or drop layers here)", { label: t(actions[id].label) })
          : dropKind === "duplicate"
            ? t("{label} (drop layers here to duplicate them)", { label: t(actions[id].label) })
            : t(actions[id].label)
      }
      disabled={!actions[id].enabled && !dropKind}
      onClick={actions[id].enabled ? actions[id].run : undefined}
      {...(dropKind ? dropHandlers(dropKind) : {})}
    >
      {icon}
    </button>
  );

  const onContextMenuRow = (event: MouseEvent<HTMLLIElement>, layer: Layer) => {
    event.preventDefault();
    event.stopPropagation();
    // As in Photoshop: right-clicking outside the selection selects that layer first.
    selectDragged(layer.id);
    setMenu({ x: event.clientX, y: event.clientY });
  };

  const openStyle = (layer: Layer) => {
    controller.store.selectLayer(layer.id);
    actions["layer.style"].run();
  };

  const item = (id: UiActionId, label = actions[id].label): ContextMenuEntry => ({
    kind: "item",
    label: t(label),
    enabled: actions[id].enabled,
    run: actions[id].run,
  });
  const active = doc?.activeLayerId
    ? rows.find((r) => r.layer.id === doc.activeLayerId)?.layer
    : undefined;
  const menuItems: ContextMenuEntry[] = [
    item("layer.style"),
    item("layer.selectPixels"),
    { kind: "separator" },
    {
      kind: "item",
      label: t("Duplicate Layer"),
      enabled: !!active,
      run: () => controller.duplicateActiveLayer(),
    },
    {
      kind: "item",
      label: t("Delete"),
      enabled: !!active,
      run: () => controller.deleteSelectedLayers(),
    },
    { kind: "separator" },
    item("layer.toSmartObject"),
    ...(active?.kind === "smart" ? [item("layer.editContents")] : []),
    { kind: "separator" },
    item("layer.rasterize"),
    item("layer.rasterizeStyle"),
    { kind: "separator" },
    item("layer.clip"),
    { kind: "separator" },
    item("layer.mergeDown"),
    item("layer.flatten"),
    { kind: "separator" },
    {
      kind: "submenu",
      label: t("Color"),
      items: [
        {
          kind: "item",
          label: t("No Color"),
          enabled: true,
          checked: !active?.label,
          run: () => controller.setSelectedLayersLabel(null),
        },
        ...LAYER_LABELS.map((label): ContextMenuEntry => ({
          kind: "item",
          label: t(LABEL_NAMES[label]),
          enabled: true,
          checked: active?.label === label,
          icon: (
            <span
              className={styles.labelSwatch}
              style={{ background: LABEL_COLORS[label] }}
              aria-hidden
            />
          ),
          run: () => controller.setSelectedLayersLabel(label),
        })),
      ],
    },
  ];

  const onDragOverRow = (event: DragEvent<HTMLLIElement>, layer: Layer) => {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    const position = dropZone(event, layer);
    if (drop?.id !== layer.id || drop.position !== position) setDrop({ id: layer.id, position });
  };

  const onDropRow = (event: DragEvent<HTMLLIElement>, layer: Layer) => {
    const draggedId = event.dataTransfer.getData(DRAG_TYPE);
    setDrop(null);
    if (!draggedId) return;
    event.preventDefault();
    event.stopPropagation();
    controller.execute(moveLayerRelative(draggedId, layer.id, dropZone(event, layer)));
  };

  return (
    <section
      className={`${styles.panel} ${styles.panelGrow}`}
      aria-labelledby="layers-heading"
      data-panel="layers"
    >
      <h2 id="layers-heading" className={styles.panelHeader}>
        {t("Layers")}
      </h2>
      {doc && rows.length === 0 && (
        <p className={`${styles.panelBody} ${styles.muted}`}>{t("No layers. Add one below.")}</p>
      )}
      {!doc && <p className={`${styles.panelBody} ${styles.muted}`}>{t("No document open.")}</p>}
      <p id="layer-rename-hint" className={styles.srOnly}>
        {t(
          "Double-click the name or press F2 to rename; double-click elsewhere on the row for layer styles. Drag to reorder, into a group, onto the trash to delete or onto New layer to duplicate. Right-click for more. Cmd or Ctrl-click adds a layer to the selection; Shift-click selects a range.",
        )}
      </p>
      {selected.size > 1 && (
        <p className={styles.srOnly} role="status">
          {t("{count} layers selected", { count: selected.size })}
        </p>
      )}
      <ul
        className={styles.layerList}
        aria-label={t("Layers")}
        onDragEnd={() => {
          setDrop(null);
          setDropOn(null);
        }}
      >
        {rows.map(({ layer, depth, effectivelyVisible }, i) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            depth={depth}
            // Rows are top first: a layer is a clipping base when the sibling above it is clipped.
            clipBase={
              !layer.clipped && rows[i - 1]?.depth === depth && !!rows[i - 1]?.layer.clipped
            }
            active={layer.id === doc?.activeLayerId}
            selected={selected.has(layer.id)}
            dimmed={!effectivelyVisible}
            drop={drop?.id === layer.id ? drop.position : null}
            onDragOverRow={onDragOverRow}
            onDropRow={onDropRow}
            onContextMenuRow={onContextMenuRow}
            onOpenStyle={openStyle}
          />
        ))}
      </ul>
      <div className={styles.layerToolbar}>
        {toolbarButton("layer.moveUp", <ArrowUpIcon />)}
        {toolbarButton("layer.moveDown", <ArrowDownIcon />)}
        {toolbarButton("layer.addMask", <MaskIcon />)}
        {toolbarButton("layer.newGroup", <FolderIcon />)}
        {toolbarButton("layer.duplicate", <DuplicateIcon />)}
        {toolbarButton("layer.new", <PlusIcon />, "duplicate")}
        {toolbarButton("layer.delete", <TrashIcon />, "delete")}
      </div>
      {menu && doc && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={t("Layer")}
          items={menuItems}
          onClose={closeMenu}
        />
      )}
    </section>
  );
}
