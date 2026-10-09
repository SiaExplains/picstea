"use client";

import type { SmartFilter, SmartObjectLayer } from "@/editor/core/document/types";
import { filterById } from "@/editor/filters/registry";
import { useController } from "./editor-context";
import styles from "./editor.module.css";

/**
 * A smart object's details and its smart filters (ADR-0016): show/hide, edit, reorder, delete.
 * Filters apply bottom to top in the order listed.
 */
export function SmartObjectSection({
  layer,
  onEditFilter,
}: {
  layer: SmartObjectLayer;
  onEditFilter: (layerId: string, filter: SmartFilter) => void;
}) {
  const controller = useController();
  const filters = layer.filters ?? [];
  return (
    <div className={styles.subsection}>
      <p className={styles.muted}>
        Smart object · {layer.content.width} × {layer.content.height} px
      </p>
      <button
        type="button"
        className={styles.button}
        onClick={() => controller.editSmartContents(layer.id)}
      >
        Edit Contents
      </button>
      <div className={styles.subsectionTitle}>Smart filters</div>
      {filters.length === 0 && (
        <p className={styles.muted}>None. Choose a filter from the Filter menu to add one.</p>
      )}
      <ul className={styles.smartFilters} aria-label="Smart filters">
        {filters.map((f, i) => {
          const name = filterById(f.filterId)?.name ?? f.filterId;
          return (
            <li key={f.id} className={styles.smartFilterRow}>
              <label className={styles.smallLabel}>
                <input
                  type="checkbox"
                  checked={f.enabled}
                  aria-label={`Show ${name}`}
                  onChange={(e) =>
                    controller.updateSmartFilter(
                      layer.id,
                      f.id,
                      { enabled: e.target.checked },
                      { label: e.target.checked ? `Show ${name}` : `Hide ${name}` },
                    )
                  }
                />
              </label>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => onEditFilter(layer.id, f)}
                title="Edit settings"
              >
                {name}
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Move ${name} up`}
                disabled={i === filters.length - 1}
                onClick={() => controller.moveSmartFilter(layer.id, f.id, 1)}
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Move ${name} down`}
                disabled={i === 0}
                onClick={() => controller.moveSmartFilter(layer.id, f.id, -1)}
              >
                ↓
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Delete ${name}`}
                onClick={() =>
                  controller.updateSmartFilter(layer.id, f.id, null, { label: `Delete ${name}` })
                }
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
