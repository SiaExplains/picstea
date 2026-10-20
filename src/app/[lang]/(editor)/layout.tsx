import { PwaStart } from "@/components/pwa/PwaStart";
import { LANGUAGE_TAG } from "@/i18n/locales";
import { currentLocale, localeParams } from "@/i18n/server";
import { rootMetadata, rootViewport } from "@/lib/seo/root-metadata";
import "../../globals.css";

export const metadata = rootMetadata;
export const viewport = rootViewport;
export const generateStaticParams = localeParams;

/**
 * Root layout of the editor. The website has its own root layout, so navigating between them
 * is always a full page load: the editor gets its strict security policy and never shares a
 * JavaScript context with ad code from website pages (ADR-0013).
 */
export default async function EditorLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await currentLocale();
  return (
    <html lang={LANGUAGE_TAG[locale]}>
      <body>
        {children}
        <PwaStart />
      </body>
    </html>
  );
}
