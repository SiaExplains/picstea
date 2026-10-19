import { expect, test } from "@playwright/test";
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
  // Three slots: the first is FocusCrew's video, then two house ads until they are booked.
  await expect(side.getByTestId("side-slot")).toHaveCount(3);
  const first = side.getByTestId("side-slot").first();
  await expect(first.getByRole("link", { name: /FocusCrew/ })).toHaveAttribute(
    "href",
    "https://focus-crew.com",
  );
  await expect(first.getByRole("link", { name: /FocusCrew/ })).toHaveAttribute(
    "rel",
    "sponsored noopener noreferrer",
  );
  const video = first.locator("video");
  await expect(video).toHaveAttribute("src", "/sponsors/focuscrew.mp4");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.muted && !v.paused)).toBe(true);
  // Media only, with the label over it; empty slots invite sponsors.
  await expect(first.getByText("Sponsored")).toBeVisible();
  await expect(first.getByText(/your productivity/i)).toHaveCount(0);
  await expect(side.getByTestId("side-slot").nth(1)).toContainText("Your ad here");
  await expect(side.getByTestId("side-slot").nth(1).getByRole("link")).toHaveAttribute(
    "href",
    "/sponsorship",
  );
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
  await expect(page.getByTestId("sponsor-card").first()).toHaveAccessibleName(/FocusCrew/);
});

test("with reduced motion the sponsor video stays on its still frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 860 });
  await openEditor(page);
  const video = page.getByTestId("editor-side").locator("video");
  await expect(video).toHaveAttribute("poster", "/sponsors/focuscrew-poster.png");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});
