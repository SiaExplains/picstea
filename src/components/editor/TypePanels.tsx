"use client";

import { useSyncExternalStore } from "react";
import type { CharStyle, ParagraphStyle, TextAlign } from "@/editor/core/document/types";
import { charStyleAt, paragraphIndexAt, paragraphStyleAt } from "@/editor/core/document/text";
import { draftTextLayer } from "@/editor/controller/editor-controller";
import { activeLayer } from "@/editor/core/document/queries";
import { useActiveSession, useController } from "./editor-context";
import styles from "./editor.module.css";
import { FontPicker } from "./FontPicker";
import { useT } from "./i18n";
import { CommitNumber } from "./LayerSections";

/**
 * Character and Paragraph panels (ADR-0041). While typing they show and change the selected
 * characters (or the paragraphs under the caret); otherwise the active text layer as a whole.
 */
function useTypeTarget() {
  const controller = useController();
  const session = useActiveSession();
  const edit = useSyncExternalStore(
    controller.textEdit.subscribe,
    controller.textEdit.get,
    () => null,
  );
  if (edit && session?.document.id === edit.documentId) {
    const layer = draftTextLayer(edit);
    const start = Math.min(edit.selection.start, edit.selection.end);
    return { layer, offset: start, editing: true };
  }
  const layer = session ? activeLayer(session.document) : undefined;
  if (layer?.kind !== "text") return null;
  return { layer, offset: 0, editing: false };
}

/** Buttons keep the editor's focus and selection: pointer down must not blur it. */
const keepFocus = (e: React.PointerEvent) => e.preventDefault();

export function CharacterPanel() {
  const controller = useController();
  const t = useT();
  const target = useTypeTarget();
  if (!target) {
    return <p className={styles.muted}>{t("Select a text layer or start typing.")}</p>;
  }
  const style = target.editing
    ? charStyleAt(target.layer, target.offset)
    : (target.layer as CharStyle);
  const set = (patch: Partial<CharStyle>) => controller.applyCharacterStyle(patch);
  return (
    <div className={styles.typePanel} data-keep-text-edit>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t("Font")}</span>
        <FontPicker
          label={t("Font")}
          value={style.fontFamily}
          onChange={(fontFamily) => set({ fontFamily })}
        />
      </div>
      <div className={styles.fieldPair}>
        <CommitNumber
          label={t("Size")}
          value={style.fontSize}
          min={1}
          max={2000}
          onCommit={(fontSize) => set({ fontSize })}
        />
        <CommitNumber
          label={t("Leading")}
          value={style.lineHeight}
          min={0.5}
          max={5}
          step={0.1}
          decimals={2}
          onCommit={(lineHeight) => set({ lineHeight })}
        />
        <CommitNumber
          label={t("Tracking")}
          value={style.letterSpacing}
          min={-100}
          max={500}
          onCommit={(letterSpacing) => set({ letterSpacing })}
        />
        <CommitNumber
          label={t("Baseline shift")}
          value={style.baselineShift}
          min={-1000}
          max={1000}
          onCommit={(baselineShift) => set({ baselineShift })}
        />
        <label className={styles.smallLabel}>
          <span>{t("Color")}</span>
          <input
            type="color"
            className={styles.colorInput}
            value={style.color}
            onChange={(e) => set({ color: e.target.value })}
            onBlur={() => controller.store.sealHistory()}
          />
        </label>
      </div>
      <div className={styles.radioRow} style={{ marginTop: 8 }}>
        <div className={styles.segmented} role="group" aria-label={t("Text style")}>
          <button
            type="button"
            aria-pressed={style.fontWeight === 700}
            title={t("Faux bold")}
            onPointerDown={keepFocus}
            onClick={() => set({ fontWeight: style.fontWeight === 700 ? 400 : 700 })}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            aria-pressed={style.italic}
            title={t("Faux italic")}
            onPointerDown={keepFocus}
            onClick={() => set({ italic: !style.italic })}
          >
            <i>I</i>
          </button>
          <button
            type="button"
            aria-pressed={style.caps === "all-caps"}
            title={t("All caps")}
            onPointerDown={keepFocus}
            onClick={() => set({ caps: style.caps === "all-caps" ? "normal" : "all-caps" })}
          >
            TT
          </button>
          <button
            type="button"
            aria-pressed={style.caps === "small-caps"}
            title={t("Small caps")}
            onPointerDown={keepFocus}
            onClick={() => set({ caps: style.caps === "small-caps" ? "normal" : "small-caps" })}
          >
            Tᴛ
          </button>
        </div>
        <label className={styles.optionGroup}>
          <input
            type="checkbox"
            checked={style.kerning}
            onChange={(e) => set({ kerning: e.target.checked })}
          />
          {t("Kerning")}
        </label>
      </div>
    </div>
  );
}

export function ParagraphPanel() {
  const controller = useController();
  const t = useT();
  const target = useTypeTarget();
  if (!target) {
    return <p className={styles.muted}>{t("Select a text layer or start typing.")}</p>;
  }
  const paragraph = paragraphStyleAt(
    target.layer,
    target.editing ? paragraphIndexAt(target.layer.text, target.offset) : 0,
  );
  const set = (patch: Partial<ParagraphStyle>) => controller.applyParagraphStyle(patch);
  const aligns: { value: TextAlign; label: string }[] = [
    { value: "left", label: t("Left") },
    { value: "center", label: t("Center") },
    { value: "right", label: t("Right") },
    { value: "justify", label: t("Justify") },
  ];
  return (
    <div className={styles.typePanel} data-keep-text-edit>
      <div className={styles.segmented} role="group" aria-label={t("Paragraph alignment")}>
        {aligns.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={paragraph.align === value}
            onPointerDown={keepFocus}
            onClick={() => set({ align: value })}
          >
            {label}
          </button>
        ))}
      </div>
      {!target.layer.box && paragraph.align === "justify" && (
        <p className={styles.muted}>
          {t("Justify spreads lines only in paragraph text (a text box).")}
        </p>
      )}
      <div className={styles.fieldPair} style={{ marginTop: 8 }}>
        <CommitNumber
          label={t("Indent left")}
          value={paragraph.indentLeft}
          min={-100000}
          max={100000}
          onCommit={(indentLeft) => set({ indentLeft })}
        />
        <CommitNumber
          label={t("Indent right")}
          value={paragraph.indentRight}
          min={-100000}
          max={100000}
          onCommit={(indentRight) => set({ indentRight })}
        />
        <CommitNumber
          label={t("First line")}
          value={paragraph.indentFirst}
          min={-100000}
          max={100000}
          onCommit={(indentFirst) => set({ indentFirst })}
        />
        <CommitNumber
          label={t("Space before")}
          value={paragraph.spaceBefore}
          min={0}
          max={100000}
          onCommit={(spaceBefore) => set({ spaceBefore })}
        />
        <CommitNumber
          label={t("Space after")}
          value={paragraph.spaceAfter}
          min={0}
          max={100000}
          onCommit={(spaceAfter) => set({ spaceAfter })}
        />
      </div>
    </div>
  );
}
