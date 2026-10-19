import { isValidElement, type ReactNode } from "react";
import { publishedPosts } from "@/content/blog";
import { DOCS } from "@/content/docs";
import { absoluteUrl, SITE } from "./site";

/**
 * /llms.txt and /llms-full.txt (llmstxt.org): a plain Markdown summary for AI assistants and AI
 * search, built from the same content as the website so it never claims anything the site
 * doesn't (docs/10 "AEO"). Every fact here must be true of the editor today.
 */

const LANDING_PAGES: readonly [path: string, title: string, summary: string][] = [
  ["/", "Picstea editor", "The editor itself: opens straight away in the browser, no sign-up."],
  [
    "/online-photo-editor",
    "Free online photo editor with layers",
    "What the editor does and how to edit a photo in four steps.",
  ],
  [
    "/psd-editor",
    "Open and edit PSD files online",
    "Photoshop files in the browser: what opens editable, what becomes pixels.",
  ],
  [
    "/photoshop-alternative",
    "A free Photoshop alternative in the browser",
    "How Picstea compares with desktop Photoshop, honestly.",
  ],
  [
    "/photopea-alternative",
    "Picstea as a Photopea alternative",
    "How Picstea compares with Photopea, including what Photopea does that Picstea doesn't.",
  ],
  ["/faq", "Frequently asked questions", "Short answers about price, privacy, files and devices."],
];

const FACTS = [
  "Free to use, in the browser, with no account and no watermark.",
  "Local-first: images are opened, edited, saved and exported on the user's device. Picstea has no server that receives images; the editor page runs no third-party code and its Content-Security-Policy blocks sending document data anywhere.",
  "Projects are saved automatically in the browser (IndexedDB) and can be downloaded as .picstea project files.",
  "Installable as an app (PWA) and works offline after the first visit; the service worker caches only the app's own files, never images.",
  "Layers: pixel, shape, text, fill and adjustment layers, groups, 16 blend modes, opacity, layer masks, vector masks, clipping masks, colour labels, merge down and flatten.",
  "Adjustment layers include Levels, Curves, Brightness/Contrast, Hue/Saturation, Exposure, Vibrance, Color Balance, Photo Filter, Channel Mixer, Gradient Map, Black & White, Invert, Posterize and Threshold.",
  "Layer styles: all ten Photoshop effects (drop shadow, inner shadow, outer and inner glow, bevel and emboss with contour and texture, satin, colour, gradient and pattern overlay, stroke) with contours, several copies, Fill opacity, global light and saved styles, in a Layer Style dialog.",
  "Selections: rectangular and elliptical marquee, freehand and polygonal lasso, magic wand, Color Range, select layer pixels, feather/expand/contract, transform selection.",
  "Painting and retouching: brush, pencil, eraser, background and magic eraser, paint bucket, gradient, colour replacement, clone stamp, healing and spot healing brush, red eye, dodge, burn, sponge, blur, sharpen and smudge.",
  "Vector tools: pen with add/delete/convert anchor point, path and direct selection, rectangle, rounded rectangle, ellipse, polygon and line shapes, editable text.",
  "Smart objects with non-destructive smart filters; filters such as Gaussian, box and motion blur, Unsharp Mask, noise and pixelate with live preview.",
  "Actions (record and replay edits), batch processing of many files into a ZIP, history panel, swatches, colour sampler and ruler, rulers, guides, grid and snapping.",
  "Opens PNG, JPEG, WebP, GIF, SVG, PSD (8-bit RGB and greyscale) and .picstea projects; exports PNG, JPEG, WebP, SVG, PDF and layered PSD.",
  "PSD import keeps layers, groups, masks, blend modes, editable text, adjustment layers, shapes, smart objects, clipping and vector masks and common layer styles.",
];

const LIMITS = [
  "Cannot open PSB, 16/32-bit or CMYK PSD files, TIFF, PDF or camera RAW files yet.",
  "Some Photoshop features open as pixels: Selective Color and Color Lookup, warped text and Photoshop smart filters; Photoshop pattern images are replaced by built-in patterns.",
  "No AI generation, object selection or content-aware fill; no perspective crop or vertical text yet.",
  "Designed for a mouse or trackpad and keyboard; on phones the layout adapts but works best on larger screens.",
];

const line = (path: string, title: string, summary: string) =>
  `- [${title}](${absoluteUrl(path)}): ${summary}`;

export function llmsTxt(): string {
  return [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description} ${SITE.slogan}`,
    "",
    `${SITE.name} (${SITE.url}) is a layer-based image editor similar in workflow to Adobe Photoshop and Photopea, running entirely in the web browser.`,
    "",
    "## Key facts",
    "",
    ...FACTS.map((f) => `- ${f}`),
    "",
    "## Current limits",
    "",
    ...LIMITS.map((f) => `- ${f}`),
    "",
    "## Pages",
    "",
    ...LANDING_PAGES.map(([p, t, s]) => line(p, t, s)),
    "",
    "## Documentation",
    "",
    ...DOCS.map((d) => line(`/docs/${d.slug}`, d.title, d.description)),
    "",
    "## Guides",
    "",
    ...publishedPosts().map((p) => line(`/blog/${p.slug}`, p.title, p.description)),
    "",
    "## Optional",
    "",
    line("/llms-full.txt", "Full documentation as text", "Every documentation page in one file."),
    line("/privacy", "Privacy", "How data is handled; images never leave the device."),
    "",
  ].join("\n");
}

const BLOCK_PREFIX: Record<string, string> = {
  h2: "\n\n## ",
  h3: "\n\n### ",
  p: "\n\n",
  ul: "\n",
  ol: "\n",
  li: "\n- ",
  dt: "\n\n",
  dd: "\n",
  tr: "\n",
  table: "\n",
};

/**
 * Readable text of page content written as JSX: headings and list items keep a Markdown shape.
 * Components (links) contribute their children's text, so nothing has to be rendered.
 */
export function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (!isValidElement(node)) return "";
  const { children } = node.props as { children?: ReactNode };
  const inner = nodeToText(children);
  if (typeof node.type !== "string") return inner;
  if (node.type === "td" || node.type === "th") return `${inner} | `;
  if (node.type === "code") return `\`${inner}\``;
  if (node.type === "strong") return `**${inner}**`;
  return (BLOCK_PREFIX[node.type] ?? "") + inner;
}

const tidy = (text: string) =>
  text
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export function llmsFullTxt(): string {
  const docs = DOCS.map(
    (d) =>
      `# ${d.title}\n\nSource: ${absoluteUrl(`/docs/${d.slug}`)}\nUpdated: ${d.updated}\n\n${d.description}\n\n${tidy(nodeToText(d.body()))}`,
  );
  return (
    [`# ${SITE.name} documentation\n\n> ${SITE.description}`, ...docs].join("\n\n---\n\n") + "\n"
  );
}
