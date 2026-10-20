import type { Locale } from "../locales";
import { de } from "./de";
import { en, type SiteMessages } from "./en";
import { es } from "./es";
import { ptBr } from "./pt-br";

export type { SiteMessages };

export const SITE_MESSAGES: Record<Locale, SiteMessages> = { en, es, "pt-br": ptBr, de };

/** Fill `{name}` placeholders. Unknown names are left as they are, so a gap is visible. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
