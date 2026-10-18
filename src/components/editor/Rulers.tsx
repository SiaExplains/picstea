"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Guide } from "@/editor/core/document/types";
import { screenToDocument, type Viewport } from "@/editor/core/viewport/viewport";
import type { ToolPointer } from "@/editor/tools/tool";
import { useController, useIsMac } from "./editor-context";
import styles from "./editor.module.css";

export const RULER_SIZE = 20;

/** Ruler step in document pixels: 1, 2 or 5 × 10ⁿ, so labelled ticks are ≥ 50 CSS px apart. */
export function rulerStep(zoom: number): number {
  const min = 50 / zoom;
  const pow = 10 ** Math.floor(Math.log10(min));
  for (const m of [1, 2, 5, 10]) if (m * pow >= min) return m * pow;
  return 10 * pow;
}

function drawRuler(
  canvas: HTMLCanvasElement,
  axis: "x" | "y",
  viewport: Viewport,
  cursor: number | null,
): void {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const css = getComputedStyle(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = css.getPropertyValue("--ed-chrome").trim() || "#2a2b2f";
  ctx.fillRect(0, 0, width, height);
  const length = axis === "x" ? width : height;
  const pan = axis === "x" ? viewport.panX : viewport.panY;
  const step = rulerStep(viewport.zoom);
  const minor = step / (step >= 10 ? 10 : step >= 5 ? 5 : 2);
  const first = Math.floor(-pan / viewport.zoom / minor) * minor;
  const last = (length - pan) / viewport.zoom;
  ctx.strokeStyle = css.getPropertyValue("--ed-text-dim").trim() || "#a4a5ab";
  ctx.fillStyle = ctx.strokeStyle;
  ctx.font = "10px system-ui, sans-serif";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let v = first; v <= last; v += minor) {
    const p = Math.round(pan + v * viewport.zoom) + 0.5;
    const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
    const tick = major ? RULER_SIZE : minor * 2 === step ? RULER_SIZE * 0.5 : RULER_SIZE * 0.3;
    if (axis === "x") {
      ctx.moveTo(p, RULER_SIZE);
      ctx.lineTo(p, RULER_SIZE - tick);
      if (major) ctx.fillText(String(Math.round(v)), p + 3, 10);
    } else {
      ctx.moveTo(RULER_SIZE, p);
      ctx.lineTo(RULER_SIZE - tick, p);
      if (major) {
        ctx.save();
        ctx.translate(10, p + 3);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(String(Math.round(v)), -ctx.measureText(String(Math.round(v))).width - 3, 0);
        ctx.restore();
      }
    }
  }
  ctx.stroke();
  if (cursor !== null) {
    const p = Math.round(pan + cursor * viewport.zoom) + 0.5;
    ctx.strokeStyle = css.getPropertyValue("--ed-accent").trim() || "#4da297";
    ctx.beginPath();
    if (axis === "x") {
      ctx.moveTo(p, 0);
      ctx.lineTo(p, RULER_SIZE);
    } else {
      ctx.moveTo(0, p);
      ctx.lineTo(RULER_SIZE, p);
    }
    ctx.stroke();
  }
}

/**
 * Rulers along the top and left of the canvas, in document pixels, following zoom and pan.
 * Dragging out of a ruler creates a guide (top ruler: horizontal, left ruler: vertical).
 */
export function Rulers({ viewportRef }: { viewportRef: RefObject<HTMLDivElement | null> }) {
  const controller = useController();
  const isMac = useIsMac();
  const topRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = 0;
      const viewport = controller.store.getSession()?.viewport;
      if (!viewport) return;
      const cursor = controller.cursor.get();
      if (topRef.current) drawRuler(topRef.current, "x", viewport, cursor?.x ?? null);
      if (leftRef.current) drawRuler(leftRef.current, "y", viewport, cursor?.y ?? null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const unsubscribers = [
      controller.store.subscribe(schedule),
      controller.viewportSize.subscribe(schedule),
      controller.cursor.subscribe(schedule),
    ];
    schedule();
    return () => {
      unsubscribers.forEach((u) => u());
      if (frame) cancelAnimationFrame(frame);
    };
  }, [controller]);

  // Drag a guide out of a ruler. Native listeners: pointer capture keeps moves coming to the
  // ruler while the pointer is over the canvas.
  useEffect(() => {
    const pointerFor = (event: PointerEvent): ToolPointer | null => {
      const element = viewportRef.current;
      const viewport = controller.store.getSession()?.viewport;
      if (!element || !viewport) return null;
      const rect = element.getBoundingClientRect();
      const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      return {
        doc: screenToDocument(viewport, screen),
        screen,
        button: event.button,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        modKey: isMac ? event.metaKey : event.ctrlKey,
      };
    };
    const attach = (canvas: HTMLCanvasElement | null, orientation: Guide["orientation"]) => {
      if (!canvas) return () => {};
      const down = (event: PointerEvent) => {
        if (event.button !== 0 || !controller.store.getSession()) return;
        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);
        if (!controller.view.get().guides) controller.setView({ guides: true });
        controller.tools.beginRulerGuide(orientation);
      };
      const move = (event: PointerEvent) => {
        if (!controller.tools.guides.active) return;
        const pointer = pointerFor(event);
        if (pointer) controller.tools.pointerMove(pointer);
      };
      const up = (event: PointerEvent) => {
        if (!controller.tools.guides.active) return;
        const pointer = pointerFor(event);
        if (pointer) controller.tools.pointerUp(pointer);
      };
      const cancel = () => controller.tools.cancel();
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", cancel);
      return () => {
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", cancel);
      };
    };
    const detachTop = attach(topRef.current, "horizontal");
    const detachLeft = attach(leftRef.current, "vertical");
    return () => {
      detachTop();
      detachLeft();
    };
  }, [controller, isMac, viewportRef]);

  return (
    <>
      <div className={styles.rulerCorner} aria-hidden />
      <canvas
        ref={topRef}
        className={`${styles.ruler} ${styles.rulerTop}`}
        data-testid="ruler-top"
        aria-label="Horizontal ruler: drag down to add a horizontal guide"
        role="img"
      />
      <canvas
        ref={leftRef}
        className={`${styles.ruler} ${styles.rulerLeft}`}
        data-testid="ruler-left"
        aria-label="Vertical ruler: drag right to add a vertical guide"
        role="img"
      />
    </>
  );
}
