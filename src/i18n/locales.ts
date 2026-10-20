/**
 * The languages Picstea speaks (ADR-0039). English keeps the unprefixed URLs (`/png-editor`); the
 * others live under their code (`/de/png-editor`, `/de` for the editor). The proxy rewrites
 * unprefixed paths to `/en/…` internally and redirects `/en/…` to the unprefixed URL, so English
 * has exactly one address. Plain module: used by the proxy, next.config, server and client code.
 */
export const LOCALES = ["en", "es", "pt-br", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function hasLocale(value: string | undefined | null): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? "");
}

/** BCP 47 tags for `<html lang>`, hreflang and `Intl`. */
export const LANGUAGE_TAG: Record<Locale, string> = {
  en: "en",
  es: "es",
  "pt-br": "pt-BR",
  de: "de",
};

/** Each language's name in that language, for the switcher. */
export const LANGUAGE_NAME: Record<Locale, string> = {
  en: "English",
  es: "Español",
  "pt-br": "Português (Brasil)",
  de: "Deutsch",
};

/** The URL prefix for a language: "" for English, "/de" for German. */
export const localePrefix = (locale: Locale) => (locale === DEFAULT_LOCALE ? "" : `/${locale}`);

/** A path in a language: localizedPath("/png-editor", "de") → "/de/png-editor"; "/" → "/de". */
export function localizedPath(path: string, locale: Locale): string {
  const prefix = localePrefix(locale);
  if (!prefix) return path;
  return path === "/" ? prefix : `${prefix}${path}`;
}

/**
 * Split a public URL path into its language and the path within it. `/de/png-editor` →
 * { locale: "de", path: "/png-editor" }; `/png-editor` → English. `/en/…` is reported as
 * `explicitDefault` so the proxy can redirect it to the unprefixed URL.
 */
export function splitLocale(pathname: string): {
  locale: Locale;
  path: string;
  explicitDefault: boolean;
} {
  const [, first = "", ...rest] = pathname.split("/");
  if (hasLocale(first)) {
    const path = `/${rest.join("/")}`;
    return { locale: first, path, explicitDefault: first === DEFAULT_LOCALE };
  }
  return { locale: DEFAULT_LOCALE, path: pathname, explicitDefault: false };
}

/** Where the user's explicit language choice is remembered (never set automatically). */
export const LANGUAGE_CHOICE_KEY = "picstea.lang";
