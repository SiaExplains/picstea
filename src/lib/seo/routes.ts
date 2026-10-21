import { AUTHORS, authorPath } from "@/content/authors";
import { publishedPosts } from "@/content/blog";
import { CONVERTER_IDS } from "@/content/converters";
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
    { path: "/png-editor", priority: 0.8 },
    { path: "/jpeg-editor", priority: 0.8 },
    { path: "/webp-editor", priority: 0.8 },
    { path: "/image-resizer", priority: 0.8 },
    { path: "/image-compressor", priority: 0.8 },
    { path: "/photo-filters", priority: 0.8 },
    { path: "/convert", priority: 0.8 },
    { path: "/blur-background", priority: 0.7 },
    { path: "/make-background-transparent", priority: 0.7 },
    { path: "/add-text-to-photo", priority: 0.7 },
    { path: "/black-and-white-photo", priority: 0.7 },
    { path: "/sharpen-image", priority: 0.7 },
    { path: "/liquify", priority: 0.7 },
    ...CONVERTER_IDS.map((id) => ({ path: `/convert/${id}`, priority: 0.8 })),
    { path: "/photoshop-alternative", priority: 0.8 },
    { path: "/photopea-alternative", priority: 0.8 },
    { path: "/gimp-alternative", priority: 0.7 },
    { path: "/pixlr-alternative", priority: 0.7 },
    { path: "/canva-alternative", priority: 0.7 },
    { path: "/photoshop-express-alternative", priority: 0.7 },
    { path: "/faq", priority: 0.7 },
    { path: "/about", priority: 0.5 },
    { path: "/docs", priority: 0.7 },
    ...DOCS.map((d) => ({ path: `/docs/${d.slug}`, priority: 0.6, lastModified: d.updated })),
    { path: "/blog", priority: 0.6 },
    ...publishedPosts().map((p) => ({
      path: `/blog/${p.slug}`,
      priority: 0.6,
      lastModified: p.updated ?? p.published,
    })),
    ...AUTHORS.map((a) => ({ path: authorPath(a), priority: 0.4 })),
    ...Object.values(LEGAL)
      .filter((l) => l.finalized)
      .map((l) => ({ path: l.path, priority: 0.2 })),
  ];
}
