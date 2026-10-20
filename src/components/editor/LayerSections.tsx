"use client";

import { useState, type KeyboardEvent } from "react";
import { setLayerTransform, updateShapeLayer, updateTextLayer } from "@/editor/core/commands";
import type { EditorDocument, Layer, ShapeLayer, TextLayer } from "@/editor/core/document/types";
import { FONT_FAMILIES, type FontFamily } from "@/editor/core/document/types";
import { layerLocalSize } from "@/editor/core/geometry/layer-geometry";
import {
  setRotationAboutCenter,
  setScaleAboutCenter,
} from "@/editor/core/geometry/transform-handles";
import { useController } from "./editor-context";
import styles from "./editor.module.css";
import { useT } from "./i18n";
import { N_ } from "@/i18n/editor/catalog";

/**
 * A number field that commits on Enter or blur, so typing "120" doesn't apply 1, 12 and 120.
 * Esc restores the current value.
 */
export function CommitNumber({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  decimals = 0,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
}) {
  const format = (n: number) => String(Number(n.toFixed(decimals)));
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    setDraft(null);
    if (draft.trim() === "" || !Number.isFinite(n)) return;
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
    if (format(clamped) !== format(value)) onCommit(clamped);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") setDraft(null);
  };
  return (
    <label className={styles.smallLabel}>
      <span>{label}</span>
      <input
        className={styles.input}
        type="number"
        step={step}
        min={min}
        max={max}
        value={draft ?? format(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

export function TransformSection({
  layer,
  doc,
}: {
  layer: Exclude<Layer, { kind: "fill" }>;
  doc: EditorDocument;
}) {
  const controller = useController();
  const t = useT();
  const size = layerLocalSize(layer, doc, controller.sizer);
  const tf = layer.transform;
  const apply = (next: typeof tf, label: string) =>
    controller.execute(setLayerTransform(layer.id, next, { label }));
  const width = Math.abs(size.width * tf.scaleX);
  const height = Math.abs(size.height * tf.scaleY);

  return (
    <div style={{ marginTop: 10 }}>
      <div className={styles.fieldLabel} style={{ marginBottom: 6 }}>
        {t("Transform")}
      </div>
      <div className={styles.fieldPair}>
        <CommitNumber label="X" value={tf.x} onCommit={(x) => apply({ ...tf, x }, N_("Move"))} />
        <CommitNumber label="Y" value={tf.y} onCommit={(y) => apply({ ...tf, y }, N_("Move"))} />
        <CommitNumber
          label="W"
          value={width}
          min={1}
          onCommit={(w) =>
            size.width > 0 &&
            apply(
              setScaleAboutCenter(tf, size, Math.sign(tf.scaleX) * (w / size.width), tf.scaleY),
              N_("Scale"),
            )
          }
        />
        <CommitNumber
          label="H"
          value={height}
          min={1}
          onCommit={(h) =>
            size.height > 0 &&
            apply(
              setScaleAboutCenter(tf, size, tf.scaleX, Math.sign(tf.scaleY) * (h / size.height)),
              N_("Scale"),
            )
          }
        />
        <CommitNumber
          label="°"
          value={tf.rotation}
          min={-180}
          max={180}
          decimals={1}
          step={0.1}
          onCommit={(r) => apply(setRotationAboutCenter(tf, size, r), N_("Rotate"))}
        />
      </div>
    </div>
  );
}

export function TextSection({ layer }: { layer: TextLayer }) {
  const controller = useController();
  const t = useT();
  const alignLabels = { left: t("Left"), center: t("Center"), right: t("Right") };
  const update = (patch: Parameters<typeof updateTextLayer>[1]) =>
    controller.execute(updateTextLayer(layer.id, patch));
  return (
    <div style={{ marginTop: 10 }}>
      <label className={styles.fieldLabel} htmlFor="prop-text">
        {t("Text")}
      </label>
      <textarea
        id="prop-text"
        className={styles.textArea}
        value={layer.text}
        maxLength={10_000}
        onChange={(e) => update({ text: e.target.value })}
        onBlur={() => controller.store.sealHistory()}
      />
      <div className={styles.field} style={{ marginTop: 8 }}>
        <label className={styles.fieldLabel} htmlFor="prop-font">
          {t("Font")}
        </label>
        <select
          id="prop-font"
          className={styles.select}
          value={layer.fontFamily}
          onChange={(e) => update({ fontFamily: e.target.value as FontFamily })}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f === "system-ui" ? t("System") : f}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fieldPair}>
        <CommitNumber
          label={t("Size")}
          value={layer.fontSize}
          min={1}
          max={2000}
          onCommit={(fontSize) => update({ fontSize })}
        />
        <label className={styles.smallLabel}>
          <span>{t("Color")}</span>
          <input
            type="color"
            className={styles.colorInput}
            value={layer.color}
            onChange={(e) => update({ color: e.target.value })}
            onBlur={() => controller.store.sealHistory()}
          />
        </label>
        <CommitNumber
          label={t("Line")}
          value={layer.lineHeight}
          min={0.5}
          max={5}
          step={0.1}
          decimals={2}
          onCommit={(lineHeight) => update({ lineHeight })}
        />
        <CommitNumber
          label={t("Spacing")}
          value={layer.letterSpacing}
          min={-100}
          max={500}
          onCommit={(letterSpacing) => update({ letterSpacing })}
        />
      </div>
      <div className={styles.radioRow} style={{ marginTop: 8 }}>
        <div className={styles.segmented} role="group" aria-label={t("Text style")}>
          <button
            type="button"
            aria-pressed={layer.fontWeight === 700}
            onClick={() => update({ fontWeight: layer.fontWeight === 700 ? 400 : 700 })}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            aria-pressed={layer.italic}
            onClick={() => update({ italic: !layer.italic })}
          >
            <i>I</i>
          </button>
        </div>
        <div className={styles.segmented} role="group" aria-label={t("Text alignment")}>
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              type="button"
              aria-pressed={layer.align === align}
              onClick={() => update({ align })}
            >
              {alignLabels[align]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShapeSection({ layer }: { layer: ShapeLayer }) {
  const controller = useController();
  const t = useT();
  const update = (patch: Parameters<typeof updateShapeLayer>[1]) =>
    controller.execute(updateShapeLayer(layer.id, patch));
  const stroke = layer.stroke ?? { color: "#000000", width: 4 };
  return (
    <div style={{ marginTop: 10 }}>
      {layer.shape !== "line" && (
        <label className={styles.smallLabel} style={{ marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={layer.fill !== null}
            onChange={(e) => update({ fill: e.target.checked ? "#4c8dff" : null })}
          />
          <span>{t("Fill")}</span>
          {layer.fill !== null && (
            <input
              type="color"
              aria-label={t("Fill colour")}
              className={styles.colorInput}
              value={layer.fill}
              onChange={(e) => update({ fill: e.target.value })}
              onBlur={() => controller.store.sealHistory()}
            />
          )}
        </label>
      )}
      <label className={styles.smallLabel} style={{ marginBottom: 6 }}>
        <input
          type="checkbox"
          checked={layer.stroke !== null}
          disabled={layer.shape === "line"}
          onChange={(e) => update({ stroke: e.target.checked ? stroke : null })}
        />
        <span>{t("Stroke")}</span>
        {layer.stroke && (
          <input
            type="color"
            aria-label={t("Stroke colour")}
            className={styles.colorInput}
            value={layer.stroke.color}
            onChange={(e) => update({ stroke: { ...stroke, color: e.target.value } })}
            onBlur={() => controller.store.sealHistory()}
          />
        )}
      </label>
      <div className={styles.fieldPair}>
        {layer.stroke && (
          <CommitNumber
            label={t("Width")}
            value={layer.stroke.width}
            min={0.5}
            max={1000}
            step={0.5}
            decimals={1}
            onCommit={(width) => update({ stroke: { ...stroke, width } })}
          />
        )}
        {layer.shape === "rect" && (
          <CommitNumber
            label={t("Radius")}
            value={layer.cornerRadius}
            min={0}
            onCommit={(cornerRadius) => update({ cornerRadius })}
          />
        )}
      </div>
    </div>
  );
}
