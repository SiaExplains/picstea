import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, LOCALES, type Locale } from "./locales";

/**
 * The language of the current route (`app/[lang]`), for any server component without passing it
 * down. The proxy only lets known languages through; this guard covers everything else (for
 * example a path with a dot, which the proxy skips).
 */
export async function currentLocale(): Promise<Locale> {
  const value = await lang();
  if (!hasLocale(value)) notFound();
  return value;
}

/** Prerender every language (required for root params with Cache Components). */
export function localeParams() {
  return LOCALES.map((locale) => ({ lang: locale }));
}

/** The website phrases in the current route's language. */
export async function siteMessages() {
  const { SITE_MESSAGES } = await import("./site");
  return SITE_MESSAGES[await currentLocale()];
}
