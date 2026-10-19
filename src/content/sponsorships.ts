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
    description: "Too many tabs? Timer, to-dos and habits in one place, at focus-crew.com.",
    video: "/sponsors/focuscrew-tabs.mp4",
    image: "/sponsors/focuscrew-tabs-poster.png",
    targetUrl: "https://focus-crew.com",
    placement: ["editor-side", "editor-start"],
    active: true,
  },
  {
    id: "wikidigit",
    sponsor: "WikiDigit",
    title: "WikiDigit — tech news for the curious",
    description: "Explore the stories at wikidigit.com.",
    video: "/sponsors/wikidigit.mp4",
    image: "/sponsors/wikidigit-poster.png",
    targetUrl: "https://wikidigit.com",
    placement: ["editor-side", "editor-start"],
    active: true,
  },
];
