/**
 * Which docs and blog URLs exist, without their content, so the request proxy stays tiny.
 * A unit test keeps this in sync with `docs.tsx` and `blog.tsx`.
 */
export const DOC_SLUGS: readonly string[] = [
  "getting-started",
  "layers-groups-and-masks",
  "selections",
  "painting-and-fills",
  "retouching",
  "guides-grid-and-snapping",
  "filters",
  "paths-and-the-pen-tool",
  "smart-objects-and-smart-filters",
  "actions-batch-colours-and-history",
  "file-formats",
  "keyboard-shortcuts",
  "privacy-and-storage",
];

/** Converter pages (`/convert/<id>`); a unit test keeps this in sync with `converters.tsx`. */
export const CONVERTER_SLUGS: readonly string[] = [
  "webp-to-png",
  "webp-to-jpg",
  "png-to-jpg",
  "jpg-to-png",
  "png-to-webp",
  "svg-to-png",
  "psd-to-png",
  "heic-to-jpg",
];

/** Blog posts and whether they are published (drafts are 404 in production). */
export const POST_SLUGS: Readonly<Record<string, "draft" | "published">> = {
  "edit-psd-online-without-uploading": "published",
  "png-vs-jpeg-vs-webp": "published",
  "layers-and-masks-explained": "published",
  "levels-and-curves-explained": "published",
  "how-to-use-the-pen-tool": "published",
  "smart-objects-explained": "published",
  "open-psd-files-with-editable-text-and-adjustments": "published",
  "record-actions-and-batch-process-images": "published",
  "remove-blemishes-and-retouch-photos-in-your-browser": "published",
  "select-align-and-distribute-several-layers": "published",
  "vibrance-color-balance-gradient-map-and-more": "published",
  "layer-styles-blend-if-and-the-image-menu": "published",
};

/** Author pages (`/authors/<slug>`); a unit test keeps this in sync with `authors.ts`. */
export const AUTHOR_SLUGS: readonly string[] = ["siavash-ghanbari"];
