// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver, Yep) which public pages changed
// (ADR-0042). Run by .github/workflows/indexnow.yml after each production deploy. Sends only public
// URLs from the sitemap; never document data.
//
//   node scripts/indexnow.mjs --since 2026-11-10        pages whose lastmod is on/after that date
//   node scripts/indexnow.mjs --all                     every page in the sitemap
//   options: --dry-run (print, don't send) · --sitemap <url> (default: the live sitemap)
import { parseArgs } from "node:util";
import {
  INDEXNOW_KEY,
  changedSince,
  indexNowRequests,
  parseSitemap,
} from "../src/lib/seo/indexnow.mjs";

const HOST = "www.picstea.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const { values } = parseArgs({
  options: {
    since: { type: "string" },
    all: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    sitemap: { type: "string", default: `https://${HOST}/sitemap.xml` },
  },
});

if (!values.all && !values.since) {
  console.error("Pass --since YYYY-MM-DD or --all.");
  process.exit(2);
}

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`GET ${url}: ${res.status}`);
  return res.text();
}

const entries = parseSitemap(await get(values.sitemap));
if (entries.length === 0) throw new Error(`No URLs in ${values.sitemap}`);
const urls = values.all ? entries.map((e) => e.url) : changedSince(entries, values.since);
console.log(
  `${urls.length} of ${entries.length} URLs ${values.all ? "(all)" : `changed since ${values.since}`}`,
);
for (const url of urls) console.log(`  ${url}`);

const requests = indexNowRequests(HOST, INDEXNOW_KEY, urls);
if (values["dry-run"] || requests.length === 0) process.exit(0);

// The engines fetch the key file to prove we own the host; check it first so a mismatch fails here.
const live = (await get(`https://${HOST}/${INDEXNOW_KEY}.txt`)).trim();
if (live !== INDEXNOW_KEY) throw new Error(`Key file on ${HOST} does not contain the key`);

for (const body of requests) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  // 200 = accepted; 202 = accepted, key check still pending.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  console.log(`IndexNow ${res.status}: ${body.urlList.length} URLs sent`);
}
