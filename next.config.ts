import type { NextConfig } from "next";

/*
 * Baseline security headers. `connect-src 'self'` is deliberate: the editor must never send
 * document data anywhere, and the browser enforces that for fetch/XHR/WebSocket/beacon.
 * Script/style directives are deferred until the ad/consent vendors are chosen (Gate 8) —
 * see docs/adr/ADR-0006-security-headers.md.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "script-src 'self' 'unsafe-inline'" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
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
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
