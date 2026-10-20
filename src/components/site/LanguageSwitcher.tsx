"use client";

import { usePathname } from "next/navigation";
import {
  LANGUAGE_CHOICE_KEY,
  LANGUAGE_NAME,
  LANGUAGE_TAG,
  LOCALES,
  localizedPath,
  splitLocale,
  type Locale,
} from "@/i18n/locales";
import { isTranslatedPath } from "@/i18n/translated-paths";
import styles from "./site.module.css";

function remember(locale: Locale) {
  try {
    window.localStorage.setItem(LANGUAGE_CHOICE_KEY, locale);
  } catch {
    // Storage blocked: the choice just isn't remembered.
  }
}

/**
 * Links to this page in the other languages. Shown only on translated pages; docs, blog and legal
 * pages are English only (ADR-0039). Full page loads, like every link between layouts.
 */
export function LanguageSwitcher({ label }: { label: string }) {
  const { locale, path } = splitLocale(usePathname());
  if (!isTranslatedPath(path)) return null;
  return (
    <nav aria-label={label} className={styles.languages}>
      {LOCALES.map((l) =>
        l === locale ? (
          <span key={l} aria-current="true" lang={LANGUAGE_TAG[l]}>
            {LANGUAGE_NAME[l]}
          </span>
        ) : (
          <a
            key={l}
            href={localizedPath(path, l)}
            hrefLang={LANGUAGE_TAG[l]}
            lang={LANGUAGE_TAG[l]}
            onClick={() => remember(l)}
          >
            {LANGUAGE_NAME[l]}
          </a>
        ),
      )}
    </nav>
  );
}
