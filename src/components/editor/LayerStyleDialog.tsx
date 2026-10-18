"use client";

import { useEffect, useRef, useState } from "react";
import { setLayerBlendMode, setLayerOpacity } from "@/editor/core/commands";
import { BLEND_MODES, type BlendMode, type EffectKind } from "@/editor/core/document/types";
import { findLayer } from "@/editor/core/document/queries";
import { useActiveSession, useController } from "./editor-context";
import { BLEND_LABELS } from "./PropertiesPanel";
import { EFFECT_LABELS, EffectControls, useEffectUpdate } from "./StyleSections";
import styles from "./editor.module.css";

type Page = "blending" | EffectKind;

const EFFECT_KINDS = Object.keys(EFFECT_LABELS) as EffectKind[];

/**
 * Layer → Blending Options… / double-click a layer (Photoshop's Layer Style dialog): blending and
 * every layer effect on one screen. Changes show live; OK keeps them as one undo step, Cancel
 * puts the layer back as it was.
 */
export function LayerStyleDialog({ layerId, onClose }: { layerId: string; onClose: () => void }) {
  const controller = useController();
  const session = useActiveSession();
  const ref = useRef<HTMLDialogElement>(null);
  // Where history stood when the dialog opened, to fold or roll back everything done in it.
  const [start] = useState(() => {
    controller.store.sealHistory();
    const s = controller.store.getSession();
    return s ? { document: s.document, pastLength: s.history.past.length } : null;
  });
  const [page, setPage] = useState<Page>("blending");
  const layer = session ? findLayer(session.document, layerId) : undefined;
  const update = useEffectUpdate(layer);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // The layer was deleted (e.g. undone) underneath the dialog: nothing left to edit.
  useEffect(() => {
    if (!layer) onClose();
  }, [layer, onClose]);

  const finish = (keep: boolean) => {
    if (start) {
      controller.store.sealHistory();
      controller.store.collapseHistory(start.document, "Layer Style");
      if (!keep) {
        controller.store.goToHistory(start.pastLength);
        controller.store.discardRedo();
      }
    }
    onClose();
  };

  if (!layer || layer.kind === "group" || layer.kind === "adjustment") return null;
  const effects = layer.effects ?? {};

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles.layerStyleDialog}`}
      aria-labelledby="layer-style-title"
      onCancel={(e) => {
        e.preventDefault();
        finish(false);
      }}
    >
      <form
        className={styles.dialogForm}
        onSubmit={(e) => {
          e.preventDefault();
          finish(true);
        }}
      >
        <h2 id="layer-style-title" className={styles.dialogTitle}>
          Layer Style — {layer.name}
        </h2>
        <div className={styles.layerStyleBody}>
          <ul className={styles.layerStyleList} aria-label="Styles">
            <li>
              <button
                type="button"
                className={styles.layerStylePage}
                aria-current={page === "blending" ? "true" : undefined}
                onClick={() => setPage("blending")}
              >
                Blending Options
              </button>
            </li>
            {EFFECT_KINDS.map((kind) => (
              <li key={kind} className={styles.layerStyleItem}>
                <input
                  type="checkbox"
                  aria-label={`Use ${EFFECT_LABELS[kind]}`}
                  checked={!!effects[kind]?.enabled}
                  onChange={(e) => {
                    update(kind, { enabled: e.target.checked });
                    controller.store.sealHistory();
                    if (e.target.checked) setPage(kind);
                  }}
                />
                <button
                  type="button"
                  className={styles.layerStylePage}
                  aria-current={page === kind ? "true" : undefined}
                  onClick={() => setPage(kind)}
                >
                  {EFFECT_LABELS[kind]}
                </button>
              </li>
            ))}
          </ul>
          <section className={styles.layerStyleSettings} aria-label="Settings">
            {page === "blending" ? (
              <>
                <h3 className={styles.subsectionTitle}>Blending Options</h3>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="style-blend">
                    Blend mode
                  </label>
                  <select
                    id="style-blend"
                    className={styles.select}
                    value={layer.blendMode}
                    onChange={(e) =>
                      controller.execute(setLayerBlendMode(layer.id, e.target.value as BlendMode))
                    }
                  >
                    {BLEND_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {BLEND_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="style-opacity">
                    Opacity {Math.round(layer.opacity * 100)}%
                  </label>
                  <input
                    id="style-opacity"
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(layer.opacity * 100)}
                    onChange={(e) =>
                      controller.execute(setLayerOpacity(layer.id, Number(e.target.value) / 100))
                    }
                    onPointerUp={() => controller.store.sealHistory()}
                  />
                </div>
              </>
            ) : (
              <>
                <h3 className={styles.subsectionTitle}>{EFFECT_LABELS[page]}</h3>
                {effects[page]?.enabled ? (
                  <EffectControls layer={layer} kind={page} />
                ) : (
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => {
                      update(page, { enabled: true });
                      controller.store.sealHistory();
                    }}
                  >
                    Turn on {EFFECT_LABELS[page].toLowerCase()}
                  </button>
                )}
              </>
            )}
          </section>
        </div>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={() => finish(false)}>
            Cancel
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`}>
            OK
          </button>
        </div>
      </form>
    </dialog>
  );
}
