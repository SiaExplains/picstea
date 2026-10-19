import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { at, drag, MOD, newDocument, trackErrors, pickMenu } from "./helpers";

/**
 * Gate 9j (ADR-0022): exports, the magic wand and Color Range draw the document in the worker,
 * and the result is the same as drawing it on the page (the fallback when there is no worker).
 */

/** Record which jobs the page sends to its worker. */
async function recordJobs(page: Page) {
  await page.addInitScript(() => {
    const log: string[] = [];
    (window as unknown as { __jobs: string[] }).__jobs = log;
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, message: unknown, ...rest: never[]) {
      const m = message as { name?: string; input?: { source?: unknown } };
      if (m?.name) log.push(m.input?.source ? `${m.name}+image` : m.name);
      return post.call(this, message, ...rest);
    } as Worker["postMessage"];
  });
}

const jobs = (page: Page) =>
  page.evaluate(() => (window as unknown as { __jobs: string[] }).__jobs);

/** Pixels, adjustments, a shape with an effect and text: everything the compositor draws. */
async function buildDocument(page: Page) {
  await newDocument(page, "Worker");
  await page.keyboard.press(`${MOD}+Shift+n`);
  await page.keyboard.press("b");
  await drag(page, [40, 60], [260, 120]);
  await page.keyboard.press("u");
  await drag(page, [300, 200], [420, 320]);
  await page.getByRole("checkbox", { name: "Drop shadow" }).check();
  await page.keyboard.press("t");
  const p = await at(page, 80, 300);
  await page.mouse.click(p.x, p.y);
  await page.keyboard.type("Off thread");
  await page.keyboard.press(`${MOD}+Enter`);
  await pickMenu(page, "Layer", "Gradient Map…");
}

async function exportPng(page: Page): Promise<Buffer> {
  await page.keyboard.press(`${MOD}+Shift+e`);
  const dialog = page.getByRole("dialog", { name: "Export" });
  await dialog.getByLabel("PNG").check();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export" }).click();
  const file = await download;
  await expect(dialog).toBeHidden();
  return readFile((await file.path())!);
}

/** Decode a PNG in the page and return its RGBA bytes. */
async function decode(page: Page, png: Buffer): Promise<number[]> {
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    return [...ctx.getImageData(0, 0, bitmap.width, bitmap.height).data];
  }, png.toString("base64"));
}

test("export draws in the worker and matches the page's own drawing", async ({ browser }) => {
  // With a worker.
  const withWorker = await browser.newPage();
  const errors = trackErrors(withWorker);
  await recordJobs(withWorker);
  await buildDocument(withWorker);
  const offThread = await decode(withWorker, await exportPng(withWorker));
  expect(await jobs(withWorker)).toContain("exportDocument");
  expect(errors).toEqual([]);

  // Without workers the page draws it, as before.
  const withoutWorker = await browser.newPage();
  await withoutWorker.addInitScript(() => {
    (window as unknown as { Worker: undefined }).Worker = undefined;
  });
  await buildDocument(withoutWorker);
  const onPage = await decode(withoutWorker, await exportPng(withoutWorker));

  expect(offThread.length).toBe(onPage.length);
  let differing = 0;
  let maxDiff = 0;
  for (let i = 0; i < onPage.length; i++) {
    const d = Math.abs(offThread[i] - onPage[i]);
    if (d > 0) differing++;
    maxDiff = Math.max(maxDiff, d);
  }
  expect({ differing, maxDiff }).toEqual({ differing: 0, maxDiff: 0 });
  await withWorker.close();
  await withoutWorker.close();
});

test("the magic wand and Color Range draw in the worker; slider steps reuse the drawing", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await recordJobs(page);
  await newDocument(page, "Sampling");
  await page.keyboard.press("u");
  await drag(page, [100, 100], [200, 180]);

  await page.keyboard.press("w");
  const p = await at(page, 150, 140);
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId("selection-size")).toHaveText("Selection 100 × 80");
  expect(await jobs(page)).toContain("floodDocument");

  await page.keyboard.press(`${MOD}+d`);
  await page.getByRole("menuitem", { name: "Select", exact: true }).click();
  await page.getByRole("menuitem", { name: "Color Range…" }).click();
  const dialog = page.getByRole("dialog", { name: "Color Range" });
  await expect(dialog.getByText(/px area|Nothing matches/)).toBeVisible();
  const fuzz = dialog.getByLabel(/Fuzziness/);
  for (const value of ["10", "60", "120"]) {
    await fuzz.fill(value);
    await expect(dialog.getByText(`Fuzziness: ${value}`)).toBeVisible();
  }
  await expect(dialog.getByText(/px area|Nothing matches/)).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  const sent = (await jobs(page)).filter((j) => j.startsWith("colorRangeDocument"));
  // The image went over once; the slider steps only sent the colour test.
  expect(sent.filter((j) => j.endsWith("+image"))).toHaveLength(1);
  expect(sent.length).toBeGreaterThanOrEqual(2);
  expect(await jobs(page)).toContain("colorRangeRelease");
  expect(errors).toEqual([]);
});
