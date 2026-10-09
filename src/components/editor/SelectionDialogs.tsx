"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { SelectionModification } from "@/editor/core/commands";
import { MAX_MODIFY_RADIUS } from "@/editor/selection/modify";
import { useController, useEditorState } from "./editor-context";
import styles from "./editor.module.css";

/** Show a native modal <dialog> while `open`. */
export function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return ref;
}

const MODIFY_TITLES: Record<SelectionModification, string> = {
  feather: "Feather Selection",
  expand: "Expand Selection",
  contract: "Contract Selection",
};

/** Select → Modify: feather, expand or contract by a radius in pixels. */
export function ModifySelectionDialog({
  kind,
  onClose,
}: {
  kind: SelectionModification | null;
  onClose: () => void;
}) {
  const controller = useController();
  const ref = useModal(kind !== null);
  const [radius, setRadius] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const title = kind ? MODIFY_TITLES[kind] : "";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!kind) return;
    const result = controller.modifySelection(kind, Number(radius));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="modify-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="modify-title" className={styles.dialogTitle}>
          {title}
        </h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="modify-radius">
            {kind === "feather" ? "Feather radius (px)" : "By (px)"}
          </label>
          <input
            id="modify-radius"
            className={styles.input}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_MODIFY_RADIUS}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
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

/**
 * Select → Color Range: select every pixel close to a colour (the foreground colour by default),
 * with a fuzziness slider. The marching ants preview the result while the dialog is open.
 * Mounted only while open, so it starts from the current foreground colour each time.
 */
export function ColorRangeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const controller = useController();
  const foreground = useEditorState((s) => s.colors.foreground);
  const ref = useModal(open);
  const [color, setColor] = useState(foreground);
  const [fuzziness, setFuzziness] = useState(40);
  const [sampleAll, setSampleAll] = useState(true);
  const mask = useMemo(
    () => (open ? controller.colorRangePreview(color, fuzziness, sampleAll) : null),
    [controller, open, color, fuzziness, sampleAll],
  );
  const count = mask?.bounds
    ? `${mask.bounds.width} × ${mask.bounds.height} px area`
    : "Nothing matches";

  // Show the candidate as marching ants behind the dialog.
  useEffect(() => {
    if (open) controller.tools.previewSelection(mask);
  }, [controller, open, mask]);

  const close = () => {
    controller.tools.previewSelection(undefined);
    controller.endColorRange();
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    controller.tools.previewSelection(undefined);
    controller.applySelection(mask?.bounds ? mask : null, "Color Range");
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="color-range-title"
      onClose={(event) => {
        if (!event.currentTarget.open) close();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="color-range-title" className={styles.dialogTitle}>
          Color Range
        </h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="cr-color">
            Colour
          </label>
          <input
            id="cr-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="cr-fuzz">
            Fuzziness: {fuzziness}
          </label>
          <input
            id="cr-fuzz"
            type="range"
            min={0}
            max={255}
            value={fuzziness}
            onChange={(e) => setFuzziness(Number(e.target.value))}
          />
        </div>
        <label className={styles.optionGroup}>
          <input
            type="checkbox"
            checked={sampleAll}
            onChange={(e) => setSampleAll(e.target.checked)}
          />
          Sample all layers
        </label>
        <p className={styles.muted} aria-live="polite">
          {count}
        </p>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={close}>
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

/** Select → Make Work Path from Selection: trace the selection with a tolerance. Mounted while open. */
export function WorkPathDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
  const ref = useModal(true);
  const [tolerance, setTolerance] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(tolerance);
    if (!Number.isFinite(value) || value < 0.5 || value > 10) {
      setError("Enter a tolerance between 0.5 and 10 pixels.");
      return;
    }
    const result = controller.workPathFromSelection(value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="work-path-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="work-path-title" className={styles.dialogTitle}>
          Make Work Path
        </h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="work-path-tolerance">
            Tolerance (px)
          </label>
          <input
            id="work-path-tolerance"
            className={styles.input}
            type="number"
            inputMode="decimal"
            min={0.5}
            max={10}
            step={0.5}
            value={tolerance}
            onChange={(e) => setTolerance(e.target.value)}
          />
        </div>
        <p className={styles.muted}>Lower values follow the selection more closely.</p>
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
