"use client";

import { useEffect, useRef } from "react";
import {
  panBy,
  screenToDocument,
  zoomAt,
  zoomFactorFromWheel,
  type Point,
} from "@/editor/core/viewport/viewport";
import { Canvas2DRenderer } from "@/editor/rendering/canvas/canvas2d-renderer";
import type { ToolPointer } from "@/editor/tools/tool";
import { useController, useIsMac } from "./editor-context";
import styles from "./editor.module.css";
import { isTypingTarget } from "./typing-target";
import { TextEditorOverlay } from "./TextEditorOverlay";

type Gesture =
  | { kind: "pan"; pointerId: number; last: Point }
  | { kind: "pinch"; startDistance: number; startZoom: number; lastMid: Point }
  | { kind: "tool"; pointerId: number };

/**
 * The document viewport: owns the <canvas>, drives the renderer from store/tool changes and turns
 * pointer/wheel input into viewport changes or tool input. Holds no document state of its own.
 */
export function CanvasViewport() {
  const controller = useController();
  const isMac = useIsMac();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Measure the viewport.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      controller.setViewportSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [controller]);

  // Render on any change to the active document, viewport, decoded assets, size or tool feedback.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new Canvas2DRenderer(canvas);
    let frame = 0;
    let antsPhase = 0;
    const draw = () => {
      frame = 0;
      const session = controller.store.getSession();
      const screen = controller.viewportSize.get();
      if (!session || screen.width === 0 || screen.height === 0) return;
      const textEdit = controller.textEdit.get();
      const toolPreview = controller.tools.preview();
      const editingLayer =
        textEdit && textEdit.documentId === session.document.id ? textEdit.layerId : null;
      const preview = editingLayer
        ? { ...toolPreview, hiddenLayerIds: new Set([editingLayer]) }
        : toolPreview;
      renderer.render({
        document: session.document,
        viewport: session.viewport,
        screen,
        devicePixelRatio: window.devicePixelRatio || 1,
        assets: controller.assets,
        assetVersion: controller.assets.getVersion(),
        sizer: controller.sizer,
        preview,
        overlays: textEdit ? [] : controller.tools.overlays(),
        selection: controller.tools.selection(),
        antsPhase,
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const unsubscribers = [
      controller.store.subscribe(schedule),
      controller.assets.subscribe(schedule),
      controller.viewportSize.subscribe(schedule),
      controller.tools.revision.subscribe(schedule),
      controller.textEdit.subscribe(schedule),
    ];
    const dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprQuery.addEventListener("change", schedule);
    // Marching ants: advance the dash a few times a second while there is a selection.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ants = window.setInterval(() => {
      if (reducedMotion.matches || !controller.tools.selection()) return;
      antsPhase = (antsPhase + 1) % 8;
      schedule();
    }, 120);
    schedule();
    return () => {
      unsubscribers.forEach((u) => u());
      window.clearInterval(ants);
      dprQuery.removeEventListener("change", schedule);
      if (frame) cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, [controller]);

  // Pointer, pinch, wheel and modifier keys. Wheel needs a non-passive listener to prevent page zoom.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const pointers = new Map<number, Point>();
    let gesture: Gesture | null = null;
    let spaceHeld = false;
    let altHeld = false;
    let lastPointer: ToolPointer | null = null;

    const local = (event: { clientX: number; clientY: number }): Point => {
      const rect = element.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const activeViewport = () => controller.store.getSession()?.viewport;
    const setViewport = (viewport: ReturnType<typeof zoomAt>) => {
      const session = controller.store.getSession();
      if (session) controller.store.setViewport(session.document.id, viewport);
    };
    const toolPointer = (event: MouseEvent): ToolPointer | null => {
      const viewport = activeViewport();
      if (!viewport) return null;
      const screen = local(event);
      const coalesced =
        "getCoalescedEvents" in event && typeof event.getCoalescedEvents === "function"
          ? (event as PointerEvent)
              .getCoalescedEvents()
              .slice(0, -1)
              .map((e) => screenToDocument(viewport, local(e)))
          : undefined;
      return {
        doc: screenToDocument(viewport, screen),
        screen,
        button: event.button,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        modKey: isMac ? event.metaKey : event.ctrlKey,
        coalesced,
      };
    };
    const updateCursor = () => {
      const tool = controller.store.getState().activeTool;
      let cursor: string;
      if (gesture?.kind === "pan") cursor = "grabbing";
      else if (spaceHeld || tool === "hand") cursor = "grab";
      else if (tool === "zoom") cursor = altHeld ? "zoom-out" : "zoom-in";
      else cursor = controller.tools.cursor(lastPointer);
      element.style.cursor = cursor;
    };
    const pinchMetrics = () => {
      const [a, b] = [...pointers.values()];
      return {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      // Input inside the on-canvas text editor belongs to the textarea, not to the tools.
      if (isTypingTarget(event.target)) return;
      // Panning calls preventDefault, which would otherwise keep focus in a panel field and
      // swallow keyboard shortcuts.
      if (isTypingTarget(document.activeElement)) (document.activeElement as HTMLElement).blur();
      const point = local(event);
      pointers.set(event.pointerId, point);
      element.setPointerCapture(event.pointerId);
      const viewport = activeViewport();
      if (!viewport) return;

      if (pointers.size === 2) {
        // A second finger turns any gesture into pinch-zoom; abandon tool input.
        if (gesture?.kind === "tool") controller.tools.cancel();
        const { distance, mid } = pinchMetrics();
        gesture = {
          kind: "pinch",
          startDistance: distance,
          startZoom: viewport.zoom,
          lastMid: mid,
        };
        return;
      }
      const tool = controller.store.getState().activeTool;
      const wantsPan = tool === "hand" || event.button === 1 || spaceHeld;
      if (wantsPan) {
        event.preventDefault();
        gesture = { kind: "pan", pointerId: event.pointerId, last: point };
      } else if (tool === "zoom") {
        if (event.button === 0) controller.zoomStep(event.altKey ? -1 : 1, point);
      } else if (controller.tools.handlesPointer && event.button === 0) {
        event.preventDefault();
        gesture = { kind: "tool", pointerId: event.pointerId };
        controller.tools.pointerDown(toolPointer(event)!);
      }
      updateCursor();
    };

    const onPointerMove = (event: PointerEvent) => {
      const point = local(event);
      const viewport = activeViewport();
      if (viewport) {
        const doc = screenToDocument(viewport, point);
        controller.cursor.set({ x: Math.floor(doc.x), y: Math.floor(doc.y) });
      }
      const pointer = toolPointer(event);
      lastPointer = pointer;
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, point);

      if (!gesture) {
        // Hover: tools may show feedback (brush outline) or a context cursor.
        if (pointer && controller.tools.handlesPointer) controller.tools.pointerMove(pointer);
      } else if (gesture.kind === "tool" && gesture.pointerId === event.pointerId && pointer) {
        controller.tools.pointerMove(pointer);
      } else if (viewport && gesture.kind === "pan" && gesture.pointerId === event.pointerId) {
        setViewport(panBy(viewport, point.x - gesture.last.x, point.y - gesture.last.y));
        gesture.last = point;
      } else if (viewport && gesture.kind === "pinch" && pointers.size === 2) {
        const { distance, mid } = pinchMetrics();
        const zoomed = zoomAt(
          viewport,
          gesture.startZoom * (distance / gesture.startDistance),
          mid,
        );
        setViewport(panBy(zoomed, mid.x - gesture.lastMid.x, mid.y - gesture.lastMid.y));
        gesture.lastMid = mid;
      }
      updateCursor();
    };

    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (element.hasPointerCapture(event.pointerId))
        element.releasePointerCapture(event.pointerId);
      if (gesture?.kind === "tool" && gesture.pointerId === event.pointerId) {
        const pointer = toolPointer(event);
        if (pointer) controller.tools.pointerUp(pointer);
        gesture = null;
      } else if (pointers.size === 0 || gesture?.kind === "pinch") {
        gesture = null;
      }
      updateCursor();
    };

    const onPointerCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (gesture?.kind === "tool") controller.tools.cancel();
      gesture = null;
      updateCursor();
    };

    const onPointerLeave = () => {
      controller.cursor.set(null);
      lastPointer = null;
      if (!gesture) controller.tools.leave();
    };

    const onDoubleClick = (event: MouseEvent) => {
      if (isTypingTarget(event.target)) return;
      const pointer = toolPointer(event);
      if (pointer && controller.tools.handlesPointer) controller.tools.doubleClick(pointer);
    };

    const onWheel = (event: WheelEvent) => {
      const viewport = activeViewport();
      if (!viewport) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      const dx = event.deltaX * scale;
      const dy = event.deltaY * scale;
      // Ctrl+wheel is also what trackpad pinch produces in Chromium, Firefox and Safari.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        setViewport(zoomAt(viewport, viewport.zoom * zoomFactorFromWheel(dy), local(event)));
      } else if (event.shiftKey) {
        setViewport(panBy(viewport, -dy, -dx));
      } else {
        setViewport(panBy(viewport, -dx, -dy));
      }
    };

    const onKey = (event: KeyboardEvent) => {
      altHeld = event.altKey;
      if (event.code === "Space" && !isTypingTarget(event.target)) {
        if (event.type === "keydown") event.preventDefault();
        spaceHeld = event.type === "keydown";
      }
      updateCursor();
    };
    const onBlur = () => {
      spaceHeld = false;
      altHeld = false;
      updateCursor();
    };
    const unsubscribeTool = controller.store.subscribe(updateCursor);

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerCancel);
    element.addEventListener("pointerleave", onPointerLeave);
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    updateCursor();
    return () => {
      unsubscribeTool();
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerCancel);
      element.removeEventListener("pointerleave", onPointerLeave);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [controller, isMac]);

  return (
    <div ref={containerRef} className={styles.viewport} data-testid="canvas-viewport">
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Document canvas" />
      <TextEditorOverlay />
    </div>
  );
}
