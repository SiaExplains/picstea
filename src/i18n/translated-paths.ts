/**
 * Website paths that exist in every language (ADR-0039): the editor home, the pages in
 * src/content/pages and the converter pages. Everything else — docs, blog, legal, sponsorship — is
 * English only: `/de/docs/…` is a 404 and translated pages link to the English page instead. Plain
 * list so the proxy stays tiny; a unit test keeps it in sync with the content.
 */
export const TRANSLATED_PATHS: readonly string[] = [
  "/",
  "/about",
  "/add-text-to-photo",
  "/black-and-white-photo",
  "/blur-background",
  "/canva-alternative",
  "/convert",
  "/faq",
  "/gimp-alternative",
  "/image-compressor",
  "/image-resizer",
  "/jpeg-editor",
  "/liquify",
  "/make-background-transparent",
  "/online-photo-editor",
  "/photo-filters",
  "/photopea-alternative",
  "/photoshop-alternative",
  "/photoshop-express-alternative",
  "/pixlr-alternative",
  "/png-editor",
  "/psd-editor",
  "/sharpen-image",
  "/webp-editor",
  "/convert/webp-to-png",
  "/convert/webp-to-jpg",
  "/convert/png-to-jpg",
  "/convert/jpg-to-png",
  "/convert/png-to-webp",
  "/convert/svg-to-png",
  "/convert/psd-to-png",
  "/convert/heic-to-jpg",
];

export const isTranslatedPath = (path: string) => TRANSLATED_PATHS.includes(path);
