import { expect, test } from "@playwright/test";
import { SPONSORSHIPS } from "../src/content/sponsorships";
import { openEditor, trackErrors } from "./helpers";

test("wide screens get the sponsorship column, privacy settings and website links", async ({
  page,
  context,
}) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 1440, height: 860 });
  await openEditor(page);

  const side = page.getByTestId("editor-side");
  await expect(side).toBeVisible();
  // Three slots, each showing a different booked sponsor, picked and placed at random per view.
  const slots = side.getByTestId("side-slot");
  await expect(slots).toHaveCount(3);
  const booked = new Map(SPONSORSHIPS.map((s) => [s.targetUrl, s.video]));
  const shown: string[] = [];
  for (let i = 0; i < 3; i++) {
    const link = slots.nth(i).getByRole("link");
    const href = (await link.getAttribute("href"))!;
    expect(booked.has(href), href).toBe(true);
    await expect(link).toHaveAttribute("rel", "sponsored noopener noreferrer");
    const video = slots.nth(i).locator(`video[src="${booked.get(href)}"]`);
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.muted && !v.paused))
      .toBe(true);
    shown.push(href);
  }
  expect(new Set(shown).size).toBe(3);
  const first = slots.first();
  // Media only, with the label over it; no house ad while every slot is booked.
  await expect(first.getByText("Sponsored")).toBeVisible();
  await expect(
    first.getByText(/your productivity|tech news|free online tools|AI and automation/i),
  ).toHaveCount(0);
  await expect(side.getByText("Your ad here")).toHaveCount(0);
  // The start screen doesn't repeat the sponsorship while the column shows it.
  await expect(page.getByTestId("sponsor-card")).toHaveCount(4);
  await expect(page.getByTestId("sponsor-card").first()).toBeHidden();

  const links = page.getByRole("navigation", { name: "Picstea" });
  await expect(links.getByRole("link", { name: "Learn" })).toHaveAttribute("href", "/docs");
  await expect(links.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
  await expect(links.getByRole("link", { name: "Shortcuts" })).toHaveAttribute(
    "href",
    "/docs/keyboard-shortcuts",
  );
  await expect(links.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");

  // Privacy settings opens the website's preferences in a new tab; the editor stays put.
  const [tab] = await Promise.all([
    context.waitForEvent("page"),
    side.getByRole("button", { name: "Privacy settings" }).click(),
  ]);
  await tab.waitForLoadState();
  expect(new URL(tab.url()).pathname).toBe("/cookies");
  await expect(tab.getByRole("dialog", { name: "Privacy settings" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("narrower screens keep the sponsorship on the start screen instead", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await openEditor(page);
  await expect(page.getByTestId("editor-side")).toBeHidden();
  await expect(page.getByTestId("sponsor-card").first()).toBeVisible();
  await expect(page.getByTestId("sponsor-card").first()).toHaveAccessibleName(
    new RegExp(SPONSORSHIPS.map((s) => s.sponsor.replace(".", "\\.")).join("|")),
  );
});

test("with reduced motion the sponsor videos stay on their still frames", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 860 });
  await openEditor(page);
  const side = page.getByTestId("editor-side");
  // Whichever three sponsors this view shows: each has its still frame and stays paused. Paths
  // come from the booked list, so a new creative doesn't need a test change.
  const posters = new Map(SPONSORSHIPS.map((ad) => [ad.video, ad.image]));
  const videos = side.locator("video");
  await expect(videos).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    const video = videos.nth(i);
    const src = (await video.getAttribute("src"))!;
    await expect(video).toHaveAttribute("poster", posters.get(src)!);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  }
});

test("every view picks three of the sponsors at random, in random positions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 860 });
  await openEditor(page);
  const views = new Set<string>();
  const seen = new Set<string>();
  // Ten views: with 24 possible arrangements, seeing only one would mean nothing is random.
  for (let i = 0; i < 10; i++) {
    if (i > 0) await page.reload();
    const slots = page.getByTestId("editor-side").getByTestId("side-slot");
    await expect(slots).toHaveCount(3);
    const hrefs: string[] = [];
    for (let s = 0; s < 3; s++)
      hrefs.push((await slots.nth(s).getByRole("link").getAttribute("href"))!);
    expect(new Set(hrefs).size).toBe(3);
    hrefs.forEach((h) => seen.add(h));
    views.add(hrefs.join(" "));
  }
  expect(views.size).toBeGreaterThan(1);
  // All four sponsors turn up across the views.
  expect(seen).toEqual(new Set(SPONSORSHIPS.map((s) => s.targetUrl)));
});
