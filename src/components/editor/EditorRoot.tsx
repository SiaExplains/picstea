"use client";

import { Component, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createLogger, describeError } from "@/lib/logging/logger";
import { EditorController, pixelBudgetFor } from "@/editor/controller/editor-controller";
import { parseViewSettings } from "@/editor/core/view-settings";
import { parseStoredActions } from "@/editor/automation/actions";
import { createId } from "@/editor/core/ids";
import type { Observable } from "@/editor/core/observable";
import { DEFAULT_SWATCHES, parseSwatches } from "@/editor/core/swatches";
import { parseStylePresets } from "@/editor/core/effects/presets";
import { parseRecentSizes } from "@/editor/core/document/presets";
import {
  IndexedDbProjectStorage,
  isIndexedDbAvailable,
} from "@/editor/persistence/indexeddb/indexeddb-project-storage";
import { MemoryProjectStorage } from "@/editor/persistence/memory/memory-project-storage";
import type { BitmapEncoder } from "@/editor/assets/asset-store";
import { defaultSurfaceFactory } from "@/editor/rendering/canvas/canvas2d-renderer";
import { createCanvasTextSizer } from "@/editor/rendering/text/text-layout";
import { workerRunner } from "@/editor/workers/job-runner";
import { EditorContext } from "./editor-context";
import styles from "./editor.module.css";
import { EditorShell } from "./EditorShell";
import { useT } from "./i18n";

const logger = createLogger("editor");

let browserController: EditorController | null = null;

/** PNG-encode editor-created pixels (brush strokes) for local saving. */
const encodePng: BitmapEncoder = async (bitmap, width, height) => {
  const surface = defaultSurfaceFactory(width, height);
  const ctx = surface.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error("2D canvas is not available.");
  ctx.drawImage(bitmap, 0, 0);
  try {
    if ("convertToBlob" in surface) return await surface.convertToBlob({ type: "image/png" });
    return await new Promise<Blob>((resolve, reject) =>
      surface.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed."))),
        "image/png",
      ),
    );
  } finally {
    surface.width = 0;
    surface.height = 0;
  }
};

/**
 * Draw SVG through an <img> element: scripts never run and external resources are not loaded
 * in this mode, and the SVG is never inserted into the page (docs/12).
 */
const rasterizeSvg = async (svg: Blob, width: number, height: number) => {
  const url = URL.createObjectURL(svg);
  try {
    const image = new Image(width, height);
    image.src = url;
    await image.decode();
    const surface = defaultSurfaceFactory(width, height);
    const ctx = surface.getContext("2d") as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error("2D canvas is not available.");
    ctx.drawImage(image, 0, 0, width, height);
    return surface;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** One controller per page lifetime, created only in the browser. */
function getBrowserController(): EditorController {
  browserController ??= new EditorController({
    storage: isIndexedDbAvailable() ? new IndexedDbProjectStorage() : new MemoryProjectStorage(),
    decode: (blob) => createImageBitmap(blob),
    encode: encodePng,
    createSurface: defaultSurfaceFactory,
    rasterizeSvg,
    // Memory for pixels and undo history follows the device when the browser reports it.
    pixelBudgetBytes: pixelBudgetFor(
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    ),
    // CPU-heavy jobs (PSD, flood fill) run in a worker; it falls back to inline if unavailable.
    jobs: workerRunner(
      () =>
        new Worker(new URL("../../workers/editor.worker.ts", import.meta.url), {
          type: "module",
          name: "picstea-editor",
        }),
    ),
    sizer: createCanvasTextSizer(
      () => defaultSurfaceFactory(1, 1).getContext("2d") as CanvasRenderingContext2D | null,
    ),
    logger,
  });
  const c = browserController;
  persist(c.view, "picstea.view", parseViewSettings);
  persist(c.swatches, "picstea.swatches", (v) => parseSwatches(v) ?? DEFAULT_SWATCHES);
  persist(c.actions, "picstea.actions", (v) => parseStoredActions(v, () => createId("action")));
  persist(c.recentSizes, "picstea.recentSizes", parseRecentSizes);
  persist(c.layerStyles, "picstea.layerStyles", (v) =>
    parseStylePresets(v, () => createId("style")),
  );
  return c;
}

/**
 * Per-browser preferences (view settings, swatches, actions, recent sizes, layer styles) live in local storage, which may be
 * unavailable (private mode, blocked storage): then they just aren't remembered.
 */
function persist<T>(observable: Observable<T>, key: string, parse: (value: unknown) => T): void {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) observable.set(parse(JSON.parse(raw)));
  } catch {
    // Unreadable or malformed: keep the defaults.
  }
  observable.subscribe(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(observable.get()));
    } catch {
      // Not remembered.
    }
  });
}

const subscribeNoop = () => () => {};

class EditorErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; saved: boolean | null }
> {
  state = { failed: false, saved: null as boolean | null };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    logger.error("editor crashed", describeError(error));
    // The UI broke, but documents are immutable data: try to store any unsaved changes now
    // instead of losing what happened since the last autosave.
    const controller = browserController;
    if (!controller) return;
    controller
      .saveAfterCrash()
      .then((saved) => this.setState({ saved }))
      .catch((saveError: unknown) => {
        logger.error("saving after crash failed", describeError(saveError));
        this.setState({ saved: false });
      });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <CrashScreen saved={this.state.saved} />;
  }
}

/** What the error boundary shows (a function component, so it can translate). */
function CrashScreen({ saved }: { saved: boolean | null }) {
  const t = useT();
  return (
    <div className={styles.root}>
      <div className={styles.fatal} role="alert">
        <div>
          <h1 className={styles.startTitle}>{t("The editor ran into a problem")}</h1>
          <p className={styles.startLead} role="status">
            {saved === true
              ? t("Your open documents were saved in this browser. Reload to continue.")
              : saved === false
                ? t(
                    "Your work up to the last autosave is still in this browser. Reload to continue.",
                  )
                : t("Saving your open documents…")}
          </p>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() => window.location.reload()}
          >
            {t("Reload editor")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Client-only root of the editor. The server renders a neutral shell; the controller (which needs
 * IndexedDB, createImageBitmap, etc.) is created after hydration.
 */
export function EditorRoot() {
  const controller = useSyncExternalStore(subscribeNoop, getBrowserController, () => null);
  const t = useT();

  // Backstop for ADR-0013: the editor must never share a page with third-party (ad) code. Website
  // links reach it with a full page load; if ad code is somehow present, start over cleanly.
  useEffect(() => {
    if (document.querySelector("script[data-vendor]") || "adsbygoogle" in window) {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (controller) void controller.refreshRecentProjects();
  }, [controller]);

  if (!controller) {
    return (
      <div className={styles.root} aria-busy="true">
        <div className={styles.fatal}>
          <p className={styles.muted}>{t("Loading editor…")}</p>
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
