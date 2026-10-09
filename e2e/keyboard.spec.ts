import { expect, test, type Page } from "@playwright/test";
import { MOD, newDocument, openEditor } from "./helpers";

/** Focus with keyboard modality (as after Tab), so :focus-visible applies. */
async function keyboardFocus(page: Page, locator: ReturnType<Page["getByRole"]>) {
  await page.keyboard.press("Shift");
  await locator.focus();
}

/** Accessible name and visible focus of the focused element. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { name: "", outline: false };
    const style = getComputedStyle(el);
    // A focus ring, or (menu items) a highlight background that differs from the container's.
    const parentBg = el.parentElement ? getComputedStyle(el.parentElement).backgroundColor : "";
    const highlighted =
      style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== parentBg;
    const outline =
      (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
      style.boxShadow !== "none" ||
      highlighted;
    return {
      name: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim(),
      outline,
    };
  });
}

test("menus work with the keyboard and focus is always visible", async ({ page }) => {
  await openEditor(page);
  // Tab into the menu bar.
  let found = false;
  for (let i = 0; i < 10 && !found; i++) {
    await page.keyboard.press("Tab");
    found = (await focused(page)).name === "File";
  }
  expect(found).toBe(true);
  expect((await focused(page)).outline).toBe(true);

  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: "File" })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  expect((await focused(page)).outline).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "File" })).toBeHidden();
  expect((await focused(page)).name).toBe("File");

  // Arrow keys move along the menu bar.
  await page.keyboard.press("ArrowRight");
  expect((await focused(page)).name).toBe("Edit");
});

test("dialogs close with Escape and give focus back", async ({ page }) => {
  await openEditor(page);
  const button = page.getByRole("button", { name: "New document" });
  await button.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "New document" });
  await expect(dialog).toBeVisible();
  // Focus moves into the dialog.
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
});

test("layers and properties can be used from the keyboard", async ({ page }) => {
  await newDocument(page, "Keys");
  await page.keyboard.press(`${MOD}+Shift+n`);
  const name = page.getByRole("button", { name: "Layer 1", exact: true });
  await keyboardFocus(page, name);
  expect((await focused(page)).outline).toBe(true);
  // F2 renames.
  await page.keyboard.press("F2");
  const input = page.getByRole("textbox", { name: "Layer name" });
  await expect(input).toBeFocused();
  await input.fill("Renamed");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Renamed", exact: true })).toBeVisible();
  // Opacity slider responds to arrow keys.
  const opacity = page.getByRole("slider", { name: "Opacity" });
  await keyboardFocus(page, opacity);
  expect((await focused(page)).outline).toBe(true);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("spinbutton", { name: "Opacity percent" })).toHaveValue("99");
});
