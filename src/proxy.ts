import { NextResponse, type NextRequest } from "next/server";
import { CONVERTER_SLUGS, DOC_SLUGS, POST_SLUGS } from "./content/slugs";
import { DEFAULT_LOCALE, splitLocale } from "./i18n/locales";
import { isTranslatedPath } from "./i18n/translated-paths";

/**
 * Two jobs, before any rendering:
 *
 * - Languages (ADR-0039). Every route lives under `app/[lang]`. English keeps the unprefixed URLs,
 *   which are rewritten to `/en/…` internally; `/en/…` itself redirects to the unprefixed URL so
 *   English has one address. Other languages pass through, but only for translated pages.
 * - Real 404 status codes for docs, blog posts and converters that don't exist (or are drafts).
 *   Pages streamed with Cache Components always start with 200, so the check has to run here
 *   (Next docs: "Status codes").
 */
const showDrafts = process.env.NODE_ENV !== "production";

function knownPage(path: string): boolean {
  const [, section, slug, extra] = path.split("/");
  if (section === "docs" && slug !== undefined) return !extra && DOC_SLUGS.includes(slug);
  if (section === "blog" && slug !== undefined) {
    return (
      !extra && (POST_SLUGS[slug] === "published" || (showDrafts && POST_SLUGS[slug] === "draft"))
    );
  }
  if (section === "convert" && slug !== undefined) return !extra && CONVERTER_SLUGS.includes(slug);
  // Anything else is decided by the router (unknown paths render the 404 page).
  return true;
}

/** A path no route matches: the global not-found page, with a real 404 status. */
const notFound = (request: NextRequest) =>
  NextResponse.rewrite(new URL(`/${DEFAULT_LOCALE}/__missing`, request.url), { status: 404 });

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { locale, path, explicitDefault } = splitLocale(pathname);

  if (explicitDefault) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url, 308);
  }
  if (!knownPage(path)) return notFound(request);
  if (locale !== DEFAULT_LOCALE) {
    // Only translated pages exist in other languages.
    return isTranslatedPath(path) ? NextResponse.next() : notFound(request);
  }
  const target = new URL(`/${DEFAULT_LOCALE}${path === "/" ? "" : path}${search}`, request.url);
  return NextResponse.rewrite(target);
}

export const config = {
  // Every page; not Next's own files or anything with a file extension (sitemap.xml, llms.txt,
  // sw.js, images, the HEIC decoder…), which live outside app/[lang].
  matcher: ["/((?!_next/|.*\\.).*)"],
};
