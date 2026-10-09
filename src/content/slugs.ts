/**
 * Which docs and blog URLs exist, without their content, so the request proxy stays tiny.
 * A unit test keeps this in sync with `docs.tsx` and `blog.tsx`.
 */
export const DOC_SLUGS: readonly string[] = [
  "getting-started",
  "layers-groups-and-masks",
  "selections",
  "painting-and-fills",
  "guides-grid-and-snapping",
  "filters",
  "paths-and-the-pen-tool",
  "smart-objects-and-smart-filters",
  "file-formats",
  "keyboard-shortcuts",
  "privacy-and-storage",
];

/** Blog posts and whether they are published (drafts are 404 in production). */
export const POST_SLUGS: Readonly<Record<string, "draft" | "published">> = {
  "edit-psd-online-without-uploading": "draft",
  "png-vs-jpeg-vs-webp": "draft",
  "layers-and-masks-explained": "draft",
  "levels-and-curves-explained": "draft",
  "how-to-use-the-pen-tool": "draft",
  "smart-objects-explained": "draft",
  "open-psd-files-with-editable-text-and-adjustments": "draft",
};
