import { expect, test, type Page } from "@playwright/test";
import { appOrigin, openEditor, trackErrors } from "./helpers";

const GOOGLE = /googlesyndication\.com|doubleclick\.net|adtrafficquality\.google|google\.com\//;

/** Intercept Google's ad code (nothing reaches the real network) and record requests to it. */
async function interceptGoogle(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route(GOOGLE, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ contentType: "text/javascript", body: "/* test ad code */" });
  });
  return requests;
}

const jsonLdTypes = async (page: Page) => {
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  return (JSON.parse(raw!)["@graph"] as { "@type": string }[]).map((n) => n["@type"]);
};

test("website pages are indexable with metadata and structured data", async ({ page }) => {
  const errors = trackErrors(page);
  await interceptGoogle(page);
  for (const [path, types] of [
    ["/docs", ["BreadcrumbList"]],
    ["/docs/getting-started", ["BreadcrumbList"]],
    ["/psd-editor", ["BreadcrumbList", "SoftwareApplication", "FAQPage"]],
    ["/online-photo-editor", ["BreadcrumbList", "SoftwareApplication", "FAQPage"]],
  ] as const) {
    const response = await page.goto(path);
    expect(response!.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${path}$`),
    );
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    expect(await jsonLdTypes(page)).toEqual(types);
  }
  // The shortcut table is generated from the real keymap.
  await page.goto("/docs/keyboard-shortcuts");
  await expect(page.getByRole("cell", { name: "Magic wand" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("published posts are in search; unfinished legal pages are kept out", async ({
  page,
  request,
}) => {
  expect((await request.get("/blog/edit-psd-online-without-uploading")).status()).toBe(200);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/psd-editor");
  expect(sitemap).toContain("/docs/selections");
  expect(sitemap).toContain("/blog/edit-psd-online-without-uploading");
  expect(sitemap).not.toMatch(/\/(privacy|cookies|terms|imprint|sponsorship)<\/loc>/);
  await page.goto("/blog");
  await expect(
    page.getByRole("link", { name: "How to edit a PSD file online without uploading it" }),
  ).toBeVisible();
  await page.goto("/imprint");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText(/Draft — under legal review/)).toBeVisible();
  await expect(page.getByText(/TO COMPLETE/).first()).toBeVisible();
});

test("Google ads load only after consent, and the choice can be changed later", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const google = await interceptGoogle(page);
  await page.goto("/docs/getting-started");
  const banner = page.getByRole("region", { name: "Privacy choices" });
  await expect(banner).toBeVisible();
  for (const name of ["Reject non-essential", "Manage preferences", "Accept all"]) {
    await expect(banner.getByRole("button", { name })).toBeVisible();
  }
  // Until a choice is made, the ad space shows Picstea's own (tracking-free) sponsorship.
  await expect(page.getByTestId("sponsor-card")).toBeVisible();
  expect(google).toEqual([]);

  await banner.getByRole("button", { name: "Reject non-essential" }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(banner).toBeHidden();
  expect(google).toEqual([]);

  // Change of mind from the footer.
  await page.getByRole("button", { name: "Privacy settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Privacy settings" });
  await expect(dialog.getByRole("checkbox", { name: "Advertising" })).not.toBeChecked();
  await dialog.getByRole("checkbox", { name: "Advertising" }).check();
  await dialog.getByRole("button", { name: "Save choices" }).click();
  await expect.poll(() => google.filter((u) => u.includes("adsbygoogle.js")).length).toBe(1);
  expect(google[0]).toContain("client=ca-pub-0000000000000000");
  await expect(page.getByText("Advertisement").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("the editor stays free of third-party code even with ads configured", async ({
  page,
  request,
}) => {
  const errors = trackErrors(page);
  const google = await interceptGoogle(page);
  const origin = appOrigin();
  const external: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (!["blob:", "data:"].includes(url.protocol) && url.origin !== origin) external.push(r.url());
  });
  // Even with advertising accepted on the website…
  await page.addInitScript(() =>
    localStorage.setItem(
      "picstea.consent",
      JSON.stringify({
        version: 1,
        choices: { analytics: true, advertising: true },
        decidedAt: new Date().toISOString(),
      }),
    ),
  );
  await openEditor(page);
  // …the editor shows only Picstea's own sponsorship, in its side column on wide screens.
  const sponsor = page.getByTestId("editor-side").getByTestId("sponsor-card").first();
  await expect(sponsor).toBeVisible();
  await expect(sponsor.getByText("Sponsored")).toBeVisible();
  await expect(page.getByRole("region", { name: "Privacy choices" })).toHaveCount(0);
  await page.getByRole("button", { name: "New document" }).click();
  await page
    .getByRole("dialog", { name: "New document" })
    .getByRole("button", { name: "Create" })
    .click();
  // The column stays beside the canvas; still no third-party code.
  await expect(sponsor).toBeVisible();
  expect(google).toEqual([]);
  expect(external).toEqual([]);

  const editorCsp = (await request.get("/")).headers()["content-security-policy"];
  expect(editorCsp).toContain("connect-src 'self';");
  expect(editorCsp).not.toContain("googlesyndication");
  const siteCsp = (await request.get("/docs")).headers()["content-security-policy"];
  expect(siteCsp).toContain("googlesyndication");
  expect(errors).toEqual([]);
});

test("content pages do not load the editor", async ({ page, request }) => {
  await interceptGoogle(page);
  const scripts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script" && r.url().includes("/_next/")) scripts.push(r.url());
  });
  await page.goto("/docs", { waitUntil: "networkidle" });
  expect(scripts.length).toBeGreaterThan(0);
  // Strings that only exist in the editor bundle.
  const markers = ["The editor ran into a problem", "Offscreen canvas is not available"];
  for (const url of scripts) {
    const body = await (await request.get(url)).text();
    for (const marker of markers)
      expect(body.includes(marker), `${url} contains editor code`).toBe(false);
  }
  // Sanity check: the markers really are in the editor's code.
  const editorScripts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script" && r.url().includes("/_next/")) editorScripts.push(r.url());
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const bodies = await Promise.all(editorScripts.map(async (u) => (await request.get(u)).text()));
  expect(bodies.some((b) => b.includes(markers[0]))).toBe(true);
});

test("opening the editor from a website page with ads is a fresh, ad-free page", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const google = await interceptGoogle(page);
  await page.goto("/docs/getting-started");
  await page
    .getByRole("region", { name: "Privacy choices" })
    .getByRole("button", { name: "Accept all" })
    .click();
  await expect.poll(() => google.length).toBeGreaterThan(0);
  await page.evaluate(() => ((window as { __sameDocument?: boolean }).__sameDocument = true));

  const editorDocument = page.waitForResponse(
    (r) => r.request().resourceType() === "document" && new URL(r.url()).pathname === "/",
  );
  await page.getByRole("banner").getByRole("link", { name: "Open editor" }).click();
  const response = await editorDocument;
  await expect(page.getByRole("button", { name: "New document" })).toBeVisible();

  // A full page load: new document, the editor's strict policy, no ad code anywhere.
  expect(
    await page.evaluate(() => (window as { __sameDocument?: boolean }).__sameDocument),
  ).toBeUndefined();
  expect(response.headers()["content-security-policy"]).not.toContain("googlesyndication");
  expect(await page.evaluate(() => "adsbygoogle" in window)).toBe(false);
  await expect(page.locator("script[data-vendor]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
