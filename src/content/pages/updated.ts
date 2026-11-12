/**
 * When each landing page's content last changed (ISO dates), shown as "Last updated" and used as
 * `dateModified` (docs/10 "AEO"). Update the date when you change a page's copy in any language —
 * part of the release checklist (docs/16_DEFINITION_OF_DONE.md). Keys are English paths;
 * converter pages share one date.
 */
export const PAGE_UPDATED: Readonly<Record<string, string>> = {
  "/about": "2026-11-10",
  "/add-text-to-photo": "2026-11-10",
  "/black-and-white-photo": "2026-10-20",
  "/blur-background": "2026-10-20",
  "/canva-alternative": "2026-10-20",
  "/convert": "2026-10-20",
  "/faq": "2026-11-12",
  "/gimp-alternative": "2026-10-20",
  "/image-compressor": "2026-10-20",
  "/image-resizer": "2026-10-20",
  "/jpeg-editor": "2026-10-20",
  "/liquify": "2026-10-20",
  "/make-background-transparent": "2026-10-20",
  "/online-photo-editor": "2026-10-20",
  "/photo-filters": "2026-10-20",
  "/photopea-alternative": "2026-11-10",
  "/photoshop-alternative": "2026-10-20",
  "/photoshop-express-alternative": "2026-10-20",
  "/pixlr-alternative": "2026-10-20",
  "/png-editor": "2026-10-20",
  "/psd-editor": "2026-11-10",
  "/sharpen-image": "2026-10-20",
  "/webp-editor": "2026-10-20",
};

/**
 * When the editor at `/` last changed: the date of the latest release with user-visible editor
 * changes. Sent as the home page's sitemap lastmod, which IndexNow pings read (ADR-0042).
 */
export const SITE_UPDATED = "2026-11-12";

/** Date shared by every /convert/<pair> page (src/content/converters). */
export const CONVERTERS_UPDATED = "2026-10-20";

export const pageUpdated = (path: string): string | undefined =>
  PAGE_UPDATED[path] ?? (path.startsWith("/convert/") ? CONVERTERS_UPDATED : undefined);
