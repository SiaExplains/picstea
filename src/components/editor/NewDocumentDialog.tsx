"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { checkDimensions, MAX_DIMENSION } from "@/editor/core/document/limits";
import { useController } from "./editor-context";
import styles from "./editor.module.css";

const PRESETS = [
  { label: "Custom", width: 0, height: 0 },
  { label: "HD 1920 × 1080", width: 1920, height: 1080 },
  { label: "Square post 1080 × 1080", width: 1080, height: 1080 },
  { label: "Story 1080 × 1920", width: 1080, height: 1920 },
  { label: "Web banner 1200 × 628", width: 1200, height: 628 },
  { label: "A4 at 150 ppi 1240 × 1754", width: 1240, height: 1754 },
];

type Background = "white" | "black" | "transparent";

export function NewDocumentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const controller = useController();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("Untitled");
  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");
  const [background, setBackground] = useState<Background>("white");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // "Custom" (index 0) when the size matches no preset.
  const presetIndex = Math.max(
    0,
    PRESETS.findIndex((p) => String(p.width) === width && String(p.height) === height),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const w = Number(width);
    const h = Number(height);
    const check = checkDimensions(w, h);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    const result = controller.newDocument({
      name,
      width: w,
      height: h,
      background:
        background === "transparent"
          ? { kind: "transparent" }
          : { kind: "color", color: background === "white" ? "#ffffff" : "#000000" },
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="new-doc-title"
      onClose={onClose}
      onCancel={onClose}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="new-doc-title" className={styles.dialogTitle}>
          New document
        </h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="nd-name">
            Name
          </label>
          <input
            id="nd-name"
            className={styles.input}
            value={name}
            maxLength={255}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="nd-preset">
            Preset
          </label>
          <select
            id="nd-preset"
            className={styles.select}
            value={presetIndex}
            onChange={(e) => {
              const preset = PRESETS[Number(e.target.value)];
              if (preset.width) {
                setWidth(String(preset.width));
                setHeight(String(preset.height));
              }
            }}
          >
            {PRESETS.map((preset, i) => (
              <option key={preset.label} value={i}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="nd-width">
            Width (px)
          </label>
          <input
            id="nd-width"
            className={styles.input}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DIMENSION}
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="nd-height">
            Height (px)
          </label>
          <input
            id="nd-height"
            className={styles.input}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DIMENSION}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="nd-bg">
            Background
          </label>
          <select
            id="nd-bg"
            className={styles.select}
            value={background}
            onChange={(e) => setBackground(e.target.value as Background)}
          >
            <option value="white">White</option>
            <option value="black">Black</option>
            <option value="transparent">Transparent</option>
          </select>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`}>
            Create
          </button>
        </div>
      </form>
    </dialog>
  );
}
