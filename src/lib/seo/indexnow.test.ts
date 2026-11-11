import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  INDEXNOW_KEY,
  MAX_URLS_PER_REQUEST,
  changedSince,
  indexNowRequests,
  parseSitemap,
} from "./indexnow.mjs";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
<url>
<loc>https://www.picstea.com/psd-editor</loc>
<xhtml:link rel="alternate" hreflang="en" href="https://www.picstea.com/psd-editor" />
<xhtml:link rel="alternate" hreflang="de" href="https://www.picstea.com/de/psd-editor" />
<lastmod>2026-11-10</lastmod>
<priority>0.9</priority>
</url>
<url>
<loc>https://www.picstea.com/de/psd-editor</loc>
<xhtml:link rel="alternate" hreflang="en" href="https://www.picstea.com/psd-editor" />
<xhtml:link rel="alternate" hreflang="de" href="https://www.picstea.com/de/psd-editor" />
<lastmod>2026-11-10</lastmod>
</url>
<url>
<loc>https://www.picstea.com/blog/old?a=1&amp;b=2</loc>
<lastmod>2026-10-01T08:00:00.000Z</lastmod>
</url>
<url>
<loc>https://www.picstea.com/authors/sia</loc>
</url>
</urlset>`;

describe("IndexNow", () => {
  it("reads every page and hreflang alternate once, with its lastmod", () => {
    expect(parseSitemap(XML)).toEqual([
      { url: "https://www.picstea.com/psd-editor", lastmod: "2026-11-10" },
      { url: "https://www.picstea.com/de/psd-editor", lastmod: "2026-11-10" },
      { url: "https://www.picstea.com/blog/old?a=1&b=2", lastmod: "2026-10-01T08:00:00.000Z" },
      { url: "https://www.picstea.com/authors/sia", lastmod: null },
    ]);
  });

  it("keeps pages changed on or after the date, never undated ones", () => {
    const entries = parseSitemap(XML);
    expect(changedSince(entries, "2026-11-10")).toEqual([
      "https://www.picstea.com/psd-editor",
      "https://www.picstea.com/de/psd-editor",
    ]);
    expect(changedSince(entries, "2026-10-01")).toHaveLength(3);
    expect(() => changedSince(entries, "yesterday")).toThrow();
  });

  it("sends only the site's own URLs, in batches, with the key location", () => {
    const urls = [
      ...Array.from(
        { length: MAX_URLS_PER_REQUEST + 1 },
        (_, i) => `https://www.picstea.com/p${i}`,
      ),
      "https://example.com/elsewhere",
    ];
    const bodies = indexNowRequests("www.picstea.com", INDEXNOW_KEY, urls);
    expect(bodies.map((b) => b.urlList.length)).toEqual([MAX_URLS_PER_REQUEST, 1]);
    expect(bodies[0].keyLocation).toBe(`https://www.picstea.com/${INDEXNOW_KEY}.txt`);
    expect(indexNowRequests("www.picstea.com", INDEXNOW_KEY, [])).toEqual([]);
  });

  it("has a key file in public/ that contains exactly the key", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    expect(readFileSync(`public/${INDEXNOW_KEY}.txt`, "utf8")).toBe(INDEXNOW_KEY);
  });
});
