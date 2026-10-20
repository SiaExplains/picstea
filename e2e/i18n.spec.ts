import { expect, test } from "@playwright/test";

test("English keeps one address: /en/… redirects to the unprefixed URL", async ({ request }) => {
  for (const [from, to] of [
    ["/en", "/"],
    ["/en/faq", "/faq"],
    ["/en/docs/getting-started", "/docs/getting-started"],
  ]) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(new URL(response.headers()["location"], "http://x").pathname, from).toBe(to);
  }
  const home = await request.get("/");
  expect(home.status()).toBe(200);
  expect(await home.text()).toContain('<html lang="en"');
});

test("the editor exists in every language, under the strict policy", async ({ request }) => {
  for (const [path, tag] of [
    ["/de", "de"],
    ["/es", "es"],
    ["/pt-br", "pt-BR"],
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(await response.text(), path).toContain(`<html lang="${tag}"`);
    const csp = response.headers()["content-security-policy"];
    expect(csp, path).toContain("connect-src 'self'");
    expect(csp, path).not.toContain("googlesyndication");
  }
});

test("pages that only exist in English are 404 in other languages", async ({ request }) => {
  for (const path of [
    "/de/docs/getting-started",
    "/es/blog",
    "/pt-br/privacy",
    "/fr",
    "/de/nope",
  ]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  // Files outside app/[lang] are untouched by the language proxy.
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/llms.txt")).status()).toBe(200);
  expect((await request.get("/vendor/libheif/1.23.5/LICENSE-libheif.txt")).status()).toBe(200);
});

test("translated pages: lang, hreflang and the language switcher", async ({ page, request }) => {
  const html = await (await request.get("/es/png-editor")).text();
  expect(html).toContain('<html lang="es"');
  for (const [tag, href] of [
    ["en", "/png-editor"],
    ["es", "/es/png-editor"],
    ["pt-BR", "/pt-br/png-editor"],
    ["de", "/de/png-editor"],
    ["x-default", "/png-editor"],
  ]) {
    expect(html, tag).toMatch(new RegExp(`hrefLang="${tag}" href="https?://[^"]+${href}"`));
  }
  const english = await (await request.get("/png-editor")).text();
  expect(english).toContain('<link rel="canonical" href="');
  expect(english).not.toBe(html);

  await page.goto("/png-editor");
  await page
    .getByRole("navigation", { name: "Language" })
    .getByRole("link", { name: "Deutsch" })
    .click();
  await expect(page).toHaveURL(/\/de\/png-editor$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  // English-only pages have no switcher.
  await page.goto("/docs/getting-started");
  await expect(page.getByRole("navigation", { name: "Language" })).toHaveCount(0);
});

test("the editor speaks the route's language", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("picstea.welcomeSeen", "1"));
  await page.goto("/de");
  const menubar = page.getByRole("menubar");
  await expect(menubar.getByRole("menuitem", { name: "Datei" })).toBeVisible();
  await expect(menubar.getByRole("menuitem", { name: "Ebene" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Neues Dokument" })).toBeVisible();

  await page.goto("/es?convert=png-to-jpg");
  await expect(page.getByRole("dialog", { name: "Convertir PNG a JPG" })).toBeVisible();
});

test("a remembered language choice moves the editor home there", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("picstea.welcomeSeen", "1");
    window.localStorage.setItem("picstea.lang", "pt-br");
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/pt-br$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
});

test("the sitemap lists every language of translated pages", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/de/png-editor", "/es/convert/webp-to-png", "/pt-br/liquify", "/de"]) {
    expect(sitemap, path).toContain(`${path}</loc>`);
  }
  expect(sitemap).not.toContain("/de/docs/");
  expect(sitemap).toContain('hreflang="pt-BR"');
});
