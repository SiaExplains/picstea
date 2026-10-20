// Copies the unmodified libheif-js ES module and its licences into public/vendor (ADR-0038).
// Run after changing the libheif-js version: `node scripts/copy-libheif.mjs`, then update
// HEIC_MODULE_URL in src/editor/formats/heic/heic.ts and the /about page.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "node_modules", "libheif-js");
const { version } = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"));
const target = join(root, "public", "vendor", "libheif", version);
mkdirSync(target, { recursive: true });
copyFileSync(join(pkg, "libheif-wasm", "libheif-bundle.mjs"), join(target, "libheif-bundle.mjs"));
copyFileSync(join(pkg, "libheif-wasm", "LICENSE"), join(target, "LICENSE-libheif.txt"));
copyFileSync(join(pkg, "LICENSE"), join(target, "LICENSE-libheif-js.txt"));
console.log(`Copied libheif-js ${version} to ${target}`);
