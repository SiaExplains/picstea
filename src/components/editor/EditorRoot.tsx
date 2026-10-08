"use client";

import { Component, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createLogger, describeError } from "@/lib/logging/logger";
import { EditorController } from "@/editor/controller/editor-controller";
import {
  IndexedDbProjectStorage,
  isIndexedDbAvailable,
} from "@/editor/persistence/indexeddb/indexeddb-project-storage";
import { MemoryProjectStorage } from "@/editor/persistence/memory/memory-project-storage";
import { EditorContext } from "./editor-context";
import styles from "./editor.module.css";
import { EditorShell } from "./EditorShell";

const logger = createLogger("editor");

let browserController: EditorController | null = null;

/** One controller per page lifetime, created only in the browser. */
function getBrowserController(): EditorController {
  browserController ??= new EditorController({
    storage: isIndexedDbAvailable() ? new IndexedDbProjectStorage() : new MemoryProjectStorage(),
    decode: (blob) => createImageBitmap(blob),
    logger,
  });
  return browserController;
}

const subscribeNoop = () => () => {};

class EditorErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    logger.error("editor crashed", describeError(error));
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={styles.root}>
        <div className={styles.fatal} role="alert">
          <div>
            <h1 className={styles.startTitle}>The editor ran into a problem</h1>
            <p className={styles.startLead}>
              Your work up to the last autosave is still in this browser. Reload to continue.
            </p>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => window.location.reload()}
            >
              Reload editor
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Client-only root of the editor. The server renders a neutral shell; the controller (which needs
 * IndexedDB, createImageBitmap, etc.) is created after hydration.
 */
export function EditorRoot() {
  const controller = useSyncExternalStore(subscribeNoop, getBrowserController, () => null);

  useEffect(() => {
    if (controller) void controller.refreshRecentProjects();
  }, [controller]);

  if (!controller) {
    return (
      <div className={styles.root} aria-busy="true">
        <div className={styles.fatal}>
          <p className={styles.muted}>Loading editor…</p>
        </div>
      </div>
    );
  }

  return (
    <EditorErrorBoundary>
      <EditorContext.Provider value={controller}>
        <EditorShell />
      </EditorContext.Provider>
    </EditorErrorBoundary>
  );
}
