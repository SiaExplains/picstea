/**
 * Large-document profiling harness (ADR-0012). Run against a production build:
 *
 *   pnpm build && pnpm start -p 3200   # in another terminal
 *   node scripts/profile-large.mjs http://localhost:3200/ 6000 4000 [dpr]
 *
 * Builds a 6000 × 4000 composition (photo, shapes, drop shadow, Hue/Saturation adjustment) and
 * reports wall time, main-thread long tasks and JS heap for common interactions.
 */
import { chromium } from "@playwright/test";
const BASE = process.argv[2] ?? "http://localhost:3200/";
const W = Number(process.argv[3] ?? 6000),
  H = Number(process.argv[4] ?? 4000);
const DPR = Number(process.argv[5] ?? 1);
const mod = process.platform === "darwin" ? "Meta" : "Control";
const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: DPR,
});
await page.addInitScript(() => {
  localStorage.setItem("mylper.welcomeSeen", "1");
  window.__lt = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__lt.push(e.duration);
  }).observe({ type: "longtask", buffered: true });
});
await page.goto(BASE);
await page.waitForSelector("text=New document");
// A big photo-like PNG made in the page.
const b64 = await page.evaluate(
  async ([w, h]) => {
    const c = new OffscreenCanvas(w, h);
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#335");
    g.addColorStop(1, "#fc8");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      x.fillStyle = `hsl(${(i * 37) % 360} 60% 50% / .5)`;
      x.beginPath();
      x.arc((i * 997) % w, (i * 613) % h, 40 + (i % 90), 0, 7);
      x.fill();
    }
    const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 32768)
      s += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(s);
  },
  [W, H],
);
const reset = () =>
  page.evaluate(() => {
    window.__lt = [];
  });
const stats = async (label, t0) => {
  const lt = await page.evaluate(() => window.__lt);
  const mem = await page.evaluate(() =>
    performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1,
  );
  console.log(
    `${label.padEnd(34)} wall ${String(Date.now() - t0).padStart(6)} ms | longtasks ${String(lt.length).padStart(3)} total ${String(Math.round(lt.reduce((a, b) => a + b, 0))).padStart(6)} ms max ${String(Math.round(Math.max(0, ...lt))).padStart(5)} ms | heap ${mem} MB`,
  );
};
const frame = () =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
let t = Date.now();
await reset();
await page
  .getByTestId("file-input")
  .setInputFiles({ name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.from(b64, "base64") });
await page.getByRole("tab", { name: /big/ }).waitFor();
await frame();
await stats(`open ${W}x${H} JPEG`, t);
const vp = await page.getByTestId("canvas-viewport").boundingBox();
const cx = vp.x + vp.width / 2,
  cy = vp.y + vp.height / 2;
async function dragPath(steps, dx, dy) {
  await page.mouse.move(cx - 150, cy - 50);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++)
    await page.mouse.move(cx - 150 + (dx * i) / steps, cy - 50 + (dy * i) / steps);
  await page.mouse.up();
  await frame();
}
// Layers
await page.keyboard.press("u");
await dragPath(5, 200, 120);
await page.keyboard.press("u");
await page.mouse.move(cx + 100, cy + 50);
await page.mouse.down();
await page.mouse.move(cx + 250, cy + 150, { steps: 3 });
await page.mouse.up();
await page.getByRole("checkbox", { name: "Drop shadow" }).check();
await frame();
await page.getByRole("menuitem", { name: "Adjustments" }).click();
t = Date.now();
await reset();
await page.getByRole("menuitem", { name: "Hue/Saturation…" }).click();
await frame();
await stats("add Hue/Saturation adjustment", t);
const sat = page.getByRole("slider", { name: "Saturation" });
t = Date.now();
await reset();
for (const v of [-10, -20, -30, -40, -50]) {
  await sat.fill(String(v));
  await frame();
}
await stats("drag adjustment slider (5 steps)", t);
// Brush on a new layer below the adjustment
await page.keyboard.press(`${mod}+Shift+n`);
await page.keyboard.press("b");
t = Date.now();
await reset();
await dragPath(40, 300, 100);
await stats("brush stroke (40 moves)", t);
// Move tool drag of a shape below adjustment
await page.keyboard.press("v");
t = Date.now();
await reset();
await page.mouse.move(cx + 175, cy + 100);
await page.mouse.down();
for (let i = 1; i <= 30; i++) await page.mouse.move(cx + 175 + i * 4, cy + 100 + i * 2);
await page.mouse.up();
await frame();
await stats("move-tool drag (30 moves)", t);
// Zoom & pan
t = Date.now();
await reset();
for (let i = 0; i < 10; i++) {
  await page.mouse.wheel(0, i < 5 ? -200 : 200);
  await frame();
}
await stats("wheel zoom x10", t);
t = Date.now();
await reset();
await page.keyboard.down("Space");
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let i = 1; i <= 30; i++) await page.mouse.move(cx + i * 5, cy + i * 3);
await page.mouse.up();
await page.keyboard.up("Space");
await frame();
await stats("space-pan (30 moves)", t);
// Magic wand
await page.keyboard.press("w");
t = Date.now();
await reset();
await page.mouse.click(cx - 300, cy - 200);
await frame();
await stats("magic wand click", t);
await page.keyboard.press(`${mod}+d`);
// Post-9b workload (launch-readiness pass): 9h styles and adjustments, retouching,
// multi-layer and smart object transforms.
await page.keyboard.press("v");
await page.getByRole("button", { name: "Rectangle 2", exact: true }).click();
for (const name of ["Inner shadow", "Bevel", "Gradient overlay"]) {
  await page.getByRole("checkbox", { name }).check();
}
await frame();
for (const item of ["Gradient Map…", "Channel Mixer…"]) {
  await page.getByRole("menuitem", { name: "Adjustments" }).click();
  t = Date.now();
  await reset();
  await page.getByRole("menuitem", { name: item }).click();
  await frame();
  await stats(`add ${item.replace("…", "")}`, t);
}
await page.getByRole("button", { name: "big", exact: true }).click();
await page.keyboard.press("j");
await page.keyboard.down("Alt");
await page.mouse.click(cx - 250, cy - 150);
await page.keyboard.up("Alt");
t = Date.now();
await reset();
await dragPath(40, 300, 100);
await stats("healing stroke (40 moves)", t);
await page.keyboard.press("v");
await page.getByRole("button", { name: "Rectangle 1", exact: true }).click();
await page.getByRole("button", { name: "Rectangle 2", exact: true }).click({ modifiers: [mod] });
t = Date.now();
await reset();
await page.mouse.move(cx + 175, cy + 100);
await page.mouse.down();
for (let i = 1; i <= 30; i++) await page.mouse.move(cx + 175 + i * 4, cy + 100 + i * 2);
await page.mouse.up();
await frame();
await stats("multi-layer drag (30 moves)", t);
await page.getByRole("button", { name: "Rectangle 1", exact: true }).click();
await page.getByRole("menuitem", { name: "Layer", exact: true }).click();
await page.getByRole("menuitem", { name: "Convert to Smart Object" }).click();
await frame();
t = Date.now();
await reset();
await page.mouse.move(cx - 100, cy);
await page.mouse.down();
for (let i = 1; i <= 30; i++) await page.mouse.move(cx - 100 + i * 4, cy + i * 2);
await page.mouse.up();
await frame();
await stats("smart object drag (30 moves)", t);
// Save
t = Date.now();
await reset();
await page.keyboard.press(`${mod}+s`);
await page
  .getByTestId("save-state")
  .filter({ hasText: "Saved in this browser" })
  .waitFor({ timeout: 120000 });
await stats("save to IndexedDB", t);
// Export PSD
await page.evaluate(() => {
  delete window.showSaveFilePicker;
});
await page.keyboard.press(`${mod}+Shift+e`);
const dlg = page.getByRole("dialog", { name: "Export" });
await dlg.getByLabel("PSD", { exact: true }).check();
t = Date.now();
await reset();
const dl = page.waitForEvent("download", { timeout: 180000 });
await dlg.getByRole("button", { name: "Export" }).click();
await dl;
await stats("export PSD", t);
await browser.close();
