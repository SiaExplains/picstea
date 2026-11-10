"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { draftTextLayer, type TextEditSession } from "@/editor/controller/editor-controller";
import {
  baseCharStyle,
  normalizeRuns,
  paragraphRanges,
  paragraphStyleAt,
  styledSegments,
} from "@/editor/core/document/text";
import type { CharStyle, ParagraphStyle, TextRun } from "@/editor/core/document/types";
import { fromTransform } from "@/editor/core/geometry/matrix";
import { cssFamily } from "@/editor/rendering/text/text-layout";
import { useActiveSession, useController, useIsMac } from "./editor-context";
import styles from "./editor.module.css";
import { useT } from "./i18n";

/**
 * On-canvas text editing (ADR-0041): a `contenteditable` block laid over the canvas with the
 * layer's transform, styles and box (the layer itself is hidden while editing). One block per
 * paragraph and one span per styled run, so mixed styles show while typing and the browser
 * provides caret, selection, IME and screen-reader support. Typing is read back from the DOM;
 * style changes from the panels re-render it (`revision`) and restore the selection.
 */
export function TextEditorOverlay() {
  const controller = useController();
  const isMac = useIsMac();
  const t = useT();
  const session = useActiveSession();
  const edit = useSyncExternalStore(
    controller.textEdit.subscribe,
    controller.textEdit.get,
    () => null,
  );
  const ref = useRef<HTMLDivElement>(null);
  const editKey = edit ? `${edit.documentId}:${edit.layerId ?? "new"}` : null;
  const rendered = useRef<{ key: string | null; revision: number }>({ key: null, revision: -1 });

  // (Re)build the DOM when editing starts or styles change from outside; never while typing.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !edit) return;
    const fresh = rendered.current.key !== editKey;
    if (!fresh && rendered.current.revision === edit.revision) return;
    rendered.current = { key: editKey, revision: edit.revision };
    renderRichText(el, edit);
    el.focus({ preventScroll: true });
    setSelection(el, fresh ? { start: edit.text.length, end: edit.text.length } : edit.selection);
  });

  // Track the selection, so the Character and Paragraph panels act on it.
  useEffect(() => {
    if (!editKey) return;
    const onChange = () => {
      const el = ref.current;
      const current = controller.textEdit.get();
      if (!el || !current) return;
      const selection = readSelection(el);
      if (!selection) return;
      const prev = current.selection;
      if (prev.start !== selection.start || prev.end !== selection.end) {
        controller.updateTextDraft({ selection });
      }
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, [controller, editKey]);

  if (!edit || !session || session.document.id !== edit.documentId) return null;

  const { zoom, panX, panY } = session.viewport;
  const [a, b, c, d, e, f] = fromTransform(edit.transform);
  const draft = draftTextLayer({ ...edit, text: edit.text || " " });
  const measured = controller.sizer.measureText(draft);
  const box = edit.box;

  const onInput = () => {
    const el = ref.current;
    const current = controller.textEdit.get();
    if (!el || !current) return;
    const parsed = parseRichText(el, current);
    controller.updateTextDraft({ ...parsed, selection: readSelection(el) ?? current.selection });
  };

  return (
    <div
      className={styles.textEditorFrame}
      style={{
        transform: `matrix(${a * zoom}, ${b * zoom}, ${c * zoom}, ${d * zoom}, ${e * zoom + panX}, ${f * zoom + panY})`,
        width: box ? box.width : measured.width + edit.style.fontSize,
        height: box ? box.height : undefined,
        minHeight: box ? undefined : measured.height,
        // Keep the box outline readable at any zoom.
        outlineWidth: `${1 / zoom}px`,
      }}
    >
      <div
        ref={ref}
        className={styles.textEditor}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label={t("Edit text on canvas")}
        spellCheck={false}
        style={{
          whiteSpace: box ? "pre-wrap" : "pre",
          overflowWrap: box ? "break-word" : "normal",
        }}
        onInput={onInput}
        onPaste={(event) => {
          // Plain text only: pasted formatting would not survive the round trip to the layer.
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
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
          } else if (event.key === "Enter" && !event.shiftKey) {
            // A new paragraph; the browser's own handling differs between engines.
            event.preventDefault();
            document.execCommand("insertText", false, "\n");
          }
        }}
      />
      {box && (
        <BoxHandles
          zoom={zoom}
          onResize={(width, height) => controller.updateTextDraft({ box: { width, height } })}
          box={box}
        />
      )}
    </div>
  );
}

/** Right, bottom and corner handles that resize a paragraph text box; the text reflows. */
function BoxHandles({
  box,
  zoom,
  onResize,
}: {
  box: { width: number; height: number };
  zoom: number;
  onResize: (width: number, height: number) => void;
}) {
  const start = (event: React.PointerEvent, dx: boolean, dy: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const from = { x: event.clientX, y: event.clientY, ...box };
    const move = (e: PointerEvent) => {
      const w = dx ? Math.max(1, Math.round(from.width + (e.clientX - from.x) / zoom)) : from.width;
      const h = dy
        ? Math.max(1, Math.round(from.height + (e.clientY - from.y) / zoom))
        : from.height;
      onResize(w, h);
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };
  const size = `${8 / zoom}px`;
  const handle = (style: CSSProperties, dx: boolean, dy: boolean, label: string) => (
    <span
      className={styles.textBoxHandle}
      aria-hidden
      title={label}
      data-keep-text-edit
      style={{ width: size, height: size, ...style }}
      onPointerDown={(e) => start(e, dx, dy)}
    />
  );
  return (
    <>
      {handle({ right: 0, top: "50%", cursor: "ew-resize" }, true, false, "width")}
      {handle({ left: "50%", bottom: 0, cursor: "ns-resize" }, false, true, "height")}
      {handle({ right: 0, bottom: 0, cursor: "nwse-resize" }, true, true, "size")}
    </>
  );
}

// ------------------------------------------------------------------ DOM ↔ rich text

const STYLE_ATTR = "data-style";
const PARA_ATTR = "data-paragraph";

function charCss(style: CharStyle): CSSProperties {
  return {
    fontFamily: cssFamily(style.fontFamily),
    fontSize: `${style.fontSize}px`,
    fontWeight: style.fontWeight,
    fontStyle: style.italic ? "italic" : "normal",
    color: style.color,
    letterSpacing: `${style.letterSpacing}px`,
    lineHeight: style.lineHeight,
    verticalAlign: style.baselineShift ? `${style.baselineShift}px` : undefined,
    textTransform: style.caps === "all-caps" ? "uppercase" : undefined,
    fontVariantCaps: style.caps === "small-caps" ? "small-caps" : undefined,
    fontKerning: style.kerning ? "normal" : "none",
  };
}

function applyCss(el: HTMLElement, css: CSSProperties): void {
  for (const [key, value] of Object.entries(css)) {
    const prop = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    if (value === undefined) el.style.removeProperty(prop);
    else
      el.style.setProperty(
        prop,
        typeof value === "number" && prop !== "font-weight" && prop !== "line-height"
          ? `${value}px`
          : String(value),
      );
  }
}

function paragraphCss(p: ParagraphStyle): CSSProperties {
  return {
    textAlign: p.align,
    paddingLeft: `${p.indentLeft}px`,
    paddingRight: `${p.indentRight}px`,
    textIndent: `${p.indentFirst}px`,
    marginTop: `${p.spaceBefore}px`,
    marginBottom: `${p.spaceAfter}px`,
  };
}

/** One <div> per paragraph, one <span> per styled run (each carrying its style as JSON). */
function renderRichText(el: HTMLElement, edit: TextEditSession): void {
  const layer = draftTextLayer(edit);
  const base = baseCharStyle(layer);
  applyCss(el, charCss(base));
  el.replaceChildren();
  const segments = styledSegments(layer);
  paragraphRanges(layer.text).forEach((range, index) => {
    const para = document.createElement("div");
    para.setAttribute(PARA_ATTR, String(index));
    applyCss(para, paragraphCss(paragraphStyleAt(layer, index)));
    for (const seg of segments) {
      const a = Math.max(seg.start, range.start);
      const z = Math.min(seg.end, range.end);
      if (z <= a) continue;
      const span = document.createElement("span");
      span.setAttribute(STYLE_ATTR, JSON.stringify(seg.style));
      applyCss(span, charCss(seg.style));
      span.textContent = layer.text.slice(a, z);
      para.append(span);
    }
    if (range.end === range.start) para.append(document.createElement("br"));
    el.append(para);
  });
}

/** Read text, runs and paragraph styles back from the DOM after the user typed. */
function parseRichText(
  el: HTMLElement,
  edit: TextEditSession,
): { text: string; runs: TextRun[]; paragraphs: ParagraphStyle[] } {
  const layer = draftTextLayer(edit);
  const base = baseCharStyle(layer);
  let text = "";
  const runs: TextRun[] = [];
  const paragraphs: ParagraphStyle[] = [];
  const blocks = blockChildren(el);
  blocks.forEach((block, i) => {
    if (i > 0) text += "\n";
    const index = Number(block.getAttribute?.(PARA_ATTR));
    paragraphs.push(paragraphStyleAt(layer, Number.isFinite(index) ? index : Math.max(0, i - 1)));
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const chunk = (node.nodeValue ?? "").replace(/\r/g, "");
      if (!chunk) continue;
      const host = node.parentElement?.closest(`[${STYLE_ATTR}]`);
      const style = host ? (safeStyle(host.getAttribute(STYLE_ATTR)) ?? base) : base;
      // Newlines typed inside a block split it into paragraphs.
      const lines = chunk.split("\n");
      lines.forEach((line, j) => {
        if (j > 0) {
          text += "\n";
          paragraphs.push(paragraphs.at(-1)!);
        }
        if (line) runs.push({ start: text.length, end: text.length + line.length, style });
        text += line;
      });
    }
  });
  return { text, runs: normalizeRuns(runs, base, text.length), paragraphs };
}

/** Paragraph blocks: our divs, or the editor itself when the browser flattened them. */
function blockChildren(el: HTMLElement): HTMLElement[] {
  const blocks = [...el.children].filter((c) => c.tagName === "DIV" || c.tagName === "P");
  return blocks.length > 0 ? (blocks as HTMLElement[]) : [el];
}

function safeStyle(json: string | null): CharStyle | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as CharStyle;
  } catch {
    return null;
  }
}

/** Character offset of a DOM position within the editor (blocks are separated by "\n"). */
function offsetOf(el: HTMLElement, node: Node, offset: number): number {
  const blocks = blockChildren(el);
  let total = 0;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (i > 0) total += 1;
    if (block === node || block.contains(node)) {
      const range = document.createRange();
      range.selectNodeContents(block);
      range.setEnd(node, offset);
      return total + range.toString().replace(/\r/g, "").length;
    }
    total += (block.textContent ?? "").length;
  }
  return total;
}

function readSelection(el: HTMLElement): { start: number; end: number } | null {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return null;
  return {
    start: offsetOf(el, range.startContainer, range.startOffset),
    end: offsetOf(el, range.endContainer, range.endOffset),
  };
}

/** The DOM position of character `offset`. */
function positionOf(el: HTMLElement, offset: number): { node: Node; offset: number } {
  const blocks = blockChildren(el);
  let remaining = offset;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const length = (block.textContent ?? "").length;
    if (remaining <= length || i === blocks.length - 1) {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const n = node.nodeValue?.length ?? 0;
        if (remaining <= n) return { node, offset: remaining };
        remaining -= n;
      }
      return { node: block, offset: block.childNodes.length };
    }
    remaining -= length + 1;
  }
  return { node: el, offset: el.childNodes.length };
}

function setSelection(el: HTMLElement, selection: { start: number; end: number }): void {
  const sel = document.getSelection();
  if (!sel) return;
  const start = positionOf(el, selection.start);
  const end = positionOf(el, selection.end);
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  sel.removeAllRanges();
  sel.addRange(range);
}
