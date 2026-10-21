import type { Advertisement } from "@/lib/sponsorship/sponsorship";

/**
 * Booked sponsorships. Add an entry to show it; images and videos go in /public/sponsors. Every
 * page view shows a random choice of them in random positions (pickSponsorships); empty slots
 * show the house ads ("Sponsor Picstea"). Every entry is validated before it is rendered.
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
    id: "emojar",
    sponsor: "Emojar",
    title: "Emojar — 288 free online tools",
    description: "Small task, easy win: free tools with no sign-up at emojar.com.",
    video: "/sponsors/emojar.mp4",
    image: "/sponsors/emojar-poster.png",
    targetUrl: "https://emojar.com",
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
  {
    id: "goallai",
    sponsor: "GoAll.ai",
    title: "GoAll.ai — go all-in on AI",
    description: "AI and automation for early-stage startups, at goall.ai.",
    video: "/sponsors/goallai.mp4",
    image: "/sponsors/goallai-poster.png",
    targetUrl: "https://goall.ai",
    placement: ["editor-side", "editor-start"],
    active: true,
  },
];
