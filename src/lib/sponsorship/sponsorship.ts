/**
 * MYLPER's own sponsorship system (docs/08). Sponsorships are static, self-hosted content: no
 * scripts, no cookies, no impression or click tracking, so they never need consent and never
 * inspect what a user is editing (ADR-0013).
 */

export type Placement = "site-sidebar" | "blog-inline" | "editor-start";

export interface Advertisement {
  readonly id: string;
  readonly sponsor: string;
  readonly title: string;
  readonly description?: string;
  /** Path to an image under /public (self-hosted; never a third-party URL). */
  readonly image?: string;
  /** https URL of the sponsor. */
  readonly targetUrl: string;
  readonly placement: Placement | readonly Placement[];
  readonly active: boolean;
}

/** Shown when no sponsor is booked for a placement. */
export const HOUSE_AD: Advertisement = {
  id: "house",
  sponsor: "MYLPER",
  title: "Sponsor MYLPER",
  description: "Reach people who create and edit images. Privacy-friendly, no tracking.",
  targetUrl: "/sponsorship",
  placement: ["site-sidebar", "blog-inline", "editor-start"],
  active: true,
};

const placements = (ad: Advertisement): readonly Placement[] =>
  typeof ad.placement === "string" ? [ad.placement] : ad.placement;

/** Only https links to other sites, or local paths; nothing else is ever rendered as a link. */
export function isSafeTarget(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Only images from this site's /public folder. */
export const isSafeImage = (path: string | undefined) =>
  path === undefined ||
  (/^\/[a-z0-9/_.-]+\.(png|jpe?g|webp|svg)$/i.test(path) && !path.includes(".."));

/**
 * The sponsorship to show for a placement: active, valid ones rotate once per day (`day` = days
 * since 1970, the same for everyone, no user data involved); the house ad fills empty slots.
 */
export function pickSponsorship(
  ads: readonly Advertisement[],
  placement: Placement,
  day: number,
): Advertisement {
  const candidates = ads.filter(
    (ad) =>
      ad.active &&
      placements(ad).includes(placement) &&
      isSafeTarget(ad.targetUrl) &&
      isSafeImage(ad.image),
  );
  if (candidates.length === 0) return HOUSE_AD;
  return candidates[Math.abs(Math.floor(day)) % candidates.length];
}

export const dayNumber = (time: number) => Math.floor(time / 86_400_000);
