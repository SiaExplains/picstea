import Image from "next/image";
import type { Advertisement } from "@/lib/sponsorship/sponsorship";
import { SponsorVideo } from "./SponsorVideo";
import styles from "./sponsor-tile.module.css";

/**
 * One sponsorship as a single link: the sponsor's image or video with a small "Sponsored" label
 * over it, and nothing else (ADR-0035). An empty slot is a short "Your ad here" tile that links to
 * the sponsorship page. No third-party scripts, no tracking.
 */
export function SponsorTile({ ad, size = 256 }: { ad: Advertisement; size?: number }) {
  const external = !ad.targetUrl.startsWith("/");
  const media = ad.video ? (
    <SponsorVideo src={ad.video} poster={ad.image} size={size} />
  ) : ad.image ? (
    <Image src={ad.image} alt="" width={size} height={size} unoptimized />
  ) : null;
  return (
    <a
      href={ad.targetUrl}
      className={styles.tile}
      aria-label={media ? `Sponsored: ${ad.title}` : "Your ad here: sponsor Picstea"}
      data-testid="sponsor-card"
      {...(external ? { target: "_blank", rel: "sponsored noopener noreferrer" } : {})}
    >
      {media ?? (
        <span className={styles.placeholder}>
          <strong>Your ad here</strong>
          <span>Sponsor Picstea</span>
        </span>
      )}
      <span className={styles.label} aria-hidden>
        Sponsored
      </span>
    </a>
  );
}
