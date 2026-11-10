import { EditorLink } from "@/components/site/EditorLink";
import type { ReactNode } from "react";
import { pageUpdated } from "@/content/pages/updated";
import { LANGUAGE_TAG, localizedPath } from "@/i18n/locales";
import { fill } from "@/i18n/site";
import { currentLocale, siteMessages } from "@/i18n/server";
import { faqPage, softwareApplication, webPage } from "@/lib/seo/jsonld";
import { ContentPage } from "./ContentPage";
import styles from "./site.module.css";

export interface Faq {
  readonly q: string;
  readonly a: string;
}

/**
 * A task landing page: direct answer, how-to, honest capabilities and limits, and a visible FAQ.
 * `path` is the English path; the page renders in the route's language (ADR-0039).
 */
export async function LandingPage({
  path,
  title,
  lead,
  faqs,
  cta,
  children,
}: {
  path: string;
  title: string;
  lead: string;
  faqs: readonly Faq[];
  /** A different call to action, e.g. "Convert now" → `/?convert=…`. */
  cta?: { href: `/?${string}`; label: string };
  children: ReactNode;
}) {
  const locale = await currentLocale();
  const t = await siteMessages();
  const url = localizedPath(path, locale);
  const updated = pageUpdated(path);
  return (
    <ContentPage
      crumbs={[
        { name: t.page.home, path: localizedPath("/", locale) },
        { name: title, path: url },
      ]}
      title={title}
      lead={lead}
      meta={
        updated &&
        fill(t.page.lastUpdated, {
          date: new Intl.DateTimeFormat(LANGUAGE_TAG[locale], {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(new Date(`${updated}T00:00:00Z`)),
        })
      }
      structuredData={[
        softwareApplication(url),
        faqPage(faqs),
        ...(updated ? [webPage(url, title, updated)] : []),
      ]}
    >
      <EditorLink href={cta?.href} className={styles.ctaLarge}>
        {cta?.label ?? t.page.openEditor}
      </EditorLink>
      {children}
      <h2>{t.page.questions}</h2>
      <dl>
        {faqs.map((f) => (
          <div key={f.q}>
            <dt>
              <strong>{f.q}</strong>
            </dt>
            <dd>{f.a}</dd>
          </div>
        ))}
      </dl>
    </ContentPage>
  );
}
