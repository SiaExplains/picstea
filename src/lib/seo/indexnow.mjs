// Pure helpers for scripts/indexnow.mjs (ADR-0042). Plain JavaScript so the script runs on Node
// without a build step; unit-tested by indexnow.test.ts.

/** The key file in public/ is named after the key and contains only the key. */
export const INDEXNOW_KEY = "a740cf6a98ea324649ca66cb739c043a";

/** IndexNow accepts at most 10,000 URLs per request. */
export const MAX_URLS_PER_REQUEST = 10_000;

/**
 * Every URL in a sitemap with its lastmod: each `<loc>` and each hreflang alternate
 * (`<xhtml:link href>`), which shares its entry's lastmod. Duplicates are merged.
 * @param {string} xml
 * @returns {{ url: string; lastmod: string | null }[]}
 */
export function parseSitemap(xml) {
  /** @type {Map<string, string | null>} */
  const urls = new Map();
  for (const [, entry] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(entry)?.[1];
    const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(entry)?.[1] ?? null;
    const alternates = [...entry.matchAll(/<xhtml:link\b[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]);
    for (const url of [loc, ...alternates]) {
      if (!url) continue;
      const decoded = url.replaceAll("&amp;", "&");
      if (!urls.has(decoded) || urls.get(decoded) === null) urls.set(decoded, lastmod);
    }
  }
  return [...urls].map(([url, lastmod]) => ({ url, lastmod }));
}

/**
 * The URLs changed on or after `since` (YYYY-MM-DD, compared by calendar date). Pages without a
 * lastmod are left out: they can't say when they changed.
 * @param {{ url: string; lastmod: string | null }[]} entries
 * @param {string} since
 * @returns {string[]}
 */
export function changedSince(entries, since) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error(`--since must be YYYY-MM-DD: ${since}`);
  return entries
    .filter((e) => e.lastmod !== null && e.lastmod.slice(0, 10) >= since)
    .map((e) => e.url);
}

/**
 * The request bodies for api.indexnow.org: only URLs on `host`, in batches of 10,000.
 * @param {string} host
 * @param {string} key
 * @param {string[]} urls
 */
export function indexNowRequests(host, key, urls) {
  const own = urls.filter((u) => new URL(u).host === host);
  const bodies = [];
  for (let i = 0; i < own.length; i += MAX_URLS_PER_REQUEST) {
    bodies.push({
      host,
      key,
      keyLocation: `https://${host}/${key}.txt`,
      urlList: own.slice(i, i + MAX_URLS_PER_REQUEST),
    });
  }
  return bodies;
}
