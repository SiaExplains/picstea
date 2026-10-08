import { publishedPosts } from "@/content/blog";
import { DOCS } from "@/content/docs";
import { LEGAL } from "@/content/legal";

/**
 * Every public, indexable page — the single source for the sitemap (docs/10 "Sitemap"). Draft
 * blog posts and unfinished legal pages are left out. Editor documents have no URLs at all.
 */
export interface PublicRoute {
  readonly path: string;
  readonly priority: number;
  readonly lastModified?: string;
}

export function publicRoutes(): PublicRoute[] {
  return [
    { path: "/", priority: 1 },
    { path: "/online-photo-editor", priority: 0.9 },
    { path: "/psd-editor", priority: 0.9 },
    { path: "/docs", priority: 0.7 },
    ...DOCS.map((d) => ({ path: `/docs/${d.slug}`, priority: 0.6, lastModified: d.updated })),
    { path: "/blog", priority: 0.6 },
    ...publishedPosts().map((p) => ({
      path: `/blog/${p.slug}`,
      priority: 0.6,
      lastModified: p.updated ?? p.published,
    })),
    ...Object.values(LEGAL)
      .filter((l) => l.finalized)
      .map((l) => ({ path: l.path, priority: 0.2 })),
  ];
}
