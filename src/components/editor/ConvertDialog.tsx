"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import {
  MAX_BATCH_FILES,
  MAX_BATCH_OUTPUT_BYTES,
  uniqueEntryName,
} from "@/editor/automation/batch";
import type { Conversion } from "@/editor/formats/convert";
import {
  EXPORT_FORMATS,
  isRasterFormat,
  type RasterExportFormat,
} from "@/editor/formats/export/raster-export";
import { OPEN_ACCEPT } from "@/editor/formats/open-file";
import { baseName } from "@/editor/formats/raster/raster-import";
import { writeZip, type ZipInput } from "@/editor/formats/zip/zip";
import { useController } from "./editor-context";
import styles from "./editor.module.css";
import { saveFile } from "./save-file";
import { useModal } from "./SelectionDialogs";

const FORMATS = (Object.keys(EXPORT_FORMATS) as (keyof typeof EXPORT_FORMATS)[]).filter(
  isRasterFormat,
);

/**
 * File → Convert… and the site's converter pages (`/?convert=webp-to-png`): turn image files into
 * PNG, JPEG or WebP without opening them. One file is saved directly; several go into one ZIP,
 * because browsers block a burst of separate downloads. Nothing is uploaded or stored.
 */
export function ConvertDialog({
  conversion,
  onClose,
}: {
  conversion: Conversion | null;
  onClose: () => void;
}) {
  const controller = useController();
  const ref = useModal(true);
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<RasterExportFormat>(conversion?.to ?? "png");
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (list: FileList | null) => {
    const picked = [...(list ?? [])].slice(0, MAX_BATCH_FILES);
    setFiles(picked);
    setError(null);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    if (!busy) choose(event.dataTransfer.files);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (files.length === 0) {
      setError("Choose the files to convert.");
      return;
    }
    setBusy(true);
    setError(null);
    const options = { to: format, quality: quality / 100 };
    const info = EXPORT_FORMATS[format];
    try {
      if (files.length === 1) {
        const result = await controller.convertFile(files[0], files[0].name, options);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const saved = await saveFile(result.blob, result.filename, info.mime);
        if (saved === "failed") setError("The file could not be saved.");
        if (saved === "saved") {
          controller.notify("info", `Converted ${result.filename}`);
          onClose();
        }
        return;
      }
      const entries: ZipInput[] = [];
      const used = new Set<string>();
      const failed: string[] = [];
      let total = 0;
      for (const file of files) {
        const result = await controller.convertFile(file, file.name, options);
        if (!result.ok) {
          failed.push(`${file.name} (${result.error})`);
          continue;
        }
        total += result.blob.size;
        if (total > MAX_BATCH_OUTPUT_BYTES) {
          failed.push(`${file.name} (the ZIP file would be larger than 1 GB)`);
          break;
        }
        const name = uniqueEntryName(baseName(file.name), info.extension, used);
        entries.push({ name, data: new Uint8Array(await result.blob.arrayBuffer()) });
      }
      if (entries.length === 0) {
        setError(`No files could be converted: ${failed.join("; ")}`);
        return;
      }
      const zip = new Blob([(await writeZip(entries)) as BlobPart], { type: "application/zip" });
      const filename = `converted-${info.extension}.zip`;
      const saved = await saveFile(zip, filename, "application/zip", "ZIP archive");
      if (saved === "failed") {
        setError("The ZIP file could not be saved.");
        return;
      }
      if (failed.length > 0) {
        controller.notify(
          "error",
          `${failed.length} file(s) could not be converted: ${failed.join("; ")}`,
        );
      }
      if (saved === "saved") {
        controller.notify("info", `Converted ${entries.length} file(s) into ${filename}`);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const title = conversion ? `Convert ${conversion.label}` : "Convert images";

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="convert-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="convert-title" className={styles.dialogTitle}>
          {title}
        </h2>
        <div
          className={styles.field}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          data-testid="convert-drop"
        >
          <label className={styles.fieldLabel} htmlFor="convert-files">
            Files
          </label>
          <input
            id="convert-files"
            type="file"
            multiple
            accept={OPEN_ACCEPT}
            disabled={busy}
            onChange={(e) => choose(e.target.files)}
          />
          <p className={styles.muted} style={{ margin: "4px 0 0", gridColumn: "2" }}>
            {files.length > 0
              ? `${files.length} file(s) selected`
              : `PNG, JPEG, WebP, GIF, SVG, HEIC or PSD, up to ${MAX_BATCH_FILES} files. Or drop them here.`}
          </p>
        </div>
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className={styles.fieldLabel} style={{ marginBottom: 6 }}>
            Convert to
          </legend>
          <div className={styles.radioRow}>
            {FORMATS.map((f) => (
              <label key={f} className={styles.smallLabel}>
                <input
                  type="radio"
                  name="convert-format"
                  value={f}
                  checked={format === f}
                  disabled={busy}
                  onChange={() => setFormat(f)}
                />
                {EXPORT_FORMATS[f].label}
              </label>
            ))}
          </div>
        </fieldset>
        {EXPORT_FORMATS[format].lossy && (
          <div className={styles.field} style={{ marginTop: 12 }}>
            <label className={styles.fieldLabel} htmlFor="convert-quality">
              Quality
            </label>
            <div className={styles.rangeRow}>
              <input
                id="convert-quality"
                type="range"
                min={1}
                max={100}
                value={quality}
                disabled={busy}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
              <span style={{ width: 40, textAlign: "right" }}>{quality}%</span>
            </div>
          </div>
        )}
        <p className={styles.muted} style={{ margin: "12px 0 0" }}>
          {EXPORT_FORMATS[format].note} Files are converted on this device — nothing is uploaded or
          saved in the browser.
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={busy}>
            {busy ? "Converting…" : "Convert"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
