"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createId } from "@/editor/core/ids";
import {
  defaultFilterValues,
  filterById,
  type FilterId,
  type FilterValues,
} from "@/editor/filters/registry";
import { useController } from "./editor-context";
import styles from "./editor.module.css";
import { useModal } from "./SelectionDialogs";

/** Wait this long after the last change before re-running the preview. */
const PREVIEW_DEBOUNCE_MS = 120;

/** A smart filter being added to (no `entryId`) or edited on a smart object (ADR-0016). */
export interface SmartFilterTarget {
  readonly layerId: string;
  readonly entryId?: string;
  readonly values?: FilterValues;
}

/**
 * Filter settings with a live canvas preview (ADR-0014). Mounted only while open, after the
 * controller has prepared the filter session; closing without OK restores the layer.
 *
 * On a smart object the filter is a smart filter: the preview updates the smart object's filter
 * list as one merged undo step, and Cancel undoes it.
 */
export function FilterDialog({
  filterId,
  smart,
  onClose,
}: {
  filterId: FilterId;
  smart?: SmartFilterTarget;
  onClose: () => void;
}) {
  const controller = useController();
  const filter = filterById(filterId)!;
  const ref = useModal(true);
  const [values, setValues] = useState<FilterValues>(() => {
    if (smart?.values) return smart.values;
    const last = controller.lastFilter.get();
    return last?.id === filterId ? last.values : defaultFilterValues(filter);
  });
  const [preview, setPreview] = useState(true);
  const [mergeKey] = useState(() => createId("smart-filter"));
  const entry = useRef<string | null>(smart?.entryId ?? null);
  const changed = useRef(false);
  const initial = useRef(JSON.stringify(values));

  /** Show the current settings on the smart object (adding the filter the first time). */
  const pushSmart = useCallback(
    (next: FilterValues) => {
      if (!smart) return;
      if (!changed.current && entry.current && JSON.stringify(next) === initial.current) return;
      if (entry.current === null) {
        entry.current = controller.addSmartFilter(filterId, next, mergeKey);
      } else {
        controller.updateSmartFilter(smart.layerId, entry.current, { values: next }, { mergeKey });
      }
      changed.current = true;
    },
    [controller, smart, filterId, mergeKey],
  );

  useEffect(() => {
    if (smart) {
      const timer = setTimeout(() => pushSmart(values), PREVIEW_DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }
    if (!preview) {
      controller.hideFilterPreview();
      return;
    }
    const timer = setTimeout(
      () => void controller.previewFilter(filterId, values),
      PREVIEW_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [controller, filterId, values, preview, smart, pushSmart]);

  const cancel = () => {
    if (smart) {
      if (changed.current) controller.undo();
    } else {
      controller.endFilter();
    }
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onClose();
    if (smart) {
      pushSmart(values);
      controller.store.sealHistory();
      return;
    }
    void controller.applyFilter(filterId, values);
  };

  const set = (key: string, value: number | boolean) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles.previewDialog}`}
      aria-labelledby="filter-title"
      data-testid="filter-dialog"
      onClose={(event) => {
        if (!event.currentTarget.open) cancel();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="filter-title" className={styles.dialogTitle}>
          {filter.name}
        </h2>
        {filter.parameters.map((p) =>
          p.kind === "toggle" ? (
            <label key={p.key} className={styles.optionGroup}>
              <input
                type="checkbox"
                checked={values[p.key] as boolean}
                onChange={(e) => set(p.key, e.target.checked)}
              />
              {p.label}
            </label>
          ) : p.kind === "choice" ? (
            <div key={p.key} className={styles.field}>
              <label className={styles.fieldLabel} htmlFor={`filter-${p.key}`}>
                {p.label}
              </label>
              <select
                id={`filter-${p.key}`}
                className={styles.input}
                value={values[p.key] as number}
                onChange={(e) => set(p.key, Number(e.target.value))}
              >
                {p.options.map((option, index) => (
                  <option key={option} value={index}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div key={p.key} className={styles.field}>
              <label className={styles.fieldLabel} htmlFor={`filter-${p.key}`}>
                {p.label} {p.unit ? `(${p.unit})` : ""}
              </label>
              <div className={styles.rangeWithNumber}>
                <input
                  type="range"
                  aria-hidden
                  tabIndex={-1}
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={values[p.key] as number}
                  onChange={(e) => set(p.key, Number(e.target.value))}
                />
                <NumberField
                  id={`filter-${p.key}`}
                  value={values[p.key] as number}
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  onChange={(v) => set(p.key, v)}
                />
              </div>
            </div>
          ),
        )}
        {smart ? (
          <p className={styles.muted}>Smart filter: you can change or remove it later.</p>
        ) : (
          <label className={styles.optionGroup}>
            <input
              type="checkbox"
              checked={preview}
              onChange={(e) => setPreview(e.target.checked)}
            />
            Preview
          </label>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={cancel}>
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
 * A number box that lets the user type freely ("0.", "-") and only reports values that are
 * complete and in range; it shows the current value again when it loses focus.
 */
function NumberField({
  id,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      id={id}
      className={styles.input}
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft ?? value}
      onChange={(e) => {
        setDraft(e.target.value);
        const v = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(v) && v >= min && v <= max) onChange(v);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
