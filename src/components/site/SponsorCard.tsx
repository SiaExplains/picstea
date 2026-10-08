import Image from "next/image";
import type { Advertisement } from "@/lib/sponsorship/sponsorship";

export interface SponsorCardStyles {
  readonly card: string;
  readonly label: string;
  readonly title: string;
  readonly text: string;
}

/**
 * One sponsorship, clearly marked as sponsored (docs/08). Plain HTML: no scripts, no tracking.
 * Styles come from the caller so the same card fits the website and the editor.
 */
export function SponsorCard({ ad, styles }: { ad: Advertisement; styles: SponsorCardStyles }) {
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
        {ad.image && <Image src={ad.image} alt="" width={64} height={64} unoptimized />}
        <strong className={styles.title}>{ad.title}</strong>
      </a>
      {ad.description && <span className={styles.text}>{ad.description}</span>}
    </aside>
  );
}
