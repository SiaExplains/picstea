"use client";

import { useRef, useState } from "react";
import { setBlendIf, setLayerChannels } from "@/editor/core/commands";
import {
  FULL_RANGE,
  type BlendIfChannel,
  type BlendRange,
  type ChannelSet,
} from "@/editor/core/document/blending";
import type { Layer } from "@/editor/core/document/types";
import { N_ } from "@/i18n/editor/catalog";
import { useController } from "./editor-context";
import { useT } from "./i18n";
import { Check, Choice, Row } from "./LayerStyleControls";
import styles from "./editor.module.css";

/** Blending Options → Channels and Blend If (ADR-0031), Photoshop's split sliders. */

type Part = "black" | "blackLow" | "blackHigh" | "white" | "whiteLow" | "whiteHigh";

const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v)));

/** Move one thumb (or a joined pair) and keep the four values in order. */
export function moveThumb(range: BlendRange, part: Part, v: number): BlendRange {
  const [b0, b1, w0, w1] = range;
  switch (part) {
    case "black": {
      const x = clamp(v, 0, w0);
      return [x, x, w0, w1];
    }
    case "blackLow":
      return [clamp(v, 0, b1), b1, w0, w1];
    case "blackHigh":
      return [b0, clamp(v, b0, w0), w0, w1];
    case "white": {
      const x = clamp(v, b1, 255);
      return [b0, b1, x, x];
    }
    case "whiteLow":
      return [b0, b1, clamp(v, b1, w1), w1];
    case "whiteHigh":
      return [b0, b1, w0, clamp(v, w0, 255)];
  }
}

const valueOf = (range: BlendRange, part: Part) =>
  ({
    black: range[1],
    blackLow: range[0],
    blackHigh: range[1],
    white: range[2],
    whiteLow: range[2],
    whiteHigh: range[3],
  })[part];

/** The thumb that shows `part`'s value once `range` is drawn (halves that meet are joined). */
export function partAfter(range: BlendRange, part: Part): Part {
  if (part.startsWith("black")) {
    return range[0] === range[1] ? "black" : part === "black" ? "blackHigh" : part;
  }
  return range[2] === range[3] ? "white" : part === "white" ? "whiteLow" : part;
}

/** Alt on a joined thumb splits it: the inner half moves on its own. */
const splitPart = (part: Part): Part =>
  part === "black" ? "blackHigh" : part === "white" ? "whiteLow" : part;

const PART_NAMES: Record<Part, string> = {
  black: N_("shadows"),
  blackLow: N_("shadows start"),
  blackHigh: N_("shadows end"),
  white: N_("highlights"),
  whiteLow: N_("highlights start"),
  whiteHigh: N_("highlights end"),
};

const BAR_COLORS: Record<BlendIfChannel, string> = {
  gray: "#ffffff",
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
};

export function BlendIfSlider({
  label,
  channel,
  range,
  onChange,
}: {
  label: string;
  channel: BlendIfChannel;
  range: BlendRange;
  onChange: (range: BlendRange) => void;
}) {
  const controller = useController();
  const t = useT();
  const seal = () => controller.store.sealHistory();
  const bar = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<Part | null>(null);
  // Splitting or joining replaces a thumb: keyboard focus follows the value to its new thumb.
  const pendingFocus = useRef<Part | null>(null);
  const [b0, b1, w0, w1] = range;
  const parts: Part[] = [
    ...(b0 === b1 ? (["black"] as const) : (["blackLow", "blackHigh"] as const)),
    ...(w0 === w1 ? (["white"] as const) : (["whiteLow", "whiteHigh"] as const)),
  ];
  const fromPointer = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 255;
  };
  const readout = (lo: number, hi: number) => (lo === hi ? String(lo) : `${lo}/${hi}`);

  return (
    <div className={styles.blendIf}>
      <div className={styles.blendIfHead}>
        <span>{label}</span>
        <span className={styles.blendIfValues}>
          {readout(b0, b1)} &nbsp; {readout(w0, w1)}
        </span>
      </div>
      <div
        ref={bar}
        className={styles.blendIfBar}
        style={{ background: `linear-gradient(to right, #000, ${BAR_COLORS[channel]})` }}
      >
        {parts.map((part) => {
          const v = valueOf(range, part);
          return (
            <div
              key={part}
              ref={(el) => {
                if (el && pendingFocus.current === part) {
                  pendingFocus.current = null;
                  el.focus();
                }
              }}
              role="slider"
              tabIndex={0}
              aria-label={t("{label} {part}", { label, part: t(PART_NAMES[part]) })}
              aria-valuemin={0}
              aria-valuemax={255}
              aria-valuenow={v}
              title={t("Alt-drag to split")}
              className={[
                styles.blendIfThumb,
                part.startsWith("black") ? styles.blendIfThumbDark : "",
                part.endsWith("Low") ? styles.blendIfHalfLow : "",
                part.endsWith("High") ? styles.blendIfHalfHigh : "",
              ].join(" ")}
              style={{ left: `${(v / 255) * 100}%` }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(e.altKey ? splitPart(part) : part);
              }}
              onPointerMove={(e) => {
                if (!dragging || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
                onChange(moveThumb(range, dragging, fromPointer(e.clientX)));
              }}
              onPointerUp={() => {
                setDragging(null);
                seal();
              }}
              onDoubleClick={() => {
                // Join a split thumb again at this value.
                if (part === "blackLow" || part === "blackHigh") onChange([v, v, w0, w1]);
                if (part === "whiteLow" || part === "whiteHigh") onChange([b0, b1, v, v]);
                seal();
              }}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 10 : 1;
                const delta =
                  e.key === "ArrowRight" || e.key === "ArrowUp"
                    ? step
                    : e.key === "ArrowLeft" || e.key === "ArrowDown"
                      ? -step
                      : 0;
                if (!delta) return;
                e.preventDefault();
                const moving = e.altKey ? splitPart(part) : part;
                const next = moveThumb(range, moving, valueOf(range, moving) + delta);
                onChange(next);
                const target = partAfter(next, moving);
                if (target !== part) pendingFocus.current = target;
              }}
              onKeyUp={seal}
            />
          );
        })}
      </div>
    </div>
  );
}

const CHANNEL_OPTIONS: readonly (readonly [BlendIfChannel, string])[] = [
  ["gray", N_("Gray")],
  ["red", N_("Red")],
  ["green", N_("Green")],
  ["blue", N_("Blue")],
];

export function AdvancedBlending({ layer }: { layer: Layer }) {
  const controller = useController();
  const t = useT();
  const [channel, setChannel] = useState<BlendIfChannel>("gray");
  const channels: ChannelSet = layer.channels ?? { r: true, g: true, b: true };
  const ranges = layer.blendIf?.[channel] ?? { current: FULL_RANGE, below: FULL_RANGE };
  const setRanges = (next: { current: BlendRange; below: BlendRange }) =>
    controller.execute(setBlendIf(layer.id, { ...layer.blendIf, [channel]: next }));
  return (
    <>
      <Row label={t("Channels")}>
        {(["r", "g", "b"] as const).map((key) => (
          <Check
            key={key}
            label={key.toUpperCase()}
            checked={channels[key]}
            onChange={(on) =>
              controller.execute(setLayerChannels(layer.id, { ...channels, [key]: on }))
            }
          />
        ))}
      </Row>
      <Choice
        label={t("Blend If")}
        value={channel}
        options={CHANNEL_OPTIONS.map(([value, text]) => [value, t(text)] as const)}
        onChange={setChannel}
      />
      <BlendIfSlider
        label={t("This Layer")}
        channel={channel}
        range={ranges.current}
        onChange={(current) => setRanges({ ...ranges, current })}
      />
      <BlendIfSlider
        label={t("Underlying Layer")}
        channel={channel}
        range={ranges.below}
        onChange={(below) => setRanges({ ...ranges, below })}
      />
      <p className={styles.muted}>
        {t(
          "Alt-drag (or Alt + arrow keys) splits a slider for a soft transition; double-click a split half to join it again.",
        )}
      </p>
    </>
  );
}
