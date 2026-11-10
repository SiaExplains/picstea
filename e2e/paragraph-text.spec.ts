import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  at,
  darkest,
  drag,
  layerNames,
  MOD,
  newDocument,
  pickMenu,
  trackErrors,
  watchNetwork,
} from "./helpers";

const LONG = "The quick brown fox jumps over the lazy dog again and again";

/** Draw a text box with the Type tool and type into it. */
async function typeInBox(page: Page, text: string) {
  await page.keyboard.press("t");
  await drag(page, [50, 50], [300, 300]);
  const editor = page.getByRole("textbox", { name: "Edit text on canvas" });
  await expect(editor).toBeFocused();
  await page.keyboard.type(text);
  return editor;
}

test("dragging a box makes paragraph text that wraps; it converts to point text and back", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await newDocument(page, "Paragraphs");
  await typeInBox(page, LONG);
  await page.keyboard.press(`${MOD}+Enter`);
  expect((await layerNames(page))[0]).toMatch(/^The quick brown fox/);

  // The text wrapped: there is ink on several lines inside the box, none to its right.
  await expect(page.getByLabel("Box W")).toHaveValue("250");
  expect(await darkest(page, 50, 50, 250, 40)).toBeLessThan(100);
  expect(await darkest(page, 50, 100, 250, 40)).toBeLessThan(100);
  expect(await darkest(page, 320, 50, 200, 60)).toBeGreaterThan(200);

  await pickMenu(page, "Layer", "Convert to Point Text");
  await expect(page.getByLabel("Box W")).toHaveCount(0);
  // The lines are kept as they wrapped.
  await expect(page.locator("#prop-text")).toHaveValue(/\n/);
  await page.keyboard.press(`${MOD}+z`);
  await expect(page.getByLabel("Box W")).toHaveValue("250");
  expect(errors).toEqual([]);
});

test("the Character panel styles only the selected characters", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Styled");
  // Menus finish the text being typed, so the panel is opened first.
  await pickMenu(page, "Window", "Character");
  const editor = await typeInBox(page, "Plain Bold");
  await page.keyboard.down("Shift");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  await page.keyboard.up("Shift");
  await page
    .getByRole("tabpanel", { name: "Character" })
    .getByRole("button", { name: "B", exact: true })
    .click();
  // Two styled runs show while typing.
  await expect(editor.locator("span")).toHaveCount(2);
  await page.keyboard.press(`${MOD}+Enter`);

  // Re-editing shows the same two runs; one undo step removes the whole edit.
  const p = await at(page, 80, 70);
  await page.mouse.click(p.x, p.y);
  await expect(editor.locator("span")).toHaveCount(2);
  await expect(editor.locator("span").last()).toHaveCSS("font-weight", "700");
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("Google Fonts and uploaded fonts come from Picstea and survive a reload", async ({ page }) => {
  const errors = trackErrors(page);
  const offending = watchNetwork(page);
  await newDocument(page, "Fonts");
  await page.keyboard.press("t");
  const p = await at(page, 60, 80);
  await page.mouse.click(p.x, p.y);
  await page.keyboard.type("Fancy");
  await page.keyboard.press(`${MOD}+Enter`);

  // A bundled Google Font, from the search box.
  const picker = page.locator("[data-panel='properties']").getByRole("button", { name: /^Font:/ });
  await picker.click();
  await page.getByRole("combobox", { name: "Search fonts" }).fill("lobster");
  await page.getByRole("option", { name: "Lobster" }).click();
  await expect(picker).toHaveText("Lobster");
  await expect.poll(() => page.evaluate(() => document.fonts.check('16px "Lobster"'))).toBe(true);

  // An uploaded font file (here: one of the bundled files under another name).
  const bytes = readFileSync(join("public", "fonts", "caveat", "caveat-latin-400-normal.woff2"));
  await picker.click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload Font…" }).click();
  await (
    await chooser
  ).setFiles({ name: "Brand-Script.woff2", mimeType: "font/woff2", buffer: bytes });
  await expect(picker).toHaveText("Brand Script");

  await page.keyboard.press(`${MOD}+s`);
  await expect(page.getByTestId("save-state")).toHaveText("Saved in this browser");
  await page.reload();
  await page
    .getByRole("list", { name: "Recent projects" })
    .getByRole("button", { name: /^Fonts/ })
    .click();
  await page.getByRole("button", { name: "Fancy", exact: true }).click();
  await expect(picker).toHaveText("Brand Script");
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('16px "Brand Script"')))
    .toBe(true);
  await expect(page.getByText(/not available here/)).toHaveCount(0);

  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});
