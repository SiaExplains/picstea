import { ogCard } from "@/lib/seo/og-card";
import { ogEntries, ogImagePath } from "@/lib/seo/og-pages";

/**
 * Social preview images, one per page (`/og/<locale>/<page>.png`), prerendered at build time.
 * Outside app/[lang], and the proxy skips paths with an extension, so the URL is served as is.
 */

const byPath = () => new Map(ogEntries().map((e) => [ogImagePath(e.locale, e.path), e]));

export function generateStaticParams() {
  return ogEntries().map((e) => ({ key: ogImagePath(e.locale, e.path).split("/").slice(2) }));
}

export async function GET(_request: Request, { params }: RouteContext<"/og/[...key]">) {
  const { key } = await params;
  const entry = byPath().get(`/og/${key.join("/")}`);
  if (!entry) return new Response("Not found", { status: 404 });
  const image = await ogCard(entry);
  image.headers.set("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
  return image;
}
