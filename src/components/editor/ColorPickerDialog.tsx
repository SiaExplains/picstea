"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import {
  hexToRgb,
  hsvToRgb,
  parseHexColor,
  rgbToHex,
  rgbToHsv,
  type Hsv,
} from "@/editor/core/color";
import { addSwatch } from "@/editor/core/swatches";
import { useController, useEditorState } from "./editor-context";
import styles from "./editor.module.css";
import { useModal } from "./SelectionDialogs";

export type ColorTarget = "foreground" | "background";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * The colour picker for the foreground and background colours: a saturation/brightness field,
 * a hue slider and exact Hex, RGB and HSB values. Applied on OK. Mounted only while open.
 */
export function ColorPickerDialog({
  target,
  onClose,
}: {
  target: ColorTarget;
  onClose: () => void;
}) {
  const controller = useController();
  const current = useEditorState((s) => s.colors[target]);
  const ref = useModal(true);
  const fieldRef = useRef<HTMLDivElement>(null);
  // HSV is the source of truth so the hue survives greys and black.
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(...hexToRgb(current)));
  const [hexText, setHexText] = useState(current);
  const [added, setAdded] = useState(false);

  const rgb = hsvToRgb(hsv);
  const hex = rgbToHex(...rgb);
  const title = target === "foreground" ? "Foreground Colour" : "Background Colour";

  const update = (next: Hsv) => {
    setHsv(next);
    setHexText(rgbToHex(...hsvToRgb(next)));
    setAdded(false);
  };

  const setFromRgb = (r: number, g: number, b: number) => {
    const next = rgbToHsv(r, g, b);
    // Keep the hue (and saturation) when the colour has none.
    update({ h: next.s === 0 ? hsv.h : next.h, s: next.v === 0 ? hsv.s : next.s, v: next.v });
  };

  const pickAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = fieldRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    update({
      h: hsv.h,
      s: clamp((event.clientX - box.left) / box.width, 0, 1),
      v: clamp(1 - (event.clientY - box.top) / box.height, 0, 1),
    });
  };

  const onFieldKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    update({ h: hsv.h, s: clamp(hsv.s + move[0], 0, 1), v: clamp(hsv.v + move[1], 0, 1) });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    controller.store.setColors({ [target]: hex });
    onClose();
  };

  const number = (
    label: string,
    name: string,
    value: number,
    max: number,
    onChange: (value: number) => void,
    suffix = "",
  ) => (
    <label className={styles.pickerNumber}>
      <span>{label}</span>
      <input
        className={styles.input}
        type="number"
        min={0}
        max={max}
        value={Math.round(value)}
        aria-label={name}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(v)) onChange(clamp(v, 0, max));
        }}
      />
      <span className={styles.muted}>{suffix}</span>
    </label>
  );

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles.pickerDialog}`}
      aria-labelledby="color-picker-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="color-picker-title" className={styles.dialogTitle}>
          {title}
        </h2>
        <div className={styles.pickerBody}>
          <div className={styles.pickerControls}>
            <div
              ref={fieldRef}
              className={styles.pickerField}
              style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
              role="slider"
              tabIndex={0}
              aria-label="Saturation and brightness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(hsv.s * 100)}
              aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
              onKeyDown={onFieldKey}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                pickAt(e);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) pickAt(e);
              }}
            >
              <span
                className={styles.pickerThumb}
                style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
              />
            </div>
            <input
              className={styles.pickerHue}
              type="range"
              min={0}
              max={359}
              value={Math.round(hsv.h) % 360}
              aria-label="Hue"
              onChange={(e) => update({ ...hsv, h: Number(e.target.value) })}
            />
          </div>
          <div className={styles.pickerValues}>
            <div className={styles.pickerPreview}>
              <span style={{ background: hex }} title="New" data-testid="picker-new" />
              <span style={{ background: current }} title="Current" />
            </div>
            <label className={styles.pickerNumber}>
              <span>#</span>
              <input
                className={styles.input}
                value={hexText.replace(/^#/, "")}
                aria-label="Hex"
                spellCheck={false}
                maxLength={7}
                onChange={(e) => {
                  setHexText(e.target.value);
                  const parsed = parseHexColor(e.target.value);
                  if (parsed) {
                    const [r, g, b] = hexToRgb(parsed);
                    const next = rgbToHsv(r, g, b);
                    setHsv({
                      h: next.s === 0 ? hsv.h : next.h,
                      s: next.v === 0 ? hsv.s : next.s,
                      v: next.v,
                    });
                    setAdded(false);
                  }
                }}
                onBlur={() => setHexText(hex)}
              />
            </label>
            {number("R", "Red", rgb[0], 255, (v) => setFromRgb(v, rgb[1], rgb[2]))}
            {number("G", "Green", rgb[1], 255, (v) => setFromRgb(rgb[0], v, rgb[2]))}
            {number("B", "Blue", rgb[2], 255, (v) => setFromRgb(rgb[0], rgb[1], v))}
            {number("H", "Hue value", hsv.h, 359, (v) => update({ ...hsv, h: v }), "°")}
            {number(
              "S",
              "Saturation",
              hsv.s * 100,
              100,
              (v) => update({ ...hsv, s: v / 100 }),
              "%",
            )}
            {number(
              "B",
              "Brightness",
              hsv.v * 100,
              100,
              (v) => update({ ...hsv, v: v / 100 }),
              "%",
            )}
          </div>
        </div>
        <div className={styles.dialogActions}>
          <button
            type="button"
            className={styles.button}
            style={{ marginRight: "auto" }}
            onClick={() => {
              controller.swatches.update((list) => addSwatch(list, hex));
              setAdded(true);
            }}
          >
            {added ? "Added to Swatches" : "Add to Swatches"}
          </button>
          <button type="button" className={styles.button} onClick={onClose}>
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
