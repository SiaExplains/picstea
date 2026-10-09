"use client";

import { Component, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createLogger, describeError } from "@/lib/logging/logger";
import { EditorController, pixelBudgetFor } from "@/editor/controller/editor-controller";
import {
  DEFAULT_VIEW_SETTINGS,
  parseViewSettings,
  type ViewSettings,
} from "@/editor/core/view-settings";
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
          name: "mylper-editor",
        }),
    ),
    sizer: createCanvasTextSizer(
      () => defaultSurfaceFactory(1, 1).getContext("2d") as CanvasRenderingContext2D | null,
    ),
    logger,
  });
  browserController.view.set(loadViewSettings());
  browserController.view.subscribe(() => saveViewSettings(browserController!.view.get()));
  return browserController;
}

/** View preferences (rulers, guides, grid, snap) are per browser; storage may be unavailable. */
const VIEW_SETTINGS_KEY = "mylper.view";

function loadViewSettings(): ViewSettings {
  try {
    const raw = window.localStorage.getItem(VIEW_SETTINGS_KEY);
    return parseViewSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_VIEW_SETTINGS;
  }
}

function saveViewSettings(settings: ViewSettings): void {
  try {
    window.localStorage.setItem(VIEW_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private mode or blocked storage: the settings just aren't remembered.
  }
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
