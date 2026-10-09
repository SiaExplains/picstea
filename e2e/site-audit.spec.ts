import { expect, test, type Page } from "@playwright/test";
import { POST_SLUGS } from "../src/content/slugs";

/**
 * Public site audit (launch-readiness pass): metadata, structured data, links, drafts and lab
 * Web Vitals for every URL in the sitemap. Lab numbers on localhost are indicative only.
 */

async function sitemapUrls(page: Page): Promise<string[]> {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

interface PageReport {
  path: string;
  title: string;
  description: string;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogUrl: string | null;
  jsonLd: string[];
  links: string[];
  lcp: number;
  cls: number;
  scriptBytes: number;
}

async function inspect(page: Page, url: string): Promise<PageReport> {
  const path = new URL(url).pathname;
  await page.addInitScript(() => {
    const w = window as unknown as { __lcp: number; __cls: number };
    w.__lcp = 0;
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!e.hadRecentInput) w.__cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const response = await page.goto(path, { waitUntil: "load" });
  expect(response?.status(), path).toBe(200);
  await page.waitForTimeout(300);
  return page.evaluate((p) => {
    const meta = (selector: string) =>
      document.querySelector(selector)?.getAttribute("content") ?? null;
    const w = window as unknown as { __lcp: number; __cls: number };
    const scripts = performance
      .getEntriesByType("resource")
      .filter((r) => (r as PerformanceResourceTiming).initiatorType === "script")
      .reduce((sum, r) => sum + ((r as PerformanceResourceTiming).encodedBodySize || 0), 0);
    return {
      path: p,
      title: document.title,
      description: meta('meta[name="description"]') ?? "",
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      ogUrl: meta('meta[property="og:url"]'),
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
        (s) => s.textContent ?? "",
      ),
      links: [...document.querySelectorAll("a[href]")]
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((h) => new URL(h).origin === location.origin),
      lcp: w.__lcp,
      cls: w.__cls,
      scriptBytes: scripts,
    };
  }, path);
}

test("every sitemap page has complete metadata, valid links and good lab vitals", async ({
  page,
}) => {
  test.setTimeout(180_000);
  // Decline ads/consent so measurements match a first visit without third-party code.
  await page.addInitScript(() =>
    localStorage.setItem("mylper.consent", JSON.stringify({ version: 1, ads: false })),
  );
  const urls = await sitemapUrls(page);
  expect(urls.length).toBeGreaterThan(10);
  const reports: PageReport[] = [];
  for (const url of urls) reports.push(await inspect(page, url));

  const problems: string[] = [];
  const titles = new Map<string, string>();
  const links = new Set<string>();
  for (const r of reports) {
    const where = r.path;
    if (!r.title || r.title.length > 60)
      problems.push(`${where}: title "${r.title}" (${r.title.length})`);
    if (titles.has(r.title)) problems.push(`${where}: title duplicates ${titles.get(r.title)}`);
    titles.set(r.title, where);
    if (r.description.length < 50 || r.description.length > 160)
      problems.push(`${where}: description length ${r.description.length}`);
    const expected = new URL(r.path, "https://example.invalid").pathname;
    if (
      !r.canonical ||
      !/^https?:\/\//.test(r.canonical) ||
      new URL(r.canonical).pathname !== expected
    )
      problems.push(`${where}: canonical ${r.canonical}`);
    if (!r.ogTitle || !r.ogDescription || !r.ogUrl)
      problems.push(`${where}: Open Graph incomplete`);
    if (r.jsonLd.length === 0) problems.push(`${where}: no structured data`);
    for (const json of r.jsonLd) {
      try {
        const data = JSON.parse(json) as { "@type"?: unknown; "@graph"?: unknown };
        if (!data["@type"] && !data["@graph"]) problems.push(`${where}: JSON-LD without @type`);
      } catch {
        problems.push(`${where}: JSON-LD does not parse`);
      }
    }
    if (r.lcp > 2500) problems.push(`${where}: LCP ${Math.round(r.lcp)} ms`);
    if (r.cls > 0.1) problems.push(`${where}: CLS ${r.cls.toFixed(3)}`);
    // Script budget from the 2026-10 audit (editor 270 KB, site pages 145 KB) plus headroom.
    const budget = r.path === "/" ? 350 * 1024 : 200 * 1024;
    if (r.scriptBytes > budget)
      problems.push(`${where}: ${Math.round(r.scriptBytes / 1024)} KB of JavaScript`);
    for (const l of r.links) links.add(new URL(l).pathname);
  }

  // Internal links resolve and never point at drafts.
  const drafts = Object.entries(POST_SLUGS)
    .filter(([, status]) => status === "draft")
    .map(([slug]) => `/blog/${slug}`);
  for (const path of links) {
    if (drafts.includes(path)) problems.push(`link to draft ${path}`);
    const status = (await page.request.get(path)).status();
    if (status >= 400) problems.push(`broken link ${path} (${status})`);
  }
  for (const r of reports) {
    if (drafts.some((d) => r.path === d)) problems.push(`draft in sitemap: ${r.path}`);
  }

  // robots.txt points at the sitemap and doesn't block the site.
  const robots = await (await page.request.get("/robots.txt")).text();
  if (!/Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/.test(robots))
    problems.push("robots.txt has no sitemap");
  if (/Disallow:\s*\/\s*$/m.test(robots)) problems.push("robots.txt blocks everything");

  // Report for the audit document.
  console.log(
    reports
      .map(
        (r) =>
          `${r.path.padEnd(52)} LCP ${String(Math.round(r.lcp)).padStart(5)} ms  CLS ${r.cls.toFixed(3)}  JS ${Math.round(r.scriptBytes / 1024)} KB`,
      )
      .join("\n"),
  );
  expect(problems, problems.join("\n")).toEqual([]);
});
