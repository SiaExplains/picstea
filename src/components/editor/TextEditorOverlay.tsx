"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { TextLayer } from "@/editor/core/document/types";
import { fromTransform } from "@/editor/core/geometry/matrix";
import { cssFont, lineAdvance } from "@/editor/rendering/text/text-layout";
import { useActiveSession, useController, useIsMac } from "./editor-context";
import styles from "./editor.module.css";

/**
 * On-canvas text editing: a transparent <textarea> laid over the canvas with the same font and
 * transform as the text layer (which is hidden while editing). Using a real textarea gives native
 * caret, selection, IME and screen-reader support.
 */
export function TextEditorOverlay() {
  const controller = useController();
  const isMac = useIsMac();
  const session = useActiveSession();
  const edit = useSyncExternalStore(
    controller.textEdit.subscribe,
    controller.textEdit.get,
    () => null,
  );
  const ref = useRef<HTMLTextAreaElement>(null);
  const editKey = edit ? `${edit.documentId}:${edit.layerId ?? "new"}` : null;

  useEffect(() => {
    const textarea = ref.current;
    if (!editKey || !textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [editKey]);

  if (!edit || !session || session.document.id !== edit.documentId) return null;

  const { zoom, panX, panY } = session.viewport;
  const [a, b, c, d, e, f] = fromTransform(edit.transform);
  const measured = controller.sizer.measureText({
    ...edit.style,
    text: edit.text || " ",
  } as TextLayer);
  // Room for the caret after the last character.
  const width = measured.width + edit.style.fontSize;
  const advance = lineAdvance(edit.style);

  return (
    <textarea
      ref={ref}
      className={styles.textEditor}
      aria-label="Edit text on canvas"
      spellCheck={false}
      value={edit.text}
      onChange={(event) => controller.updateTextDraft({ text: event.target.value })}
      onBlur={(event) => {
        const next = event.relatedTarget as HTMLElement | null;
        if (next?.closest("[data-keep-text-edit]")) return;
        controller.commitTextEdit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          controller.cancelTextEdit();
        } else if (event.key === "Enter" && (isMac ? event.metaKey : event.ctrlKey)) {
          event.preventDefault();
          controller.commitTextEdit();
        }
      }}
      style={{
        transform: `matrix(${a * zoom}, ${b * zoom}, ${c * zoom}, ${d * zoom}, ${e * zoom + panX}, ${f * zoom + panY})`,
        width,
        height: measured.height + advance * 0.25,
        font: cssFont(edit.style),
        lineHeight: `${advance}px`,
        letterSpacing: `${edit.style.letterSpacing}px`,
        color: edit.style.color,
        textAlign: edit.style.align,
        // Keep the box outline readable at any zoom.
        outlineWidth: `${1 / zoom}px`,
      }}
    />
  );
}
