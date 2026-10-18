import { expect, test } from "@playwright/test";

test("home page is the editor and welcomes first-time visitors once", async ({ page }) => {
  await page.goto("/");
  const welcome = page.getByRole("dialog", { name: /free image editor/i });
  await expect(welcome).toBeVisible();
  await expect(welcome.getByRole("heading", { level: 1 })).toBeVisible();
  await welcome.getByRole("button", { name: "Start editing" }).click();
  await expect(welcome).toBeHidden();
  await expect(page.getByRole("button", { name: "New document" })).toBeVisible();

  // Dismissed for good; the logo brings it back.
  await page.reload();
  await expect(page.getByRole("button", { name: "New document" })).toBeVisible();
  await expect(welcome).toBeHidden();
  // The logo sits on the dark menu bar with no native button background behind it.
  const logo = page.getByRole("button", { name: "Picstea" });
  expect(await logo.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    "rgba(0, 0, 0, 0)",
  );
  expect(await logo.evaluate((el) => getComputedStyle(el).appearance)).toBe("none");
  await logo.click();
  await expect(welcome).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(welcome).toBeHidden();
});

test("home page is indexable with metadata, icons and structured data", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  const html = await response.text();
  // The welcome text is server-rendered, so crawlers see it without running the editor.
  expect(html).toContain("A free image editor that keeps your images on your device");

  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https?:\/\/[^/]+\/?$/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(jsonLd!)["@graph"].map((n: { "@type": string }) => n["@type"])).toEqual([
    "WebSite",
    "Organization",
    "SoftwareApplication",
  ]);

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).not.toContain("Disallow");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/editor");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.short_name).toBe("Picstea");
  expect((await request.get("/favicon.ico")).status()).toBe(200);
});

test("the old /editor address redirects permanently to the home page", async ({ request }) => {
  const response = await request.get("/editor", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toBe("/");
});

test("security headers are sent", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("connect-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("AI assistants and social previews: llms.txt, robots and preview images", async ({
  request,
  page,
}) => {
  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  expect(llms.headers()["content-type"]).toContain("text/markdown");
  const text = await llms.text();
  expect(text).toMatch(/^# Picstea/);
  expect(text).toContain("/photopea-alternative");
  expect((await request.get("/llms-full.txt")).status()).toBe(200);

  const robots = await (await request.get("/robots.txt")).text();
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
    expect(robots).toContain(`User-Agent: ${bot}`);
  }
  expect(robots).not.toContain("Disallow");

  const image = await request.get("/og-image.png");
  expect(image.headers()["content-type"]).toBe("image/png");
  for (const path of ["/", "/faq", "/blog/png-vs-jpeg-vs-webp"]) {
    await page.goto(path);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/og-image\.png$/,
    );
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      "Picstea",
    );
  }
});
