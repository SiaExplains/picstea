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
    "/png-editor",
    "Free online PNG editor with transparency",
    "Edit PNG images with layers and transparent backgrounds; lossless PNG export.",
  ],
  [
    "/jpeg-editor",
    "Free online JPEG editor",
    "Fix light and colour, retouch and export JPEG photos at a chosen quality.",
  ],
  [
    "/webp-editor",
    "Free online WebP editor and converter",
    "Open, edit and convert WebP to PNG or JPEG and back, in the browser.",
  ],
  [
    "/image-resizer",
    "Resize an image online",
    "Image Size, Canvas Size, crop and trim; one image at a time (no batch resizing yet).",
  ],
  [
    "/image-compressor",
    "Compress an image online without uploading it",
    "Make files smaller by resizing and exporting JPEG or WebP at a lower quality; no target-size option.",
  ],
  [
    "/photo-filters",
    "Free photo filters and effects online",
    "60+ filters with live preview, incl. Camera Raw, Liquify and the Filter Gallery.",
  ],
  [
    "/convert",
    "Free image converter that never uploads your files",
    "Converts PNG, JPEG, WebP, GIF, SVG, HEIC and PSD files to PNG, JPG or WebP in the browser; one page per conversion under /convert/ (e.g. /convert/webp-to-png).",
  ],
  [
    "/blur-background",
    "How to blur a photo background online",
    "Select the subject and blur the rest with Lens Blur, or use Tilt-Shift / Iris Blur; no AI subject selection.",
  ],
  [
    "/make-background-transparent",
    "How to make a background transparent online",
    "Magic Eraser, Background Eraser or a selection, then PNG/WebP; manual, no automatic background removal.",
  ],
  [
    "/add-text-to-photo",
    "How to add text to a photo online",
    "Type tool, common system fonts, drop shadow and stroke styles; point text only, no wrapping.",
  ],
  [
    "/black-and-white-photo",
    "How to make a photo black and white online",
    "Black & White adjustment layer, Channel Mixer (Monochrome), Gradient Map duotones, keep one colour with a mask.",
  ],
  [
    "/sharpen-image",
    "How to sharpen an image online",
    "Unsharp Mask, Smart Sharpen and High Pass; can't recover badly blurred photos (no AI unblur).",
  ],
  [
    "/liquify",
    "Liquify a photo online",
    "Forward Warp, Twirl, Pucker, Bloat, Reconstruct and Smooth; no face-aware Liquify.",
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
  [
    "/gimp-alternative",
    "Picstea as a GIMP alternative",
    "Browser editor vs GIMP's desktop app: nothing to install and a Photoshop-style workflow; GIMP wins on plugins, scripting and print work.",
  ],
  [
    "/pixlr-alternative",
    "Picstea as a Pixlr alternative",
    "No save limits, no account, no ads in the editor; Pixlr wins on AI tools and mobile apps.",
  ],
  [
    "/canva-alternative",
    "Picstea vs Canva",
    "Photo editing (layers, masks, PSD) vs template-based design; Canva wins for templates, teams and stock assets.",
  ],
  [
    "/photoshop-express-alternative",
    "Picstea as a Photoshop Express alternative",
    "Full layer-based editing in any browser vs quick mobile edits; Photoshop Express wins for one-tap fixes on phones.",
  ],
  ["/faq", "Frequently asked questions", "Short answers about price, privacy, files and devices."],
  [
    "/about",
    "About Picstea",
    "What Picstea is, how it keeps images on the device and how it is funded.",
  ],
];

const FACTS = [
  "Free to use, in the browser, with no account and no watermark.",
  "Local-first: images are opened, edited, saved and exported on the user's device. Picstea has no server that receives images; the editor page runs no third-party code and its Content-Security-Policy blocks sending document data anywhere.",
  "Projects are saved automatically in the browser (IndexedDB) and can be downloaded as .picstea project files.",
  "Installable as an app (PWA) and works offline after the first visit; the service worker caches only the app's own files, never images.",
  "Layers: pixel, shape, text, fill and adjustment layers, groups, 16 blend modes, opacity, layer masks, vector masks, clipping masks, colour labels, merge down and flatten.",
  "Adjustment layers include Levels, Curves, Brightness/Contrast, Hue/Saturation, Exposure, Vibrance, Color Balance, Photo Filter, Channel Mixer, Gradient Map, Black & White, Invert, Posterize and Threshold.",
  "Layer styles: all ten Photoshop effects (drop shadow, inner shadow, outer and inner glow, bevel and emboss with contour and texture, satin, colour, gradient and pattern overlay, stroke) with contours, several copies, Fill opacity, Blend If, channel restrictions, global light and saved styles, in a Layer Style dialog.",
  "Selections: rectangular and elliptical marquee, freehand and polygonal lasso, magic wand, Color Range, select layer pixels, feather/expand/contract, transform selection.",
  "Painting and retouching: brush, pencil, eraser, background and magic eraser, paint bucket, gradient, colour replacement, clone stamp, healing and spot healing brush, red eye, dodge, burn, sponge, blur, sharpen and smudge.",
  "Vector tools: pen with add/delete/convert anchor point, path and direct selection, rectangle, rounded rectangle, ellipse, polygon and line shapes, editable text.",
  "Smart objects with non-destructive smart filters; Photoshop's full Filter menu with live preview: blurs and Blur Gallery, Distort, Noise, Pixelate, Render, Sharpen, Stylize, Other and Fourier, plus Filter Gallery, Lens Correction, Camera Raw, Liquify and Vanishing Point.",
  "Actions (record and replay edits), batch processing of many files into a ZIP, history panel, swatches, colour sampler and ruler, rulers, guides, grid and snapping.",
  "Opens PNG, JPEG, WebP, GIF, SVG, HEIC/HEIF (iPhone photos, decoded on the device with libheif), PSD (8-bit RGB and greyscale) and .picstea projects; exports PNG, JPEG, WebP, SVG, PDF and layered PSD.",
  "File → Convert… (also linked as /?convert=<pair> from the converter pages, including /convert/heic-to-jpg) converts up to 200 files to PNG, JPEG or WebP without opening them; several files are saved as one ZIP. PSDs use the flattened image stored in the file.",
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
