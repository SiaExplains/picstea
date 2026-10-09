import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { readZip } from "../src/editor/formats/zip/zip";
import {
  drag,
  MOD,
  newDocument,
  openEditor,
  pixel,
  setForegroundColor,
  trackErrors,
} from "./helpers";

async function menu(page: Page, name: string, item: string) {
  await page.getByRole("menuitem", { name, exact: true }).click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

async function panelTab(page: Page, name: "History" | "Swatches" | "Actions") {
  await page.getByRole("tablist", { name: "Panels" }).getByRole("tab", { name }).click();
}

/** A black square on a new pixel layer, as the starting point for the action. */
async function blackSquare(page: Page) {
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("m");
  await drag(page, [100, 100], [300, 300]);
  await page.keyboard.press("Shift+F5");
  await page.keyboard.press(`${MOD}+d`);
}

async function sample(page: Page): Promise<number[][]> {
  const out: number[][] = [];
  for (const [x, y] of [
    [150, 150],
    [298, 200],
    [350, 200],
    [450, 250],
    [520, 300],
  ]) {
    out.push(await pixel(page, x, y));
  }
  return out;
}

const close = (a: number[][], b: number[][]) =>
  a.every((p, i) => p.every((v, c) => Math.abs(v - b[i][c]) <= 2));

test("records an action and plays it back as one undo step", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Recorded");
  await blackSquare(page);

  await panelTab(page, "Actions");
  await page.getByRole("button", { name: "New…" }).click();
  const naming = page.getByRole("dialog", { name: "New Action" });
  await naming.getByLabel("Name").fill("Flip blur invert");
  await naming.getByRole("button", { name: "Record" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Recording" })).toBeVisible();

  await menu(page, "Layer", "Flip Horizontal");
  await menu(page, "Filter", "Gaussian Blur…");
  const blur = page.getByRole("dialog", { name: "Gaussian Blur" });
  await blur.getByLabel("Radius (px)").fill("4");
  await blur.getByRole("button", { name: "OK" }).click();
  await expect(blur).toBeHidden();
  await menu(page, "Adjustments", "Invert…");
  await page.getByRole("button", { name: "Stop" }).click();

  await page.getByRole("button", { name: "Show steps of Flip blur invert" }).click();
  await expect(
    page.getByRole("list", { name: "Steps of Flip blur invert" }).getByRole("listitem"),
  ).toHaveText([/^Flip Horizontal/, /^Gaussian Blur/, /^Invert Adjustment Layer/]);
  await page.mouse.move(1, 1);
  const recorded = await sample(page);

  // The same start in a second document, then Play.
  await page.getByRole("menuitem", { name: "File", exact: true }).click();
  await page.getByRole("menuitem", { name: "New…" }).click();
  const dialog = page.getByRole("dialog", { name: "New document" });
  await dialog.getByLabel("Width (px)").fill("600");
  await dialog.getByLabel("Height (px)").fill("400");
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "100%" }).click();
  await blackSquare(page);
  await page.mouse.move(1, 1);
  const before = await sample(page);

  await page.getByRole("button", { name: "Play" }).click();
  await expect.poll(async () => close(await sample(page), recorded)).toBe(true);

  await panelTab(page, "History");
  const history = page.getByRole("listbox", { name: "History" });
  await expect(history.getByRole("option").last()).toHaveText("Action: Flip blur invert");
  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(async () => close(await sample(page), before)).toBe(true);
  expect(errors).toEqual([]);
});

test("the History panel jumps back and forward", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Undo steps");
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press(`${MOD}+Shift+n`);
  await panelTab(page, "History");
  const history = page.getByRole("listbox", { name: "History" });
  await expect(history.getByRole("option")).toHaveCount(4);
  await expect(history.getByRole("option", { selected: true })).toHaveText("New Layer");

  await history.getByRole("option").nth(1).click();
  await expect(page.getByRole("button", { name: /^Layer \d$/ })).toHaveCount(1);
  await expect(history.getByRole("option", { selected: true })).toHaveText("New Layer");
  await expect(history.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");

  await history.getByRole("option").first().click();
  await expect(page.getByRole("button", { name: /^Layer \d$/ })).toHaveCount(0);
  await history.press("End");
  await expect(page.getByRole("button", { name: /^Layer \d$/ })).toHaveCount(3);
  await history.press("ArrowUp");
  await expect(page.getByRole("button", { name: /^Layer \d$/ })).toHaveCount(2);
  // A new edit drops the steps after the current one.
  await page.keyboard.press(`${MOD}+Shift+n`);
  await expect(history.getByRole("option")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("colour picker sets the foreground; swatches are kept", async ({ page }) => {
  const errors = trackErrors(page);
  await newDocument(page, "Colours");
  await setForegroundColor(page, "#12ab9f");

  // Keyboard on the saturation/brightness field changes the colour; Cancel keeps the old one.
  await page.getByRole("button", { name: "Foreground colour" }).click();
  const picker = page.getByRole("dialog", { name: "Foreground Colour" });
  await expect(picker.getByLabel("Red")).toHaveValue("18");
  await picker.getByRole("slider", { name: "Saturation and brightness" }).press("Shift+ArrowDown");
  await expect(picker.getByLabel("Hex")).not.toHaveValue("12ab9f");
  await picker.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Foreground colour" })).toHaveAttribute(
    "data-color",
    "#12ab9f",
  );

  await page.getByRole("button", { name: "Foreground colour" }).click();
  await picker.getByRole("button", { name: "Add to Swatches" }).click();
  await picker.getByRole("button", { name: "Cancel" }).click();
  await panelTab(page, "Swatches");
  await expect(page.getByRole("button", { name: "Swatch #12ab9f" })).toBeVisible();

  // A swatch sets the colour; Alt-click sets the background.
  await page.getByRole("button", { name: "Swatch #ff0000" }).click();
  await expect(page.getByRole("button", { name: "Foreground colour" })).toHaveAttribute(
    "data-color",
    "#ff0000",
  );
  await page.getByRole("button", { name: "Swatch #0000ff" }).click({ modifiers: ["Alt"] });
  await expect(page.getByRole("button", { name: "Background colour" })).toHaveAttribute(
    "data-color",
    "#0000ff",
  );
  await page.getByRole("button", { name: "Swatch #000000" }).press("Delete");
  await expect(page.getByRole("button", { name: "Swatch #000000" })).toHaveCount(0);

  // Swatches are remembered in this browser.
  await page.reload();
  await panelTab(page, "Swatches");
  await expect(page.getByRole("button", { name: "Swatch #12ab9f" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Swatch #000000" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Batch plays an action on several files into one ZIP", async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
  await openEditor(page);
  const images = await page.evaluate(() =>
    [
      [40, 30],
      [20, 50],
    ].map(([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
  );

  // An imported action: invert, so white images come out black.
  const actions = JSON.stringify({
    format: "mylper-actions",
    version: 1,
    actions: [{ name: "Invert", steps: [{ type: "adjustment", adjustment: { type: "invert" } }] }],
  });
  await panelTab(page, "Actions");
  await page.getByTestId("actions-import").setInputFiles({
    name: "actions.json",
    mimeType: "application/json",
    buffer: Buffer.from(actions),
  });
  await expect(page.getByRole("button", { name: /^Invert/ })).toBeVisible();

  await menu(page, "File", "Batch…");
  const dialog = page.getByRole("dialog", { name: "Batch" });
  await dialog.getByLabel(/Files/).setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: Buffer.from(images[0], "base64") },
    { name: "two.png", mimeType: "image/png", buffer: Buffer.from(images[1], "base64") },
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") },
  ]);
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Run" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Invert batch.zip");
  const zip = readZip(new Uint8Array(await readFile((await file.path())!)), {
    maxEntries: 10,
    maxEntryBytes: 10_000_000,
    maxTotalBytes: 10_000_000,
  });
  expect([...zip.keys()]).toEqual(["one.png", "two.png"]);

  // The output really is inverted (white → black) and keeps its size.
  const one = await zip.get("one.png")!.read();
  const decoded = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    return { size: [bitmap.width, bitmap.height], rgba: [...ctx.getImageData(5, 5, 1, 1).data] };
  }, Buffer.from(one).toString("base64"));
  expect(decoded).toEqual({ size: [40, 30], rgba: [0, 0, 0, 255] });
  // Batch documents were closed and never stored.
  await expect(page.getByRole("tablist", { name: "Open documents" }).getByRole("tab")).toHaveCount(
    0,
  );
  await expect(page.getByText("1 file(s) could not be processed: notes.txt")).toBeVisible();
  expect(errors).toEqual([]);
});
