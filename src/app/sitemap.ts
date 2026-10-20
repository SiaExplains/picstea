import type { MetadataRoute } from "next";
import { LOCALES, localizedPath } from "@/i18n/locales";
import { isTranslatedPath } from "@/i18n/translated-paths";
import { languageAlternates } from "@/lib/seo/i18n-metadata";
import { publicRoutes } from "@/lib/seo/routes";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Every public page; translated pages once per language, each listing the others as alternates
 * (hreflang, ADR-0039). English-only pages (docs, blog, legal) appear once.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes().flatMap((route) => {
    const common = {
      priority: route.priority,
      ...(route.lastModified ? { lastModified: route.lastModified } : {}),
    };
    if (!isTranslatedPath(route.path)) return [{ url: absoluteUrl(route.path), ...common }];
    const alternates = { languages: languageAlternates(route.path) };
    return LOCALES.map((locale) => ({
      url: absoluteUrl(localizedPath(route.path, locale)),
      alternates,
      ...common,
    }));
  });
}
