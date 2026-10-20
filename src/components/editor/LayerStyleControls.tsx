"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BLEND_MODES, type BlendMode, type GradientStop } from "@/editor/core/document/types";
import {
  CONTOUR_NAMES,
  CONTOUR_PRESETS,
  MAX_CONTOUR_POINTS,
  PATTERNS,
  PATTERN_NAMES,
  contourPreset,
  type Contour,
  type ContourPoint,
  type ContourPreset,
  type GlobalLight,
  type LayerEffects,
  type PatternId,
} from "@/editor/core/effects/model";
import { fillPattern } from "@/editor/rendering/compositing/effect-paint";
import { renderWithEffects } from "@/editor/rendering/compositing/effects";
import { useController } from "./editor-context";
import { useT } from "./i18n";
import { BLEND_LABELS } from "./PropertiesPanel";
import styles from "./editor.module.css";

/** Controls of the Layer Style dialog (ADR-0030). Every drag merges into one undo step. */

function useSeal() {
  const controller = useController();
  return () => controller.store.sealHistory();
}

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

/** A labelled row: name on the left, controls on the right (Photoshop's layout). */
export function Row({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.styleRow}>
      {htmlFor ? (
        <label className={styles.styleRowLabel} htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className={styles.styleRowLabel}>{label}</span>
      )}
      <div className={styles.styleRowControls}>{children}</div>
    </div>
  );
}

/** Slider plus number field, with a unit. */
export function NumberSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "px",
  factor = 1,
  inputMin = min,
  inputMax = max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Typed values may go beyond the slider (Photoshop's distance goes to 30000 px). */
  inputMin?: number;
  inputMax?: number;
  /** Shown value = stored value × factor (100 for percentages). */
  factor?: number;
  onChange: (value: number) => void;
}) {
  const seal = useSeal();
  const t = useT();
  const id = useId();
  const shown = Math.round(value * factor * 100) / 100;
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (text: string) => {
    const n = Number(text);
    if (text.trim() !== "" && Number.isFinite(n)) {
      onChange(Math.min(inputMax, Math.max(inputMin, n)) / factor);
    }
    setDraft(null);
    seal();
  };
  return (
    <Row label={label} htmlFor={id}>
      <input
        id={id}
        type="range"
        className={styles.styleRange}
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, shown))}
        onChange={(e) => onChange(Number(e.target.value) / factor)}
        onPointerUp={seal}
        onKeyUp={seal}
        onBlur={seal}
      />
      <input
        type="number"
        aria-label={t("{label} value", { label })}
        className={styles.styleNumber}
        min={inputMin}
        max={inputMax}
        step={step}
        value={draft ?? String(shown)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
          }
        }}
      />
      <span className={styles.styleUnit}>{unit}</span>
    </Row>
  );
}

export const percentProps = { min: 0, max: 100, unit: "%", factor: 100 } as const;

/** Photoshop's angle dial: drag the line, or type degrees; optionally "Use Global Light". */
export function AngleDial({
  label: labelProp,
  value,
  onChange,
  global,
}: {
  label?: string;
  value: number;
  onChange: (angle: number) => void;
  global?: { checked: boolean; onToggle: (checked: boolean) => void };
}) {
  const seal = useSeal();
  const t = useT();
  const label = labelProp ?? t("Angle");
  const dialRef = useRef<HTMLDivElement>(null);
  const fromPointer = (e: React.PointerEvent) => {
    const r = dialRef.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = r.top + r.height / 2 - e.clientY;
    onChange(Math.round((Math.atan2(dy, dx) * 180) / Math.PI));
  };
  const rad = (value * Math.PI) / 180;
  return (
    <Row label={label}>
      <div
        ref={dialRef}
        className={styles.angleDial}
        role="slider"
        tabIndex={0}
        aria-label={t("{label} dial", { label })}
        aria-valuemin={-180}
        aria-valuemax={180}
        aria-valuenow={value}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e);
        }}
        onPointerUp={seal}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 15 : 1;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(wrap(value - step));
          else if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(wrap(value + step));
          else return;
          e.preventDefault();
        }}
        onKeyUp={seal}
      >
        <svg viewBox="-10 -10 20 20" aria-hidden>
          <circle r="9" className={styles.angleDialFace} />
          <line x1="0" y1="0" x2={Math.cos(rad) * 8} y2={-Math.sin(rad) * 8} />
          <circle r="1.4" />
        </svg>
      </div>
      <input
        type="number"
        aria-label={t("{label} degrees", { label })}
        className={styles.styleNumber}
        min={-180}
        max={180}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n)) onChange(wrap(n));
        }}
        onBlur={seal}
      />
      <span className={styles.styleUnit}>°</span>
      {global && (
        <label className={styles.styleCheck}>
          <input
            type="checkbox"
            checked={global.checked}
            onChange={(e) => {
              global.onToggle(e.target.checked);
              seal();
            }}
          />
          {t("Use Global Light")}
        </label>
      )}
    </Row>
  );
}

const wrap = (a: number) => {
  const r = ((((a + 180) % 360) + 360) % 360) - 180;
  return r === -180 && a > 0 ? 180 : r;
};

/** Blend mode menu, with a colour swatch next to it when the effect has one colour. */
export function BlendRow({
  label: labelProp,
  mode,
  onMode,
  color,
  onColor,
}: {
  label?: string;
  mode: BlendMode;
  onMode: (mode: BlendMode) => void;
  color?: string;
  onColor?: (color: string) => void;
}) {
  const seal = useSeal();
  const t = useT();
  const label = labelProp ?? t("Blend Mode");
  const id = useId();
  return (
    <Row label={label} htmlFor={id}>
      <select
        id={id}
        className={styles.select}
        value={mode}
        onChange={(e) => {
          onMode(e.target.value as BlendMode);
          seal();
        }}
      >
        {BLEND_MODES.map((m) => (
          <option key={m} value={m}>
            {t(BLEND_LABELS[m])}
          </option>
        ))}
      </select>
      {color !== undefined && onColor && (
        <ColorSwatch label={t("{label} colour", { label })} value={color} onChange={onColor} />
      )}
    </Row>
  );
}

export function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const seal = useSeal();
  return (
    <input
      type="color"
      aria-label={label}
      className={styles.colorInput}
      style={{ width: 36 }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={seal}
    />
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const seal = useSeal();
  return (
    <label className={styles.styleCheck}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
          seal();
        }}
      />
      {label}
    </label>
  );
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  const seal = useSeal();
  const id = useId();
  return (
    <Row label={label} htmlFor={id}>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(e) => {
          onChange(e.target.value as T);
          seal();
        }}
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </Row>
  );
}

const PRESET_NAMES = Object.keys(CONTOUR_PRESETS) as Exclude<ContourPreset, "custom">[];

const curvePath = (points: readonly ContourPoint[]) =>
  points.map((p, i) => `${i ? "L" : "M"}${p.x * 100} ${100 - p.y * 100}`).join(" ");

/**
 * Contour: a preset menu and an editable curve (drag points; click to add one, double-click a
 * point to remove it).
 */
export function ContourPicker({
  label: labelProp,
  contour,
  onChange,
  antiAlias,
  onAntiAlias,
}: {
  label?: string;
  contour: Contour;
  onChange: (contour: Contour) => void;
  antiAlias?: boolean;
  onAntiAlias?: (value: boolean) => void;
}) {
  const seal = useSeal();
  const t = useT();
  const label = labelProp ?? t("Contour");
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const toPoint = (e: React.PointerEvent): ContourPoint => {
    const r = svgRef.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, Math.round(v * 100) / 100));
    return {
      x: clamp((e.clientX - r.left) / r.width),
      y: clamp(1 - (e.clientY - r.top) / r.height),
    };
  };
  const setPoints = (points: ContourPoint[]) => onChange({ preset: "custom", points });
  const pts = contour.points;
  return (
    <Row label={label} htmlFor={id}>
      <svg
        ref={svgRef}
        className={styles.contourCurve}
        viewBox="-4 -4 108 108"
        role="img"
        aria-label={t("{label} curve", { label })}
        onPointerDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (pts.length >= MAX_CONTOUR_POINTS) return;
          const p = toPoint(e);
          const next = [...pts, p].sort((a, b) => a.x - b.x);
          setPoints(next);
          setDrag(next.indexOf(p));
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag === null) return;
          const p = toPoint(e);
          const lo = drag === 0 ? 0 : pts[drag - 1].x;
          const hi = drag === pts.length - 1 ? 1 : pts[drag + 1].x;
          const x = drag === 0 ? 0 : drag === pts.length - 1 ? 1 : Math.min(hi, Math.max(lo, p.x));
          setPoints(pts.map((q, i) => (i === drag ? { x, y: p.y } : q)));
        }}
        onPointerUp={() => {
          setDrag(null);
          seal();
        }}
      >
        <rect x="0" y="0" width="100" height="100" className={styles.contourFrame} />
        <path d={curvePath(pts)} className={styles.contourLine} />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x * 100}
            cy={100 - p.y * 100}
            r="4"
            className={styles.contourPoint}
            onPointerDown={(e) => {
              e.stopPropagation();
              setDrag(i);
              svgRef.current?.setPointerCapture(e.pointerId);
            }}
            onDoubleClick={() => {
              if (i === 0 || i === pts.length - 1) return;
              setPoints(pts.filter((_, j) => j !== i));
              seal();
            }}
          />
        ))}
      </svg>
      <select
        id={id}
        className={styles.select}
        value={contour.preset}
        onChange={(e) => {
          const v = e.target.value as ContourPreset;
          if (v !== "custom") onChange(contourPreset(v));
          seal();
        }}
      >
        {PRESET_NAMES.map((name) => (
          <option key={name} value={name}>
            {t(CONTOUR_NAMES[name])}
          </option>
        ))}
        {contour.preset === "custom" && <option value="custom">{t(CONTOUR_NAMES.custom)}</option>}
      </select>
      {onAntiAlias && (
        <Check label={t("Anti-aliased")} checked={!!antiAlias} onChange={onAntiAlias} />
      )}
    </Row>
  );
}

function PatternSwatch({ pattern }: { pattern: PatternId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fillPattern(ctx, canvas, makeCanvas, { pattern, scale: 1, angle: 0, originX: 0, originY: 0 });
  }, [pattern]);
  return <canvas ref={ref} width={32} height={32} className={styles.patternSwatch} aria-hidden />;
}

export function PatternPicker({
  value,
  onChange,
}: {
  value: PatternId;
  onChange: (pattern: PatternId) => void;
}) {
  const seal = useSeal();
  const t = useT();
  return (
    <Row label={t("Pattern")}>
      <div className={styles.patternGrid} role="radiogroup" aria-label={t("Pattern")}>
        {PATTERNS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={p === value}
            aria-label={t(PATTERN_NAMES[p])}
            title={t(PATTERN_NAMES[p])}
            className={styles.patternOption}
            onClick={() => {
              onChange(p);
              seal();
            }}
          >
            <PatternSwatch pattern={p} />
          </button>
        ))}
      </div>
    </Row>
  );
}

/** A small gradient bar for a set of stops. */
export function gradientCss(stops: readonly GradientStop[], reverse = false) {
  return `linear-gradient(to right, ${[...stops]
    .map((s) => ({ ...s, position: reverse ? 1 - s.position : s.position }))
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${Math.round(s.position * 100)}%`)
    .join(", ")})`;
}

/** Photoshop's preview swatch: the style on a grey square. */
export function StylePreview({
  effects,
  fillOpacity,
  light,
}: {
  effects: LayerEffects;
  fillOpacity: number;
  light?: GlobalLight;
}) {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const size = canvas.width;
    const content = makeCanvas(size, size);
    const c = content.getContext("2d")!;
    c.fillStyle = "#9a9a9a";
    const inset = size * 0.25;
    c.beginPath();
    c.roundRect(inset, inset, size - inset * 2, size - inset * 2, size * 0.06);
    c.fill();
    const out = renderWithEffects(content, effects, {
      createSurface: makeCanvas,
      scale: 0.5,
      box: { x: inset, y: inset, width: size - inset * 2, height: size - inset * 2 },
      light,
      fillOpacity,
    });
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(out, 0, 0);
    out.width = out.height = 0;
    content.width = content.height = 0;
  }, [effects, fillOpacity, light]);
  return (
    <canvas
      ref={ref}
      width={96}
      height={96}
      className={styles.stylePreview}
      role="img"
      aria-label={t("Style preview")}
    />
  );
}
