"use client";

import { useEffect } from "react";
import { hasLocale, LANGUAGE_CHOICE_KEY, localizedPath, type Locale } from "@/i18n/locales";

/**
 * On the English editor home only: someone who explicitly chose another language before (the site
 * switcher or Help → Language) gets the editor in that language, query included (`?convert=…`).
 * Never decided from the browser's language, so crawlers and shared links stay predictable
 * (ADR-0039).
 */
export function LanguageRedirect({ locale }: { locale: Locale }) {
  useEffect(() => {
    if (locale !== "en" || window.location.pathname !== "/") return;
    let choice: string | null = null;
    try {
      choice = window.localStorage.getItem(LANGUAGE_CHOICE_KEY);
    } catch {
      return;
    }
    if (!hasLocale(choice) || choice === "en") return;
    window.location.replace(localizedPath("/", choice) + window.location.search);
  }, [locale]);
  return null;
}
