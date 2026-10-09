"use client";

import { useState } from "react";
import { MAX_GRADIENT_STOPS } from "@/editor/adjustments/gradient";
import { MIXER_LIMIT } from "@/editor/adjustments/registry";
import { setAdjustment } from "@/editor/core/commands";
import type {
  Adjustment,
  AdjustmentLayer,
  ColorBalanceRange,
  GradientStop,
  MixerRow,
} from "@/editor/core/document/types";
import { useController } from "./editor-context";
import styles from "./editor.module.css";
import { Slider } from "./StyleSections";

/** Properties-panel editors for the Gate 9h adjustments (ADR-0021). */

type Of<T extends Adjustment["type"]> = Extract<Adjustment, { type: T }>;

function useApply(layer: AdjustmentLayer) {
  const controller = useController();
  return (next: Adjustment) => controller.execute(setAdjustment(layer.id, next));
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const controller = useController();
  return (
    <label className={styles.smallLabel} style={{ marginTop: 6 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
          controller.store.sealHistory();
        }}
      />
      <span>{label}</span>
    </label>
  );
}

function Segments<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={label} style={{ marginBottom: 6 }}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

const RANGES = [
  ["shadows", "Shadows"],
  ["midtones", "Midtones"],
  ["highlights", "Highlights"],
] as const;

export function ColorBalanceEditor({
  layer,
  adjustment,
}: {
  layer: AdjustmentLayer;
  adjustment: Of<"color-balance">;
}) {
  const apply = useApply(layer);
  const [range, setRange] = useState<(typeof RANGES)[number][0]>("midtones");
  const values = adjustment[range];
  const set = (patch: Partial<ColorBalanceRange>) =>
    apply({ ...adjustment, [range]: { ...values, ...patch } });
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>Color Balance</div>
      <Segments label="Tonal range" value={range} options={RANGES} onChange={setRange} />
      <Slider
        label="Cyan – Red"
        value={values.cyanRed}
        min={-100}
        max={100}
        onChange={(v) => set({ cyanRed: v })}
      />
      <Slider
        label="Magenta – Green"
        value={values.magentaGreen}
        min={-100}
        max={100}
        onChange={(v) => set({ magentaGreen: v })}
      />
      <Slider
        label="Yellow – Blue"
        value={values.yellowBlue}
        min={-100}
        max={100}
        onChange={(v) => set({ yellowBlue: v })}
      />
      <Toggle
        label="Preserve luminosity"
        checked={adjustment.preserveLuminosity}
        onChange={(preserveLuminosity) => apply({ ...adjustment, preserveLuminosity })}
      />
    </div>
  );
}

export function PhotoFilterEditor({
  layer,
  adjustment,
}: {
  layer: AdjustmentLayer;
  adjustment: Of<"photo-filter">;
}) {
  const apply = useApply(layer);
  const controller = useController();
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>Photo Filter</div>
      <label className={styles.smallLabel}>
        <span>Filter colour</span>
        <input
          type="color"
          aria-label="Filter colour"
          className={styles.colorInput}
          style={{ width: 48 }}
          value={adjustment.color}
          onChange={(e) => apply({ ...adjustment, color: e.target.value })}
          onBlur={() => controller.store.sealHistory()}
        />
      </label>
      <Slider
        label="Density"
        value={adjustment.density}
        min={1}
        max={100}
        format={(v) => `${v}%`}
        onChange={(density) => apply({ ...adjustment, density })}
      />
      <Toggle
        label="Preserve luminosity"
        checked={adjustment.preserveLuminosity}
        onChange={(preserveLuminosity) => apply({ ...adjustment, preserveLuminosity })}
      />
    </div>
  );
}

const OUTPUTS = [
  ["red", "Red"],
  ["green", "Green"],
  ["blue", "Blue"],
] as const;

export function ChannelMixerEditor({
  layer,
  adjustment,
}: {
  layer: AdjustmentLayer;
  adjustment: Of<"channel-mixer">;
}) {
  const apply = useApply(layer);
  const [output, setOutput] = useState<(typeof OUTPUTS)[number][0]>("red");
  const key = adjustment.monochrome ? "red" : output;
  const row = adjustment[key];
  const set = (patch: Partial<MixerRow>) => apply({ ...adjustment, [key]: { ...row, ...patch } });
  const pct = (v: number) => `${v}%`;
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>Channel Mixer</div>
      {adjustment.monochrome ? (
        <p className={styles.muted} style={{ margin: "0 0 6px" }}>
          Output: Gray
        </p>
      ) : (
        <Segments label="Output channel" value={output} options={OUTPUTS} onChange={setOutput} />
      )}
      <Slider
        label="Red"
        value={row.red}
        min={-MIXER_LIMIT}
        max={MIXER_LIMIT}
        format={pct}
        onChange={(v) => set({ red: v })}
      />
      <Slider
        label="Green"
        value={row.green}
        min={-MIXER_LIMIT}
        max={MIXER_LIMIT}
        format={pct}
        onChange={(v) => set({ green: v })}
      />
      <Slider
        label="Blue"
        value={row.blue}
        min={-MIXER_LIMIT}
        max={MIXER_LIMIT}
        format={pct}
        onChange={(v) => set({ blue: v })}
      />
      <Slider
        label="Constant"
        value={row.constant}
        min={-MIXER_LIMIT}
        max={MIXER_LIMIT}
        format={pct}
        onChange={(v) => set({ constant: v })}
      />
      <Toggle
        label="Monochrome"
        checked={adjustment.monochrome}
        onChange={(monochrome) => apply({ ...adjustment, monochrome })}
      />
    </div>
  );
}

/** Edit 2–16 gradient stops: colour and position, add and remove. */
export function GradientStopsEditor({
  stops,
  onChange,
  label,
}: {
  stops: readonly GradientStop[];
  onChange: (stops: GradientStop[]) => void;
  label: string;
}) {
  const controller = useController();
  const seal = () => controller.store.sealHistory();
  const preview = `linear-gradient(to right, ${stops
    .toSorted((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${Math.round(s.position * 100)}%`)
    .join(", ")})`;
  const update = (i: number, patch: Partial<GradientStop>) =>
    onChange(stops.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div role="group" aria-label={label}>
      <div className={styles.gradientPreview} style={{ background: preview }} aria-hidden />
      <ol className={styles.stopList}>
        {stops.map((stop, i) => (
          <li key={i} className={styles.stopRow}>
            <input
              type="color"
              aria-label={`Stop ${i + 1} colour`}
              className={styles.colorInput}
              style={{ width: 36 }}
              value={stop.color}
              onChange={(e) => update(i, { color: e.target.value })}
              onBlur={seal}
            />
            <input
              type="range"
              aria-label={`Stop ${i + 1} position`}
              min={0}
              max={100}
              value={Math.round(stop.position * 100)}
              onChange={(e) => update(i, { position: Number(e.target.value) / 100 })}
              onPointerUp={seal}
              onKeyUp={seal}
            />
            <span className={styles.sliderValue}>{Math.round(stop.position * 100)}%</span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Remove stop ${i + 1}`}
              disabled={stops.length <= 2}
              onClick={() => onChange(stops.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={styles.button}
        disabled={stops.length >= MAX_GRADIENT_STOPS}
        onClick={() => {
          // Add a stop halfway along the widest gap.
          const byPosition = stops.toSorted((x, y) => x.position - y.position);
          let best = 0;
          let gap = -1;
          for (let i = 0; i < byPosition.length - 1; i++) {
            const g = byPosition[i + 1].position - byPosition[i].position;
            if (g > gap) {
              gap = g;
              best = i;
            }
          }
          const a = byPosition[best];
          const b = byPosition[best + 1];
          onChange([...stops, { position: (a.position + b.position) / 2, color: a.color }]);
        }}
      >
        Add stop
      </button>
    </div>
  );
}

export function GradientMapEditor({
  layer,
  adjustment,
}: {
  layer: AdjustmentLayer;
  adjustment: Of<"gradient-map">;
}) {
  const apply = useApply(layer);
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>Gradient Map</div>
      <p className={styles.muted} style={{ margin: "0 0 6px" }}>
        Shadows take the left colour, highlights the right.
      </p>
      <GradientStopsEditor
        label="Gradient"
        stops={adjustment.stops}
        onChange={(stops) => apply({ ...adjustment, stops })}
      />
      <Toggle
        label="Reverse"
        checked={adjustment.reverse}
        onChange={(reverse) => apply({ ...adjustment, reverse })}
      />
    </div>
  );
}
