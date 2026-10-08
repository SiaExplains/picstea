"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";
import {
  moveLayerRelative,
  renameLayer,
  setLayerLocked,
  setLayerVisibility,
  setMaskEnabled,
  type DropPosition,
} from "@/editor/core/commands";
import { flattenTopFirst } from "@/editor/core/document/tree";
import type { Layer } from "@/editor/core/document/types";
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
} from "./icons";
import type { UiAction, UiActionId } from "./use-editor-actions";

const DRAG_TYPE = "application/x-mylper-layer";

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
  }
}

interface RowProps {
  layer: Layer;
  depth: number;
  active: boolean;
  dimmed: boolean;
  drop: DropPosition | null;
  onDragOverRow: (event: DragEvent<HTMLLIElement>, layer: Layer) => void;
  onDropRow: (event: DragEvent<HTMLLIElement>, layer: Layer) => void;
}

function LayerRow({ layer, depth, active, dimmed, drop, onDragOverRow, onDropRow }: RowProps) {
  const controller = useController();
  const editTarget = useEditorState((s) => s.editTarget);
  const [editing, setEditing] = useState(false);
  const maskTargeted = active && editTarget === "mask" && !!layer.mask;

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
    active ? styles.layerRowActive : "",
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
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, layer.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => onDragOverRow(e, layer)}
      onDrop={(e) => onDropRow(e, layer)}
      onClick={() => controller.store.selectLayer(layer.id)}
      style={{ paddingLeft: 4 + depth * 14 }}
    >
      <button
        type="button"
        className={styles.iconButton}
        aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
        aria-pressed={!layer.visible}
        title={layer.visible ? "Hide layer" : "Show layer"}
        onClick={(e) => {
          e.stopPropagation();
          controller.execute(setLayerVisibility(layer.id, !layer.visible));
        }}
      >
        {layer.visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>
      {layer.kind === "group" ? (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={layer.expanded ? `Collapse ${layer.name}` : `Expand ${layer.name}`}
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
        aria-label={`Edit ${layer.name} content`}
        aria-pressed={active && !maskTargeted}
        onClick={(e) => {
          e.stopPropagation();
          controller.store.selectLayer(layer.id);
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
          aria-label={`Edit ${layer.name} mask${layer.mask.enabled ? "" : " (disabled)"}`}
          aria-pressed={maskTargeted}
          title="Click to paint on the mask · Shift-click to enable/disable it"
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
      {editing ? (
        <input
          className={`${styles.input} ${styles.layerRename}`}
          defaultValue={layer.name}
          aria-label="Layer name"
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
          title="Double-click to rename"
          onDoubleClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "F2") setEditing(true);
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              controller.store.selectLayer(layer.id);
            }
          }}
          onFocus={() => controller.store.selectLayer(layer.id)}
        >
          {layer.name}
        </span>
      )}
      {hasActiveEffects(layer.effects) && (
        <span className={styles.fxBadge} title="Layer effects" aria-label="Has layer effects">
          fx
        </span>
      )}
      <button
        type="button"
        className={styles.iconButton}
        aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
        aria-pressed={layer.locked}
        title={layer.locked ? "Unlock layer" : "Lock layer"}
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
  const [drop, setDrop] = useState<{ id: string; position: DropPosition } | null>(null);

  const toolbarButton = (id: UiActionId, icon: React.ReactNode) => (
    <button
      type="button"
      className={styles.iconButton}
      aria-label={actions[id].label}
      title={actions[id].label}
      disabled={!actions[id].enabled}
      onClick={actions[id].run}
    >
      {icon}
    </button>
  );

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
    <section className={`${styles.panel} ${styles.panelGrow}`} aria-labelledby="layers-heading">
      <h2 id="layers-heading" className={styles.panelHeader}>
        Layers
      </h2>
      {doc && rows.length === 0 && (
        <p className={`${styles.panelBody} ${styles.muted}`}>No layers. Add one below.</p>
      )}
      {!doc && <p className={`${styles.panelBody} ${styles.muted}`}>No document open.</p>}
      <p id="layer-rename-hint" className={styles.srOnly}>
        Double-click or press F2 to rename. Drag to reorder or to move into a group.
      </p>
      <ul className={styles.layerList} aria-label="Layers" onDragEnd={() => setDrop(null)}>
        {rows.map(({ layer, depth, effectivelyVisible }) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            depth={depth}
            active={layer.id === doc?.activeLayerId}
            dimmed={!effectivelyVisible}
            drop={drop?.id === layer.id ? drop.position : null}
            onDragOverRow={onDragOverRow}
            onDropRow={onDropRow}
          />
        ))}
      </ul>
      <div className={styles.layerToolbar}>
        {toolbarButton("layer.moveUp", <ArrowUpIcon />)}
        {toolbarButton("layer.moveDown", <ArrowDownIcon />)}
        {toolbarButton("layer.addMask", <MaskIcon />)}
        {toolbarButton("layer.newGroup", <FolderIcon />)}
        {toolbarButton("layer.duplicate", <DuplicateIcon />)}
        {toolbarButton("layer.new", <PlusIcon />)}
        {toolbarButton("layer.delete", <TrashIcon />)}
      </div>
    </section>
  );
}
