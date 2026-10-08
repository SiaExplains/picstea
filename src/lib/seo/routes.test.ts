import { describe, expect, it } from "vitest";
import { POSTS } from "@/content/blog";
import { LEGAL } from "@/content/legal";
import { publicRoutes } from "./routes";
import { article, breadcrumbList, faqPage } from "./jsonld";

describe("public routes", () => {
  it("lists the editor, guides and docs, and never drafts or unfinished legal pages", () => {
    const paths = publicRoutes().map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/psd-editor");
    expect(paths).toContain("/docs/keyboard-shortcuts");
    for (const post of POSTS.filter((p) => p.draft))
      expect(paths).not.toContain(`/blog/${post.slug}`);
    for (const page of Object.values(LEGAL).filter((l) => !l.finalized)) {
      expect(paths).not.toContain(page.path);
    }
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("structured data", () => {
  it("builds breadcrumbs, articles and FAQs with absolute URLs", () => {
    const crumbs = breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Docs", path: "/docs" },
    ]);
    expect(crumbs.itemListElement[1]).toMatchObject({ position: 2, name: "Docs" });
    expect(crumbs.itemListElement[1].item).toMatch(/^https?:\/\/.+\/docs$/);
    const a = article({ title: "T", description: "D", path: "/blog/t", published: "2026-10-09" });
    expect(a).toMatchObject({ "@type": "Article", dateModified: "2026-10-09" });
    expect(faqPage([{ q: "Q?", a: "A." }]).mainEntity[0].acceptedAnswer.text).toBe("A.");
  });
});

describe("slug lists for the proxy", () => {
  it("match the docs and blog content exactly", async () => {
    const { DOCS } = await import("@/content/docs");
    const { DOC_SLUGS, POST_SLUGS } = await import("@/content/slugs");
    expect([...DOC_SLUGS]).toEqual(DOCS.map((d) => d.slug));
    expect(POST_SLUGS).toEqual(
      Object.fromEntries(POSTS.map((p) => [p.slug, p.draft ? "draft" : "published"])),
    );
  });
});
