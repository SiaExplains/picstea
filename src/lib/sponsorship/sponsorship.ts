/**
 * Picstea's own sponsorship system (docs/08). Sponsorships are static, self-hosted content: no
 * scripts, no cookies, no impression or click tracking, so they never need consent and never
 * inspect what a user is editing (ADR-0013).
 */

export type Placement = "site-sidebar" | "blog-inline" | "editor-start" | "editor-side";

export interface Advertisement {
  readonly id: string;
  readonly sponsor: string;
  readonly title: string;
  readonly description?: string;
  /** Path to an image under /public (self-hosted; never a third-party URL). */
  readonly image?: string;
  /**
   * A short, silent, looping video under /public (self-hosted MP4 or WebM), shown instead of
   * the image. `image` is its still frame for people who prefer reduced motion.
   */
  readonly video?: string;
  /** https URL of the sponsor. */
  readonly targetUrl: string;
  readonly placement: Placement | readonly Placement[];
  readonly active: boolean;
}

/** Shown when no sponsor is booked for a placement. */
export const HOUSE_AD: Advertisement = {
  id: "house",
  sponsor: "Picstea",
  title: "Sponsor Picstea",
  description: "Reach people who create and edit images. Privacy-friendly, no tracking.",
  targetUrl: "/sponsorship",
  placement: ["site-sidebar", "blog-inline", "editor-start", "editor-side"],
  active: true,
};

/** House ads for the further empty slots of a placement with several (the editor's column). */
export const HOUSE_ADS: readonly Advertisement[] = [
  HOUSE_AD,
  {
    id: "house-2",
    sponsor: "Picstea",
    title: "Your product here",
    description: "A calm, clearly labelled space beside the canvas. No scripts, no tracking.",
    targetUrl: "/sponsorship",
    placement: "editor-side",
    active: true,
  },
  {
    id: "house-3",
    sponsor: "Picstea",
    title: "Advertise to creators",
    description: "Designers, photographers and makers use Picstea every day.",
    targetUrl: "/sponsorship",
    placement: "editor-side",
    active: true,
  },
];

const placements = (ad: Advertisement): readonly Placement[] =>
  typeof ad.placement === "string" ? [ad.placement] : ad.placement;

/** Only https links to other sites, or local paths; nothing else is ever rendered as a link. */
export function isSafeTarget(url: string): boolean {
  // Browsers read "/\\host" (and tabs or newlines inside it) as "//host": another site.
  if (/[\\\s]/.test(url)) return false;
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
  (/^\/[a-z0-9/_.-]+\.(png|jpe?g|webp|svg)$/i.test(path) &&
    !path.includes("..") &&
    !path.startsWith("//"));

/** Only MP4 or WebM videos from this site's /public folder. */
export const isSafeVideo = (path: string | undefined) =>
  path === undefined ||
  (/^\/[a-z0-9/_.-]+\.(mp4|webm)$/i.test(path) && !path.includes("..") && !path.startsWith("//"));

const valid = (ad: Advertisement, placement: Placement) =>
  ad.active &&
  placements(ad).includes(placement) &&
  isSafeTarget(ad.targetUrl) &&
  isSafeImage(ad.image) &&
  isSafeVideo(ad.video);

/**
 * The valid sponsorships for a placement in a random order chosen by `seed` (a per-page-load
 * number, see page-seed.ts). Seed 0 is the listed order: what prerendering and tests use.
 * Fisher–Yates with a small seeded generator (mulberry32), so every order is equally likely.
 */
function shuffled(ads: readonly Advertisement[], seed: number): Advertisement[] {
  const list = [...ads];
  if (seed === 0) return list;
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * The sponsorships for a placement with `count` slots: `count` of the booked ones, picked and
 * placed at random for each page view (so with more bookings than slots each sponsor appears in
 * a share of views, equally often in every position), then house ads for any empty slots.
 */
export function pickSponsorships(
  ads: readonly Advertisement[],
  placement: Placement,
  seed: number,
  count: number,
): Advertisement[] {
  const booked = shuffled(
    ads.filter((ad) => valid(ad, placement)),
    seed,
  ).slice(0, count);
  const house = HOUSE_ADS.slice(0, count - booked.length);
  return [...booked, ...house];
}

/**
 * The one sponsorship for a single-slot placement, picked at random per page view (`seed`, see
 * page-seed.ts; no user data involved); the house ad when nothing is booked.
 */
export function pickSponsorship(
  ads: readonly Advertisement[],
  placement: Placement,
  seed: number,
): Advertisement {
  return (
    shuffled(
      ads.filter((ad) => valid(ad, placement)),
      seed,
    )[0] ?? HOUSE_AD
  );
}
