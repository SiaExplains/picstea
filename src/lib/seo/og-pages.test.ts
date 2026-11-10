import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { TRANSLATED_PATHS } from "@/i18n/translated-paths";
import { ogEntries, ogImagePath } from "./og-pages";
import { publicRoutes } from "./routes";

describe("social preview images", () => {
  const entries = ogEntries();
  const has = (locale: string, path: string) =>
    entries.some((e) => e.locale === locale && e.path === path);

  it("cover every public page except the editor home, author and legal pages", () => {
    const skipped = (path: string) =>
      path === "/" ||
      path.startsWith("/authors/") ||
      ["/privacy", "/cookies", "/terms", "/imprint", "/sponsorship"].includes(path);
    const missing = publicRoutes()
      .map((r) => r.path)
      .filter((path) => !skipped(path) && !has("en", path));
    expect(missing).toEqual([]);
  });

  it("exist in every language for translated pages", () => {
    const missing: string[] = [];
    for (const path of TRANSLATED_PATHS) {
      if (path === "/") continue;
      for (const locale of LOCALES) if (!has(locale, path)) missing.push(`${locale}${path}`);
    }
    expect(missing).toEqual([]);
  });

  it("have unique, safe image paths and non-empty titles", () => {
    const paths = entries.map((e) => ogImagePath(e.locale, e.path));
    expect(new Set(paths).size).toBe(paths.length);
    for (const e of entries) {
      expect(ogImagePath(e.locale, e.path)).toMatch(/^\/og\/[a-z-]+(\/[a-z0-9-]+)+\.png$/);
      expect(e.title.trim().length).toBeGreaterThan(0);
    }
  });
});
