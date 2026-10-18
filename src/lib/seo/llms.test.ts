import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import robots, { AI_CRAWLERS } from "@/app/robots";
import { publishedPosts } from "@/content/blog";
import { DOCS } from "@/content/docs";
import { llmsFullTxt, llmsTxt, nodeToText } from "./llms";
import { absoluteUrl } from "./site";

describe("llms.txt", () => {
  it("starts with the name and summary and links every doc and published guide", () => {
    const text = llmsTxt();
    expect(text.startsWith("# Picstea\n\n> ")).toBe(true);
    for (const d of DOCS) expect(text).toContain(absoluteUrl(`/docs/${d.slug}`));
    for (const p of publishedPosts()) expect(text).toContain(absoluteUrl(`/blog/${p.slug}`));
    expect(text).toContain(absoluteUrl("/photoshop-alternative"));
    expect(text).toContain("## Current limits");
  });

  it("contains every docs page as text, without markup", () => {
    const full = llmsFullTxt();
    for (const d of DOCS) expect(full).toContain(`# ${d.title}`);
    expect(full).not.toMatch(/<[a-z]+[ >]/);
    expect(full).toContain("## Open the editor");
  });

  it("turns JSX into readable Markdown, keeping link text", () => {
    // Stands in for a component such as a link: only its children's text matters.
    const Link = ({ children }: { children?: ReactNode }) => children;
    const el = createElement(
      "div",
      null,
      createElement("h2", null, "Title"),
      createElement("p", null, "Use ", createElement("strong", null, "Layers"), "."),
      createElement("ul", null, createElement("li", null, "one"), createElement("li", null, "two")),
      createElement(Link, null, "link text"),
    );
    const text = nodeToText(el);
    expect(text).toContain("## Title");
    expect(text).toContain("Use **Layers**.");
    expect(text).toContain("- one\n- two");
    expect(text).toContain("link text");
  });
});

describe("robots.txt", () => {
  it("allows everyone and names the AI search and training crawlers", () => {
    const rules = robots().rules;
    const list = Array.isArray(rules) ? rules : [rules];
    expect(list[0]).toMatchObject({ userAgent: "*", allow: "/" });
    expect(list[1].userAgent).toEqual([...AI_CRAWLERS]);
    expect(AI_CRAWLERS).toContain("ClaudeBot");
    expect(AI_CRAWLERS).toContain("OAI-SearchBot");
    expect(list.some((r) => r.disallow)).toBe(false);
  });
});
