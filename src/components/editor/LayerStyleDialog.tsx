"use client";

import { useEffect, useRef, useState } from "react";
import {
  addEffectCopy,
  moveEffectCopy,
  setFillOpacity,
  setGlobalLight,
  setLayerBlendMode,
  setLayerEffect,
  setLayerOpacity,
  setLayerStyle,
} from "@/editor/core/commands";
import { findLayer } from "@/editor/core/document/queries";
import type { BlendMode, Layer } from "@/editor/core/document/types";
import {
  DEFAULT_EFFECTS,
  DEFAULT_GLOBAL_LIGHT,
  EFFECT_KINDS,
  EFFECT_NAMES,
  MULTI_KINDS,
  effectList,
  maxCopies,
  type EffectByKind,
  type EffectKind,
  type GlobalLight,
  type LayerEffects,
} from "@/editor/core/effects/model";
import {
  BUILT_IN_STYLES,
  MAX_STYLE_NAME_LENGTH,
  MAX_STYLE_PRESETS,
  type LayerStylePreset,
} from "@/editor/core/effects/presets";
import { createId } from "@/editor/core/ids";
import { useActiveSession, useController, useObservable } from "./editor-context";
import {
  AngleDial,
  BlendRow,
  NumberSlider,
  StylePreview,
  percentProps,
} from "./LayerStyleControls";
import { EffectPage, type BevelPage } from "./LayerStylePages";
import { AdvancedBlending } from "./BlendIfControls";
import styles from "./editor.module.css";

type Page =
  | { readonly kind: "styles" }
  | { readonly kind: "blending" }
  | { readonly kind: EffectKind; readonly index: number; readonly bevel?: BevelPage };

const copyName = (kind: EffectKind, index: number, count: number) =>
  count > 1 ? `${EFFECT_NAMES[kind]} ${index + 1}` : EFFECT_NAMES[kind];

const isEffectPage = (page: Page): page is Extract<Page, { index: number }> => "index" in page;

/**
 * Layer → Layer Style… / double-click a layer (Photoshop's Layer Style dialog, ADR-0030): saved
 * styles, blending options and every effect, with several copies of the effects that allow it.
 * Changes show live; OK keeps them as one undo step, Cancel puts the layer back as it was.
 */
export function LayerStyleDialog({ layerId, onClose }: { layerId: string; onClose: () => void }) {
  const controller = useController();
  const session = useActiveSession();
  const ref = useRef<HTMLDialogElement>(null);
  // Where history stood when the dialog opened, to fold or roll back everything done in it.
  const [start] = useState(() => {
    controller.store.sealHistory();
    const s = controller.store.getSession();
    return s ? { document: s.document, pastLength: s.history.past.length } : null;
  });
  const [page, setPage] = useState<Page>({ kind: "blending" });
  const [naming, setNaming] = useState<string | null>(null);
  const saved = useObservable(controller.layerStyles);
  const layer = session ? findLayer(session.document, layerId) : undefined;
  const light: GlobalLight = session?.document.globalLight ?? DEFAULT_GLOBAL_LIGHT;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // The layer was deleted (e.g. undone) underneath the dialog: nothing left to edit.
  useEffect(() => {
    if (!layer) onClose();
  }, [layer, onClose]);

  const finish = (keep: boolean) => {
    if (start) {
      controller.store.sealHistory();
      controller.store.collapseHistory(start.document, "Layer Style");
      if (!keep) {
        controller.store.goToHistory(start.pastLength);
        controller.store.discardRedo();
      }
    }
    onClose();
  };

  if (!layer || layer.kind === "adjustment") return null;
  const effects: LayerEffects = layer.effects ?? {};
  const fill = layer.fillOpacity ?? 1;

  const run = (command: Parameters<typeof controller.execute>[0]) => controller.execute(command);
  const seal = () => controller.store.sealHistory();

  const setEffect = <K extends EffectKind>(
    kind: K,
    index: number,
    patch: Partial<EffectByKind[K]>,
  ) => {
    const current = effectList(effects, kind)[index] ?? DEFAULT_EFFECTS[kind];
    run(setLayerEffect(layer.id, kind, { ...current, ...patch } as EffectByKind[K], index));
  };
  const toggle = (kind: EffectKind, index: number, enabled: boolean) => {
    setEffect(kind, index, { enabled } as Partial<EffectByKind[EffectKind]>);
    seal();
    if (enabled) setPage({ kind, index });
  };

  const applyStyle = (preset: LayerStylePreset) => {
    run(setLayerStyle(layer.id, preset.effects, "Apply Style"));
    run(setFillOpacity(layer.id, preset.fillOpacity ?? 1));
    seal();
  };
  const saveStyle = (name: string) => {
    const trimmed = name.trim().slice(0, MAX_STYLE_NAME_LENGTH);
    if (!trimmed) return;
    const preset: LayerStylePreset = {
      id: createId("style"),
      name: trimmed,
      effects,
      ...(fill < 1 ? { fillOpacity: fill } : {}),
    };
    controller.layerStyles.set([...saved, preset].slice(-MAX_STYLE_PRESETS));
    setNaming(null);
    setPage({ kind: "styles" });
  };

  const selected = isEffectPage(page) ? page : null;
  const selectedCount = selected ? effectList(effects, selected.kind).length : 0;

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles.layerStyleDialog}`}
      aria-labelledby="layer-style-title"
      onCancel={(e) => {
        e.preventDefault();
        finish(false);
      }}
    >
      <form
        className={styles.dialogForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (naming !== null) saveStyle(naming);
          else finish(true);
        }}
      >
        <h2 id="layer-style-title" className={styles.dialogTitle}>
          Layer Style — {layer.name}
        </h2>
        <div className={styles.layerStyleBody}>
          <div className={styles.layerStyleSide}>
            <ul className={styles.layerStyleList} aria-label="Effects">
              <PageButton
                label="Styles"
                current={page.kind === "styles"}
                onClick={() => setPage({ kind: "styles" })}
              />
              <PageButton
                label="Blending Options"
                current={page.kind === "blending"}
                onClick={() => setPage({ kind: "blending" })}
              />
              {EFFECT_KINDS.map((kind) => {
                const list = effectList(effects, kind);
                const rows = list.length ? list : [undefined];
                return rows.map((effect, index) => {
                  const name = copyName(kind, index, list.length);
                  const current = !!selected && selected.kind === kind && selected.index === index;
                  return (
                    <EffectRow
                      key={`${kind}-${index}`}
                      name={name}
                      checked={!!effect?.enabled}
                      current={current && !selected?.bevel}
                      onToggle={(on) => toggle(kind, index, on)}
                      onSelect={() => setPage({ kind, index })}
                      onAdd={
                        MULTI_KINDS.has(kind) && list.length > 0 && list.length < maxCopies(kind)
                          ? () => {
                              run(addEffectCopy(layer.id, kind, index));
                              seal();
                              setPage({ kind, index: index + 1 });
                            }
                          : undefined
                      }
                    >
                      {kind === "bevel" && (
                        <>
                          <EffectRow
                            sub
                            name="Contour"
                            checked={!!effects.bevel?.[0]?.contour.enabled}
                            current={current && selected?.bevel === "contour"}
                            onToggle={(on) => {
                              const b = effects.bevel?.[0] ?? DEFAULT_EFFECTS.bevel;
                              setEffect("bevel", 0, { contour: { ...b.contour, enabled: on } });
                              seal();
                              if (on) setPage({ kind, index: 0, bevel: "contour" });
                            }}
                            onSelect={() => setPage({ kind, index: 0, bevel: "contour" })}
                          />
                          <EffectRow
                            sub
                            name="Texture"
                            checked={!!effects.bevel?.[0]?.texture.enabled}
                            current={current && selected?.bevel === "texture"}
                            onToggle={(on) => {
                              const b = effects.bevel?.[0] ?? DEFAULT_EFFECTS.bevel;
                              setEffect("bevel", 0, { texture: { ...b.texture, enabled: on } });
                              seal();
                              if (on) setPage({ kind, index: 0, bevel: "texture" });
                            }}
                            onSelect={() => setPage({ kind, index: 0, bevel: "texture" })}
                          />
                        </>
                      )}
                    </EffectRow>
                  );
                });
              })}
            </ul>
            <div className={styles.layerStyleTools} role="toolbar" aria-label="Effect order">
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Move effect up"
                title="Move effect up"
                disabled={!selected || selected.index === 0}
                onClick={() => {
                  if (!selected) return;
                  run(moveEffectCopy(layer.id, selected.kind, selected.index, selected.index - 1));
                  seal();
                  setPage({ kind: selected.kind, index: selected.index - 1 });
                }}
              >
                ▲
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Move effect down"
                title="Move effect down"
                disabled={!selected || selected.index >= selectedCount - 1}
                onClick={() => {
                  if (!selected) return;
                  run(moveEffectCopy(layer.id, selected.kind, selected.index, selected.index + 1));
                  seal();
                  setPage({ kind: selected.kind, index: selected.index + 1 });
                }}
              >
                ▼
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Delete effect"
                title="Delete effect"
                disabled={!selected || selectedCount === 0}
                onClick={() => {
                  if (!selected) return;
                  run(setLayerEffect(layer.id, selected.kind, null, selected.index));
                  seal();
                  setPage({ kind: selected.kind, index: Math.max(0, selected.index - 1) });
                }}
              >
                🗑
              </button>
            </div>
          </div>

          <section className={styles.layerStyleSettings} aria-label="Settings">
            {page.kind === "styles" && (
              <StylesPage
                saved={saved}
                onApply={applyStyle}
                onDelete={(id) => controller.layerStyles.set(saved.filter((s) => s.id !== id))}
                onClear={() => {
                  run(setLayerStyle(layer.id, null, "Clear Layer Style"));
                  run(setFillOpacity(layer.id, 1));
                  seal();
                }}
              />
            )}
            {page.kind === "blending" && (
              <BlendingPage layer={layer} light={light} onLight={(l) => run(setGlobalLight(l))} />
            )}
            {selected && (
              <EffectSettings
                key={`${selected.kind}-${selected.index}-${selected.bevel ?? ""}`}
                page={selected}
                effects={effects}
                light={light}
                setEffect={setEffect}
                onLight={(l) => run(setGlobalLight(l))}
                onTurnOn={() => toggle(selected.kind, selected.index, true)}
              />
            )}
          </section>

          <div className={styles.layerStyleActions}>
            <button type="submit" className={`${styles.button} ${styles.primary}`}>
              OK
            </button>
            <button type="button" className={styles.button} onClick={() => finish(false)}>
              Cancel
            </button>
            {naming === null ? (
              <button
                type="button"
                className={styles.button}
                onClick={() => setNaming(`Style ${saved.length + 1}`)}
              >
                New Style…
              </button>
            ) : (
              <div className={styles.newStyleForm}>
                <label className={styles.fieldLabel} htmlFor="new-style-name">
                  Style name
                </label>
                <input
                  id="new-style-name"
                  className={styles.input}
                  value={naming}
                  maxLength={MAX_STYLE_NAME_LENGTH}
                  autoFocus
                  onChange={(e) => setNaming(e.target.value)}
                />
                <div className={styles.newStyleButtons}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => saveStyle(naming)}
                    disabled={!naming.trim()}
                  >
                    Save style
                  </button>
                  <button type="button" className={styles.button} onClick={() => setNaming(null)}>
                    Don&apos;t save
                  </button>
                </div>
              </div>
            )}
            <StylePreview effects={effects} fillOpacity={fill} light={light} />
          </div>
        </div>
      </form>
    </dialog>
  );
}

function PageButton({
  label,
  current,
  onClick,
}: {
  label: string;
  current: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={styles.layerStylePage}
        aria-current={current ? "true" : undefined}
        onClick={onClick}
      >
        {label}
      </button>
    </li>
  );
}

function EffectRow({
  name,
  checked,
  current,
  onToggle,
  onSelect,
  onAdd,
  sub = false,
  children,
}: {
  name: string;
  checked: boolean;
  current: boolean;
  onToggle: (on: boolean) => void;
  onSelect: () => void;
  onAdd?: () => void;
  sub?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <li className={`${styles.layerStyleItem} ${sub ? styles.layerStyleSub : ""}`}>
        <input
          type="checkbox"
          aria-label={`Use ${name}`}
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <button
          type="button"
          className={styles.layerStylePage}
          aria-current={current ? "true" : undefined}
          onClick={onSelect}
        >
          {name}
        </button>
        {onAdd && (
          <button
            type="button"
            className={styles.layerStyleAdd}
            aria-label={`Add another ${name}`}
            title={`Add another ${name}`}
            onClick={onAdd}
          >
            +
          </button>
        )}
      </li>
      {children}
    </>
  );
}

function EffectSettings({
  page,
  effects,
  light,
  setEffect,
  onLight,
  onTurnOn,
}: {
  page: Extract<Page, { index: number }>;
  effects: LayerEffects;
  light: GlobalLight;
  setEffect: <K extends EffectKind>(
    kind: K,
    index: number,
    patch: Partial<EffectByKind[K]>,
  ) => void;
  onLight: (light: GlobalLight) => void;
  onTurnOn: () => void;
}) {
  const { kind, index } = page;
  const effect = effectList(effects, kind)[index];
  const title =
    page.bevel === "contour"
      ? "Contour"
      : page.bevel === "texture"
        ? "Texture"
        : EFFECT_NAMES[kind];
  return (
    <>
      <h3 className={styles.subsectionTitle}>{title}</h3>
      {effect ? (
        <EffectPage
          kind={kind}
          bevelPage={page.bevel}
          effect={effect}
          set={(patch) => setEffect(kind, index, patch)}
          light={light}
          setLight={onLight}
        />
      ) : (
        <button type="button" className={styles.button} onClick={onTurnOn}>
          Turn on {EFFECT_NAMES[kind]}
        </button>
      )}
    </>
  );
}

function BlendingPage({
  layer,
  light,
  onLight,
}: {
  layer: Layer;
  light: GlobalLight;
  onLight: (light: GlobalLight) => void;
}) {
  const controller = useController();
  return (
    <>
      <h3 className={styles.subsectionTitle}>Blending Options</h3>
      <h4 className={styles.styleGroupTitle}>General Blending</h4>
      {layer.kind !== "group" || layer.blendMode !== "pass-through" ? (
        <BlendRow
          mode={layer.blendMode as BlendMode}
          onMode={(mode) => controller.execute(setLayerBlendMode(layer.id, mode))}
        />
      ) : (
        <p className={styles.muted}>Pass Through (change it in the Layers panel)</p>
      )}
      <NumberSlider
        label="Opacity"
        value={layer.opacity}
        {...percentProps}
        onChange={(v) => controller.execute(setLayerOpacity(layer.id, v))}
      />
      <h4 className={styles.styleGroupTitle}>Advanced Blending</h4>
      <NumberSlider
        label="Fill Opacity"
        value={layer.fillOpacity ?? 1}
        {...percentProps}
        onChange={(v) => controller.execute(setFillOpacity(layer.id, v))}
      />
      <p className={styles.muted}>Fill fades the layer&apos;s pixels but not its effects.</p>
      <AdvancedBlending layer={layer} />
      <h4 className={styles.styleGroupTitle}>Global Light</h4>
      <AngleDial
        label="Global angle"
        value={light.angle}
        onChange={(angle) => onLight({ ...light, angle })}
      />
      <NumberSlider
        label="Global altitude"
        value={light.altitude}
        min={0}
        max={90}
        unit="°"
        onChange={(altitude) => onLight({ ...light, altitude })}
      />
    </>
  );
}

function StylesPage({
  saved,
  onApply,
  onDelete,
  onClear,
}: {
  saved: readonly LayerStylePreset[];
  onApply: (preset: LayerStylePreset) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <>
      <h3 className={styles.subsectionTitle}>Styles</h3>
      <ul className={styles.styleGrid} aria-label="Saved styles">
        {[...BUILT_IN_STYLES, ...saved].map((preset) => {
          const own = !preset.id.startsWith("builtin-");
          return (
            <li key={preset.id} className={styles.styleCard}>
              <button
                type="button"
                className={styles.styleCardButton}
                aria-label={`Apply ${preset.name}`}
                onClick={() => onApply(preset)}
              >
                <StylePreview effects={preset.effects} fillOpacity={preset.fillOpacity ?? 1} />
                <span>{preset.name}</span>
              </button>
              {own && (
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Delete ${preset.name}`}
                  title="Delete style"
                  onClick={() => onDelete(preset.id)}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className={styles.muted}>
        Styles you save with New Style… stay in this browser. Nothing is uploaded.
      </p>
      <button type="button" className={styles.button} onClick={onClear}>
        Clear Layer Style
      </button>
    </>
  );
}
