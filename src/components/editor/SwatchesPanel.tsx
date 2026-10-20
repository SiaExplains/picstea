"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { addSwatch, DEFAULT_SWATCHES } from "@/editor/core/swatches";
import { useController, useEditorState, useObservable } from "./editor-context";
import styles from "./editor.module.css";
import { useT } from "./i18n";

/**
 * Swatches: click sets the foreground colour, Alt-click the background colour. Delete removes
 * the focused swatch. Stored in this browser only.
 */
export function SwatchesPanel() {
  const controller = useController();
  const swatches = useObservable(controller.swatches);
  const foreground = useEditorState((s) => s.colors.foreground);
  const t = useT();

  const pick = (event: MouseEvent, color: string) => {
    controller.store.setColors(event.altKey ? { background: color } : { foreground: color });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    event.preventDefault();
    event.stopPropagation();
    const grid = event.currentTarget.parentElement;
    controller.swatches.update((list) => list.filter((_, i) => i !== index));
    // Keep focus in the grid on the swatch that took its place.
    requestAnimationFrame(() => {
      const buttons = grid?.querySelectorAll<HTMLButtonElement>("button");
      buttons?.[Math.min(index, buttons.length - 1)]?.focus();
    });
  };

  return (
    <div className={styles.swatchesPanel}>
      <div className={styles.swatchGrid} role="group" aria-label={t("Swatches")}>
        {swatches.map((swatch, i) => (
          <button
            key={`${swatch.color}-${i}`}
            type="button"
            className={styles.swatchCell}
            style={{ background: swatch.color }}
            aria-label={t("Swatch {name}", { name: swatch.name ?? swatch.color })}
            title={`${swatch.name ? `${swatch.name} ` : ""}${swatch.color} — ${t("click: foreground, Alt-click: background, Delete: remove")}`}
            onClick={(e) => pick(e, swatch.color)}
            onKeyDown={(e) => onKeyDown(e, i)}
          />
        ))}
      </div>
      <div className={styles.panelActions}>
        <button
          type="button"
          className={styles.button}
          onClick={() => controller.swatches.update((list) => addSwatch(list, foreground))}
        >
          {t("Add Foreground")}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => controller.swatches.set(DEFAULT_SWATCHES)}
        >
          {t("Reset")}
        </button>
      </div>
    </div>
  );
}
