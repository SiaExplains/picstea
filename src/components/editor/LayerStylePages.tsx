"use client";

import type { GradientStop } from "@/editor/core/document/types";
import {
  type BevelEffect,
  type EffectByKind,
  type EffectKind,
  type GlobalLight,
  type GlowFill,
  type GradientMethod,
  type GradientStyle,
  type StrokeFill,
} from "@/editor/core/effects/model";
import { EFFECT_LIMITS } from "@/editor/core/effects/parse";
import { N_ } from "@/i18n/editor/catalog";
import { GradientStopsEditor } from "./AdjustmentEditors";
import {
  AngleDial,
  BlendRow,
  Check,
  Choice,
  ContourPicker,
  NumberSlider,
  PatternPicker,
  Row,
  percentProps,
} from "./LayerStyleControls";
import { useT, type Translate } from "./i18n";
import styles from "./editor.module.css";

/** The settings page of each effect in the Layer Style dialog (ADR-0030). */

export type BevelPage = "structure" | "contour" | "texture";

interface PageProps<K extends EffectKind> {
  readonly effect: EffectByKind[K];
  readonly set: (patch: Partial<EffectByKind[K]>) => void;
  readonly light: GlobalLight;
  readonly setLight: (light: GlobalLight) => void;
}

const Heading = ({ children }: { children: string }) => (
  <h4 className={styles.styleGroupTitle}>{children}</h4>
);

const GRADIENT_STYLES: readonly (readonly [GradientStyle, string])[] = [
  ["linear", N_("Linear")],
  ["radial", N_("Radial")],
  ["angle", N_("Angle")],
  ["reflected", N_("Reflected")],
  ["diamond", N_("Diamond")],
];

const METHODS: readonly (readonly [GradientMethod, string])[] = [
  ["perceptual", N_("Perceptual")],
  ["linear", N_("Linear")],
  ["classic", N_("Classic")],
];

/** Option labels in the current language. */
const translated = <T extends string>(t: Translate, options: readonly (readonly [T, string])[]) =>
  options.map(([value, text]) => [value, t(text)] as const);

const BW: readonly GradientStop[] = [
  { position: 0, color: "#000000" },
  { position: 1, color: "#ffffff" },
];

/** Angle that follows the global light when the effect uses it. */
function lightAngle(
  e: { angle: number; useGlobalLight: boolean },
  set: (patch: { angle?: number; useGlobalLight?: boolean }) => void,
  light: GlobalLight,
  setLight: (light: GlobalLight) => void,
) {
  return {
    value: e.useGlobalLight ? light.angle : e.angle,
    onChange: (angle: number) =>
      e.useGlobalLight ? setLight({ ...light, angle }) : set({ angle }),
    global: {
      checked: e.useGlobalLight,
      onToggle: (checked: boolean) =>
        set(checked ? { useGlobalLight: true } : { useGlobalLight: false, angle: light.angle }),
    },
  };
}

function Opacity({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const t = useT();
  return <NumberSlider label={t("Opacity")} value={value} {...percentProps} onChange={onChange} />;
}

function Noise({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const t = useT();
  return <NumberSlider label={t("Noise")} value={value} {...percentProps} onChange={onChange} />;
}

function Size({
  label,
  value,
  onChange,
  min = 0,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  const t = useT();
  return (
    <NumberSlider
      label={label ?? t("Size")}
      value={value}
      min={min}
      max={EFFECT_LIMITS.size[1]}
      onChange={onChange}
    />
  );
}

function Distance({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const t = useT();
  return (
    <NumberSlider
      label={t("Distance")}
      value={value}
      min={0}
      max={250}
      inputMax={EFFECT_LIMITS.distance[1]}
      onChange={onChange}
    />
  );
}

function ShadowPage<K extends "dropShadow" | "innerShadow">({
  kind,
  effect,
  set,
  light,
  setLight,
}: PageProps<K> & { kind: K }) {
  const t = useT();
  const e = effect as EffectByKind["dropShadow"] & EffectByKind["innerShadow"];
  const patch = set as (
    p: Partial<EffectByKind["dropShadow"] & EffectByKind["innerShadow"]>,
  ) => void;
  const drop = kind === "dropShadow";
  return (
    <>
      <Heading>{t("Structure")}</Heading>
      <BlendRow
        mode={e.blendMode}
        onMode={(blendMode) => patch({ blendMode })}
        color={e.color}
        onColor={(color) => patch({ color })}
      />
      <Opacity value={e.opacity} onChange={(opacity) => patch({ opacity })} />
      <AngleDial {...lightAngle(e, patch, light, setLight)} />
      <Distance value={e.distance} onChange={(distance) => patch({ distance })} />
      {drop ? (
        <NumberSlider
          label={t("Spread")}
          value={e.spread}
          {...percentProps}
          onChange={(spread) => patch({ spread })}
        />
      ) : (
        <NumberSlider
          label={t("Choke")}
          value={e.choke}
          {...percentProps}
          onChange={(choke) => patch({ choke })}
        />
      )}
      <Size value={e.size} onChange={(size) => patch({ size })} />
      <Heading>{t("Quality")}</Heading>
      <ContourPicker
        contour={e.contour}
        onChange={(contour) => patch({ contour })}
        antiAlias={e.antiAlias}
        onAntiAlias={(antiAlias) => patch({ antiAlias })}
      />
      <Noise value={e.noise} onChange={(noise) => patch({ noise })} />
      {drop && (
        <Check
          label={t("Layer Knocks Out Drop Shadow")}
          checked={e.knockout}
          onChange={(knockout) => patch({ knockout })}
        />
      )}
    </>
  );
}

function GlowFillRow({ fill, onChange }: { fill: GlowFill; onChange: (fill: GlowFill) => void }) {
  const t = useT();
  return (
    <>
      <Choice
        label={t("Fill")}
        value={fill.kind}
        options={[
          ["color", t("Color")],
          ["gradient", t("Gradient")],
        ]}
        onChange={(kind) =>
          onChange(
            kind === "color"
              ? {
                  kind: "color",
                  color: fill.kind === "gradient" ? fill.stops[0].color : fill.color,
                }
              : {
                  kind: "gradient",
                  stops:
                    fill.kind === "color"
                      ? [
                          { position: 0, color: fill.color },
                          { position: 1, color: "#ffffff" },
                        ]
                      : fill.stops,
                  reverse: false,
                },
          )
        }
      />
      {fill.kind === "color" ? (
        <Row label={t("Color")}>
          <input
            type="color"
            aria-label={t("Glow colour")}
            className={styles.colorInput}
            style={{ width: 36 }}
            value={fill.color}
            onChange={(e) => onChange({ kind: "color", color: e.target.value })}
          />
        </Row>
      ) : (
        <>
          <GradientStopsEditor
            label={t("Glow gradient")}
            stops={fill.stops}
            onChange={(stops) => onChange({ ...fill, stops })}
          />
          <Check
            label={t("Reverse")}
            checked={fill.reverse}
            onChange={(reverse) => onChange({ ...fill, reverse })}
          />
        </>
      )}
    </>
  );
}

function GlowPage<K extends "outerGlow" | "innerGlow">({
  kind,
  effect,
  set,
}: PageProps<K> & { kind: K }) {
  const t = useT();
  const e = effect as EffectByKind["outerGlow"] & EffectByKind["innerGlow"];
  const patch = set as (p: Partial<EffectByKind["outerGlow"] & EffectByKind["innerGlow"]>) => void;
  const inner = kind === "innerGlow";
  return (
    <>
      <Heading>{t("Structure")}</Heading>
      <BlendRow mode={e.blendMode} onMode={(blendMode) => patch({ blendMode })} />
      <Opacity value={e.opacity} onChange={(opacity) => patch({ opacity })} />
      <Noise value={e.noise} onChange={(noise) => patch({ noise })} />
      <GlowFillRow fill={e.fill} onChange={(fill) => patch({ fill })} />
      <Heading>{t("Elements")}</Heading>
      <Choice
        label={t("Technique")}
        value={e.technique}
        options={[
          ["softer", t("Softer")],
          ["precise", t("Precise")],
        ]}
        onChange={(technique) => patch({ technique })}
      />
      {inner && (
        <Choice
          label={t("Source")}
          value={e.source}
          options={[
            ["center", t("Center")],
            ["edge", t("Edge")],
          ]}
          onChange={(source) => patch({ source })}
        />
      )}
      {inner ? (
        <NumberSlider
          label={t("Choke")}
          value={e.choke}
          {...percentProps}
          onChange={(choke) => patch({ choke })}
        />
      ) : (
        <NumberSlider
          label={t("Spread")}
          value={e.spread}
          {...percentProps}
          onChange={(spread) => patch({ spread })}
        />
      )}
      <Size value={e.size} onChange={(size) => patch({ size })} />
      <Heading>{t("Quality")}</Heading>
      <ContourPicker
        contour={e.contour}
        onChange={(contour) => patch({ contour })}
        antiAlias={e.antiAlias}
        onAntiAlias={(antiAlias) => patch({ antiAlias })}
      />
      <NumberSlider
        label={t("Range")}
        value={e.range}
        min={1}
        max={100}
        unit="%"
        factor={100}
        onChange={(range) => patch({ range })}
      />
      <NumberSlider
        label={t("Jitter")}
        value={e.jitter}
        {...percentProps}
        onChange={(jitter) => patch({ jitter })}
      />
    </>
  );
}

function BevelPageView({
  effect: e,
  set,
  light,
  setLight,
  page,
}: PageProps<"bevel"> & { page: BevelPage }) {
  const t = useT();
  if (page === "contour") {
    const c = e.contour;
    const patch = (p: Partial<BevelEffect["contour"]>) => set({ contour: { ...c, ...p } });
    return (
      <>
        <Heading>{t("Elements")}</Heading>
        <ContourPicker
          contour={c.contour}
          onChange={(contour) => patch({ contour })}
          antiAlias={c.antiAlias}
          onAntiAlias={(antiAlias) => patch({ antiAlias })}
        />
        <NumberSlider
          label={t("Range")}
          value={c.range}
          min={1}
          max={100}
          unit="%"
          factor={100}
          onChange={(range) => patch({ range })}
        />
      </>
    );
  }
  if (page === "texture") {
    const tx = e.texture;
    const patch = (p: Partial<BevelEffect["texture"]>) => set({ texture: { ...tx, ...p } });
    return (
      <>
        <Heading>{t("Elements")}</Heading>
        <PatternPicker value={tx.pattern} onChange={(pattern) => patch({ pattern })} />
        <NumberSlider
          label={t("Scale")}
          value={tx.scale}
          min={1}
          max={1000}
          unit="%"
          factor={100}
          onChange={(scale) => patch({ scale })}
        />
        <NumberSlider
          label={t("Depth")}
          value={tx.depth}
          min={-1000}
          max={1000}
          unit="%"
          factor={100}
          onChange={(depth) => patch({ depth })}
        />
        <Check label={t("Invert")} checked={tx.invert} onChange={(invert) => patch({ invert })} />
        <Check
          label={t("Link with Layer")}
          checked={tx.align}
          onChange={(align) => patch({ align })}
        />
        <PatternOffsets
          x={tx.offsetX}
          y={tx.offsetY}
          onChange={(offsetX, offsetY) => patch({ offsetX, offsetY })}
        />
      </>
    );
  }
  return (
    <>
      <Heading>{t("Structure")}</Heading>
      <Choice
        label={t("Style")}
        value={e.style}
        options={[
          ["outer", t("Outer Bevel")],
          ["inner", t("Inner Bevel")],
          ["emboss", t("Emboss")],
          ["pillow", t("Pillow Emboss")],
          ["stroke", t("Stroke Emboss")],
        ]}
        onChange={(style) => set({ style })}
      />
      <Choice
        label={t("Technique")}
        value={e.technique}
        options={[
          ["smooth", t("Smooth")],
          ["chisel-hard", t("Chisel Hard")],
          ["chisel-soft", t("Chisel Soft")],
        ]}
        onChange={(technique) => set({ technique })}
      />
      <NumberSlider
        label={t("Depth")}
        value={e.depth}
        min={1}
        max={1000}
        unit="%"
        factor={100}
        onChange={(depth) => set({ depth })}
      />
      <Choice
        label={t("Direction")}
        value={e.direction}
        options={[
          ["up", t("Up")],
          ["down", t("Down")],
        ]}
        onChange={(direction) => set({ direction })}
      />
      <Size value={e.size} onChange={(size) => set({ size })} />
      <NumberSlider
        label={t("Soften")}
        value={e.soften}
        min={0}
        max={EFFECT_LIMITS.soften[1]}
        onChange={(soften) => set({ soften })}
      />
      <Heading>{t("Shading")}</Heading>
      <AngleDial {...lightAngle(e, set, light, setLight)} />
      <NumberSlider
        label={t("Altitude")}
        value={e.useGlobalLight ? light.altitude : e.altitude}
        min={0}
        max={90}
        unit="°"
        onChange={(altitude) =>
          e.useGlobalLight ? setLight({ ...light, altitude }) : set({ altitude })
        }
      />
      <ContourPicker
        label={t("Gloss Contour")}
        contour={e.glossContour}
        onChange={(glossContour) => set({ glossContour })}
        antiAlias={e.glossAntiAlias}
        onAntiAlias={(glossAntiAlias) => set({ glossAntiAlias })}
      />
      <BlendRow
        label={t("Highlight Mode")}
        mode={e.highlightMode}
        onMode={(highlightMode) => set({ highlightMode })}
        color={e.highlightColor}
        onColor={(highlightColor) => set({ highlightColor })}
      />
      <NumberSlider
        label={t("Highlight Opacity")}
        value={e.highlightOpacity}
        {...percentProps}
        onChange={(highlightOpacity) => set({ highlightOpacity })}
      />
      <BlendRow
        label={t("Shadow Mode")}
        mode={e.shadowMode}
        onMode={(shadowMode) => set({ shadowMode })}
        color={e.shadowColor}
        onColor={(shadowColor) => set({ shadowColor })}
      />
      <NumberSlider
        label={t("Shadow Opacity")}
        value={e.shadowOpacity}
        {...percentProps}
        onChange={(shadowOpacity) => set({ shadowOpacity })}
      />
    </>
  );
}

function PatternOffsets({
  x,
  y,
  onChange,
}: {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const t = useT();
  const [min, max] = EFFECT_LIMITS.patternOffset;
  return (
    <>
      <NumberSlider
        label={t("Offset X")}
        value={x}
        min={-500}
        max={500}
        inputMin={min}
        inputMax={max}
        onChange={(v) => onChange(v, y)}
      />
      <NumberSlider
        label={t("Offset Y")}
        value={y}
        min={-500}
        max={500}
        inputMin={min}
        inputMax={max}
        onChange={(v) => onChange(x, v)}
      />
      <Row label="">
        <button type="button" className={styles.button} onClick={() => onChange(0, 0)}>
          {t("Snap to Origin")}
        </button>
      </Row>
    </>
  );
}

function SatinPage({ effect: e, set }: PageProps<"satin">) {
  const t = useT();
  return (
    <>
      <Heading>{t("Structure")}</Heading>
      <BlendRow
        mode={e.blendMode}
        onMode={(blendMode) => set({ blendMode })}
        color={e.color}
        onColor={(color) => set({ color })}
      />
      <Opacity value={e.opacity} onChange={(opacity) => set({ opacity })} />
      <AngleDial value={e.angle} onChange={(angle) => set({ angle })} />
      <NumberSlider
        label={t("Distance")}
        value={e.distance}
        min={1}
        max={250}
        onChange={(distance) => set({ distance })}
      />
      <Size value={e.size} onChange={(size) => set({ size })} />
      <ContourPicker
        contour={e.contour}
        onChange={(contour) => set({ contour })}
        antiAlias={e.antiAlias}
        onAntiAlias={(antiAlias) => set({ antiAlias })}
      />
      <Check label={t("Invert")} checked={e.invert} onChange={(invert) => set({ invert })} />
    </>
  );
}

function GradientOverlayPage({ effect: e, set }: PageProps<"gradientOverlay">) {
  const t = useT();
  return (
    <>
      <Heading>{t("Gradient")}</Heading>
      <BlendRow mode={e.blendMode} onMode={(blendMode) => set({ blendMode })} />
      <Check label={t("Dither")} checked={e.dither} onChange={(dither) => set({ dither })} />
      <Opacity value={e.opacity} onChange={(opacity) => set({ opacity })} />
      <GradientStopsEditor
        label={t("Overlay gradient")}
        stops={e.stops}
        onChange={(stops) => set({ stops })}
      />
      <Check label={t("Reverse")} checked={e.reverse} onChange={(reverse) => set({ reverse })} />
      <Choice
        label={t("Style")}
        value={e.style}
        options={translated(t, GRADIENT_STYLES)}
        onChange={(style) => set({ style })}
      />
      <Choice
        label={t("Method")}
        value={e.method}
        options={translated(t, METHODS)}
        onChange={(method) => set({ method })}
      />
      <Check label={t("Align with Layer")} checked={e.align} onChange={(align) => set({ align })} />
      <AngleDial value={e.angle} onChange={(angle) => set({ angle })} />
      <NumberSlider
        label={t("Scale")}
        value={e.scale}
        min={10}
        max={150}
        unit="%"
        factor={100}
        onChange={(scale) => set({ scale })}
      />
      <NumberSlider
        label={t("Offset X")}
        value={e.offsetX}
        min={-150}
        max={150}
        unit="%"
        factor={100}
        onChange={(offsetX) => set({ offsetX })}
      />
      <NumberSlider
        label={t("Offset Y")}
        value={e.offsetY}
        min={-150}
        max={150}
        unit="%"
        factor={100}
        onChange={(offsetY) => set({ offsetY })}
      />
      <Row label="">
        <button
          type="button"
          className={styles.button}
          onClick={() => set({ offsetX: 0, offsetY: 0 })}
        >
          {t("Reset Alignment")}
        </button>
      </Row>
    </>
  );
}

function PatternOverlayPage({ effect: e, set }: PageProps<"patternOverlay">) {
  const t = useT();
  return (
    <>
      <Heading>{t("Pattern")}</Heading>
      <BlendRow mode={e.blendMode} onMode={(blendMode) => set({ blendMode })} />
      <Opacity value={e.opacity} onChange={(opacity) => set({ opacity })} />
      <PatternPicker value={e.pattern} onChange={(pattern) => set({ pattern })} />
      <AngleDial value={e.angle} onChange={(angle) => set({ angle })} />
      <NumberSlider
        label={t("Scale")}
        value={e.scale}
        min={1}
        max={1000}
        unit="%"
        factor={100}
        onChange={(scale) => set({ scale })}
      />
      <Check label={t("Link with Layer")} checked={e.align} onChange={(align) => set({ align })} />
      <PatternOffsets
        x={e.offsetX}
        y={e.offsetY}
        onChange={(offsetX, offsetY) => set({ offsetX, offsetY })}
      />
    </>
  );
}

function StrokePage({ effect: e, set }: PageProps<"stroke">) {
  const t = useT();
  const fill = e.fill;
  const setFill = (patch: Partial<Extract<StrokeFill, { kind: "gradient" }>>) =>
    fill.kind === "gradient" && set({ fill: { ...fill, ...patch } });
  return (
    <>
      <Heading>{t("Structure")}</Heading>
      <Size value={e.size} min={1} onChange={(size) => set({ size })} />
      <Choice
        label={t("Position")}
        value={e.position}
        options={[
          ["outside", t("Outside")],
          ["inside", t("Inside")],
          ["center", t("Center")],
        ]}
        onChange={(position) => set({ position })}
      />
      <BlendRow mode={e.blendMode} onMode={(blendMode) => set({ blendMode })} />
      <Opacity value={e.opacity} onChange={(opacity) => set({ opacity })} />
      <Check
        label={t("Overprint")}
        checked={e.overprint}
        onChange={(overprint) => set({ overprint })}
      />
      <Heading>{t("Fill")}</Heading>
      <Choice
        label={t("Fill Type")}
        value={fill.kind}
        options={[
          ["color", t("Color")],
          ["gradient", t("Gradient")],
        ]}
        onChange={(kind) =>
          set({
            fill:
              kind === "color"
                ? {
                    kind: "color",
                    color: fill.kind === "gradient" ? fill.stops[0].color : fill.color,
                  }
                : {
                    kind: "gradient",
                    stops:
                      fill.kind === "color"
                        ? [{ position: 0, color: fill.color }, BW[1]]
                        : fill.stops,
                    reverse: false,
                    style: "linear",
                    angle: 90,
                    scale: 1,
                  },
          })
        }
      />
      {fill.kind === "color" ? (
        <Row label={t("Color")}>
          <input
            type="color"
            aria-label={t("Stroke colour")}
            className={styles.colorInput}
            style={{ width: 36 }}
            value={fill.color}
            onChange={(ev) => set({ fill: { kind: "color", color: ev.target.value } })}
          />
        </Row>
      ) : (
        <>
          <GradientStopsEditor
            label={t("Stroke gradient")}
            stops={fill.stops}
            onChange={(stops) => setFill({ stops })}
          />
          <Check
            label={t("Reverse")}
            checked={fill.reverse}
            onChange={(reverse) => setFill({ reverse })}
          />
          <Choice
            label={t("Style")}
            value={fill.style}
            options={translated(t, GRADIENT_STYLES)}
            onChange={(style) => setFill({ style })}
          />
          <AngleDial value={fill.angle} onChange={(angle) => setFill({ angle })} />
          <NumberSlider
            label={t("Scale")}
            value={fill.scale}
            min={10}
            max={150}
            unit="%"
            factor={100}
            onChange={(scale) => setFill({ scale })}
          />
        </>
      )}
    </>
  );
}

/** The settings of one copy of an effect. */
export function EffectPage<K extends EffectKind>({
  kind,
  bevelPage = "structure",
  ...props
}: PageProps<K> & { kind: K; bevelPage?: BevelPage }) {
  const t = useT();
  const p = props as unknown as PageProps<never>;
  switch (kind) {
    case "dropShadow":
      return <ShadowPage kind="dropShadow" {...(p as unknown as PageProps<"dropShadow">)} />;
    case "innerShadow":
      return <ShadowPage kind="innerShadow" {...(p as unknown as PageProps<"innerShadow">)} />;
    case "outerGlow":
      return <GlowPage kind="outerGlow" {...(p as unknown as PageProps<"outerGlow">)} />;
    case "innerGlow":
      return <GlowPage kind="innerGlow" {...(p as unknown as PageProps<"innerGlow">)} />;
    case "bevel":
      return <BevelPageView page={bevelPage} {...(p as unknown as PageProps<"bevel">)} />;
    case "satin":
      return <SatinPage {...(p as unknown as PageProps<"satin">)} />;
    case "colorOverlay": {
      const { effect: e, set } = p as unknown as PageProps<"colorOverlay">;
      return (
        <>
          <Heading>{t("Color")}</Heading>
          <BlendRow
            mode={e.blendMode}
            onMode={(blendMode) => set({ blendMode })}
            color={e.color}
            onColor={(color) => set({ color })}
          />
          <Opacity value={e.opacity} onChange={(opacity) => set({ opacity })} />
        </>
      );
    }
    case "gradientOverlay":
      return <GradientOverlayPage {...(p as unknown as PageProps<"gradientOverlay">)} />;
    case "patternOverlay":
      return <PatternOverlayPage {...(p as unknown as PageProps<"patternOverlay">)} />;
    case "stroke":
      return <StrokePage {...(p as unknown as PageProps<"stroke">)} />;
  }
  return null;
}
