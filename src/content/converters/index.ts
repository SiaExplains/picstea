import type { Locale } from "@/i18n/locales";
import type { Translated } from "../pages/types";
import de from "./de";
import en from "./en";
import es from "./es";
import ptBr from "./pt-br";
import type { ConverterPage } from "./types";

export type { ConverterPage };

export const CONVERTERS: Translated<readonly ConverterPage[]> = { en, es, "pt-br": ptBr, de };

/** The conversion ids, in page order (the same in every language; unit test). */
export const CONVERTER_IDS = en.map((c) => c.id);

export const converterFor = (locale: Locale, id: string) =>
  CONVERTERS[locale].find((c) => c.id === id);
