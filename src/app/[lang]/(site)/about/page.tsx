import { ContentPage } from "@/components/site/ContentPage";
import { EditorLink } from "@/components/site/EditorLink";
import styles from "@/components/site/site.module.css";
import { copy } from "@/content/pages/about";
import { localizedPath } from "@/i18n/locales";
import { currentLocale, siteMessages } from "@/i18n/server";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";
import { softwareApplication } from "@/lib/seo/jsonld";

const PATH = "/about";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default async function AboutPage() {
  const locale = await currentLocale();
  const t = await siteMessages();
  const page = copy[locale];
  const url = localizedPath(PATH, locale);
  return (
    <ContentPage
      crumbs={[
        { name: t.page.home, path: localizedPath("/", locale) },
        { name: page.title, path: url },
      ]}
      title={page.title}
      lead={page.lead}
      structuredData={[softwareApplication(url)]}
      ad={null}
    >
      <EditorLink className={styles.ctaLarge}>{t.page.openEditor}</EditorLink>
      {page.body()}
    </ContentPage>
  );
}
