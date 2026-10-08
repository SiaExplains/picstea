/** Canonical site settings shared by metadata, sitemap, robots and structured data. */

const FALLBACK_SITE_URL = "https://mylper.com";

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK_SITE_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return FALLBACK_SITE_URL;
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE = {
  name: "MYLPER",
  url: resolveSiteUrl(),
  tagline: "Free online image editor that keeps your images on your device",
  description:
    "MYLPER is a free, browser-based image editor with layers, blend modes and undo history. " +
    "It runs entirely in your browser: your images are never uploaded.",
} as const;

/** Public, indexable routes. The editor is intentionally excluded (it is noindex). */
export const PUBLIC_ROUTES = ["/"] as const;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString();
}
