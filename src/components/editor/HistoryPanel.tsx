"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { useActiveSession, useController } from "./editor-context";
import styles from "./editor.module.css";

/**
 * History panel: every undo step of the active document. Choosing a step undoes or redoes to it;
 * the steps after it stay available (dimmed) until the next edit.
 */
export function HistoryPanel() {
  const controller = useController();
  const session = useActiveSession();
  const listRef = useRef<HTMLUListElement>(null);
  const history = session?.history;
  const current = history?.past.length ?? 0;

  // Keep the current step in view.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [current, history]);

  if (!session || !history) {
    return <p className={styles.muted}>Open a document to see its history.</p>;
  }

  const rows = [
    { label: `Opened ${session.document.name}`, key: "open" },
    ...[...history.past, ...history.future].map((entry, i) => ({
      label: entry.label,
      key: `${i}-${entry.timestamp}`,
    })),
  ];
  const go = (index: number) => controller.store.goToHistory(index, session.document.id);

  const onKeyDown = (event: KeyboardEvent) => {
    const next =
      event.key === "ArrowUp"
        ? current - 1
        : event.key === "ArrowDown"
          ? current + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? rows.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    if (next >= 0 && next < rows.length) go(next);
  };

  return (
    <ul
      ref={listRef}
      className={styles.historyList}
      role="listbox"
      aria-label="History"
      tabIndex={0}
      aria-activedescendant={`history-row-${current}`}
      onKeyDown={onKeyDown}
    >
      {rows.map((row, i) => (
        <li
          key={row.key}
          id={`history-row-${i}`}
          role="option"
          aria-selected={i === current}
          className={`${styles.historyRow} ${i > current ? styles.historyFuture : ""}`}
          onClick={() => go(i)}
        >
          {row.label}
        </li>
      ))}
    </ul>
  );
}
