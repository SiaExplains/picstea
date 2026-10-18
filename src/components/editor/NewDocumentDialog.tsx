"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { checkDimensions, estimateBytes, MAX_DIMENSION } from "@/editor/core/document/limits";
import {
  addRecentSize,
  formatPresetSize,
  fromPixels,
  MAX_PPI,
  MIN_PPI,
  PRESET_CATEGORIES,
  searchPresets,
  SIZE_UNITS,
  toPixels,
  type PresetCategory,
  type SizePreset,
  type SizeUnit,
} from "@/editor/core/document/presets";
import { useController, useObservable } from "./editor-context";
import styles from "./editor.module.css";
import { PresetGrid } from "./PresetGrid";

type Background = "white" | "black" | "transparent" | "custom";

const UNIT_LABELS: Record<SizeUnit, string> = {
  px: "Pixels",
  in: "Inches",
  cm: "Centimetres",
  mm: "Millimetres",
};

const positive = (text: string): number | null => {
  const n = Number(text);
  return text.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

export function NewDocumentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const controller = useController();
  const recent = useObservable(controller.recentSizes);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prefix = useId();
  const [name, setName] = useState("Untitled");
  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");
  const [unit, setUnit] = useState<SizeUnit>("px");
  const [ppiText, setPpiText] = useState("72");
  const [background, setBackground] = useState<Background>("white");
  const [customColor, setCustomColor] = useState("#808080");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const categories: readonly PresetCategory[] = recent.length
    ? [
        {
          id: "recent",
          label: "Recent",
          presets: recent.map((size, i) => ({
            ...size,
            id: `recent-${i}`,
            name: formatPresetSize(size),
          })),
        },
        ...PRESET_CATEGORIES,
      ]
    : PRESET_CATEGORIES;
  const activeIndex = Math.max(
    0,
    categories.findIndex((c) => c.id === (tab ?? (recent.length ? "recent" : "social"))),
  );
  const results = query.trim() ? searchPresets(query) : null;

  // The size in pixels, when the fields describe one.
  const ppiValue = positive(ppiText);
  const ppi = ppiValue !== null && ppiValue >= MIN_PPI && ppiValue <= MAX_PPI ? ppiValue : null;
  const w = positive(width);
  const h = positive(height);
  const pixels =
    ppi !== null && w !== null && h !== null
      ? { width: toPixels(w, unit, ppi), height: toPixels(h, unit, ppi) }
      : null;
  const check = pixels ? checkDimensions(pixels.width, pixels.height) : null;

  const pick = (preset: SizePreset) => {
    setWidth(String(preset.width));
    setHeight(String(preset.height));
    setUnit(preset.unit);
    setPpiText(String(preset.ppi));
    setSelectedId(preset.id);
    setError(null);
  };

  /** Any manual edit makes the size custom. */
  const edited = <T,>(set: (value: T) => void) => {
    return (value: T) => {
      set(value);
      setSelectedId(null);
    };
  };

  const changeUnit = (next: SizeUnit) => {
    // Same pixel size in the new unit.
    if (pixels && ppi !== null) {
      setWidth(String(fromPixels(pixels.width, next, ppi)));
      setHeight(String(fromPixels(pixels.height, next, ppi)));
    }
    setUnit(next);
  };

  const onTabKeyDown = (event: KeyboardEvent) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (activeIndex + delta + categories.length) % categories.length;
    setTab(categories[next].id);
    tabRefs.current[next]?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ppi === null) {
      setError(`Resolution must be between ${MIN_PPI} and ${MAX_PPI.toLocaleString("en-US")} ppi.`);
      return;
    }
    if (w === null || h === null || !pixels || !check) {
      setError("Enter a width and a height.");
      return;
    }
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    const result = controller.newDocument({
      name,
      width: pixels.width,
      height: pixels.height,
      resolution: ppi,
      background:
        background === "transparent"
          ? { kind: "transparent" }
          : {
              kind: "color",
              color:
                background === "custom"
                  ? customColor
                  : background === "white"
                    ? "#ffffff"
                    : "#000000",
            },
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    controller.recentSizes.set(addRecentSize(recent, { width: w, height: h, unit, ppi }));
    setError(null);
    onClose();
  };

  const step = unit === "px" ? 1 : "any";

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${styles.newDocDialog}`}
      aria-labelledby="new-doc-title"
      // The native close event is queued asynchronously; ignore a stale one that arrives after
      // the dialog has already been reopened.
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="new-doc-title" className={styles.dialogTitle}>
          New document
        </h2>
        <div className={styles.newDocBody}>
          <section className={styles.newDocPresets} aria-label="Size presets">
            {/* Presets render only while open, so a closed dialog adds nothing to the page. */}
            {open && (
              <>
                <input
                  type="search"
                  className={`${styles.input} ${styles.presetSearch}`}
                  aria-label="Search sizes"
                  placeholder="Search sizes, e.g. story, A4, 1080"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  // Enter searches; it must not create the document.
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                />
                <div hidden={results !== null}>
                  <div
                    className={styles.panelTabs}
                    role="tablist"
                    aria-label="Size categories"
                    onKeyDown={onTabKeyDown}
                  >
                    {categories.map((category, i) => (
                      <button
                        key={category.id}
                        ref={(el) => {
                          tabRefs.current[i] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`${prefix}-${category.id}-tab`}
                        aria-selected={i === activeIndex}
                        aria-controls={`${prefix}-${category.id}-panel`}
                        tabIndex={i === activeIndex ? 0 : -1}
                        className={styles.panelTab}
                        onClick={() => setTab(category.id)}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                  {categories.map((category, i) => (
                    <div
                      key={category.id}
                      role="tabpanel"
                      id={`${prefix}-${category.id}-panel`}
                      aria-labelledby={`${prefix}-${category.id}-tab`}
                      hidden={i !== activeIndex}
                    >
                      {i === activeIndex && (
                        <PresetGrid
                          label={`${category.label} sizes`}
                          presets={category.presets}
                          selectedId={selectedId}
                          onPick={pick}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {results !== null &&
                  (results.length ? (
                    <PresetGrid
                      label="Search results"
                      presets={results}
                      selectedId={selectedId}
                      onPick={pick}
                    />
                  ) : (
                    <p className={styles.muted}>No sizes match “{query.trim()}”.</p>
                  ))}
              </>
            )}
          </section>
          <div className={styles.newDocFields}>
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
              <label className={styles.fieldLabel} htmlFor="nd-width">
                Width ({unit})
              </label>
              <input
                id="nd-width"
                className={styles.input}
                type="number"
                inputMode="decimal"
                min={0}
                max={unit === "px" ? MAX_DIMENSION : undefined}
                step={step}
                value={width}
                onChange={(e) => edited(setWidth)(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="nd-height">
                Height ({unit})
              </label>
              <input
                id="nd-height"
                className={styles.input}
                type="number"
                inputMode="decimal"
                min={0}
                max={unit === "px" ? MAX_DIMENSION : undefined}
                step={step}
                value={height}
                onChange={(e) => edited(setHeight)(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="nd-unit">
                Units
              </label>
              <div className={styles.newDocUnitRow}>
                <select
                  id="nd-unit"
                  className={styles.select}
                  value={unit}
                  onChange={(e) => changeUnit(e.target.value as SizeUnit)}
                >
                  {SIZE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.button}
                  aria-label="Swap width and height"
                  title="Swap width and height"
                  onClick={() => {
                    setWidth(height);
                    setHeight(width);
                    setSelectedId(null);
                  }}
                >
                  ⇄
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="nd-ppi">
                Resolution (ppi)
              </label>
              <input
                id="nd-ppi"
                className={styles.input}
                type="number"
                inputMode="decimal"
                min={MIN_PPI}
                max={MAX_PPI}
                value={ppiText}
                onChange={(e) => edited(setPpiText)(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="nd-bg">
                Background
              </label>
              <div className={styles.newDocUnitRow}>
                <select
                  id="nd-bg"
                  className={styles.select}
                  value={background}
                  onChange={(e) => setBackground(e.target.value as Background)}
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                  <option value="transparent">Transparent</option>
                  <option value="custom">Colour…</option>
                </select>
                {background === "custom" && (
                  <input
                    type="color"
                    className={styles.newDocColor}
                    aria-label="Background colour"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                  />
                )}
              </div>
            </div>
            <p className={styles.newDocSummary} aria-live="polite">
              {pixels && check?.ok ? (
                <>
                  {pixels.width.toLocaleString("en-US")} × {pixels.height.toLocaleString("en-US")}{" "}
                  px · {(estimateBytes(pixels.width, pixels.height) / 1024 / 1024).toFixed(1)} MB
                </>
              ) : check && !check.ok ? (
                <span className={styles.newDocWarning}>{check.reason}</span>
              ) : (
                "—"
              )}
            </p>
            <p className={`${styles.muted} ${styles.newDocNote}`}>RGB · 8-bit · sRGB</p>
          </div>
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
