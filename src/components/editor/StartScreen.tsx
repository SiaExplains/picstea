"use client";

import { useSyncExternalStore } from "react";
import { SponsorCard } from "@/components/site/SponsorCard";
import { SPONSORSHIPS } from "@/content/sponsorships";
import { dayNumber, pickSponsorship } from "@/lib/sponsorship/sponsorship";
import { useAppStatus, useController } from "./editor-context";
import styles from "./editor.module.css";
import { TrashIcon } from "./icons";
import { useInstallState } from "@/components/pwa/PwaStart";
import { promptInstall } from "@/lib/pwa/pwa";
import type { UiAction, UiActionId } from "./use-editor-actions";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function StartScreen({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const controller = useController();
  const recent = useAppStatus((s) => s.recentProjects);
  const persistent = useAppStatus((s) => s.storagePersistent);
  const install = useInstallState();

  return (
    <div className={styles.start}>
      <h2 className={styles.startTitle}>Start editing</h2>
      <p className={styles.startLead}>
        Create a new document, or open an image, a PSD or a .picstea project. Everything stays in
        this browser — nothing is uploaded. You can also drop a file anywhere on this page.
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
        {install.canPrompt && !install.installed && (
          <button
            type="button"
            className={styles.button}
            title="Opens in its own window and works offline"
            onClick={() => void promptInstall()}
          >
            Install Picstea
          </button>
        )}
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
      <StartSponsorship />
    </div>
  );
}

const noSubscribe = () => () => {};

/**
 * The editor's only sponsorship space (docs/08): on the start screen, before a document is open,
 * never over the canvas or tools. Picstea's own sponsorships only — no third-party code runs in
 * the editor.
 */
function StartSponsorship() {
  const day = useSyncExternalStore(
    noSubscribe,
    () => dayNumber(Date.now()),
    () => 0,
  );
  const ad = pickSponsorship(SPONSORSHIPS, "editor-start", day);
  return (
    <SponsorCard
      ad={ad}
      styles={{
        card: styles.sponsor,
        label: styles.sponsorLabel,
        title: styles.sponsorTitle,
        text: styles.muted,
      }}
    />
  );
}
