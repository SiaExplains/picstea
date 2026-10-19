"use client";

import { useState, type FormEvent } from "react";
import { MAX_DIMENSION } from "@/editor/core/document/limits";
import { useActiveSession, useController } from "./editor-context";
import { useModal } from "./SelectionDialogs";
import styles from "./editor.module.css";

/** Image → Image Size…, Canvas Size… and Trim… (ADR-0033). Each is mounted only while open. */

const whole = (text: string) => {
  const n = Number(text);
  return Number.isInteger(n) && n >= 1 && n <= MAX_DIMENSION ? n : null;
};

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
            Cancel
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!valid}>
            OK
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
      title="Image Size"
      onClose={onClose}
      valid={!!w && !!h && ppiOk}
      error={
        !w || !h
          ? `Width and height must be whole numbers from 1 to ${MAX_DIMENSION}.`
          : !ppiOk
            ? "Resolution must be between 1 and 100000 pixels/inch."
            : null
      }
      onSubmit={() => {
        if (w && h && controller.transformImage({ kind: "scale", width: w, height: h }, ppi)) {
          onClose();
        }
      }}
    >
      <p className={styles.muted}>
        Currently {doc.width} × {doc.height} px.
      </p>
      <NumberField
        id="image-width"
        label="Width (px)"
        value={width}
        onChange={(v) => {
          setWidth(v);
          const n = whole(v);
          if (constrain && n) setHeight(String(Math.max(1, Math.round(n * ratio))));
        }}
      />
      <NumberField
        id="image-height"
        label="Height (px)"
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
        <span>Constrain proportions</span>
      </label>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="image-resolution">
          Resolution (pixels/inch)
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
  ["Top left", "Top", "Top right"],
  ["Left", "Centre", "Right"],
  ["Bottom left", "Bottom", "Bottom right"],
];

/** Canvas Size: add or remove canvas around the image, anchored on one of nine positions. */
export function CanvasSizeDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
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
      title="Canvas Size"
      onClose={onClose}
      valid={!!w && !!h}
      error={!w || !h ? `The new size must be from 1 to ${MAX_DIMENSION} pixels.` : null}
      onSubmit={() => {
        if (w && h && controller.canvasSize(w, h, anchor[0], anchor[1])) onClose();
        else if (w === doc.width && h === doc.height) onClose();
      }}
    >
      <p className={styles.muted}>
        Currently {doc.width} × {doc.height} px.
      </p>
      <NumberField id="canvas-width" label="Width (px)" value={width} onChange={setWidth} />
      <NumberField id="canvas-height" label="Height (px)" value={height} onChange={setHeight} />
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
        <span>Relative (add to the current size)</span>
      </label>
      <fieldset className={styles.field}>
        <legend className={styles.fieldLabel}>Anchor</legend>
        <div className={styles.anchorGrid} role="radiogroup" aria-label="Anchor">
          {ANCHORS.map((ay, row) =>
            ANCHORS.map((ax, col) => (
              <button
                key={`${row}-${col}`}
                type="button"
                role="radio"
                aria-checked={anchor[0] === ax && anchor[1] === ay}
                aria-label={ANCHOR_NAMES[row][col]}
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
  const [basedOn, setBasedOn] = useState<"transparent" | "top-left" | "bottom-right">(
    "transparent",
  );
  const options = [
    ["transparent", "Transparent pixels"],
    ["top-left", "Top left pixel colour"],
    ["bottom-right", "Bottom right pixel colour"],
  ] as const;
  return (
    <DialogFrame
      id="trim-title"
      title="Trim"
      onClose={onClose}
      valid
      error={null}
      onSubmit={() => {
        controller.trim(basedOn);
        onClose();
      }}
    >
      <fieldset className={styles.field}>
        <legend className={styles.fieldLabel}>Based on</legend>
        {options.map(([value, label]) => (
          <label key={value} className={styles.smallLabel}>
            <input
              type="radio"
              name="trim-based-on"
              checked={basedOn === value}
              onChange={() => setBasedOn(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
    </DialogFrame>
  );
}
