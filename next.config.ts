import type { NextConfig } from "next";

import { ADSENSE_CLIENT, ADSENSE_CSP } from "./src/lib/ads/adsense";

/*
 * Content-Security-Policy (ADR-0006, ADR-0013).
 *
 * The editor (and every route by default) gets the strict policy: `connect-src 'self'` means the
 * browser itself stops any attempt to send document data elsewhere. Website pages (docs, blog,
 * guides, legal) additionally allow Google's ad origins — only when an AdSense publisher ID is
 * configured, and the ad code itself only loads after consent (src/lib/consent).
 */
const dev = process.env.NODE_ENV === "development";

function policy(
  extra: {
    script?: readonly string[];
    connect?: readonly string[];
    frame?: readonly string[];
    img?: readonly string[];
  } = {},
) {
  const list = (base: string, more: readonly string[] = []) => [base, ...more].join(" ");
  return [
    "default-src 'self'",
    list("connect-src 'self'", extra.connect),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    list("img-src 'self' blob: data:", extra.img),
    "worker-src 'self' blob:",
    list("script-src 'self' 'unsafe-inline'" + (dev ? " 'unsafe-eval'" : ""), extra.script),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    ...(extra.frame ? [list("frame-src", extra.frame)] : []),
  ].join("; ");
}

const editorPolicy = policy();
const sitePolicy = ADSENSE_CLIENT ? policy(ADSENSE_CSP) : editorPolicy;

/** Website routes (src/app/(site)); everything else, including the editor at /, stays strict. */
const SITE_ROUTES = [
  "/docs",
  "/blog",
  "/online-photo-editor",
  "/psd-editor",
  "/photoshop-alternative",
  "/photopea-alternative",
  "/faq",
  "/privacy",
  "/cookies",
  "/terms",
  "/imprint",
  "/sponsorship",
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The editor and the website have separate root layouts (ADR-0013), so the 404 for unmatched
  // URLs is defined once in app/global-not-found.tsx.
  experimental: { globalNotFound: true },
  partialPrefetching: true,
  poweredByHeader: false,
  // The editor moved from /editor to the home page (v0.3.0); keep old links and bookmarks working.
  async redirects() {
    return [{ source: "/editor", destination: "/", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: editorPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // HTTPS only from now on. Not in development (an HTTPS dev server would pin every
          // localhost port). No preload or includeSubDomains: those are the operator's decision.
          ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000" }]),
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      // The service worker (ADR-0029): always revalidated so updates reach users, strict policy.
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      // Later rules override the same header: website pages get the site policy.
      ...SITE_ROUTES.flatMap((route) => [route, `${route}/:path*`]).map((source) => ({
        source,
        headers: [{ key: "Content-Security-Policy", value: sitePolicy }],
      })),
    ];
  },
};

export default nextConfig;
