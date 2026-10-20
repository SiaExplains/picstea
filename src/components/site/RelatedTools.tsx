import Link from "next/link";
import { localizedPath, type Locale } from "@/i18n/locales";
import { currentLocale, siteMessages } from "@/i18n/server";
import type { SiteMessages } from "@/i18n/site";

/** The task landing pages, so each one links to the others (docs/10 "Marketing architecture"). */
export const TOOL_PAGES = [
  "/online-photo-editor",
  "/psd-editor",
  "/png-editor",
  "/jpeg-editor",
  "/webp-editor",
  "/image-resizer",
  "/image-compressor",
  "/photo-filters",
  "/convert",
] as const;

/** Step-by-step pages for one edit each. Topics with their own blog post are left to the blog. */
export const HOW_TO_PAGES = [
  "/blur-background",
  "/make-background-transparent",
  "/add-text-to-photo",
  "/black-and-white-photo",
  "/sharpen-image",
  "/liquify",
] as const;

/** Honest comparisons with other editors; each lists the others. */
export const COMPARE_PAGES = [
  "/photoshop-alternative",
  "/photopea-alternative",
  "/gimp-alternative",
  "/pixlr-alternative",
  "/canva-alternative",
  "/photoshop-express-alternative",
] as const;

type LinkedPath = keyof SiteMessages["links"];

/** Links to some of these pages in the route's language, labelled from the site phrases. */
export function PageLinks({
  pages,
  current,
  locale,
  t,
}: {
  pages: readonly LinkedPath[];
  current?: string;
  locale: Locale;
  t: SiteMessages;
}) {
  return (
    <ul>
      {pages
        .filter((path) => path !== current)
        .map((path) => (
          <li key={path}>
            <Link href={localizedPath(path, locale)}>{t.links[path]}</Link>
          </li>
        ))}
    </ul>
  );
}

export async function RelatedTools({ current }: { current: string }) {
  const locale = await currentLocale();
  const t = await siteMessages();
  const comparing = (COMPARE_PAGES as readonly string[]).includes(current);
  return (
    <>
      {comparing && (
        <>
          <h2>{t.page.otherComparisons}</h2>
          <PageLinks pages={COMPARE_PAGES} current={current} locale={locale} t={t} />
        </>
      )}
      <h2>{t.page.howTo}</h2>
      <PageLinks pages={HOW_TO_PAGES} current={current} locale={locale} t={t} />
      <h2>{t.page.relatedTools}</h2>
      <PageLinks pages={TOOL_PAGES} current={current} locale={locale} t={t} />
    </>
  );
}
