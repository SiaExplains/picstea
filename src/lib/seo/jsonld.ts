import { absoluteUrl, SITE } from "./site";

/**
 * Structured data builders (docs/10 "Structured data"). Only types that describe what is really
 * on the page; no ratings or reviews are ever generated.
 */

export interface Crumb {
  readonly name: string;
  readonly path: string;
}

export function breadcrumbList(crumbs: readonly Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function article(post: {
  title: string;
  description: string;
  path: string;
  published: string;
  updated?: string;
}) {
  return {
    "@type": "Article",
    headline: post.title,
    description: post.description,
    url: absoluteUrl(post.path),
    mainEntityOfPage: absoluteUrl(post.path),
    datePublished: post.published,
    dateModified: post.updated ?? post.published,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: { "@id": `${SITE.url}/#organization` },
  };
}

export function faqPage(items: readonly { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function softwareApplication(path: string) {
  return {
    "@type": "SoftwareApplication",
    name: SITE.name,
    url: absoluteUrl(path),
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (web browser)",
    description: SITE.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@id": `${SITE.url}/#organization` },
  };
}

/** A JSON-LD document with several nodes. */
export const graph = (...nodes: object[]) => ({
  "@context": "https://schema.org",
  "@graph": nodes,
});
