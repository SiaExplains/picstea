"use client";

import { useSyncExternalStore } from "react";
import { SponsorCard } from "@/components/site/SponsorCard";
import { SPONSORSHIPS } from "@/content/sponsorships";
import { dayNumber, pickSponsorship } from "@/lib/sponsorship/sponsorship";
import styles from "./editor.module.css";

const noSubscribe = () => () => {};

/**
 * The editor's right-hand column on wide screens (ADR-0025): one fixed-size sponsorship space and
 * the privacy settings. Picstea's own sponsorships only — static and self-hosted, so no
 * third-party code runs in the editor and nothing here can see the document. The space is
 * reserved up front, so the canvas never shifts.
 */
export function SideColumn({ onPrivacySettings }: { onPrivacySettings: () => void }) {
  // Day 0 while prerendering; today's rotation once in the browser (no hydration mismatch).
  const day = useSyncExternalStore(
    noSubscribe,
    () => dayNumber(Date.now()),
    () => 0,
  );
  const ad = pickSponsorship(SPONSORSHIPS, "editor-side", day);
  return (
    <aside className={styles.side} aria-label="Sponsorship and privacy" data-testid="editor-side">
      <div className={styles.sideSlot}>
        <SponsorCard
          ad={ad}
          styles={{
            card: styles.sideSponsor,
            label: styles.sponsorLabel,
            title: styles.sponsorTitle,
            text: styles.muted,
          }}
        />
      </div>
      <a className={styles.sideLink} href="/sponsorship" target="_blank" rel="noopener">
        Advertise here
      </a>
      <button type="button" className={styles.sideButton} onClick={onPrivacySettings}>
        Privacy settings
      </button>
    </aside>
  );
}
