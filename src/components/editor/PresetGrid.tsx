"use client";

import { useRef, type KeyboardEvent } from "react";
import { formatPresetSize, presetPixels, type SizePreset } from "@/editor/core/document/presets";
import styles from "./editor.module.css";

const THUMB = 56;

/** "210 × 297 mm · 300 ppi"; pixel sizes don't show the resolution. */
export function describePreset(preset: SizePreset): string {
  const size = formatPresetSize(preset);
  return preset.unit === "px" ? size : `${size} · ${preset.ppi} ppi`;
}

/** A radio group of size presets, each drawn as a box with the preset's proportions. */
export function PresetGrid({
  label,
  presets,
  selectedId,
  onPick,
}: {
  label: string;
  presets: readonly SizePreset[];
  selectedId: string | null;
  onPick: (preset: SizePreset) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const checkedIndex = presets.findIndex((p) => p.id === selectedId);
  const tabStop = checkedIndex >= 0 ? checkedIndex : 0;

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + presets.length) % presets.length;
    onPick(presets[next]);
    refs.current[next]?.focus();
  };

  return (
    <div className={styles.presetGrid} role="radiogroup" aria-label={label}>
      {presets.map((preset, i) => {
        const px = presetPixels(preset);
        const scale = THUMB / Math.max(px.width, px.height);
        return (
          <button
            key={preset.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={preset.id === selectedId}
            aria-label={`${preset.name}, ${describePreset(preset)}`}
            tabIndex={i === tabStop ? 0 : -1}
            className={styles.presetCard}
            onClick={() => onPick(preset)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className={styles.presetThumbBox} aria-hidden="true">
              <span
                className={styles.presetThumb}
                style={{
                  width: Math.max(4, Math.round(px.width * scale)),
                  height: Math.max(4, Math.round(px.height * scale)),
                }}
              />
            </span>
            <span className={styles.presetName}>{preset.name}</span>
            <span className={styles.presetSize}>{describePreset(preset)}</span>
          </button>
        );
      })}
    </div>
  );
}
