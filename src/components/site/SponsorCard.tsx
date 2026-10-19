import Image from "next/image";
import type { Advertisement } from "@/lib/sponsorship/sponsorship";
import { SponsorVideo } from "./SponsorVideo";

export interface SponsorCardStyles {
  readonly card: string;
  readonly label: string;
  readonly title: string;
  readonly text: string;
}

/**
 * One sponsorship, clearly marked as sponsored (docs/08): an image or a short silent video, a
 * title and a link. No third-party scripts, no tracking.
 * Styles come from the caller so the same card fits the website and the editor.
 */
export function SponsorCard({
  ad,
  styles,
  mediaSize = 64,
}: {
  ad: Advertisement;
  styles: SponsorCardStyles;
  /** Width and height of the image or video, in CSS pixels. */
  mediaSize?: number;
}) {
  const external = !ad.targetUrl.startsWith("/");
  return (
    <aside
      className={styles.card}
      aria-label={`Sponsored: ${ad.sponsor}`}
      data-testid="sponsor-card"
    >
      <span className={styles.label}>Sponsored</span>
      <a
        href={ad.targetUrl}
        {...(external ? { target: "_blank", rel: "sponsored noopener noreferrer" } : {})}
      >
        {ad.video ? (
          <SponsorVideo src={ad.video} poster={ad.image} size={mediaSize} />
        ) : (
          ad.image && (
            <Image src={ad.image} alt="" width={mediaSize} height={mediaSize} unoptimized />
          )
        )}
        <strong className={styles.title}>{ad.title}</strong>
      </a>
      {ad.description && <span className={styles.text}>{ad.description}</span>}
    </aside>
  );
}
