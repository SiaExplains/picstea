"use client";

import { setFillColor, setLayerBlendMode, setLayerOpacity } from "@/editor/core/commands";
import { activeLayer } from "@/editor/core/document/queries";
import { BLEND_MODES, type BlendMode } from "@/editor/core/document/types";
import { useActiveSession, useController } from "./editor-context";
import styles from "./editor.module.css";

const BLEND_LABELS: Record<BlendMode, string> = {
  normal: "Normal",
  multiply: "Multiply",
  screen: "Screen",
  overlay: "Overlay",
  darken: "Darken",
  lighten: "Lighten",
  "color-dodge": "Color Dodge",
  "color-burn": "Color Burn",
  "hard-light": "Hard Light",
  "soft-light": "Soft Light",
  difference: "Difference",
  exclusion: "Exclusion",
  hue: "Hue",
  saturation: "Saturation",
  color: "Color",
  luminosity: "Luminosity",
};

export function PropertiesPanel() {
  const controller = useController();
  const session = useActiveSession();
  const doc = session?.document;
  const layer = doc ? activeLayer(doc) : undefined;

  return (
    <section className={styles.panel} aria-labelledby="properties-heading">
      <h2 id="properties-heading" className={styles.panelHeader}>
        Properties
      </h2>
      <div className={styles.panelBody}>
        {!doc && <p className={styles.muted}>Open or create a document to see its properties.</p>}
        {doc && !layer && (
          <p className={styles.muted}>
            {doc.width} × {doc.height} px · {doc.resolution} ppi
          </p>
        )}
        {layer && (
          <fieldset disabled={layer.locked} style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className={styles.srOnly}>{layer.name} properties</legend>
            {layer.locked && (
              <p className={styles.muted} style={{ marginTop: 0 }}>
                Layer is locked.
              </p>
            )}
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="prop-opacity">
                Opacity
              </label>
              <div className={styles.rangeRow}>
                <input
                  id="prop-opacity"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) =>
                    controller.execute(setLayerOpacity(layer.id, Number(e.target.value) / 100))
                  }
                  onPointerUp={() => controller.store.sealHistory()}
                  onKeyUp={() => controller.store.sealHistory()}
                />
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={100}
                  aria-label="Opacity percent"
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (e.target.value !== "" && Number.isFinite(value)) {
                      controller.execute(setLayerOpacity(layer.id, value / 100));
                    }
                  }}
                  onBlur={() => controller.store.sealHistory()}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="prop-blend">
                Blend
              </label>
              <select
                id="prop-blend"
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
            {layer.kind === "fill" && (
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="prop-color">
                  Color
                </label>
                <input
                  id="prop-color"
                  type="color"
                  className={styles.colorInput}
                  value={layer.color}
                  onChange={(e) => controller.execute(setFillColor(layer.id, e.target.value))}
                  onBlur={() => controller.store.sealHistory()}
                />
              </div>
            )}
            {layer.kind === "raster" && (
              <p className={styles.muted}>
                Image · {layer.width} × {layer.height} px at {layer.transform.x},{" "}
                {layer.transform.y}
              </p>
            )}
          </fieldset>
        )}
      </div>
    </section>
  );
}
