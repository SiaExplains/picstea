"use client";

import { useState, type FormEvent } from "react";
import type { Guide } from "@/editor/core/document/types";
import { MAX_GRID_SIZE, MIN_GRID_SIZE } from "@/editor/core/view-settings";
import { useController } from "./editor-context";
import styles from "./editor.module.css";
import { useModal } from "./SelectionDialogs";

/** View → New Guide…: an exact guide position. Mounted only while open. */
export function GuideDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
  const ref = useModal(true);
  const [orientation, setOrientation] = useState<Guide["orientation"]>("vertical");
  const [position, setPosition] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(position);
    if (position.trim() === "" || !Number.isFinite(value)) {
      setError("Enter a position in pixels.");
      return;
    }
    if (controller.addGuide(orientation, value)) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="guide-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="guide-title" className={styles.dialogTitle}>
          New Guide
        </h2>
        <fieldset className={styles.field}>
          <legend className={styles.fieldLabel}>Orientation</legend>
          {(["vertical", "horizontal"] as const).map((o) => (
            <label key={o} className={styles.optionGroup}>
              <input
                type="radio"
                name="guide-orientation"
                checked={orientation === o}
                onChange={() => setOrientation(o)}
              />
              {o === "vertical" ? "Vertical" : "Horizontal"}
            </label>
          ))}
        </fieldset>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="guide-position">
            Position (px from the {orientation === "vertical" ? "left" : "top"})
          </label>
          <input
            id="guide-position"
            className={styles.input}
            type="number"
            inputMode="decimal"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
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
            OK
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** View → Grid Size…: grid spacing in document pixels (turns the grid on). */
export function GridDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
  const ref = useModal(true);
  const [size, setSize] = useState(String(controller.view.get().gridSize));
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(size);
    if (!Number.isFinite(value) || value < MIN_GRID_SIZE || value > MAX_GRID_SIZE) {
      setError(`Enter a size between ${MIN_GRID_SIZE} and ${MAX_GRID_SIZE} px.`);
      return;
    }
    controller.setView({ gridSize: value, grid: true });
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="grid-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="grid-title" className={styles.dialogTitle}>
          Grid Size
        </h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="grid-size">
            Grid every (px)
          </label>
          <input
            id="grid-size"
            className={styles.input}
            type="number"
            inputMode="numeric"
            min={MIN_GRID_SIZE}
            max={MAX_GRID_SIZE}
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
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
            OK
          </button>
        </div>
      </form>
    </dialog>
  );
}
