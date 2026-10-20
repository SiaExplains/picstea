"use client";

import { useSyncExternalStore } from "react";
import { SponsorTile } from "@/components/site/SponsorTile";
import { SPONSORSHIPS } from "@/content/sponsorships";
import { dayNumber, pickSponsorship } from "@/lib/sponsorship/sponsorship";
import { useAppStatus, useController } from "./editor-context";
import styles from "./editor.module.css";
import { TrashIcon } from "./icons";
import { useInstallState } from "@/components/pwa/PwaStart";
import { promptInstall } from "@/lib/pwa/pwa";
import type { UiAction, UiActionId } from "./use-editor-actions";
import { useT } from "./i18n";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function StartScreen({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const controller = useController();
  const recent = useAppStatus((s) => s.recentProjects);
  const persistent = useAppStatus((s) => s.storagePersistent);
  const install = useInstallState();
  const t = useT();

  return (
    <div className={styles.start}>
      <h2 className={styles.startTitle}>{t("Start editing")}</h2>
      <p className={styles.startLead}>
        {t(
          "Create a new document, or open an image, a PSD or a .picstea project. Everything stays in this browser — nothing is uploaded. You can also drop a file anywhere on this page.",
        )}
      </p>
      {!persistent && (
        <p className={styles.warning} role="alert">
          {t(
            "This browser is not allowing local storage (for example in a private window). You can still edit, but your work will be lost when you close the tab.",
          )}
        </p>
      )}
      <div className={styles.startActions}>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          onClick={actions["file.new"].run}
        >
          {t("New document")}
        </button>
        <button type="button" className={styles.button} onClick={actions["file.open"].run}>
          {t("Open image")}
        </button>
        {install.canPrompt && !install.installed && (
          <button
            type="button"
            className={styles.button}
            title={t("Opens in its own window and works offline")}
            onClick={() => void promptInstall()}
          >
            {t("Install Picstea")}
          </button>
        )}
      </div>

      <h2 className={styles.sectionTitle}>{t("Recent in this browser")}</h2>
      {recent === null && <p className={styles.muted}>{t("Loading…")}</p>}
      {recent?.length === 0 && (
        <p className={styles.muted}>
          {t("No saved projects yet. Your work is saved here automatically.")}
        </p>
      )}
      {recent && recent.length > 0 && (
        <ul className={styles.recentList} aria-label={t("Recent projects")}>
          {recent.map((project) => (
            <li key={project.id} className={styles.recentItem}>
              <button
                type="button"
                className={styles.recentOpen}
                onClick={() => void controller.openProject(project.id)}
              >
                <span className={styles.recentName}>{project.name}</span>
                <span className={styles.recentMeta}>
                  {project.width} × {project.height} ·{" "}
                  {project.layerCount === 1
                    ? t("{count} layer", { count: project.layerCount })
                    : t("{count} layers", { count: project.layerCount })}
                </span>
                <span className={styles.recentMeta}>
                  {dateFormat.format(new Date(project.modifiedAt))}
                </span>
              </button>
              <button
                type="button"
                className={styles.iconButton}
                style={{ marginRight: 6 }}
                aria-label={t("Delete {name} from this browser", { name: project.name })}
                title={t("Delete from this browser")}
                onClick={() => {
                  if (
                    window.confirm(
                      t("Delete “{name}” from this browser? This cannot be undone.", {
                        name: project.name,
                      }),
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
      <StartSponsorship />
    </div>
  );
}

const noSubscribe = () => () => {};

/**
 * The start screen's sponsorship (docs/08) on screens narrower than the side column, which has
 * three slots of its own (ADR-0034, ADR-0035). Never over the canvas or tools. Picstea's own
 * sponsorships only — no third-party code runs in the editor.
 */
function StartSponsorship() {
  const day = useSyncExternalStore(
    noSubscribe,
    () => dayNumber(Date.now()),
    () => 0,
  );
  const ad = pickSponsorship(SPONSORSHIPS, "editor-start", day);
  return (
    <div className={styles.startSponsor}>
      <SponsorTile ad={ad} size={200} />
    </div>
  );
}
