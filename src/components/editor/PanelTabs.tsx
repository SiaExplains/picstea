"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ActionsPanel } from "./ActionsPanel";
import styles from "./editor.module.css";
import { HistoryPanel } from "./HistoryPanel";
import { SwatchesPanel } from "./SwatchesPanel";

const TABS = [
  { id: "history", label: "History", Panel: HistoryPanel },
  { id: "swatches", label: "Swatches", Panel: SwatchesPanel },
  { id: "actions", label: "Actions", Panel: ActionsPanel },
] as const;

/** History, Swatches and Actions share one panel (ARIA tabs). */
export function PanelTabs() {
  const [active, setActive] = useState(0);
  const prefix = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
      aria-label="History, swatches and actions"
    >
      <div className={styles.panelTabs} role="tablist" aria-label="Panels" onKeyDown={onKeyDown}>
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
            className={styles.panelTab}
            onClick={() => setActive(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${prefix}-${TABS[active].id}-panel`}
        aria-labelledby={`${prefix}-${TABS[active].id}-tab`}
        className={styles.tabPanelBody}
      >
        <Panel />
      </div>
    </section>
  );
}
