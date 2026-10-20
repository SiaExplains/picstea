import { EditorLink } from "@/components/site/EditorLink";
import type { ReactNode } from "react";
import { faqPage, softwareApplication } from "@/lib/seo/jsonld";
import { ContentPage } from "./ContentPage";
import styles from "./site.module.css";

export interface Faq {
  readonly q: string;
  readonly a: string;
}

/** A task landing page: direct answer, how-to, honest capabilities and limits, and a visible FAQ. */
export function LandingPage({
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
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: title, path },
      ]}
      title={title}
      lead={lead}
      structuredData={[softwareApplication(path), faqPage(faqs)]}
    >
      <EditorLink href={cta?.href} className={styles.ctaLarge}>
        {cta?.label ?? "Open the editor — free, no sign-up"}
      </EditorLink>
      {children}
      <h2>Questions</h2>
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
