import Image from "next/image";
import Link from "next/link";
import { COMPARE_PAGES, HOW_TO_PAGES, PageLinks, TOOL_PAGES } from "@/components/site/RelatedTools";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { LocalLink } from "@/components/site/LocalLink";
import { fill } from "@/i18n/site";
import { EditorLink } from "@/components/site/EditorLink";
import { ConsentManager } from "@/components/site/ConsentManager";
import { PwaStart } from "@/components/pwa/PwaStart";
import { PrivacySettingsButton } from "@/components/site/PrivacySettingsButton";
import styles from "@/components/site/site.module.css";
import { rootMetadata, rootViewport } from "@/lib/seo/root-metadata";
import { SITE } from "@/lib/seo/site";
import { LANGUAGE_TAG } from "@/i18n/locales";
import { currentLocale, localeParams, siteMessages } from "@/i18n/server";
import "../../globals.css";

export const metadata = rootMetadata;
export const viewport = rootViewport;
export const generateStaticParams = localeParams;

/**
 * Root layout of the public website. A separate root layout from the editor's, so links to the
 * editor are full page loads: the editor starts with its own strict security policy and without
 * any ad code from website pages (ADR-0013).
 * (docs, blog, guides, legal). Static server components; the only
 * client code is the consent manager and ad slots. The editor bundle is never loaded here.
 */
export default async function SiteLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await currentLocale();
  const t = await siteMessages();
  return (
    <html lang={LANGUAGE_TAG[locale]}>
      <body>
        <div className={styles.site}>
          <header className={styles.header}>
            <EditorLink
              className={styles.brand}
              aria-label={fill(t.header.editorAria, { name: SITE.name })}
            >
              {/* White wordmark on the brand teal: one image reads on light and dark pages. */}
              <Image
                src="/brand/picstea-logo.png"
                alt={SITE.name}
                width={83}
                height={28}
                className={styles.logo}
                priority
                unoptimized
              />
            </EditorLink>
            <nav aria-label="Main" className={styles.nav}>
              <Link href="/docs">{t.header.docs}</Link>
              <Link href="/blog">{t.header.blog}</Link>
              <EditorLink className={styles.cta}>{t.header.openEditor}</EditorLink>
            </nav>
            <LanguageSwitcher label={t.header.language} />
          </header>
          <div className={styles.body}>{children}</div>
          <footer className={styles.footer}>
            <nav aria-label={t.footer.tools} className={styles.footerNav}>
              <PageLinks pages={TOOL_PAGES} locale={locale} t={t} />
            </nav>
            <nav aria-label={t.footer.howTo} className={styles.footerNav}>
              <PageLinks pages={HOW_TO_PAGES} locale={locale} t={t} />
            </nav>
            <nav aria-label={t.footer.comparisons} className={styles.footerNav}>
              <PageLinks pages={COMPARE_PAGES} locale={locale} t={t} />
            </nav>
            <nav aria-label={t.footer.more} className={styles.footerNav}>
              <LocalLink href="/faq">{t.footer.faq}</LocalLink>
              <LocalLink href="/about">{t.footer.about}</LocalLink>
              <Link href="/docs">{t.footer.documentation}</Link>
              <Link href="/blog">{t.footer.blog}</Link>
              <Link href="/privacy">{t.footer.privacy}</Link>
              <Link href="/cookies">{t.footer.cookies}</Link>
              <Link href="/terms">{t.footer.terms}</Link>
              <Link href="/imprint">{t.footer.imprint}</Link>
              <Link href="/sponsorship">{t.footer.sponsorship}</Link>
              <PrivacySettingsButton />
            </nav>
            <p>
              © {SITE.name} — {SITE.slogan} {t.footer.tagline}
            </p>
          </footer>
          <ConsentManager />
          <PwaStart />
        </div>
      </body>
    </html>
  );
}
