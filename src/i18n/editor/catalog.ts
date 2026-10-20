import { LANGUAGE_TAG, type Locale } from "../locales";

/**
 * The editor's translations (ADR-0039), gettext style: the English text in the code is the key,
 * and a catalogue maps it to another language. English needs no catalogue; a missing entry falls
 * back to English. `{name}` placeholders are filled after translating.
 */
export type Catalog = Readonly<Record<string, string>>;

export type Params = Readonly<Record<string, string | number>>;

/** "Gaussian Blur…" (a menu item that opens a dialog) uses the entry for "Gaussian Blur". */
function withEllipsis(catalog: Catalog, key: string): string | undefined {
  if (!key.endsWith("…")) return undefined;
  const base = catalog[key.slice(0, -1)];
  return base === undefined ? undefined : `${base}…`;
}

/** Placeholders whose values are themselves English UI names (filters, tools, history steps…). */
const TRANSLATED_PARAMS = new Set([
  "label",
  "tool",
  "action",
  "command",
  "format",
  "filter",
  "mode",
  "edge",
  "title",
]);

export function translate(catalog: Catalog, locale: Locale, key: string, params?: Params): string {
  const template = catalog[key] ?? withEllipsis(catalog, key) ?? key;
  if (!params) return template;
  const numbers = new Intl.NumberFormat(LANGUAGE_TAG[locale]);
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    if (typeof value === "number") return numbers.format(value);
    // Names of things the catalogue knows ("{label} was not applied…"); never user data such as
    // layer or file names, which use other placeholders.
    return TRANSLATED_PARAMS.has(name) ? (catalog[value] ?? value) : value;
  });
}

/**
 * Marks a label that is translated later, where it is shown (`t(BLEND_LABELS[mode])`): returns
 * the text unchanged so the key collector finds it (gettext's `N_`).
 */
export const N_ = <T extends string>(text: T): T => text;

/**
 * A word that means different things in different places ("Screen": a blend mode, a size
 * category) gets a context: the catalogue entry "size category|Screen" wins, the plain word is
 * the fallback (gettext's pgettext).
 */
export function translateIn(
  catalog: Catalog,
  locale: Locale,
  context: string,
  key: string,
): string {
  return catalog[`${context}|${key}`] ?? translate(catalog, locale, key);
}
