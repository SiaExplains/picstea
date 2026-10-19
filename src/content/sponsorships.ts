import type { Advertisement } from "@/lib/sponsorship/sponsorship";

/**
 * Booked sponsorships. Add an entry to show it; images and videos go in /public/sponsors. Empty
 * slots show the house ads ("Sponsor Picstea"). Every entry is validated before it is rendered.
 */
export const SPONSORSHIPS: readonly Advertisement[] = [
  {
    id: "focuscrew",
    sponsor: "FocusCrew",
    title: "FocusCrew — your productivity, all in one place",
    description: "Plan, focus and build habits. Start focusing at focus-crew.com.",
    video: "/sponsors/focuscrew.mp4",
    image: "/sponsors/focuscrew-poster.png",
    targetUrl: "https://focus-crew.com",
    placement: ["editor-side", "editor-start"],
    active: true,
  },
];
