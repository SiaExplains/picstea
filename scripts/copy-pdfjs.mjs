// Copies the unmodified PDF.js build, its worker, character maps, standard fonts, WebAssembly
// image decoders and licence into public/vendor (ADR-0045), so PDFs open without any network
// request to another site. Run after changing the pdfjs-dist version: `node scripts/copy-pdfjs.mjs`,
// then update PDFJS_BASE in src/editor/formats/pdf/pdf-read.ts and the /about page.
import { cpSync, copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "node_modules", "pdfjs-dist");
const { version } = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"));
const target = join(root, "public", "vendor", "pdfjs", version);
mkdirSync(target, { recursive: true });
for (const file of ["pdf.min.mjs", "pdf.worker.min.mjs"]) {
  copyFileSync(join(pkg, "build", file), join(target, file));
}
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  cpSync(join(pkg, dir), join(target, dir), { recursive: true });
}
copyFileSync(join(pkg, "LICENSE"), join(target, "LICENSE-pdfjs.txt"));
console.log(`Copied pdfjs-dist ${version} to ${target}`);
