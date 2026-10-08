"use client";

import { useEffect } from "react";
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
