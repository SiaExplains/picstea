import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { openEditor, trackErrors, watchNetwork } from "./helpers";

/** Made with macOS `sips -s format heic`: a 40 × 20 image, left half red, right half blue. */
const fixture = (name: string) => join(__dirname, "fixtures", name);

test("the editor opens HEIC photos on the device, upright", async ({ page }) => {
  const errors = trackErrors(page);
  const offending = watchNetwork(page);
  await openEditor(page);
  await page.getByTestId("file-input").setInputFiles(fixture("red-blue.heic"));
  const status = page.getByRole("contentinfo", { name: "Status" });
  await expect(status).toContainText("40 × 20 px");
  await expect(page.getByRole("tab", { name: /^red-blue$/ })).toBeVisible();

  // Rotated 90° by sips: the editor shows it the way the file says.
  await page.getByTestId("file-input").setInputFiles(fixture("rotated.heic"));
  await expect(status).toContainText("20 × 40 px");

  // The decoder came from Picstea's own origin; nothing else was requested.
  expect(offending).toEqual([]);
  expect(errors).toEqual([]);
});

test("HEIC converts to JPG under the editor's security policy", async ({ page, request }) => {
  const csp = (await request.get("/")).headers()["content-security-policy"];
  expect(csp).toContain("'wasm-unsafe-eval'");
  expect(csp).toContain("connect-src 'self'");

  const errors = trackErrors(page);
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
  await page.goto("/?convert=heic-to-jpg");
  const dialog = page.getByRole("dialog", { name: "Convert HEIC to JPG" });
  await expect(dialog.getByRole("radio", { name: "JPEG" })).toBeChecked();
  await dialog.getByLabel("Files").setInputFiles(fixture("red-blue.heic"));
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Convert" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("red-blue.jpg");
  const bytes = await readFile((await file.path())!);
  expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  expect(errors).toEqual([]);
});
