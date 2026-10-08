"use client";

import {
  DEFAULT_EFFECTS,
  setAdjustment,
  setLayerEffect,
  setMaskEnabled,
  setMaskLinked,
} from "@/editor/core/commands";
import { adjustmentDefinition } from "@/editor/adjustments/registry";
import type {
  AdjustmentLayer,
  EffectKind,
  Layer,
  LayerEffects,
} from "@/editor/core/document/types";
import { useController } from "./editor-context";
import styles from "./editor.module.css";

/** A labelled slider that merges a drag into one undo step and seals on release. */
function Slider({
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

const EFFECT_LABELS: Record<EffectKind, string> = {
  dropShadow: "Drop shadow",
  outerGlow: "Outer glow",
  stroke: "Outer stroke",
  colorOverlay: "Colour overlay",
};

const percent = (v: number) => `${Math.round(v * 100)}%`;

export function EffectsSection({ layer }: { layer: Layer }) {
  const controller = useController();
  const effects: LayerEffects = layer.effects ?? {};

  function update<K extends EffectKind>(kind: K, patch: Partial<NonNullable<LayerEffects[K]>>) {
    const current = effects[kind] ?? DEFAULT_EFFECTS[kind];
    controller.execute(setLayerEffect(layer.id, kind, { ...current, ...patch } as LayerEffects[K]));
  }

  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>Effects</div>
      {(Object.keys(EFFECT_LABELS) as EffectKind[]).map((kind) => {
        const effect = effects[kind];
        const on = !!effect?.enabled;
        return (
          <div key={kind} className={styles.effectRow}>
            <label className={styles.smallLabel}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => {
                  update(kind, { enabled: e.target.checked });
                  controller.store.sealHistory();
                }}
              />
              <span>{EFFECT_LABELS[kind]}</span>
              {effect && (
                <input
                  type="color"
                  aria-label={`${EFFECT_LABELS[kind]} colour`}
                  className={styles.colorInput}
                  style={{ width: 36 }}
                  value={effect.color}
                  onChange={(e) => update(kind, { color: e.target.value })}
                  onBlur={() => controller.store.sealHistory()}
                />
              )}
            </label>
            {effect && on && (
              <div style={{ marginTop: 4 }}>
                <Slider
                  label="Opacity"
                  value={effect.opacity}
                  min={0}
                  max={1}
                  step={0.01}
                  format={percent}
                  onChange={(opacity) => update(kind, { opacity })}
                />
                {kind === "dropShadow" && effects.dropShadow && (
                  <>
                    <Slider
                      label="Angle"
                      value={effects.dropShadow.angle}
                      min={-180}
                      max={180}
                      format={(v) => `${v}°`}
                      onChange={(angle) => update("dropShadow", { angle })}
                    />
                    <Slider
                      label="Distance"
                      value={effects.dropShadow.distance}
                      min={0}
                      max={200}
                      onChange={(distance) => update("dropShadow", { distance })}
                    />
                    <Slider
                      label="Blur"
                      value={effects.dropShadow.blur}
                      min={0}
                      max={100}
                      onChange={(blur) => update("dropShadow", { blur })}
                    />
                  </>
                )}
                {kind === "outerGlow" && effects.outerGlow && (
                  <Slider
                    label="Size"
                    value={effects.outerGlow.size}
                    min={0}
                    max={100}
                    onChange={(size) => update("outerGlow", { size })}
                  />
                )}
                {kind === "stroke" && effects.stroke && (
                  <Slider
                    label="Size"
                    value={effects.stroke.size}
                    min={1}
                    max={50}
                    onChange={(size) => update("stroke", { size })}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
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
