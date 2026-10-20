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
import { useMessage, useT } from "./i18n";
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
  const t = useT();
  const message = useMessage();
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
      setError(t("Choose an action. Record one in the Actions panel first."));
      return;
    }
    if (files.length === 0) {
      setError(t("Choose the files to process."));
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
      setError(message(result.error, result.template));
      return;
    }
    const filename = safeFilename(`${action.name} batch`, "zip");
    const saved = await saveFile(result.blob, filename, "application/zip", t("ZIP archive"));
    if (saved === "failed") {
      setError(t("The ZIP file could not be saved."));
      return;
    }
    if (saved === "saved") {
      controller.notify(
        "info",
        result.cancelled
          ? t("Processed {count} file(s) (stopped early) into {name}.", {
              count: result.processed,
              name: filename,
            })
          : t("Processed {count} file(s) into {name}.", {
              count: result.processed,
              name: filename,
            }),
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
          {t("Batch")}
        </h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="batch-action">
            {t("Action")}
          </label>
          <select
            id="batch-action"
            className={styles.input}
            value={actionId}
            disabled={running || actions.length === 0}
            onChange={(e) => setActionId(e.target.value)}
          >
            {actions.length === 0 && <option value="">{t("No actions recorded yet")}</option>}
            {actions.map((a) => (
              <option key={a.id} value={a.id}>
                {t("{name} ({count} steps)", { name: a.name, count: a.steps.length })}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="batch-files">
            {t("Files (up to {max})", { max: MAX_BATCH_FILES })}
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
              {t("{count} file(s) selected", { count: files.length })}
            </p>
          )}
        </div>
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className={styles.fieldLabel} style={{ marginBottom: 6 }}>
            {t("Save as")}
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
              {t("Quality")}
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
          {t(
            "Each file is opened, the action is played and the result is added to one ZIP file. Your files stay on this device and are not saved to the browser.",
          )}
        </p>
        {progress && (
          <div className={styles.field} style={{ marginTop: 12 }}>
            <progress
              max={progress.total}
              value={progress.done}
              aria-label={t("Batch progress")}
              style={{ width: "100%" }}
            />
            <p role="status" className={styles.muted} style={{ margin: "4px 0 0" }}>
              {t("Processing {current} of {total}…", {
                current: Math.min(progress.done + 1, progress.total),
                total: progress.total,
              })}
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
            {running ? t("Stop") : t("Cancel")}
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={running}>
            {running ? t("Processing…") : t("Run")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
