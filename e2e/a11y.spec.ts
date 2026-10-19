import { expect, test, type Page } from "@playwright/test";
import { audit, describeViolations, type AuditOptions } from "./a11y";
import { drag, MOD, newDocument, openEditor, pickMenu } from "./helpers";

/** Paths listed in the sitemap, plus the 404 page. */
async function sitePaths(page: Page): Promise<string[]> {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  return [...new Set(paths.filter((p) => p !== "/")), "/this-page-does-not-exist"];
}

/** Findings across all states of a test, so one run shows every problem. */
let findings: string[] = [];

async function expectClean(page: Page, where: string, options: AuditOptions = {}) {
  const violations = await audit(page, options);
  if (violations.length) findings.push(`${where}\n${describeViolations(violations)}`);
}

test.beforeEach(() => {
  findings = [];
});

test.afterEach(() => {
  expect(findings, findings.join("\n\n")).toEqual([]);
});

test("the auditor finds known violations", async ({ page }) => {
  await page.setContent(`
    <html><head><title></title></head><body style="background:#fff">
      <button></button>
      <input type="text">
      <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
      <div tabindex="0">focus me</div>
      <span tabindex="3" role="button">positive</span>
      <p style="color:#bbb">low contrast</p>
      <h1>One</h1><h3>Skipped</h3>
      <div aria-labelledby="nope" role="dialog" open></div>
      <i id="x"></i><b id="x"></b>
    </body></html>`);
  const rules = new Set((await audit(page, { requireH1: true })).map((v) => v.rule));
  for (const rule of [
    "html-lang",
    "document-title",
    "name",
    "img-alt",
    "focusable-role",
    "tabindex",
    "contrast",
    "heading-order",
    "aria-reference",
    "duplicate-id",
  ]) {
    expect(rules, rule).toContain(rule);
  }
});

test("site pages pass the accessibility audit", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/docs");
  for (const path of await sitePaths(page)) {
    await page.goto(path);
    await expectClean(page, path, { requireH1: true });
  }
});

test("the editor passes the accessibility audit in its main states", async ({ page }) => {
  test.setTimeout(120_000);
  await openEditor(page);
  await expectClean(page, "start screen");
  await newDocument(page, "Audit");
  await expectClean(page, "document open");

  // Each menu.
  for (const name of [
    "File",
    "Edit",
    "Image",
    "Layer",
    "Select",
    "Filter",
    "View",
    "Window",
    "Help",
  ]) {
    await page.getByRole("menuitem", { name, exact: true }).click();
    await expectClean(page, `${name} menu`);
    await page.keyboard.press("Escape");
  }
  // A submenu open beside its menu.
  await page.getByRole("menuitem", { name: "Layer", exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menu", { name: "New" })).toBeVisible();
  await expectClean(page, "Layer → New submenu");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  // Dialogs.
  const dialogs: [string, () => Promise<void>, string][] = [
    ["New document", () => page.keyboard.press(`${MOD}+Alt+n`), "New document"],
    ["Export", () => page.keyboard.press(`${MOD}+Shift+e`), "Export"],
    [
      "Colour picker",
      () => page.getByRole("button", { name: "Foreground colour" }).click(),
      "Foreground Colour",
    ],
    [
      "Batch",
      async () => {
        await pickMenu(page, "File", "Batch…");
      },
      "Batch",
    ],
  ];
  for (const [where, open, name] of dialogs) {
    await open();
    await expect(page.getByRole("dialog", { name })).toBeVisible();
    await expectClean(page, `${where} dialog`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name })).toBeHidden();
  }

  // Size presets: a physical-unit category and search results.
  await page.keyboard.press(`${MOD}+Alt+n`);
  const newDoc = page.getByRole("dialog", { name: "New document" });
  await newDoc.getByRole("tab", { name: "Print" }).click();
  await newDoc.getByRole("radio", { name: /^A4,/ }).click();
  await expectClean(page, "New document, Print");
  await newDoc.getByRole("searchbox", { name: "Search sizes" }).fill("story");
  await expectClean(page, "New document, search");
  await newDoc.getByRole("button", { name: "Cancel" }).click();
  await expect(newDoc).toBeHidden();

  // Properties for each kind of layer, and the tool options of every tool.
  await page.keyboard.press(`${MOD}+Shift+n`);
  await expectClean(page, "pixel layer");
  await page.keyboard.press("u");
  await drag(page, [50, 50], [150, 150]);
  await expectClean(page, "shape layer");
  await pickMenu(page, "Layer", "Gradient Map…");
  await expectClean(page, "gradient map");
  await pickMenu(page, "Layer", "Curves…");
  await expectClean(page, "curves");
  await page.keyboard.press(`${MOD}+Alt+a`);
  await expectClean(page, "multi-selection");
  for (const key of [
    "v",
    "m",
    "l",
    "w",
    "c",
    "i",
    "b",
    "n",
    "e",
    "s",
    "j",
    "o",
    "r",
    "g",
    "u",
    "p",
    "a",
    "t",
    "h",
    "z",
  ]) {
    await page.keyboard.press(key);
    await expectClean(page, `tool ${key}`);
  }
  for (const tab of ["History", "Swatches", "Actions"]) {
    await page.getByRole("tablist", { name: "Panels" }).getByRole("tab", { name: tab }).click();
    await expectClean(page, `${tab} panel`);
  }
});
