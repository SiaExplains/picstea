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

/** Honest comparisons with other editors; each lists the others. */
export const COMPARE_PAGES = [
  ["/photoshop-alternative", "Picstea vs Photoshop"],
  ["/photopea-alternative", "Picstea vs Photopea"],
  ["/gimp-alternative", "Picstea vs GIMP"],
  ["/pixlr-alternative", "Picstea vs Pixlr"],
  ["/canva-alternative", "Picstea vs Canva"],
  ["/photoshop-express-alternative", "Picstea vs Photoshop Express"],
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
  const comparing = COMPARE_PAGES.some(([path]) => path === current);
  return (
    <>
      {comparing && (
        <>
          <h2>Other comparisons</h2>
          <LinkList pages={COMPARE_PAGES} current={current} />
        </>
      )}
      <h2>How-to guides</h2>
      <LinkList pages={HOW_TO_PAGES} current={current} />
      <h2>Related tools</h2>
      <LinkList pages={TOOL_PAGES} current={current} />
    </>
  );
}
