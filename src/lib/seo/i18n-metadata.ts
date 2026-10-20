import type { Metadata } from "next";
import { LANGUAGE_TAG, LOCALES, localizedPath, type Locale } from "@/i18n/locales";
import { currentLocale } from "@/i18n/server";
import { pageOpenGraph } from "./root-metadata";
import { absoluteUrl } from "./site";

/** Open Graph locale names (og:locale wants language_TERRITORY). */
const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  es: "es_ES",
  "pt-br": "pt_BR",
  de: "de_DE",
};

/** hreflang links for a translated page: every language plus x-default (English). */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES)
    languages[LANGUAGE_TAG[locale]] = absoluteUrl(localizedPath(path, locale));
  languages["x-default"] = absoluteUrl(path);
  return languages;
}

/**
 * Metadata for a translated page in the current route's language: title, description, the
 * canonical URL of this language and hreflang alternates for all of them.
 */
export async function translatedMetadata(
  path: string,
  copy: Readonly<Record<Locale, { title: string; description: string }>>,
): Promise<Metadata> {
  const locale = await currentLocale();
  const { title, description } = copy[locale];
  const url = localizedPath(path, locale);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: pageOpenGraph({ url, title, description, locale: OG_LOCALE[locale] }),
  };
}
