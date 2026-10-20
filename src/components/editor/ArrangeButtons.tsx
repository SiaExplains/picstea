"use client";

import { ALIGN_LABELS } from "@/editor/controller/editor-controller";
import { DISTRIBUTE_LABELS, type DistributeMode } from "@/editor/core/geometry/multi-transform";
import type { AlignEdge } from "@/editor/core/geometry/snapping";
import { useController } from "./editor-context";
import styles from "./editor.module.css";
import { useT } from "./i18n";
import { N_ } from "@/i18n/editor/catalog";

const ALIGN_SHORT: Record<AlignEdge, string> = {
  left: N_("Left"),
  "center-x": N_("Centre"),
  right: N_("Right"),
  top: N_("Top"),
  "center-y": N_("Middle"),
  bottom: N_("Bottom"),
};

const DISTRIBUTE_SHORT: Record<DistributeMode, string> = {
  "centers-x": N_("H centres"),
  "centers-y": N_("V centres"),
  "spacing-x": N_("H spacing"),
  "spacing-y": N_("V spacing"),
};

/** Align and distribute buttons for a multi-layer selection (ADR-0020). */
export function ArrangeButtons({ count }: { count: number }) {
  const controller = useController();
  const t = useT();
  return (
    <>
      <div className={styles.segmented} role="group" aria-label={t("Align layers")}>
        {(Object.keys(ALIGN_SHORT) as AlignEdge[]).map((edge) => (
          <button
            key={edge}
            type="button"
            aria-label={t(ALIGN_LABELS[edge])}
            title={t(ALIGN_LABELS[edge])}
            onClick={() => controller.alignActiveLayer(edge)}
          >
            {t(ALIGN_SHORT[edge])}
          </button>
        ))}
      </div>
      <div className={styles.segmented} role="group" aria-label={t("Distribute layers")}>
        {(Object.keys(DISTRIBUTE_SHORT) as DistributeMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-label={t(DISTRIBUTE_LABELS[mode])}
            title={
              count >= 3
                ? t(DISTRIBUTE_LABELS[mode])
                : t("{label} (select 3 or more)", { label: t(DISTRIBUTE_LABELS[mode]) })
            }
            disabled={count < 3}
            onClick={() => controller.distributeSelectedLayers(mode)}
          >
            {t(DISTRIBUTE_SHORT[mode])}
          </button>
        ))}
      </div>
    </>
  );
}
