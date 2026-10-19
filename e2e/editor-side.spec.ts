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
  // Three slots: FocusCrew's and WikiDigit's videos (taking turns at the top each day), then a
  // house ad until the last one is booked.
  const slots = side.getByTestId("side-slot");
  await expect(slots).toHaveCount(3);
  for (const [name, href, src] of [
    [/FocusCrew/, "https://focus-crew.com", "/sponsors/focuscrew-tabs.mp4"],
    [/WikiDigit/, "https://wikidigit.com", "/sponsors/wikidigit.mp4"],
  ] as const) {
    const link = side.getByRole("link", { name });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("rel", "sponsored noopener noreferrer");
    const video = side.locator(`video[src="${src}"]`);
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.muted && !v.paused))
      .toBe(true);
  }
  const first = slots.first();
  // Media only, with the label over it; empty slots invite sponsors.
  await expect(first.getByText("Sponsored")).toBeVisible();
  await expect(first.getByText(/your productivity|tech news/i)).toHaveCount(0);
  await expect(slots.nth(2)).toContainText("Your ad here");
  await expect(slots.nth(2).getByRole("link")).toHaveAttribute("href", "/sponsorship");
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
    /FocusCrew|WikiDigit/,
  );
});

test("with reduced motion the sponsor videos stay on their still frames", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 860 });
  await openEditor(page);
  const side = page.getByTestId("editor-side");
  // Paths from the booked list, so a new creative doesn't need a test change.
  for (const { video: src, image: poster } of SPONSORSHIPS.filter((ad) => ad.video)) {
    const video = side.locator(`video[src="${src}"]`);
    await expect(video).toHaveAttribute("poster", poster!);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  }
});
