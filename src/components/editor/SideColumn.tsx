"use client";

import { useSyncExternalStore } from "react";
import { SponsorTile } from "@/components/site/SponsorTile";
import { SPONSORSHIPS } from "@/content/sponsorships";
import { dayNumber, pickSponsorships } from "@/lib/sponsorship/sponsorship";
import styles from "./editor.module.css";

const noSubscribe = () => () => {};

/** Sponsorship slots in the column, top to bottom. */
const SIDE_SLOTS = 3;

/**
 * The editor's right-hand column on wide screens (ADR-0025, ADR-0034): three sponsorship slots
 * and the privacy settings. Picstea's own sponsorships only — static and self-hosted, so no
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
  const ads = pickSponsorships(SPONSORSHIPS, "editor-side", day, SIDE_SLOTS);
  return (
    <aside className={styles.side} aria-label="Sponsorship and privacy" data-testid="editor-side">
      <div className={styles.sideSlots}>
        {ads.map((ad, i) => (
          <div key={`${i}-${ad.id}`} className={styles.sideSlot} data-testid="side-slot">
            <SponsorTile ad={ad} />
          </div>
        ))}
      </div>
      <button type="button" className={styles.sideButton} onClick={onPrivacySettings}>
        Privacy settings
      </button>
    </aside>
  );
}
