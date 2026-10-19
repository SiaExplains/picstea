import { expect, test } from "@playwright/test";
import { openEditor, trackErrors } from "./helpers";

test.use({ serviceWorkers: "allow" });

test("installable: the manifest describes a standalone app", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    short_name: "Picstea",
  });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(["192x192", "512x512"]);
  const sw = await request.get("/sw.js");
  expect(sw.headers()["cache-control"]).toContain("no-cache");
  expect(sw.headers()["content-type"]).toContain("javascript");
});

test("after one online visit the editor opens and works offline", async ({ page, context }) => {
  const errors = trackErrors(page);
  // Which requests failed, to name them if the check below fails.
  const failed: string[] = [];
  page.on("requestfailed", (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
  await openEditor(page);
  // The worker installs, takes control and caches what this page loaded.
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
    timeout: 15_000,
  });
  await page.waitForFunction(
    async () => {
      const names = await caches.keys();
      if (!names.includes("picstea-static-v1") || !names.includes("picstea-pages-v1")) return false;
      const pages = await (await caches.open("picstea-pages-v1")).keys();
      return pages.length > 0;
    },
    null,
    { timeout: 15_000 },
  );

  // Make a project online, so offline there is something saved to reopen.
  await page.getByRole("button", { name: "New document" }).click();
  await page.getByRole("dialog", { name: "New document" }).getByLabel("Name").fill("Offline");
  await page
    .getByRole("dialog", { name: "New document" })
    .getByRole("button", { name: "Create" })
    .click();
  await expect(page.getByTestId("canvas-viewport")).toBeVisible();
  await expect(page.getByText("Saved in this browser")).toBeVisible({ timeout: 10_000 });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "New document" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Recent projects" })).toContainText("Offline");
  await page.getByRole("button", { name: "New document" }).click();
  await page
    .getByRole("dialog", { name: "New document" })
    .getByRole("button", { name: "Create" })
    .click();
  await expect(page.getByTestId("canvas-viewport")).toBeVisible();
  await context.setOffline(false);
  // Going offline makes the browser log failed network requests; nothing else may fail.
  expect(
    errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(e)),
    failed.join("\n"),
  ).toEqual([]);
});

test("pages never visited show a small offline page instead of a browser error", async ({
  page,
  context,
}) => {
  await openEditor(page);
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
    timeout: 15_000,
  });
  await context.setOffline(true);
  await page.goto("/docs/filters").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await context.setOffline(false);
});

test("Help → Install Picstea explains how to install when the browser has no prompt", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("menuitem", { name: "Help" }).click();
  await page.getByRole("menuitem", { name: "Install Picstea…" }).click();
  const dialog = page.getByRole("dialog", { name: "Install Picstea" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Add to Dock");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toBeHidden();
});
