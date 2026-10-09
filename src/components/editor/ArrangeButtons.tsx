"use client";

import { ALIGN_LABELS } from "@/editor/controller/editor-controller";
import { DISTRIBUTE_LABELS, type DistributeMode } from "@/editor/core/geometry/multi-transform";
import type { AlignEdge } from "@/editor/core/geometry/snapping";
import { useController } from "./editor-context";
import styles from "./editor.module.css";

const ALIGN_SHORT: Record<AlignEdge, string> = {
  left: "Left",
  "center-x": "Centre",
  right: "Right",
  top: "Top",
  "center-y": "Middle",
  bottom: "Bottom",
};

const DISTRIBUTE_SHORT: Record<DistributeMode, string> = {
  "centers-x": "H centres",
  "centers-y": "V centres",
  "spacing-x": "H spacing",
  "spacing-y": "V spacing",
};

/** Align and distribute buttons for a multi-layer selection (ADR-0020). */
export function ArrangeButtons({ count }: { count: number }) {
  const controller = useController();
  return (
    <>
      <div className={styles.segmented} role="group" aria-label="Align layers">
        {(Object.keys(ALIGN_SHORT) as AlignEdge[]).map((edge) => (
          <button
            key={edge}
            type="button"
            aria-label={ALIGN_LABELS[edge]}
            title={ALIGN_LABELS[edge]}
            onClick={() => controller.alignActiveLayer(edge)}
          >
            {ALIGN_SHORT[edge]}
          </button>
        ))}
      </div>
      <div className={styles.segmented} role="group" aria-label="Distribute layers">
        {(Object.keys(DISTRIBUTE_SHORT) as DistributeMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-label={DISTRIBUTE_LABELS[mode]}
            title={
              count >= 3 ? DISTRIBUTE_LABELS[mode] : `${DISTRIBUTE_LABELS[mode]} (select 3 or more)`
            }
            disabled={count < 3}
            onClick={() => controller.distributeSelectedLayers(mode)}
          >
            {DISTRIBUTE_SHORT[mode]}
          </button>
        ))}
      </div>
    </>
  );
}
