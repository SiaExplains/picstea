"use client";

import { useAppStatus, useController } from "./editor-context";
import styles from "./editor.module.css";
import { TrashIcon } from "./icons";
import type { UiAction, UiActionId } from "./use-editor-actions";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function StartScreen({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const controller = useController();
  const recent = useAppStatus((s) => s.recentProjects);
  const persistent = useAppStatus((s) => s.storagePersistent);

  return (
    <div className={styles.start}>
      <h1 className={styles.startTitle}>Start editing</h1>
      <p className={styles.startLead}>
        Create a new document or open an image. Everything stays in this browser — your images are
        never uploaded. You can also drop an image anywhere on this page, or paste one.
      </p>
      {!persistent && (
        <p className={styles.warning} role="alert">
          This browser is not allowing local storage (for example in a private window). You can
          still edit, but your work will be lost when you close the tab.
        </p>
      )}
      <div className={styles.startActions}>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          onClick={actions["file.new"].run}
        >
          New document
        </button>
        <button type="button" className={styles.button} onClick={actions["file.open"].run}>
          Open image
        </button>
      </div>

      <h2 className={styles.sectionTitle}>Recent in this browser</h2>
      {recent === null && <p className={styles.muted}>Loading…</p>}
      {recent?.length === 0 && (
        <p className={styles.muted}>
          No saved projects yet. Your work is saved here automatically.
        </p>
      )}
      {recent && recent.length > 0 && (
        <ul className={styles.recentList} aria-label="Recent projects">
          {recent.map((project) => (
            <li key={project.id} className={styles.recentItem}>
              <button
                type="button"
                className={styles.recentOpen}
                onClick={() => void controller.openProject(project.id)}
              >
                <span className={styles.recentName}>{project.name}</span>
                <span className={styles.recentMeta}>
                  {project.width} × {project.height} · {project.layerCount}{" "}
                  {project.layerCount === 1 ? "layer" : "layers"}
                </span>
                <span className={styles.recentMeta}>
                  {dateFormat.format(new Date(project.modifiedAt))}
                </span>
              </button>
              <button
                type="button"
                className={styles.iconButton}
                style={{ marginRight: 6 }}
                aria-label={`Delete ${project.name} from this browser`}
                title="Delete from this browser"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete “${project.name}” from this browser? This cannot be undone.`,
                    )
                  ) {
                    void controller.deleteProject(project.id);
                  }
                }}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
