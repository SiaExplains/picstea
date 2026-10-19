"use client";

import {
  DEFAULT_EFFECTS,
  setAdjustment,
  setLayerEffect,
  setMaskEnabled,
  setMaskLinked,
} from "@/editor/core/commands";
import { adjustmentDefinition } from "@/editor/adjustments/registry";
import type { AdjustmentLayer, Layer } from "@/editor/core/document/types";
import { effectList, type EffectKind, type LayerEffects } from "@/editor/core/effects/model";
import { useController } from "./editor-context";
import { CurvesEditor, LevelsEditor } from "./ToneEditors";
import {
  ChannelMixerEditor,
  ColorBalanceEditor,
  GradientMapEditor,
  PhotoFilterEditor,
} from "./AdjustmentEditors";
import styles from "./editor.module.css";

/** A labelled slider that merges a drag into one undo step and seals on release. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format = (v) => String(Math.round(v * 100) / 100),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const controller = useController();
  const seal = () => controller.store.sealHistory();
  return (
    <label className={styles.sliderRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={seal}
        onKeyUp={seal}
        onBlur={seal}
      />
      <span className={styles.sliderValue}>{format(value)}</span>
    </label>
  );
}

export function AdjustmentSection({ layer }: { layer: AdjustmentLayer }) {
  const controller = useController();
  const { adjustment } = layer;
  if (adjustment.type === "levels") return <LevelsEditor layer={{ ...layer, adjustment }} />;
  if (adjustment.type === "curves") return <CurvesEditor layer={{ ...layer, adjustment }} />;
  if (adjustment.type === "color-balance")
    return <ColorBalanceEditor layer={layer} adjustment={adjustment} />;
  if (adjustment.type === "photo-filter")
    return <PhotoFilterEditor layer={layer} adjustment={adjustment} />;
  if (adjustment.type === "channel-mixer")
    return <ChannelMixerEditor layer={layer} adjustment={adjustment} />;
  if (adjustment.type === "gradient-map")
    return <GradientMapEditor layer={layer} adjustment={adjustment} />;
  const def = adjustmentDefinition(layer.adjustment.type);
  const values = layer.adjustment as unknown as Record<string, number>;
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>{def.label}</div>
      {def.params.length === 0 && <p className={styles.muted}>No settings.</p>}
      {def.params.map((p) => (
        <Slider
          key={p.key}
          label={p.label}
          value={values[p.key]}
          min={p.min}
          max={p.max}
          step={p.step}
          onChange={(v) =>
            controller.execute(
              setAdjustment(layer.id, {
                ...layer.adjustment,
                [p.key]: v,
              } as AdjustmentLayer["adjustment"]),
            )
          }
        />
      ))}
    </div>
  );
}

/** Short names for the Properties panel's effect switches. */
export const EFFECT_LABELS: Record<EffectKind, string> = {
  dropShadow: "Drop shadow",
  outerGlow: "Outer glow",
  innerShadow: "Inner shadow",
  innerGlow: "Inner glow",
  satin: "Satin",
  bevel: "Bevel",
  colorOverlay: "Colour overlay",
  gradientOverlay: "Gradient overlay",
  patternOverlay: "Pattern overlay",
  stroke: "Stroke",
};

const PANEL_ORDER: readonly EffectKind[] = [
  "dropShadow",
  "outerGlow",
  "stroke",
  "innerShadow",
  "innerGlow",
  "bevel",
  "satin",
  "colorOverlay",
  "gradientOverlay",
  "patternOverlay",
];

/**
 * Effects in the Properties panel: a switch per effect (its first copy, starting from
 * Photoshop's defaults), and the full Layer Style dialog for the settings (ADR-0030).
 */
export function EffectsSection({ layer, onEdit }: { layer: Layer; onEdit: () => void }) {
  const controller = useController();
  const effects: LayerEffects = layer.effects ?? {};

  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>Effects</div>
      <div className={styles.effectToggles} role="group" aria-label="Layer effects">
        {PANEL_ORDER.map((kind) => {
          const list = effectList(effects, kind);
          const on = list.some((e) => e.enabled);
          const extra = list.length > 1 ? ` ×${list.length}` : "";
          return (
            <label key={kind} className={styles.smallLabel}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  if (list.length === 0) {
                    controller.execute(
                      setLayerEffect(layer.id, kind, { ...DEFAULT_EFFECTS[kind], enabled }),
                    );
                  } else {
                    list.forEach((effect, i) =>
                      controller.execute(setLayerEffect(layer.id, kind, { ...effect, enabled }, i)),
                    );
                  }
                  controller.store.sealHistory();
                }}
              />
              <span>
                {EFFECT_LABELS[kind]}
                {extra}
              </span>
            </label>
          );
        })}
      </div>
      <button type="button" className={styles.button} style={{ marginTop: 6 }} onClick={onEdit}>
        Layer Style…
      </button>
    </div>
  );
}

export function MaskSection({ layer }: { layer: Layer }) {
  const controller = useController();
  const mask = layer.mask;
  if (!mask) return null;
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>Mask</div>
      <label className={styles.smallLabel}>
        <input
          type="checkbox"
          checked={mask.enabled}
          onChange={(e) => controller.execute(setMaskEnabled(layer.id, e.target.checked))}
        />
        <span>Enabled</span>
      </label>
      <label className={styles.smallLabel} style={{ marginTop: 4 }}>
        <input
          type="checkbox"
          checked={mask.linked}
          onChange={(e) => controller.execute(setMaskLinked(layer.id, e.target.checked))}
        />
        <span>Move with layer</span>
      </label>
      <p className={styles.muted} style={{ margin: "6px 0 0" }}>
        Paint black to hide, white to reveal. Click the mask thumbnail in Layers to paint on it.
      </p>
      <button
        type="button"
        className={styles.button}
        style={{ marginTop: 6 }}
        onClick={() => controller.deleteActiveMask()}
      >
        Delete mask
      </button>
    </div>
  );
}
