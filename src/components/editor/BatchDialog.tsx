"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_BATCH_FILES } from "@/editor/automation/batch";
import {
  EXPORT_FORMATS,
  isRasterFormat,
  safeFilename,
  type RasterExportFormat,
} from "@/editor/formats/export/raster-export";
import { OPEN_ACCEPT } from "@/editor/formats/open-file";
import { useController, useObservable } from "./editor-context";
import styles from "./editor.module.css";
import { saveFile } from "./save-file";
import { useModal } from "./SelectionDialogs";

const FORMATS = (Object.keys(EXPORT_FORMATS) as (keyof typeof EXPORT_FORMATS)[]).filter(
  isRasterFormat,
);

/**
 * File → Batch: play an action on many files and download the results as one ZIP. Everything
 * happens on this device; the files are never uploaded or stored.
 */
export function BatchDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
  const actions = useObservable(controller.actions);
  const ref = useModal(true);
  const [actionId, setActionId] = useState(actions[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<RasterExportFormat>("png");
  const [quality, setQuality] = useState(90);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Closing the dialog mid-run cancels the remaining files.
  useEffect(() => () => abortRef.current?.abort(), []);

  const running = progress !== null;
  const action = actions.find((a) => a.id === actionId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!action) {
      setError("Choose an action. Record one in the Actions panel first.");
      return;
    }
    if (files.length === 0) {
      setError("Choose the files to process.");
      return;
    }
    setError(null);
    const abort = new AbortController();
    abortRef.current = abort;
    setProgress({ done: 0, total: files.length });
    const result = await controller.runBatch({
      actionId: action.id,
      files: files.map((file) => ({ blob: file, name: file.name })),
      export: { format, quality: quality / 100 },
      signal: abort.signal,
      onProgress: (done, total) => setProgress({ done, total }),
    });
    abortRef.current = null;
    setProgress(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const filename = safeFilename(`${action.name} batch`, "zip");
    const saved = await saveFile(result.blob, filename, "application/zip", "ZIP archive");
    if (saved === "failed") {
      setError("The ZIP file could not be saved.");
      return;
    }
    if (saved === "saved") {
      controller.notify(
        "info",
        `Processed ${result.processed} file(s)${result.cancelled ? " (stopped early)" : ""} into ${filename}.`,
      );
    }
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="batch-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="batch-title" className={styles.dialogTitle}>
          Batch
        </h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="batch-action">
            Action
          </label>
          <select
            id="batch-action"
            className={styles.input}
            value={actionId}
            disabled={running || actions.length === 0}
            onChange={(e) => setActionId(e.target.value)}
          >
            {actions.length === 0 && <option value="">No actions recorded yet</option>}
            {actions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.steps.length} steps)
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="batch-files">
            Files (up to {MAX_BATCH_FILES})
          </label>
          <input
            id="batch-files"
            type="file"
            multiple
            accept={OPEN_ACCEPT}
            disabled={running}
            onChange={(e) => setFiles([...(e.target.files ?? [])])}
          />
          {files.length > 0 && (
            <p className={styles.muted} style={{ margin: "4px 0 0" }}>
              {files.length} file(s) selected
            </p>
          )}
        </div>
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className={styles.fieldLabel} style={{ marginBottom: 6 }}>
            Save as
          </legend>
          <div className={styles.radioRow}>
            {FORMATS.map((f) => (
              <label key={f} className={styles.smallLabel}>
                <input
                  type="radio"
                  name="batch-format"
                  value={f}
                  checked={format === f}
                  disabled={running}
                  onChange={() => setFormat(f)}
                />
                {EXPORT_FORMATS[f].label}
              </label>
            ))}
          </div>
        </fieldset>
        {EXPORT_FORMATS[format].lossy && (
          <div className={styles.field} style={{ marginTop: 12 }}>
            <label className={styles.fieldLabel} htmlFor="batch-quality">
              Quality
            </label>
            <div className={styles.rangeRow}>
              <input
                id="batch-quality"
                type="range"
                min={1}
                max={100}
                value={quality}
                disabled={running}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
              <span style={{ width: 40, textAlign: "right" }}>{quality}%</span>
            </div>
          </div>
        )}
        <p className={styles.muted} style={{ margin: "12px 0 0" }}>
          Each file is opened, the action is played and the result is added to one ZIP file. Your
          files stay on this device and are not saved to the browser.
        </p>
        {progress && (
          <div className={styles.field} style={{ marginTop: 12 }}>
            <progress
              max={progress.total}
              value={progress.done}
              aria-label="Batch progress"
              style={{ width: "100%" }}
            />
            <p role="status" className={styles.muted} style={{ margin: "4px 0 0" }}>
              Processing {Math.min(progress.done + 1, progress.total)} of {progress.total}…
            </p>
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button
            type="button"
            className={styles.button}
            onClick={() => (running ? abortRef.current?.abort() : onClose())}
          >
            {running ? "Stop" : "Cancel"}
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={running}>
            {running ? "Processing…" : "Run"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
