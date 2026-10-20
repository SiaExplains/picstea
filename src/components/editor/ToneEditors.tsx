"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { setAdjustment } from "@/editor/core/commands";
import type {
  AdjustmentLayer,
  CurvePoint,
  LevelsChannel,
  ToneChannel,
} from "@/editor/core/document/types";
import {
  addCurvePoint,
  curveLut,
  moveCurvePoint,
  removeCurvePoint,
  TONE_CHANNEL_LABELS,
  TONE_CHANNELS,
} from "@/editor/adjustments/tone";
import { useController } from "./editor-context";
import { useT } from "./i18n";
import styles from "./editor.module.css";
import { Slider } from "./StyleSections";

type LevelsLayer = AdjustmentLayer & { adjustment: { type: "levels" } };
type CurvesLayer = AdjustmentLayer & { adjustment: { type: "curves" } };

/** Recompute the histogram this long after the image beneath stops changing. */
const HISTOGRAM_DELAY_MS = 250;

function useHistogram(layerId: string, channel: ToneChannel): Uint32Array | null {
  const controller = useController();
  const [bins, setBins] = useState<Uint32Array | null>(null);
  // Only what lies beneath matters, but any document change may affect it; debounce instead.
  const doc = controller.store.getSession()?.document;
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      void controller
        .adjustmentHistogram(layerId, channel)
        .then((result) => {
          if (live) setBins(result);
        })
        .catch(() => {
          if (live) setBins(null);
        });
    }, HISTOGRAM_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [controller, layerId, channel, doc]);
  return bins;
}

/** Histogram bars as one SVG path (0…255 wide, 0…100 high), scaled to the tallest bin. */
function histogramPath(bins: Uint32Array | null): string {
  if (!bins) return "";
  let max = 0;
  for (const v of bins) max = Math.max(max, v);
  if (max === 0) return "";
  let d = "M0 100";
  for (let i = 0; i < 256; i++) d += ` L${i} ${100 - (bins[i] / max) * 100}`;
  return `${d} L255 100 Z`;
}

function ChannelSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ToneChannel;
  onChange: (c: ToneChannel) => void;
}) {
  const t = useT();
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {t("Channel")}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value as ToneChannel)}
      >
        {TONE_CHANNELS.map((c) => (
          <option key={c} value={c}>
            {t(TONE_CHANNEL_LABELS[c])}
          </option>
        ))}
      </select>
    </div>
  );
}

export function LevelsEditor({ layer }: { layer: LevelsLayer }) {
  const controller = useController();
  const t = useT();
  const [channel, setChannel] = useState<ToneChannel>("rgb");
  const bins = useHistogram(layer.id, channel);
  const levels = layer.adjustment[channel];
  const update = (patch: Partial<LevelsChannel>) =>
    controller.execute(
      setAdjustment(layer.id, { ...layer.adjustment, [channel]: { ...levels, ...patch } }),
    );

  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>{t("Levels")}</div>
      <ChannelSelect id={`levels-channel-${layer.id}`} value={channel} onChange={setChannel} />
      <svg
        className={styles.histogram}
        viewBox="0 0 255 100"
        preserveAspectRatio="none"
        role="img"
        aria-label={t("Histogram of the {channel} channel beneath this layer", {
          channel: t(TONE_CHANNEL_LABELS[channel]),
        })}
      >
        <path d={histogramPath(bins)} className={styles.histogramBars} />
        <line
          x1={levels.inBlack}
          x2={levels.inBlack}
          y1={0}
          y2={100}
          className={styles.histogramMark}
        />
        <line
          x1={levels.inWhite}
          x2={levels.inWhite}
          y1={0}
          y2={100}
          className={styles.histogramMark}
        />
      </svg>
      <Slider
        label={t("Input black")}
        value={levels.inBlack}
        min={0}
        max={253}
        onChange={(v) => update({ inBlack: v, inWhite: Math.max(levels.inWhite, v + 2) })}
      />
      <Slider
        label={t("Gamma")}
        value={levels.gamma}
        min={0.1}
        max={9.99}
        step={0.01}
        onChange={(v) => update({ gamma: v })}
      />
      <Slider
        label={t("Input white")}
        value={levels.inWhite}
        min={2}
        max={255}
        onChange={(v) => update({ inWhite: v, inBlack: Math.min(levels.inBlack, v - 2) })}
      />
      <Slider
        label={t("Output black")}
        value={levels.outBlack}
        min={0}
        max={255}
        onChange={(v) => update({ outBlack: v })}
      />
      <Slider
        label={t("Output white")}
        value={levels.outWhite}
        min={0}
        max={255}
        onChange={(v) => update({ outWhite: v })}
      />
    </div>
  );
}

/** Distance (graph units) a point is dragged off the graph to delete it. */
const REMOVE_DISTANCE = 24;

export function CurvesEditor({ layer }: { layer: CurvesLayer }) {
  const controller = useController();
  const t = useT();
  const [channel, setChannel] = useState<ToneChannel>("rgb");
  const [selected, setSelected] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ index: number; pointerId: number } | null>(null);
  const bins = useHistogram(layer.id, channel);
  const points = layer.adjustment[channel];
  const index = Math.min(selected, points.length - 1);
  const point = points[index];

  const curvePath = useMemo(() => {
    const lut = curveLut(points);
    let d = `M0 ${255 - lut[0]}`;
    for (let i = 1; i < 256; i++) d += ` L${i} ${255 - lut[i]}`;
    return d;
  }, [points]);

  const commit = (next: readonly CurvePoint[]) =>
    controller.execute(setAdjustment(layer.id, { ...layer.adjustment, [channel]: next }));
  const seal = () => controller.store.sealHistory();

  /** Pointer position in curve units (input 0…255 left→right, output 0…255 bottom→top). */
  const toCurve = (event: PointerEvent): CurvePoint | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return [
      ((event.clientX - r.left) / r.width) * 255,
      255 - ((event.clientY - r.top) / r.height) * 255,
    ];
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const p = toCurve(event);
    if (!p) return;
    // Pick the nearest point within reach, otherwise add one on the curve under the pointer.
    let hit = -1;
    let best = 10;
    points.forEach((q, i) => {
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < best) {
        best = d;
        hit = i;
      }
    });
    let next = points;
    if (hit === -1) {
      next = addCurvePoint(points, p);
      if (next.length === points.length) return;
      commit(next);
      hit = next.findIndex((q) => q[0] === Math.round(Math.min(255, Math.max(0, p[0]))));
    }
    setSelected(hit);
    dragRef.current = { index: hit, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const p = toCurve(event);
    if (!p) return;
    commit(moveCurvePoint(points, drag.index, p));
  };

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const p = toCurve(event);
    const interior = drag.index > 0 && drag.index < points.length - 1;
    const off =
      p &&
      (p[0] < -REMOVE_DISTANCE ||
        p[0] > 255 + REMOVE_DISTANCE ||
        p[1] < -REMOVE_DISTANCE ||
        p[1] > 255 + REMOVE_DISTANCE);
    if (interior && off) {
      commit(removeCurvePoint(points, drag.index));
      setSelected(Math.max(0, drag.index - 1));
    }
    seal();
  };

  const onPointKeyDown = (event: KeyboardEvent, i: number) => {
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      commit(moveCurvePoint(points, i, [points[i][0] + move[0], points[i][1] + move[1]]));
    } else if (
      (event.key === "Delete" || event.key === "Backspace") &&
      i > 0 &&
      i < points.length - 1
    ) {
      event.preventDefault();
      commit(removeCurvePoint(points, i));
      setSelected(i - 1);
      seal();
    }
  };

  const setPointValue = (axis: 0 | 1, value: number) => {
    if (!Number.isFinite(value)) return;
    const next: CurvePoint = axis === 0 ? [value, point[1]] : [point[0], value];
    commit(moveCurvePoint(points, index, next));
  };

  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>{t("Curves")}</div>
      <ChannelSelect id={`curves-channel-${layer.id}`} value={channel} onChange={setChannel} />
      <svg
        ref={svgRef}
        className={styles.curves}
        viewBox="-6 -6 267 267"
        data-testid="curves-graph"
        aria-label={t(
          "{channel} curve. Click to add a point; drag a point off the graph to remove it.",
          { channel: t(TONE_CHANNEL_LABELS[channel]) },
        )}
        role="group"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
          seal();
        }}
      >
        <rect x={0} y={0} width={255} height={255} className={styles.curvesBg} />
        <g transform="translate(0 155)">
          <path d={histogramPath(bins)} className={styles.histogramBars} />
        </g>
        {[64, 128, 192].map((v) => (
          <g key={v} className={styles.curvesGrid}>
            <line x1={v} x2={v} y1={0} y2={255} />
            <line x1={0} x2={255} y1={v} y2={v} />
          </g>
        ))}
        <line x1={0} y1={255} x2={255} y2={0} className={styles.curvesGrid} />
        <path d={curvePath} className={styles.curveLine} />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={255 - p[1]}
            r={i === index ? 6 : 4.5}
            className={i === index ? styles.curvePointActive : styles.curvePoint}
            tabIndex={0}
            role="slider"
            aria-label={t("Curve point {number}", { number: i + 1 })}
            aria-valuemin={0}
            aria-valuemax={255}
            aria-valuenow={p[1]}
            aria-valuetext={t("Input {input}, output {output}", { input: p[0], output: p[1] })}
            onFocus={() => setSelected(i)}
            onKeyDown={(e) => onPointKeyDown(e, i)}
            onKeyUp={seal}
          />
        ))}
      </svg>
      <div className={styles.curveFields}>
        <label className={styles.smallLabel}>
          {t("Input")}
          <input
            className={styles.input}
            type="number"
            min={0}
            max={255}
            value={point[0]}
            onChange={(e) => setPointValue(0, Number(e.target.value))}
            onBlur={seal}
          />
        </label>
        <label className={styles.smallLabel}>
          {t("Output")}
          <input
            className={styles.input}
            type="number"
            min={0}
            max={255}
            value={point[1]}
            onChange={(e) => setPointValue(1, Number(e.target.value))}
            onBlur={seal}
          />
        </label>
      </div>
    </div>
  );
}
