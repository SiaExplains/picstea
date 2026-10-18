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
  await expect(side.getByTestId("sponsor-card")).toBeVisible();
  // The start screen doesn't repeat the sponsorship while the column shows it.
  await expect(page.getByTestId("sponsor-card")).toHaveCount(2);
  await expect(page.getByTestId("sponsor-card").first()).toBeHidden();

  const links = page.getByRole("navigation", { name: "Picstea" });
  await expect(links.getByRole("link", { name: "Learn" })).toHaveAttribute("href", "/docs");
  await expect(links.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
  await expect(links.getByRole("link", { name: "Shortcuts" })).toHaveAttribute(
    "href",
    "/docs/keyboard-shortcuts",
  );
  await links.getByRole("button", { name: "About" }).click();
  await expect(
    page.getByRole("dialog", { name: /keeps your images on your device/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

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
});
