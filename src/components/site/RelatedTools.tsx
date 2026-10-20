import Link from "next/link";

/** The task landing pages, so each one links to the others (docs/10 "Marketing architecture"). */
export const TOOL_PAGES = [
  ["/online-photo-editor", "Online photo editor"],
  ["/psd-editor", "PSD editor"],
  ["/png-editor", "PNG editor"],
  ["/jpeg-editor", "JPEG editor"],
  ["/webp-editor", "WebP editor"],
  ["/image-resizer", "Image resizer"],
  ["/image-compressor", "Image compressor"],
  ["/photo-filters", "Photo filters"],
  ["/convert", "Image converter"],
] as const;

/** Step-by-step pages for one edit each. Topics with their own blog post are left to the blog. */
export const HOW_TO_PAGES = [
  ["/blur-background", "Blur a photo background"],
  ["/make-background-transparent", "Make a background transparent"],
  ["/add-text-to-photo", "Add text to a photo"],
  ["/black-and-white-photo", "Make a photo black and white"],
  ["/sharpen-image", "Sharpen an image"],
  ["/liquify", "Liquify a photo"],
] as const;

function LinkList({
  pages,
  current,
}: {
  pages: readonly (readonly [string, string])[];
  current: string;
}) {
  return (
    <ul>
      {pages
        .filter(([path]) => path !== current)
        .map(([path, label]) => (
          <li key={path}>
            <Link href={path}>{label}</Link>
          </li>
        ))}
    </ul>
  );
}

export function RelatedTools({ current }: { current: string }) {
  return (
    <>
      <h2>How-to guides</h2>
      <LinkList pages={HOW_TO_PAGES} current={current} />
      <h2>Related tools</h2>
      <LinkList pages={TOOL_PAGES} current={current} />
    </>
  );
}
