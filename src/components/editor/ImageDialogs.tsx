"use client";

import { useState, type FormEvent } from "react";
import { MAX_DIMENSION } from "@/editor/core/document/limits";
import { N_ } from "@/i18n/editor/catalog";
import { useActiveSession, useController } from "./editor-context";
import { useT } from "./i18n";
import { useModal } from "./SelectionDialogs";
import styles from "./editor.module.css";

/** Image → Image Size…, Canvas Size… and Trim… (ADR-0033). Each is mounted only while open. */

const whole = (text: string) => {
  const n = Number(text);
  return Number.isInteger(n) && n >= 1 && n <= MAX_DIMENSION ? n : null;
};

// Numbers in these messages are passed as strings so they read as before ("12000", not "12,000").
const MAX_TEXT = String(MAX_DIMENSION);

function DialogFrame({
  id,
  title,
  onClose,
  onSubmit,
  valid,
  error,
  children,
}: {
  id: string;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  valid: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  const t = useT();
  const ref = useModal(true);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={id}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form
        className={styles.dialogForm}
        noValidate
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (valid) onSubmit();
        }}
      >
        <h2 id={id} className={styles.dialogTitle}>
          {title}
        </h2>
        {children}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={onClose}>
            {t("Cancel")}
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!valid}>
            {t("OK")}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_DIMENSION}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * Image Size: scale the whole image. Layers are scaled, not resampled, so pixel layers keep
 * their original pixels and scaling back up later loses nothing.
 */
export function ImageSizeDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
  const t = useT();
  const doc = useActiveSession()?.document;
  const [width, setWidth] = useState(String(doc?.width ?? 1));
  const [height, setHeight] = useState(String(doc?.height ?? 1));
  const [resolution, setResolution] = useState(String(doc?.resolution ?? 72));
  const [constrain, setConstrain] = useState(true);
  if (!doc) return null;
  const w = whole(width);
  const h = whole(height);
  const ppi = Number(resolution);
  const ppiOk = Number.isFinite(ppi) && ppi >= 1 && ppi <= 100_000;
  const ratio = doc.height / doc.width;
  return (
    <DialogFrame
      id="image-size-title"
      title={t("Image Size")}
      onClose={onClose}
      valid={!!w && !!h && ppiOk}
      error={
        !w || !h
          ? t("Width and height must be whole numbers from 1 to {max}.", { max: MAX_TEXT })
          : !ppiOk
            ? t("Resolution must be between 1 and 100000 pixels/inch.")
            : null
      }
      onSubmit={() => {
        if (w && h && controller.transformImage({ kind: "scale", width: w, height: h }, ppi)) {
          onClose();
        }
      }}
    >
      <p className={styles.muted}>
        {t("Currently {width} × {height} px.", {
          width: String(doc.width),
          height: String(doc.height),
        })}
      </p>
      <NumberField
        id="image-width"
        label={t("Width (px)")}
        value={width}
        onChange={(v) => {
          setWidth(v);
          const n = whole(v);
          if (constrain && n) setHeight(String(Math.max(1, Math.round(n * ratio))));
        }}
      />
      <NumberField
        id="image-height"
        label={t("Height (px)")}
        value={height}
        onChange={(v) => {
          setHeight(v);
          const n = whole(v);
          if (constrain && n) setWidth(String(Math.max(1, Math.round(n / ratio))));
        }}
      />
      <label className={styles.smallLabel}>
        <input
          type="checkbox"
          checked={constrain}
          onChange={(e) => setConstrain(e.target.checked)}
        />
        <span>{t("Constrain proportions")}</span>
      </label>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="image-resolution">
          {t("Resolution (pixels/inch)")}
        </label>
        <input
          id="image-resolution"
          className={styles.input}
          type="number"
          min={1}
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        />
      </div>
    </DialogFrame>
  );
}

const ANCHORS = [0, 0.5, 1] as const;
const ANCHOR_NAMES = [
  [N_("Top left"), N_("Top"), N_("Top right")],
  [N_("Left"), N_("Centre"), N_("Right")],
  [N_("Bottom left"), N_("Bottom"), N_("Bottom right")],
];

/** Canvas Size: add or remove canvas around the image, anchored on one of nine positions. */
export function CanvasSizeDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
  const t = useT();
  const doc = useActiveSession()?.document;
  const [width, setWidth] = useState(String(doc?.width ?? 1));
  const [height, setHeight] = useState(String(doc?.height ?? 1));
  const [relative, setRelative] = useState(false);
  const [anchor, setAnchor] = useState<[number, number]>([0.5, 0.5]);
  if (!doc) return null;
  const parse = (text: string, base: number) => {
    const n = Number(text);
    if (!Number.isInteger(n)) return null;
    return whole(String(relative ? base + n : n));
  };
  const w = parse(width, doc.width);
  const h = parse(height, doc.height);
  return (
    <DialogFrame
      id="canvas-size-title"
      title={t("Canvas Size")}
      onClose={onClose}
      valid={!!w && !!h}
      error={!w || !h ? t("The new size must be from 1 to {max} pixels.", { max: MAX_TEXT }) : null}
      onSubmit={() => {
        if (w && h && controller.canvasSize(w, h, anchor[0], anchor[1])) onClose();
        else if (w === doc.width && h === doc.height) onClose();
      }}
    >
      <p className={styles.muted}>
        {t("Currently {width} × {height} px.", {
          width: String(doc.width),
          height: String(doc.height),
        })}
      </p>
      <NumberField id="canvas-width" label={t("Width (px)")} value={width} onChange={setWidth} />
      <NumberField
        id="canvas-height"
        label={t("Height (px)")}
        value={height}
        onChange={setHeight}
      />
      <label className={styles.smallLabel}>
        <input
          type="checkbox"
          checked={relative}
          onChange={(e) => {
            const on = e.target.checked;
            setRelative(on);
            setWidth(on ? "0" : String(doc.width));
            setHeight(on ? "0" : String(doc.height));
          }}
        />
        <span>{t("Relative (add to the current size)")}</span>
      </label>
      <fieldset className={styles.field}>
        <legend className={styles.fieldLabel}>{t("Anchor")}</legend>
        <div className={styles.anchorGrid} role="radiogroup" aria-label={t("Anchor")}>
          {ANCHORS.map((ay, row) =>
            ANCHORS.map((ax, col) => (
              <button
                key={`${row}-${col}`}
                type="button"
                role="radio"
                aria-checked={anchor[0] === ax && anchor[1] === ay}
                aria-label={t(ANCHOR_NAMES[row][col])}
                className={styles.anchorCell}
                onClick={() => setAnchor([ax, ay])}
              />
            )),
          )}
        </div>
      </fieldset>
    </DialogFrame>
  );
}

/** Trim: crop away transparent pixels or pixels the colour of a corner. */
export function TrimDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
  const t = useT();
  const [basedOn, setBasedOn] = useState<"transparent" | "top-left" | "bottom-right">(
    "transparent",
  );
  const options = [
    ["transparent", N_("Transparent pixels")],
    ["top-left", N_("Top left pixel colour")],
    ["bottom-right", N_("Bottom right pixel colour")],
  ] as const;
  return (
    <DialogFrame
      id="trim-title"
      title={t("Trim")}
      onClose={onClose}
      valid
      error={null}
      onSubmit={() => {
        controller.trim(basedOn);
        onClose();
      }}
    >
      <fieldset className={styles.field}>
        <legend className={styles.fieldLabel}>{t("Based on")}</legend>
        {options.map(([value, label]) => (
          <label key={value} className={styles.smallLabel}>
            <input
              type="radio"
              name="trim-based-on"
              checked={basedOn === value}
              onChange={() => setBasedOn(value)}
            />
            <span>{t(label)}</span>
          </label>
        ))}
      </fieldset>
    </DialogFrame>
  );
}
