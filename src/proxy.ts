import { NextResponse, type NextRequest } from "next/server";
import { CONVERTER_SLUGS, DOC_SLUGS, POST_SLUGS } from "./content/slugs";

/**
 * Real 404 status codes for docs pages and blog posts that don't exist (or are unpublished
 * drafts). Pages streamed with Cache Components always start with 200, so the check has to run
 * here, before rendering (Next docs: "Status codes"). Runs only on /docs/*, /blog/* and
 * /convert/*.
 */
const showDrafts = process.env.NODE_ENV !== "production";

export function proxy(request: NextRequest) {
  const [, section, slug, extra] = request.nextUrl.pathname.split("/");
  const known =
    !extra &&
    (section === "docs"
      ? DOC_SLUGS.includes(slug)
      : section === "convert"
        ? CONVERTER_SLUGS.includes(slug)
        : POST_SLUGS[slug] === "published" || (showDrafts && POST_SLUGS[slug] === "draft"));
  if (known) return NextResponse.next();
  // A path no route matches renders the global not-found page with a real 404 status.
  return NextResponse.rewrite(new URL("/__missing", request.url), { status: 404 });
}

export const config = {
  matcher: ["/docs/:slug+", "/blog/:slug+", "/convert/:slug+"],
};
