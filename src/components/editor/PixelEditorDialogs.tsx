"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  applyLiquifyDab,
  createLiquifyField,
  LIQUIFY_TOOLS,
  renderLiquify,
  type LiquifyField,
  type LiquifyTool,
} from "@/editor/filters/liquify";
import {
  invert3,
  isConvexQuad,
  project,
  ClonePainter,
  squareToQuad,
  type CloneDab,
  type PlaneCorners,
} from "@/editor/filters/vanishing-point";
import type { RgbaPixels } from "@/editor/selection/flood";
import { useController } from "./editor-context";
import styles from "./editor.module.css";
import { useModal } from "./SelectionDialogs";

/**
 * Filter → Liquify… and Vanishing Point… (ADR-0036): editors with their own preview, because
 * their settings are brush strokes, not sliders. They work on a reduced copy of the layer; OK
 * renders the same edit at full size in the worker as one undo step.
 */

/** Liquify re-renders on every brush move, so its preview is kept small enough to stay smooth. */
const LIQUIFY_PREVIEW_PIXELS = 700_000;
const VANISHING_PREVIEW_PIXELS = 1_200_000;

function draw(canvas: HTMLCanvasElement | null, pixels: RgbaPixels): void {
  if (!canvas) return;
  if (canvas.width !== pixels.width) canvas.width = pixels.width;
  if (canvas.height !== pixels.height) canvas.height = pixels.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.createImageData(pixels.width, pixels.height);
  image.data.set(pixels.data);
  ctx.putImageData(image, 0, 0);
}

/** Pointer position in preview pixels. */
function pointerPixels(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  pixels: RgbaPixels,
) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * pixels.width,
    y: ((event.clientY - rect.top) / rect.height) * pixels.height,
    /** Screen pixels per preview pixel. */
    zoom: rect.width / pixels.width,
  };
}

/** Close at once (after the controller's notice) when the layer can't be edited. */
function useCloseWhenEmpty(source: RgbaPixels | null, onClose: () => void) {
  useEffect(() => {
    if (!source) onClose();
  }, [source, onClose]);
}

function BrushCursor({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <div
      className={styles.brushCursor}
      style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }}
      aria-hidden
    />
  );
}

function RangeField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}: {value}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

const LIQUIFY_LABELS: Record<LiquifyTool, string> = {
  forwardWarp: "Forward Warp",
  reconstruct: "Reconstruct",
  smooth: "Smooth",
  twirlClockwise: "Twirl Clockwise",
  twirlCounterclockwise: "Twirl Counterclockwise",
  pucker: "Pucker",
  bloat: "Bloat",
};

/** Filter → Liquify…: push, twirl, pucker and bloat pixels with a brush. */
export function LiquifyDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
  const ref = useModal(true);
  const [source] = useState(() => controller.beginPixelEditor(LIQUIFY_PREVIEW_PIXELS));
  useCloseWhenEmpty(source, onClose);
  const field = useRef<LiquifyField | null>(
    source ? createLiquifyField(source.width, source.height) : null,
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<LiquifyTool>("forwardWarp");
  const [size, setSize] = useState(() =>
    source ? Math.round(Math.min(source.width, source.height) / 6) : 50,
  );
  const [pressure, setPressure] = useState(50);
  const [cursor, setCursor] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const [edited, setEdited] = useState(false);
  const frame = useRef(0);
  const stroke = useRef<{ x: number; y: number } | null>(null);

  const redraw = useCallback(() => {
    if (frame.current || !source) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (field.current) draw(canvas.current, renderLiquify(source, field.current));
    });
  }, [source]);

  useEffect(() => {
    if (source) draw(canvas.current, source);
    return () => cancelAnimationFrame(frame.current);
  }, [source]);

  const dab = useCallback(
    (x: number, y: number, du = 0, dv = 0) => {
      if (!source || !field.current) return;
      applyLiquifyDab(field.current, {
        tool,
        u: x / source.width,
        v: y / source.height,
        radius: size / 2 / source.width,
        pressure: pressure / 100,
        du,
        dv,
      });
      setEdited(true);
      redraw();
    },
    [source, tool, size, pressure, redraw],
  );

  // Tools other than Forward Warp keep working while the brush is held still.
  useEffect(() => {
    if (tool === "forwardWarp") return;
    const timer = setInterval(() => {
      const s = stroke.current;
      if (s) dab(s.x, s.y);
    }, 40);
    return () => clearInterval(timer);
  }, [tool, dab]);

  if (!source) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = pointerPixels(event, event.currentTarget, source);
    stroke.current = { x: p.x, y: p.y };
    if (tool !== "forwardWarp") dab(p.x, p.y);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = pointerPixels(event, event.currentTarget, source);
    setCursor(p);
    const s = stroke.current;
    if (!s) return;
    if (tool === "forwardWarp") {
      // Step along the move so fast drags still push smoothly.
      const dist = Math.hypot(p.x - s.x, p.y - s.y);
      const steps = Math.max(1, Math.ceil(dist / Math.max(1, size / 8)));
      for (let k = 1; k <= steps; k++) {
        const x0 = s.x + ((p.x - s.x) * (k - 1)) / steps;
        const y0 = s.y + ((p.y - s.y) * (k - 1)) / steps;
        const x1 = s.x + ((p.x - s.x) * k) / steps;
        const y1 = s.y + ((p.y - s.y) * k) / steps;
        dab(x0, y0, (x1 - x0) / source.width, (y1 - y0) / source.height);
      }
    }
    stroke.current = { x: p.x, y: p.y };
  };
  const endStroke = () => {
    stroke.current = null;
  };

  const reset = () => {
    field.current = createLiquifyField(source.width, source.height);
    setEdited(false);
    draw(canvas.current, source);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const f = field.current;
    onClose();
    if (f) void controller.applyLiquify(f);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "[") setSize((s) => Math.max(2, Math.round(s * 0.9)));
    if (event.key === "]") setSize((s) => Math.min(2000, Math.round(s * 1.1) + 1));
  };

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles.pixelEditor}`}
      aria-labelledby="liquify-title"
      data-testid="liquify-dialog"
      onKeyDown={onKeyDown}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="liquify-title" className={styles.dialogTitle}>
          Liquify
        </h2>
        <div className={styles.pixelEditorBody}>
          <div className={styles.pixelEditorSide}>
            <div className={styles.toolList} role="radiogroup" aria-label="Liquify tool">
              {LIQUIFY_TOOLS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tool === t}
                  className={styles.button}
                  onClick={() => setTool(t)}
                >
                  {LIQUIFY_LABELS[t]}
                </button>
              ))}
            </div>
            <RangeField
              id="liquify-size"
              label="Brush size (px)"
              value={size}
              min={2}
              max={Math.max(source.width, source.height)}
              onChange={setSize}
            />
            <RangeField
              id="liquify-pressure"
              label="Brush pressure (%)"
              value={pressure}
              min={1}
              max={100}
              onChange={setPressure}
            />
            <p className={styles.muted}>[ and ] change the brush size.</p>
            <button type="button" className={styles.button} onClick={reset} disabled={!edited}>
              Restore All
            </button>
          </div>
          <div className={styles.pixelStage}>
            <div className={styles.pixelCanvasWrap} onPointerLeave={() => setCursor(null)}>
              <canvas
                ref={canvas}
                className={styles.pixelCanvas}
                aria-label="Liquify preview: drag to apply the tool"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endStroke}
                onPointerCancel={endStroke}
              />
              {cursor && (
                <BrushCursor
                  x={cursor.x * cursor.zoom}
                  y={cursor.y * cursor.zoom}
                  size={size * cursor.zoom}
                />
              )}
            </div>
          </div>
        </div>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!edited}>
            OK
          </button>
        </div>
      </form>
    </dialog>
  );
}

type Corners = number[];

/** Filter → Vanishing Point…: draw a perspective plane, then clone inside it in perspective. */
export function VanishingPointDialog({ onClose }: { onClose: () => void }) {
  const controller = useController();
  const ref = useModal(true);
  const [source] = useState(() => controller.beginPixelEditor(VANISHING_PREVIEW_PIXELS));
  useCloseWhenEmpty(source, onClose);
  const canvas = useRef<HTMLCanvasElement>(null);
  /** Corners in preview pixels, clockwise; fewer than 4 while the plane is being created. */
  const [corners, setCorners] = useState<Corners>([]);
  const [mode, setMode] = useState<"plane" | "clone">("plane");
  const [size, setSize] = useState(40);
  const [hardness, setHardness] = useState(50);
  const [pickSource, setPickSource] = useState(false);
  const [sourcePoint, setSourcePoint] = useState<{ u: number; v: number } | null>(null);
  const [strokes, setStrokes] = useState<CloneDab[][]>([]);
  const [cursor, setCursor] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const dragCorner = useRef<number | null>(null);
  const painting = useRef<{
    dabs: CloneDab[];
    offset: { x: number; y: number };
    last: { u: number; v: number } | null;
    id: number;
    /** Last pointer position in preview pixels, to fill gaps between pointer events. */
    from: { x: number; y: number };
  } | null>(null);
  /** Offset kept between strokes (aligned clone), reset when a new source is picked. */
  const aligned = useRef<{ x: number; y: number } | null>(null);
  /** Paints the preview; rebuilt from the layer when the plane or the stroke list changes. */
  const painter = useRef<ClonePainter | null>(null);

  const complete = corners.length === 8;
  const valid = complete && isConvexQuad(corners);
  const toImage = valid ? squareToQuad(corners) : null;
  const toPlane = toImage ? invert3(toImage) : null;
  /** The plane in normalised layer coordinates (what the edit stores). */
  const plane = useMemo((): PlaneCorners | null => {
    if (!source || corners.length !== 8 || !isConvexQuad(corners)) return null;
    const sx = Math.max(1, source.width - 1);
    const sy = Math.max(1, source.height - 1);
    return corners.map((v, k) => v / (k % 2 === 0 ? sx : sy)) as unknown as PlaneCorners;
  }, [source, corners]);

  // Re-render the preview from the layer whenever the plane or the stroke list changes.
  useEffect(() => {
    if (!source) return;
    if (!plane) {
      painter.current = null;
      draw(canvas.current, source);
      return;
    }
    const next = new ClonePainter(source, plane);
    for (const d of strokes.flat()) next.dab(d);
    painter.current = next;
    draw(canvas.current, next.result());
  }, [source, plane, strokes]);

  if (!source) return null;

  const toPlaneCoords = (x: number, y: number) => {
    if (!toPlane) return null;
    const out = new Float64Array(2);
    return project(toPlane, x, y, out) ? { u: out[0], v: out[1] } : null;
  };

  /** Brush radius in plane units at preview point (x, y). */
  const planeRadius = (x: number, y: number) => {
    const a = toPlaneCoords(x, y);
    const b = toPlaneCoords(x + size / 2, y);
    const c = toPlaneCoords(x, y + size / 2);
    if (!a || !b || !c) return 0;
    return (Math.hypot(b.u - a.u, b.v - a.v) + Math.hypot(c.u - a.u, c.v - a.v)) / 2;
  };

  /** Stamp along the pointer's path from the last position to (x, y), dabs a quarter brush apart. */
  const paintTo = (x: number, y: number) => {
    const s = painting.current;
    if (!s) return;
    const added: CloneDab[] = [];
    const dist = Math.hypot(x - s.from.x, y - s.from.y);
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, size / 8)));
    for (let k = s.dabs.length === 0 ? 0 : 1; k <= steps; k++) {
      const px = s.from.x + ((x - s.from.x) * k) / steps;
      const py = s.from.y + ((y - s.from.y) * k) / steps;
      const p = toPlaneCoords(px, py);
      const radius = planeRadius(px, py);
      if (!p || radius <= 0) continue;
      if (s.last && Math.hypot(p.u - s.last.u, p.v - s.last.v) < radius * 0.25) continue;
      s.last = p;
      added.push({
        stroke: s.id,
        x: p.u,
        y: p.v,
        ox: s.offset.x,
        oy: s.offset.y,
        radius,
        hardness: hardness / 100,
      });
    }
    s.from = { x, y };
    if (!added.length) return;
    s.dabs.push(...added);
    const target = painter.current;
    if (target) {
      for (const d of added) target.dab(d);
      draw(canvas.current, target.result());
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = pointerPixels(event, event.currentTarget, source);
    if (mode === "plane") {
      if (!complete) {
        setCorners((c) => [...c, p.x, p.y]);
        return;
      }
      // Grab the nearest corner handle.
      let best = -1;
      let bestD = 12 / p.zoom;
      for (let k = 0; k < 4; k++) {
        const d = Math.hypot(corners[k * 2] - p.x, corners[k * 2 + 1] - p.y);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      if (best >= 0) {
        dragCorner.current = best;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
    const at = toPlaneCoords(p.x, p.y);
    if (!at) return;
    if (event.altKey || pickSource) {
      setSourcePoint(at);
      aligned.current = null;
      setPickSource(false);
      return;
    }
    if (!sourcePoint) return;
    const offset = aligned.current ?? { x: sourcePoint.u - at.u, y: sourcePoint.v - at.v };
    aligned.current = offset;
    event.currentTarget.setPointerCapture(event.pointerId);
    painting.current = {
      id: strokes.length,
      dabs: [],
      offset,
      last: null,
      from: { x: p.x, y: p.y },
    };
    paintTo(p.x, p.y);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = pointerPixels(event, event.currentTarget, source);
    setCursor(p);
    if (dragCorner.current !== null) {
      const k = dragCorner.current;
      setCorners((c) => {
        const next = [...c];
        next[k * 2] = Math.min(source.width, Math.max(0, p.x));
        next[k * 2 + 1] = Math.min(source.height, Math.max(0, p.y));
        return next;
      });
      return;
    }
    if (painting.current) paintTo(p.x, p.y);
  };

  const onPointerUp = () => {
    dragCorner.current = null;
    const s = painting.current;
    painting.current = null;
    if (s && s.dabs.length) setStrokes((list) => [...list, s.dabs]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const dabs = strokes.flat();
    onClose();
    if (plane && dabs.length) void controller.applyVanishingPoint({ corners: plane, dabs });
  };

  // Plane grid: 8×8 lines through the plane, in preview pixels.
  const gridLines: string[] = [];
  if (toImage) {
    const out = new Float64Array(2);
    const at = (u: number, v: number) => (project(toImage, u, v, out) ? `${out[0]},${out[1]}` : "");
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      gridLines.push(`M${at(t, 0)} L${at(t, 1)}`, `M${at(0, t)} L${at(1, t)}`);
    }
  }
  const sourceMark = (() => {
    if (!sourcePoint || !toImage) return null;
    const out = new Float64Array(2);
    return project(toImage, sourcePoint.u, sourcePoint.v, out) ? { x: out[0], y: out[1] } : null;
  })();

  const hint =
    mode === "plane"
      ? complete
        ? valid
          ? "Drag the corners to line the grid up with a flat surface."
          : "The corners cross. Drag them into a four-sided shape."
        : `Click ${4 - corners.length / 2} more corner${corners.length === 6 ? "" : "s"} of a flat surface.`
      : sourcePoint
        ? "Paint to clone. Alt-click (or Set Source) to pick a new source."
        : "Alt-click inside the plane, or press Set Source, to choose where to clone from.";

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles.pixelEditor}`}
      aria-labelledby="vp-title"
      data-testid="vanishing-point-dialog"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="vp-title" className={styles.dialogTitle}>
          Vanishing Point
        </h2>
        <div className={styles.pixelEditorBody}>
          <div className={styles.pixelEditorSide}>
            <div className={styles.toolList} role="radiogroup" aria-label="Vanishing Point tool">
              <button
                type="button"
                role="radio"
                aria-checked={mode === "plane"}
                className={styles.button}
                onClick={() => setMode("plane")}
              >
                Edit Plane
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "clone"}
                className={styles.button}
                disabled={!valid}
                onClick={() => setMode("clone")}
              >
                Stamp
              </button>
            </div>
            <p className={styles.muted} role="status">
              {hint}
            </p>
            {mode === "plane" ? (
              <button
                type="button"
                className={styles.button}
                onClick={() => setCorners([])}
                disabled={corners.length === 0}
              >
                Delete Plane
              </button>
            ) : (
              <>
                <RangeField
                  id="vp-size"
                  label="Brush diameter (px)"
                  value={size}
                  min={2}
                  max={Math.max(source.width, source.height)}
                  onChange={setSize}
                />
                <RangeField
                  id="vp-hardness"
                  label="Hardness (%)"
                  value={hardness}
                  min={0}
                  max={100}
                  onChange={setHardness}
                />
                <button
                  type="button"
                  className={styles.button}
                  aria-pressed={pickSource}
                  onClick={() => setPickSource((v) => !v)}
                >
                  Set Source
                </button>
                <button
                  type="button"
                  className={styles.button}
                  disabled={strokes.length === 0}
                  onClick={() => setStrokes((list) => list.slice(0, -1))}
                >
                  Undo Stroke
                </button>
              </>
            )}
          </div>
          <div className={styles.pixelStage}>
            <div className={styles.pixelCanvasWrap} onPointerLeave={() => setCursor(null)}>
              <canvas
                ref={canvas}
                className={styles.pixelCanvas}
                aria-label="Vanishing Point preview"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              <svg
                className={styles.pixelOverlay}
                viewBox={`0 0 ${source.width} ${source.height}`}
                preserveAspectRatio="none"
                aria-hidden
              >
                {gridLines.length > 0 && (
                  <path
                    d={gridLines.join(" ")}
                    className={valid ? styles.planeGrid : styles.planeGridBad}
                  />
                )}
                {complete && !valid && (
                  <polygon points={corners.join(",")} className={styles.planeGridBad} />
                )}
                {corners.length > 2 && !complete && (
                  <polyline points={corners.join(",")} className={styles.planeGrid} />
                )}
                {mode === "plane" &&
                  Array.from({ length: corners.length / 2 }, (_, k) => (
                    <circle
                      key={k}
                      cx={corners[k * 2]}
                      cy={corners[k * 2 + 1]}
                      r={6 / (cursor?.zoom ?? 1)}
                      className={styles.planeHandle}
                    />
                  ))}
                {sourceMark && mode === "clone" && (
                  <path
                    d={`M${sourceMark.x - 8} ${sourceMark.y} H${sourceMark.x + 8} M${sourceMark.x} ${sourceMark.y - 8} V${sourceMark.y + 8}`}
                    className={styles.planeGrid}
                  />
                )}
              </svg>
              {cursor && mode === "clone" && (
                <BrushCursor
                  x={cursor.x * cursor.zoom}
                  y={cursor.y * cursor.zoom}
                  size={size * cursor.zoom}
                />
              )}
            </div>
          </div>
        </div>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.primary}`}
            disabled={strokes.length === 0}
          >
            OK
          </button>
        </div>
      </form>
    </dialog>
  );
}
