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
] as const;

export function RelatedTools({ current }: { current: string }) {
  return (
    <>
      <h2>Related</h2>
      <ul>
        {TOOL_PAGES.filter(([path]) => path !== current).map(([path, label]) => (
          <li key={path}>
            <Link href={path}>{label}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
