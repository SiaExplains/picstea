import { expect, test, type Page } from "@playwright/test";
import { openEditor, trackErrors } from "./helpers";

async function openDialog(page: Page) {
  await page.getByRole("button", { name: "New document" }).click();
  const dialog = page.getByRole("dialog", { name: "New document" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("print presets set physical size and resolution", async ({ page }) => {
  const errors = trackErrors(page);
  await openEditor(page);
  const dialog = await openDialog(page);
  await dialog.getByRole("tab", { name: "Print" }).click();
  const a4 = dialog.getByRole("radio", { name: /^A4,/ });
  await a4.click();
  await expect(a4).toHaveAttribute("aria-checked", "true");
  await expect(dialog.getByLabel("Width (mm)")).toHaveValue("210");
  await expect(dialog.getByLabel("Height (mm)")).toHaveValue("297");
  await expect(dialog.getByLabel("Resolution (ppi)")).toHaveValue("300");
  await expect(dialog.getByText("2,480 × 3,508 px")).toBeVisible();

  // Switching units keeps the pixel size.
  await dialog.getByLabel("Units").selectOption("px");
  await expect(dialog.getByLabel("Width (px)")).toHaveValue("2480");
  await expect(dialog.getByLabel("Height (px)")).toHaveValue("3508");
  // Same size, so the preset stays selected.
  await expect(a4).toHaveAttribute("aria-checked", "true");

  // Swap to landscape: now a custom size.
  await dialog.getByRole("button", { name: "Swap width and height" }).click();
  await expect(dialog.getByLabel("Width (px)")).toHaveValue("3508");
  await expect(a4).toHaveAttribute("aria-checked", "false");

  // Transparent: no layer is selected, so Properties shows the document size and resolution.
  await dialog.getByLabel("Background").selectOption("transparent");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("3508 × 2480 px · 300 ppi")).toBeVisible();
  expect(errors).toEqual([]);
});

test("search finds sizes across categories, and recent sizes are remembered", async ({ page }) => {
  await openEditor(page);
  let dialog = await openDialog(page);
  const search = dialog.getByRole("searchbox", { name: "Search sizes" });
  await search.fill("story");
  const story = dialog
    .getByRole("radiogroup", { name: "Search results" })
    .getByRole("radio", { name: /^Instagram story,/ });
  await story.click();
  await expect(dialog.getByLabel("Width (px)")).toHaveValue("1080");
  await expect(dialog.getByLabel("Height (px)")).toHaveValue("1920");
  // Enter in the search box doesn't create the document.
  await search.press("Enter");
  await expect(dialog).toBeVisible();
  await search.fill("nothing like this");
  await expect(dialog.getByText(/No sizes match/)).toBeVisible();
  await search.fill("");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toBeHidden();

  // Recent opens first next time, and survives a reload.
  await page.reload();
  dialog = await openDialog(page);
  await expect(dialog.getByRole("tab", { name: "Recent" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(dialog.getByRole("radio", { name: /^1080 × 1920 px,/ })).toBeVisible();
});

test("arrow keys move through presets and limits are explained", async ({ page }) => {
  await openEditor(page);
  const dialog = await openDialog(page);
  await dialog.getByRole("tab", { name: "Screen" }).click();
  const first = dialog.getByRole("radio", { name: /^VGA,/ });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("radio", { name: /^XGA,/ })).toBeFocused();
  await expect(dialog.getByLabel("Width (px)")).toHaveValue("1024");

  await dialog.getByLabel("Units").selectOption("in");
  await dialog.getByLabel("Width (in)").fill("100");
  await dialog.getByLabel("Resolution (ppi)").fill("300");
  await expect(dialog.getByText(/at most 12,000 pixels/)).toBeVisible();
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByRole("alert")).toContainText("at most 12,000 pixels");
  await expect(dialog).toBeVisible();
});
