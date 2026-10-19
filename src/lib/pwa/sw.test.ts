import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Classify = (url: string, method: string, mode: string, origin: string) => string;

/** Run the real public/sw.js in a minimal worker scope and take its exposed policy. */
function loadPolicy(): { classify: Classify; listeners: string[] } {
  const listeners: string[] = [];
  const self: Record<string, unknown> = {
    addEventListener: (type: string) => listeners.push(type),
    location: { origin: "https://www.picstea.com" },
  };
  const code = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
  new Function("self", "caches", "fetch", code)(self, {}, () => undefined);
  const policy = self.picsteaCachePolicy as { classify: Classify };
  return { classify: policy.classify, listeners };
}

const ORIGIN = "https://www.picstea.com";

describe("service worker caching policy", () => {
  const { classify, listeners } = loadPolicy();

  it("caches hashed build files and app icons first", () => {
    expect(classify(`${ORIGIN}/_next/static/chunks/app-1a2b.js`, "GET", "no-cors", ORIGIN)).toBe(
      "static",
    );
    expect(classify(`${ORIGIN}/android-chrome-192x192.png`, "GET", "no-cors", ORIGIN)).toBe(
      "static",
    );
    expect(classify(`${ORIGIN}/manifest.webmanifest`, "GET", "cors", ORIGIN)).toBe("static");
  });

  it("serves pages network-first", () => {
    expect(classify(`${ORIGIN}/`, "GET", "navigate", ORIGIN)).toBe("page");
    expect(classify(`${ORIGIN}/docs/selections`, "GET", "navigate", ORIGIN)).toBe("page");
  });

  it("never touches other sites, non-GET requests, itself or live data", () => {
    expect(
      classify(
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
        "GET",
        "no-cors",
        ORIGIN,
      ),
    ).toBe("skip");
    expect(classify(`${ORIGIN}/`, "POST", "navigate", ORIGIN)).toBe("skip");
    expect(classify(`${ORIGIN}/sw.js`, "GET", "same-origin", ORIGIN)).toBe("skip");
    expect(classify(`${ORIGIN}/docs?_rsc=abc`, "GET", "cors", ORIGIN)).toBe("skip");
    // Sponsorship media: the browser's business, never cached.
    expect(classify(`${ORIGIN}/sponsors/focuscrew-tabs-poster.png`, "GET", "no-cors", ORIGIN)).toBe(
      "skip",
    );
    expect(classify(`${ORIGIN}/sponsors/focuscrew-tabs.mp4`, "GET", "no-cors", ORIGIN)).toBe(
      "skip",
    );
    expect(classify(`${ORIGIN}/llms.txt`, "GET", "cors", ORIGIN)).toBe("skip");
    expect(classify("not a url", "GET", "navigate", ORIGIN)).toBe("skip");
  });

  it("handles install, activate, fetch and the warm-up message", () => {
    expect(listeners.sort()).toEqual(["activate", "fetch", "install", "message"]);
  });
});
