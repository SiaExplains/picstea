"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ActionsPanel } from "./ActionsPanel";
import styles from "./editor.module.css";
import { HistoryPanel } from "./HistoryPanel";
import { SwatchesPanel } from "./SwatchesPanel";
import { onShowTab } from "./show-panel";
import { useT } from "./i18n";
import { N_ } from "@/i18n/editor/catalog";

const TABS = [
  { id: "history", label: N_("History"), Panel: HistoryPanel },
  { id: "swatches", label: N_("Swatches"), Panel: SwatchesPanel },
  { id: "actions", label: N_("Actions"), Panel: ActionsPanel },
] as const;

/** History, Swatches and Actions share one panel (ARIA tabs). */
export function PanelTabs() {
  const [active, setActive] = useState(0);
  const prefix = useId();
  const t = useT();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Window → History / Swatches / Actions.
  useEffect(
    () =>
      onShowTab((tab) => {
        const index = TABS.findIndex((t) => t.id === tab);
        setActive(index);
        tabRefs.current[index]?.scrollIntoView({ block: "nearest" });
        tabRefs.current[index]?.focus();
      }),
    [],
  );

  const onKeyDown = (event: KeyboardEvent) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (active + delta + TABS.length) % TABS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const { Panel } = TABS[active];
  return (
    <section
      className={`${styles.panel} ${styles.tabbedPanel}`}
      aria-label={t("History, swatches and actions")}
      data-panel="tabs"
    >
      <div
        className={styles.panelTabs}
        role="tablist"
        aria-label={t("Panels")}
        onKeyDown={onKeyDown}
      >
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${prefix}-${tab.id}-tab`}
            aria-selected={i === active}
            aria-controls={`${prefix}-${tab.id}-panel`}
            tabIndex={i === active ? 0 : -1}
            className={`${styles.panelTab} ${styles.panelTabFit}`}
            title={t(tab.label)}
            onClick={() => setActive(i)}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>
      {TABS.map((tab, i) => (
        // Every panel exists so each tab's aria-controls resolves; only the active one renders.
        <div
          key={tab.id}
          role="tabpanel"
          id={`${prefix}-${tab.id}-panel`}
          aria-labelledby={`${prefix}-${tab.id}-tab`}
          className={styles.tabPanelBody}
          hidden={i !== active}
        >
          {i === active && <Panel />}
        </div>
      ))}
    </section>
  );
}
