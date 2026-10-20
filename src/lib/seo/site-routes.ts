/**
 * Website route prefixes (src/app/(site)). They get the site Content-Security-Policy, which also
 * allows Google's ad origins when AdSense is configured; every other path — above all the editor
 * at `/` — keeps the strict policy (ADR-0013). Imported by next.config.ts; a unit test checks that
 * every public page except `/` is covered, so a new page can't silently lose its ads.
 */
export const SITE_ROUTES: readonly string[] = [
  "/about",
  "/docs",
  "/blog",
  "/online-photo-editor",
  "/psd-editor",
  "/png-editor",
  "/jpeg-editor",
  "/webp-editor",
  "/image-resizer",
  "/image-compressor",
  "/photo-filters",
  "/convert",
  "/photoshop-alternative",
  "/photopea-alternative",
  "/faq",
  "/privacy",
  "/cookies",
  "/terms",
  "/imprint",
  "/sponsorship",
];

export function isSiteRoute(path: string): boolean {
  return SITE_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}
