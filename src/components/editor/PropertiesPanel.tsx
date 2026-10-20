"use client";

import { setFillColor, setLayerBlendMode, setLayerOpacity } from "@/editor/core/commands";
import { activeLayer } from "@/editor/core/document/queries";
import { countLayers } from "@/editor/core/document/tree";
import {
  BLEND_MODES,
  type BlendMode,
  type GroupBlendMode,
  type SmartFilter,
} from "@/editor/core/document/types";
import { selectedLayerIds } from "@/editor/core/editor-store";
import { ArrangeButtons } from "./ArrangeButtons";
import { SmartObjectSection } from "./SmartFilterSection";
import { useActiveSession, useController } from "./editor-context";
import styles from "./editor.module.css";
import { ShapeSection, TextSection, TransformSection } from "./LayerSections";
import { AdjustmentSection, EffectsSection, MaskSection } from "./StyleSections";
import { useT } from "./i18n";
import { N_ } from "@/i18n/editor/catalog";

export const BLEND_LABELS: Record<BlendMode, string> = {
  normal: N_("Normal"),
  multiply: N_("Multiply"),
  screen: N_("Screen"),
  overlay: N_("Overlay"),
  darken: N_("Darken"),
  lighten: N_("Lighten"),
  "color-dodge": N_("Color Dodge"),
  "color-burn": N_("Color Burn"),
  "hard-light": N_("Hard Light"),
  "soft-light": N_("Soft Light"),
  difference: N_("Difference"),
  exclusion: N_("Exclusion"),
  hue: N_("Hue"),
  saturation: N_("Saturation"),
  color: N_("Color"),
  luminosity: N_("Luminosity"),
};

export function PropertiesPanel({
  onEditSmartFilter,
  onEditLayerStyle,
}: {
  onEditSmartFilter: (layerId: string, filter: SmartFilter) => void;
  onEditLayerStyle: () => void;
}) {
  const controller = useController();
  const session = useActiveSession();
  const doc = session?.document;
  const layer = doc ? activeLayer(doc) : undefined;
  const selected = selectedLayerIds(session);
  const t = useT();

  return (
    <section
      className={`${styles.panel} ${styles.panelScroll}`}
      aria-labelledby="properties-heading"
      data-panel="properties"
    >
      <h2 id="properties-heading" className={styles.panelHeader}>
        {t("Properties")}
      </h2>
      <div className={styles.panelBody}>
        {!doc && (
          <p className={styles.muted}>{t("Open or create a document to see its properties.")}</p>
        )}
        {doc && !layer && (
          <p className={styles.muted}>
            {doc.width} × {doc.height} px · {doc.resolution} ppi
          </p>
        )}
        {selected.length > 1 && (
          <div className={styles.multiSelection} data-testid="multi-selection">
            <p>
              <strong>{t("{count} layers selected", { count: selected.length })}</strong>
              <span className={styles.muted}>
                {" "}
                {t("· settings below are for {name}", {
                  name: layer?.name ?? t("the active layer"),
                })}
              </span>
            </p>
            <div className={styles.arrange}>
              <ArrangeButtons count={selected.length} />
            </div>
          </div>
        )}
        {layer && (
          <fieldset disabled={layer.locked} style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className={styles.srOnly}>
              {t("{name} properties", { name: layer.name })}
            </legend>
            {layer.locked && (
              <p className={styles.muted} style={{ marginTop: 0 }}>
                {t("Layer is locked.")}
              </p>
            )}
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="prop-opacity">
                {t("Opacity")}
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
                  aria-label={t("Opacity percent")}
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
                {t("Blend")}
              </label>
              <select
                id="prop-blend"
                className={styles.select}
                value={layer.blendMode}
                onChange={(e) =>
                  controller.execute(setLayerBlendMode(layer.id, e.target.value as GroupBlendMode))
                }
              >
                {layer.kind === "group" && (
                  <option value="pass-through">{t("Pass Through")}</option>
                )}
                {BLEND_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(BLEND_LABELS[mode])}
                  </option>
                ))}
              </select>
            </div>
            {layer.kind === "fill" && (
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="prop-color">
                  {t("Color")}
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
                {layer.assetId ? t("Pixel layer") : t("Empty pixel layer")} · {layer.width} ×{" "}
                {layer.height} px
              </p>
            )}
            {layer.kind === "text" && <TextSection key={`text-${layer.id}`} layer={layer} />}
            {layer.kind === "shape" && <ShapeSection key={`shape-${layer.id}`} layer={layer} />}
            {layer.kind === "group" && (
              <p className={styles.muted}>
                {countLayers(layer.children) === 1
                  ? t("Group · {count} layer", { count: countLayers(layer.children) })
                  : t("Group · {count} layers", { count: countLayers(layer.children) })}
                {" · "}
                {layer.blendMode === "pass-through" ? t("blends with layers below") : t("isolated")}
              </p>
            )}
            {layer.kind === "adjustment" && (
              <AdjustmentSection key={`adj-${layer.id}`} layer={layer} />
            )}
            {layer.kind === "smart" && (
              <SmartObjectSection
                key={`smart-${layer.id}`}
                layer={layer}
                onEditFilter={onEditSmartFilter}
              />
            )}
            {(layer.kind === "raster" ||
              layer.kind === "shape" ||
              layer.kind === "text" ||
              layer.kind === "smart") &&
              doc && <TransformSection key={`transform-${layer.id}`} layer={layer} doc={doc} />}
            <MaskSection key={`mask-${layer.id}`} layer={layer} />
            {layer.kind !== "adjustment" && (
              <EffectsSection key={`fx-${layer.id}`} layer={layer} onEdit={onEditLayerStyle} />
            )}
          </fieldset>
        )}
      </div>
    </section>
  );
}
