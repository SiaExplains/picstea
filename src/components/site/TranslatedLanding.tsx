import type { PageCopy, Translated } from "@/content/pages/types";
import { currentLocale, siteMessages } from "@/i18n/server";
import type { SiteMessages } from "@/i18n/site";
import { LandingPage } from "./LandingPage";
import { RelatedTools } from "./RelatedTools";

/** A translated landing page in the route's language (ADR-0039). `path` is the English path. */
export async function TranslatedLanding({
  path,
  copy,
  cta,
}: {
  path: string;
  copy: Translated<PageCopy>;
  /** A different call to action into the editor, labelled from the site phrases. */
  cta?: { href: `/?${string}`; label: (t: SiteMessages) => string };
}) {
  const page = copy[await currentLocale()];
  const t = await siteMessages();
  return (
    <LandingPage
      path={path}
      title={page.title}
      lead={page.lead}
      faqs={page.faqs}
      cta={cta && { href: cta.href, label: cta.label(t) }}
    >
      {page.body()}
      <RelatedTools current={path} />
    </LandingPage>
  );
}
