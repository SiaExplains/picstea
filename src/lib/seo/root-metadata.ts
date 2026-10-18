import type { Metadata, Viewport } from "next";
import { ADSENSE_CLIENT } from "../ads/adsense";
import { SITE } from "./site";

/** The social preview image (public/og-image.png, 1200 × 630) for every page. */
export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: `${SITE.name} — ${SITE.tagline}. ${SITE.slogan}`,
} as const;

const BASE_OPEN_GRAPH = { siteName: SITE.name, locale: "en_US", images: [OG_IMAGE] };

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/**
 * A page's Open Graph data with the site-wide parts (name, locale, image). Next replaces the
 * parent's `openGraph` entirely when a page sets its own, so every page goes through this.
 */
export function pageOpenGraph(og: OpenGraph): OpenGraph {
  return { type: "website", ...BASE_OPEN_GRAPH, ...og } as OpenGraph;
}

/**
 * Metadata shared by both root layouts (editor and website). They are separate root layouts so
 * that moving between them is always a full page load (ADR-0013).
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: pageOpenGraph({}),
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  // AdSense site verification without loading any ad code (the editor home page stays ad-free).
  ...(ADSENSE_CLIENT ? { other: { "google-adsense-account": ADSENSE_CLIENT } } : {}),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const rootViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141518" },
  ],
};
