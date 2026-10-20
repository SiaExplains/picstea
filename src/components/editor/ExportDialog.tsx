"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  EXPORT_FORMATS,
  exportFilename,
  type ExportFormat,
} from "@/editor/formats/export/raster-export";
import { useActiveSession, useController } from "./editor-context";
import { useMessage, useT } from "./i18n";
import styles from "./editor.module.css";
import { saveFile } from "./save-file";

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const controller = useController();
  const session = useActiveSession();
  const t = useT();
  const message = useMessage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const doc = session?.document;
  const info = EXPORT_FORMATS[format];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await controller.exportActive({ format, quality: quality / 100 });
    if (!result.ok) {
      setBusy(false);
      setError(message(result.error, result.template));
      return;
    }
    const saved = await saveFile(result.blob, result.filename, info.mime);
    setBusy(false);
    if (saved === "cancelled") return;
    if (saved === "failed") {
      setError(t("The file could not be saved."));
      return;
    }
    controller.notify(
      "info",
      result.warnings.length > 0
        ? t("Exported {name}. {details}", {
            name: result.filename,
            details: result.warnings.map((w) => t(w)).join(" "),
          })
        : t("Exported {name}", { name: result.filename }),
    );
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="export-title"
      // The native close event is queued asynchronously; ignore a stale one that arrives after
      // the dialog has already been reopened.
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit}>
        <h2 id="export-title" className={styles.dialogTitle}>
          {t("Export")}
        </h2>
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className={styles.fieldLabel} style={{ marginBottom: 6 }}>
            {t("Format")}
          </legend>
          <div className={styles.radioRow}>
            {(Object.keys(EXPORT_FORMATS) as ExportFormat[]).map((f) => (
              <label key={f} className={styles.smallLabel}>
                <input
                  type="radio"
                  name="export-format"
                  value={f}
                  checked={format === f}
                  onChange={() => setFormat(f)}
                />
                {EXPORT_FORMATS[f].label}
              </label>
            ))}
          </div>
        </fieldset>
        {info.lossy && (
          <div className={styles.field} style={{ marginTop: 12 }}>
            <label className={styles.fieldLabel} htmlFor="export-quality">
              {t("Quality")}
            </label>
            <div className={styles.rangeRow}>
              <input
                id="export-quality"
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
              <span style={{ width: 40, textAlign: "right" }}>{quality}%</span>
            </div>
          </div>
        )}
        <p className={styles.muted} style={{ margin: "12px 0 0" }} data-testid="export-note">
          {t(info.note)}
        </p>
        <p className={styles.muted} style={{ margin: "6px 0 0" }}>
          {doc && (
            <>
              {exportFilename(doc.name, format)} · {doc.width} × {doc.height} px
            </>
          )}
        </p>
        <p className={styles.muted} style={{ margin: "6px 0 0" }}>
          {t("The file is created on your device — nothing is uploaded.")}
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={onClose}>
            {t("Cancel")}
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.primary}`}
            disabled={busy || !doc}
          >
            {busy ? t("Exporting…") : t("Export")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
