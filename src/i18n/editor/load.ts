import type { Locale } from "../locales";
import type { Catalog } from "./catalog";

/** The editor catalogue for a language; only that one is sent to the browser (ADR-0039). */
export async function loadEditorCatalog(locale: Locale): Promise<Catalog> {
  switch (locale) {
    case "en":
      return {};
    case "es":
      return (await import("./es")).es;
    case "pt-br":
      return (await import("./pt-br")).ptBr;
    case "de":
      return (await import("./de")).de;
  }
}
