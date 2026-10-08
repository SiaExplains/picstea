"use client";

import { useEffect, useRef, useState } from "react";
import {
  panBy,
  screenToDocument,
  zoomAt,
  zoomFactorFromWheel,
  type Point,
} from "@/editor/core/viewport/viewport";
import { Canvas2DRenderer } from "@/editor/rendering/canvas/canvas2d-renderer";
import { useController, useEditorState } from "./editor-context";
import styles from "./editor.module.css";

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

type Gesture =
  | { kind: "pan"; pointerId: number; last: Point }
  | { kind: "pinch"; startDistance: number; startZoom: number; lastMid: Point };

/**
 * The document viewport: owns the <canvas>, drives the renderer from store changes and turns
 * pointer/wheel input into viewport changes. Holds no document state of its own.
 */
export function CanvasViewport() {
  const controller = useController();
  const activeTool = useEditorState((s) => s.activeTool);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [altHeld, setAltHeld] = useState(false);

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

  // Render on any change to the active document, its viewport, decoded assets or size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new Canvas2DRenderer(canvas);
    let frame = 0;
    const draw = () => {
      frame = 0;
      const session = controller.store.getSession();
      const screen = controller.viewportSize.get();
      if (!session || screen.width === 0 || screen.height === 0) return;
      renderer.render({
        document: session.document,
        viewport: session.viewport,
        screen,
        devicePixelRatio: window.devicePixelRatio || 1,
        assets: controller.assets,
        assetVersion: controller.assets.getVersion(),
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const unsubscribers = [
      controller.store.subscribe(schedule),
      controller.assets.subscribe(schedule),
      controller.viewportSize.subscribe(schedule),
    ];
    const dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprQuery.addEventListener("change", schedule);
    schedule();
    return () => {
      unsubscribers.forEach((u) => u());
      dprQuery.removeEventListener("change", schedule);
      if (frame) cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, [controller]);

  // Space-to-pan and Alt (zoom out) modifiers, like professional editors.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      setAltHeld(event.altKey);
      if (event.code !== "Space" || isTypingTarget(event.target)) return;
      if (event.type === "keydown") event.preventDefault();
      setSpaceHeld(event.type === "keydown");
    };
    const onBlur = () => {
      setSpaceHeld(false);
      setAltHeld(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // Pointer, pinch and wheel navigation. Wheel needs a non-passive listener to prevent page zoom.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const pointers = new Map<number, Point>();
    let gesture: Gesture | null = null;

    const local = (event: { clientX: number; clientY: number }): Point => {
      const rect = element.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const activeViewport = () => controller.store.getSession()?.viewport;
    const setViewport = (viewport: ReturnType<typeof zoomAt>) => {
      const session = controller.store.getSession();
      if (session) controller.store.setViewport(session.document.id, viewport);
    };
    const pinchMetrics = () => {
      const [a, b] = [...pointers.values()];
      return {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      // Panning calls preventDefault, which would otherwise keep focus in a panel field and
      // swallow keyboard shortcuts.
      if (isTypingTarget(document.activeElement)) (document.activeElement as HTMLElement).blur();
      const point = local(event);
      pointers.set(event.pointerId, point);
      element.setPointerCapture(event.pointerId);
      const viewport = activeViewport();
      if (!viewport) return;

      if (pointers.size === 2) {
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
      const wantsPan = tool === "hand" || event.button === 1 || element.dataset.space === "1";
      if (wantsPan) {
        event.preventDefault();
        gesture = { kind: "pan", pointerId: event.pointerId, last: point };
        setPanning(true);
      } else if (tool === "zoom" && event.button === 0) {
        controller.zoomStep(event.altKey ? -1 : 1, point);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const point = local(event);
      const viewport = activeViewport();
      if (viewport) {
        const doc = screenToDocument(viewport, point);
        controller.cursor.set({ x: Math.floor(doc.x), y: Math.floor(doc.y) });
      }
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, point);
      if (!viewport || !gesture) return;

      if (gesture.kind === "pan" && gesture.pointerId === event.pointerId) {
        setViewport(panBy(viewport, point.x - gesture.last.x, point.y - gesture.last.y));
        gesture.last = point;
      } else if (gesture.kind === "pinch" && pointers.size === 2) {
        const { distance, mid } = pinchMetrics();
        const zoomed = zoomAt(
          viewport,
          gesture.startZoom * (distance / gesture.startDistance),
          mid,
        );
        setViewport(panBy(zoomed, mid.x - gesture.lastMid.x, mid.y - gesture.lastMid.y));
        gesture.lastMid = mid;
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (element.hasPointerCapture(event.pointerId))
        element.releasePointerCapture(event.pointerId);
      if (pointers.size === 0) {
        gesture = null;
        setPanning(false);
      } else if (gesture?.kind === "pinch") {
        gesture = null;
      }
    };

    const onPointerLeave = () => controller.cursor.set(null);

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

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);
    element.addEventListener("pointerleave", onPointerLeave);
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("pointerleave", onPointerLeave);
      element.removeEventListener("wheel", onWheel);
    };
  }, [controller]);

  let cursor = "default";
  if (panning) cursor = "grabbing";
  else if (spaceHeld || activeTool === "hand") cursor = "grab";
  else if (activeTool === "zoom") cursor = altHeld ? "zoom-out" : "zoom-in";

  return (
    <div
      ref={containerRef}
      className={styles.viewport}
      style={{ cursor }}
      data-space={spaceHeld ? "1" : "0"}
      data-testid="canvas-viewport"
    >
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Document canvas" />
    </div>
  );
}
