"use client";

import { useState, type KeyboardEvent } from "react";
import { renameLayer, setLayerLocked, setLayerVisibility } from "@/editor/core/commands";
import type { Layer } from "@/editor/core/document/types";
import { useActiveSession, useController } from "./editor-context";
import styles from "./editor.module.css";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DuplicateIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  LockIcon,
  PlusIcon,
  ShapeIcon,
  TextIcon,
  TrashIcon,
  UnlockIcon,
} from "./icons";
import type { UiAction, UiActionId } from "./use-editor-actions";

function LayerThumb({ layer }: { layer: Layer }) {
  switch (layer.kind) {
    case "fill":
      return <span className={styles.layerThumb} style={{ background: layer.color }} aria-hidden />;
    case "text":
      return (
        <span className={styles.layerThumb} aria-hidden>
          <TextIcon size={12} />
        </span>
      );
    case "shape":
      return (
        <span className={styles.layerThumb} aria-hidden>
          <ShapeIcon size={12} />
        </span>
      );
    case "raster":
      return (
        <span className={styles.layerThumb} aria-hidden>
          {layer.assetId && <ImageIcon size={12} />}
        </span>
      );
  }
}

function LayerRow({ layer, active }: { layer: Layer; active: boolean }) {
  const controller = useController();
  const [editing, setEditing] = useState(false);

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
    layer.visible ? "" : styles.layerHidden,
  ].join(" ");

  return (
    <li
      className={classes}
      data-testid="layer-row"
      data-layer-name={layer.name}
      onClick={() => controller.store.selectLayer(layer.id)}
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
      <LayerThumb layer={layer} />
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
        <button
          type="button"
          className={styles.layerName}
          aria-label={layer.name}
          aria-describedby="layer-rename-hint"
          aria-current={active ? "true" : undefined}
          title="Double-click to rename"
          onDoubleClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "F2") setEditing(true);
          }}
          onFocus={() => controller.store.selectLayer(layer.id)}
        >
          {layer.name}
        </button>
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

export function LayersPanel({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const session = useActiveSession();
  const doc = session?.document;
  // Display top-most layer first, as layer panels conventionally do.
  const layers = doc ? [...doc.layers].reverse() : [];

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

  return (
    <section className={`${styles.panel} ${styles.panelGrow}`} aria-labelledby="layers-heading">
      <h2 id="layers-heading" className={styles.panelHeader}>
        Layers
      </h2>
      {doc && layers.length === 0 && (
        <p className={`${styles.panelBody} ${styles.muted}`}>No layers. Add one below.</p>
      )}
      {!doc && <p className={`${styles.panelBody} ${styles.muted}`}>No document open.</p>}
      <p id="layer-rename-hint" className={styles.srOnly}>
        Double-click or press F2 to rename.
      </p>
      <ul className={styles.layerList} aria-label="Layers">
        {layers.map((layer) => (
          <LayerRow key={layer.id} layer={layer} active={layer.id === doc?.activeLayerId} />
        ))}
      </ul>
      <div className={styles.layerToolbar}>
        {toolbarButton("layer.moveUp", <ArrowUpIcon />)}
        {toolbarButton("layer.moveDown", <ArrowDownIcon />)}
        {toolbarButton("layer.duplicate", <DuplicateIcon />)}
        {toolbarButton("layer.new", <PlusIcon />)}
        {toolbarButton("layer.delete", <TrashIcon />)}
      </div>
    </section>
  );
}
