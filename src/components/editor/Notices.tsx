"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAppStatus, useController } from "./editor-context";
import styles from "./editor.module.css";
import { CloseIcon } from "./icons";

const AUTO_DISMISS_MS = 8000;

export function Notices() {
  const controller = useController();
  const notices = useAppStatus((s) => s.notices);

  useEffect(() => {
    if (notices.length === 0) return;
    const oldest = notices[0];
    const timer = setTimeout(() => controller.dismissNotice(oldest.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notices, controller]);

  return (
    <div className={styles.notices} role="status" aria-live="polite">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={`${styles.notice} ${notice.kind === "error" ? styles.noticeError : ""}`}
        >
          <span className={styles.noticeText}>{notice.message}</span>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Dismiss"
            onClick={() => controller.dismissNotice(notice.id)}
          >
            <CloseIcon size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Covers the editor while a long operation runs, so nothing is clicked twice (ADR-0012). */
export function BusyOverlay() {
  const controller = useController();
  const busy = useSyncExternalStore(controller.busy.subscribe, controller.busy.get, () => null);
  if (!busy) return null;
  return (
    <div className={styles.busy} role="status" aria-live="polite" data-testid="busy">
      <span className={styles.spinner} aria-hidden="true" />
      {busy}
    </div>
  );
}
