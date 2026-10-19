/** Canonical site settings shared by metadata, sitemap, robots and structured data. */

/** The production host (Vercel serves www; picstea.com redirects there). */
const FALLBACK_SITE_URL = "https://www.picstea.com";

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
  name: "Picstea",
  url: resolveSiteUrl(),
  /** The brand line, used in marketing copy and the welcome dialog — not in the editor chrome. */
  slogan: "Edit Boldly. Create Freely.",
  tagline: "Free Online Photo Editor",
  description:
    "Picstea is a free online photo editor with layers, masks and adjustment layers. " +
    "Edit and export images in your browser — they never leave your device.",
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString();
}
