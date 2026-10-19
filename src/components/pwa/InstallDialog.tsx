"use client";

import { useEffect, useRef } from "react";
import styles from "@/components/editor/editor.module.css";

/**
 * How to install Picstea when the browser has no install prompt of its own to show (Safari,
 * Firefox), or the prompt was dismissed. Installed, the editor opens in its own window and works
 * offline.
 */
export function InstallDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="install-title" onClose={onClose}>
      <form method="dialog" className={styles.dialogForm}>
        <h2 id="install-title" className={styles.dialogTitle}>
          Install Picstea
        </h2>
        <p>
          Installed, Picstea opens in its own window like a desktop app and works without an
          internet connection. Your projects stay in this browser either way.
        </p>
        <ul>
          <li>
            <strong>Chrome or Edge:</strong> the install icon at the right of the address bar, or
            the browser menu → Install Picstea.
          </li>
          <li>
            <strong>Safari on a Mac:</strong> File → Add to Dock.
          </li>
          <li>
            <strong>iPhone or iPad:</strong> Share → Add to Home Screen.
          </li>
          <li>
            <strong>Firefox:</strong> no install option; Picstea still works offline in the browser
            once it has been opened.
          </li>
        </ul>
        <div className={styles.dialogActions}>
          <button type="submit" className={`${styles.button} ${styles.primary}`}>
            OK
          </button>
        </div>
      </form>
    </dialog>
  );
}
