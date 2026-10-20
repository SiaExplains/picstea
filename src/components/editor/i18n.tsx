"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import type { Msg } from "@/editor/core/message";
import { translate, translateIn, type Catalog, type Params } from "@/i18n/editor/catalog";
import type { Locale } from "@/i18n/locales";

interface I18n {
  readonly locale: Locale;
  readonly catalog: Catalog;
}

const I18nContext = createContext<I18n>({ locale: "en", catalog: {} });

/** The editor's language and its catalogue, from the server (empty for English). */
export function I18nProvider({ locale, catalog, children }: I18n & { children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, catalog }}>{children}</I18nContext.Provider>;
}

export type Translate = (key: string, params?: Params) => string;

/** `t("Gaussian Blur")` → the current language's text (the English key when there is none). */
export function useT(): Translate {
  const { locale, catalog } = useContext(I18nContext);
  return useCallback((key, params) => translate(catalog, locale, key, params), [catalog, locale]);
}

/** `tc("size category", "Screen")`: a word translated in its context (see translateIn). */
export function useTc(): (context: string, key: string) => string {
  const { locale, catalog } = useContext(I18nContext);
  return useCallback(
    (context, key) => translateIn(catalog, locale, context, key),
    [catalog, locale],
  );
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

/**
 * Text for an engine message: its template when it has values, else the English text itself
 * (notices, failed results, errors; ADR-0039).
 */
export function useMessage(): (text: string, template?: Msg) => string {
  const t = useT();
  return useCallback(
    (text, template) => (template ? t(template.text, template.params) : t(text)),
    [t],
  );
}
