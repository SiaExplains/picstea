import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { EditorRoot } from "@/components/editor/EditorRoot";
import { I18nProvider } from "@/components/editor/i18n";
import { LanguageRedirect } from "@/components/editor/LanguageRedirect";
import { loadEditorCatalog } from "@/i18n/editor/load";
import { JsonLd } from "@/components/marketing/JsonLd";
import { WelcomeAbout } from "@/components/welcome/WelcomeAbout";
import { WelcomeDialog } from "@/components/welcome/WelcomeDialog";
import { SITE } from "@/lib/seo/site";
import { home } from "@/content/pages/home";
import { LANGUAGE_TAG, localizedPath } from "@/i18n/locales";
import { currentLocale } from "@/i18n/server";
import { isTranslatedPath } from "@/i18n/translated-paths";
import { languageAlternates } from "@/lib/seo/i18n-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const { tagline, description } = home[locale];
  const title = `${SITE.name} — ${tagline}`;
  const url = localizedPath("/", locale);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: languageAlternates("/") },
    openGraph: pageOpenGraph({ url, title, description }),
  };
}

/** The home page is the editor itself; a welcome dialog explains it on the first visit. */
export default async function HomePage() {
  const locale = await currentLocale();
  const copy = home[locale];
  const links = copy.welcome.links.map(
    ([path, label]) =>
      [isTranslatedPath(path) ? localizedPath(path, locale) : path, label] as const,
  );
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${SITE.url}/#website`,
              name: SITE.name,
              url: SITE.url,
            },
            {
              "@type": "Organization",
              "@id": `${SITE.url}/#organization`,
              name: SITE.name,
              url: SITE.url,
              logo: `${SITE.url}/android-chrome-512x512.png`,
            },
            {
              "@type": "SoftwareApplication",
              name: SITE.name,
              url: SITE.url,
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Any (web browser)",
              description: copy.description,
              inLanguage: LANGUAGE_TAG[locale],
              offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
              publisher: { "@id": `${SITE.url}/#organization` },
            },
          ],
        }}
      />
      <LanguageRedirect locale={locale} />
      <I18nProvider locale={locale} catalog={await loadEditorCatalog(locale)}>
        <EditorRoot />
        <WelcomeDialog text={copy.welcome} links={links}>
          <WelcomeAbout />
        </WelcomeDialog>
      </I18nProvider>
    </>
  );
}
