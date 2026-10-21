"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { SPONSORSHIPS } from "@/content/sponsorships";
import { ADSENSE_CLIENT, ADSENSE_SLOT } from "@/lib/ads/adsense";
import { allows } from "@/lib/consent/consent";
import { consentRuntime, GOOGLE_CMP } from "@/lib/consent/runtime";
import { noSubscribe, pageSeed } from "@/lib/sponsorship/page-seed";
import { pickSponsorship, type Placement } from "@/lib/sponsorship/sponsorship";
import styles from "./site.module.css";
import { SponsorCard } from "./SponsorCard";

/**
 * A fixed-size ad space on website pages (never in the editor). With a configured AdSense unit and
 * advertising consent — or Google's CMP deciding consent itself — it shows a Google ad; otherwise
 * Picstea's own sponsorship. The box is
 * reserved up front, so nothing shifts when the ad loads (docs/08, docs/10 Core Web Vitals).
 */
export function AdSlot({ placement }: { placement: Exclude<Placement, "editor-start"> }) {
  const consent = useSyncExternalStore(consentRuntime.subscribe, consentRuntime.get, () => null);
  const google =
    !!ADSENSE_CLIENT && !!ADSENSE_SLOT && (GOOGLE_CMP || allows(consent, "advertising"));
  const pushed = useRef(false);

  useEffect(() => {
    if (!google || pushed.current) return;
    pushed.current = true;
    try {
      const w = window as Window & { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle ?? []).push({});
    } catch {
      // Ad blocked: the reserved space simply stays empty.
    }
  }, [google]);

  // Listed order while prerendering; a random pick once in the browser (no hydration mismatch).
  const seed = useSyncExternalStore(noSubscribe, pageSeed, () => 0);
  const ad = pickSponsorship(SPONSORSHIPS, placement, seed);
  return (
    <div className={styles.adSlot} data-placement={placement}>
      {google ? (
        <>
          <span className={styles.adLabel}>Advertisement</span>
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height: "100%" }}
            data-ad-client={ADSENSE_CLIENT!}
            data-ad-slot={ADSENSE_SLOT!}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </>
      ) : (
        <SponsorCard
          ad={ad}
          styles={{
            card: styles.sponsor,
            label: styles.adLabel,
            title: styles.sponsorTitle,
            text: styles.sponsorText,
          }}
        />
      )}
    </div>
  );
}
