/*
 * Picstea service worker (ADR-0029): makes the app installable and lets the editor open offline.
 *
 * It only ever handles same-origin GET requests for the app itself — never cross-origin requests
 * (ads, Google), never request bodies. User images and projects live in IndexedDB and are never
 * seen here.
 *
 * - Build assets (/_next/static/…, icons, fonts): cache-first. Their names are content-hashed, so
 *   a cached copy is always the right one, and tabs still running an older version keep finding
 *   their files after an update.
 * - Pages: network-first, falling back to the cached copy (or a small offline page) without a
 *   connection, so online visitors always get the latest version.
 * - Updates apply at once (skipWaiting + claim): HTML is network-first and old assets stay cached,
 *   so nothing can load half old, half new.
 */

const STATIC_CACHE = "picstea-static-v1";
const PAGE_CACHE = "picstea-pages-v1";
const KEEP = [STATIC_CACHE, PAGE_CACHE];
const MAX_STATIC_ENTRIES = 400;
const STATIC_FILE = /\.(?:js|css|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/;

/**
 * What to do with a request: "static" (cache-first), "page" (network-first) or "skip" (leave it
 * to the browser). Exposed for unit tests.
 */
function classify(url, method, mode, origin) {
  if (method !== "GET") return "skip";
  let u;
  try {
    u = new URL(url);
  } catch {
    return "skip";
  }
  if (u.origin !== origin) return "skip";
  if (u.pathname === "/sw.js" || u.pathname.startsWith("/_next/webpack-hmr")) return "skip";
  // React Server Component payloads for client-side navigation: always fresh, never cached.
  if (u.searchParams.has("_rsc")) return "skip";
  // Sponsorship media isn't part of the app: left to the browser, never cached (ADR-0035).
  if (u.pathname.startsWith("/sponsors/")) return "skip";
  if (u.pathname.startsWith("/_next/static/")) return "static";
  if (mode === "navigate") return "page";
  if (u.pathname === "/manifest.webmanifest" || STATIC_FILE.test(u.pathname)) return "static";
  return "skip";
}

self.picsteaCachePolicy = { classify, STATIC_CACHE, PAGE_CACHE };

const OFFLINE_PAGE = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Picstea</title><body style="font:16px/1.5 system-ui,sans-serif;background:#1e1f22;color:#e6e6e8;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:420px;padding:24px"><h1 style="font-size:22px">You're offline</h1><p>This page hasn't been saved for offline use yet. The <a style="color:#8fd3c9" href="/">Picstea editor</a> works offline once you have opened it online.</p></main></body></html>`;

const cacheable = (response) => response && response.ok && response.type === "basic";

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_STATIC_ENTRIES; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response)) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (cacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    const hit =
      (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
    if (hit) return hit;
    return new Response(OFFLINE_PAGE, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("picstea-") && !KEEP.includes(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const kind = classify(request.url, request.method, request.mode, self.location.origin);
  if (kind === "static") event.respondWith(cacheFirst(request));
  else if (kind === "page") event.respondWith(networkFirst(request));
});

/** Cache a same-origin URL into `cache` unless it is already there. */
async function warm(cache, url) {
  if (await cache.match(url)) return;
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (cacheable(response)) await cache.put(url, response);
  } catch {
    // Offline or blocked: it is cached the next time it loads.
  }
}

/**
 * The page lists the app files it already loaded (and its own address), so a second visit also
 * works offline even for files that were loaded before this worker took control.
 */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  const origin = self.location.origin;
  event.waitUntil(
    (async () => {
      const statics = await caches.open(STATIC_CACHE);
      for (const url of data.urls.slice(0, 300)) {
        if (typeof url === "string" && classify(url, "GET", "no-cors", origin) === "static") {
          await warm(statics, url);
        }
      }
      await trim(statics);
      if (
        typeof data.page === "string" &&
        classify(data.page, "GET", "navigate", origin) === "page"
      ) {
        await warm(await caches.open(PAGE_CACHE), data.page);
      }
    })(),
  );
});
