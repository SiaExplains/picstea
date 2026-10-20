import { publishedPosts } from "@/content/blog";
import styles from "./welcome.module.css";

/*
 * The longer description of Picstea inside the welcome dialog. A server component passed to the
 * client dialog as children, so the text is in the home page's HTML for search engines and AI
 * assistants but adds nothing to the editor's JavaScript. Every claim must match the facts and
 * limits in src/lib/seo/llms.ts (docs/10: no overclaiming).
 */

const FAQ = [
  ["Is Picstea free?", "Yes. It runs in your browser with no account, no watermark and no trial."],
  [
    "Are my images uploaded?",
    "No. Images are opened, edited and exported on your device. Picstea has no server that receives them.",
  ],
  [
    "Where is my work saved?",
    "In this browser's storage on your device, automatically. Use File → Save Project As to keep a .picstea copy, or export a PSD.",
  ],
  [
    "Can I open Photoshop files?",
    "Yes. 8-bit RGB and greyscale PSD files open with layers, groups, masks, editable text, adjustment layers and common layer styles.",
  ],
  [
    "Does it work offline?",
    "Yes. After the first visit you can install Picstea as an app and keep editing without a connection.",
  ],
  [
    "Does it work on a phone?",
    "The layout adapts to small screens, but Picstea works best with a mouse or trackpad and a keyboard.",
  ],
  [
    "Is it a replacement for Photoshop or Photopea?",
    "For most layer-based photo editing and design work, yes. Photoshop still leads on AI tools, CMYK print work and 16-bit editing.",
  ],
] as const;

const LANDING_LINKS = [
  ["/online-photo-editor", "Free online photo editor with layers"],
  ["/psd-editor", "Open and edit PSD files online"],
  ["/png-editor", "PNG editor"],
  ["/jpeg-editor", "JPEG editor"],
  ["/webp-editor", "WebP editor and converter"],
  ["/image-resizer", "Resize an image"],
  ["/image-compressor", "Compress an image"],
  ["/photo-filters", "Photo filters"],
  ["/convert", "Convert images (HEIC, WebP, PNG, JPG, SVG, PSD)"],
  ["/blur-background", "How to blur a photo background"],
  ["/make-background-transparent", "How to make a background transparent"],
  ["/photoshop-alternative", "A free Photoshop alternative"],
  ["/photopea-alternative", "Picstea as a Photopea alternative"],
  ["/docs", "Documentation"],
  ["/faq", "Frequently asked questions"],
  ["/about", "About Picstea"],
] as const;

function latestPosts(count: number) {
  return [...publishedPosts()]
    .sort((a, b) => (b.updated ?? b.published).localeCompare(a.updated ?? a.published))
    .slice(0, count);
}

export function WelcomeAbout() {
  return (
    <details className={styles.about}>
      <summary>About Picstea: features, privacy, file formats and FAQ</summary>

      <h2>What is Picstea?</h2>
      <p>
        Picstea is a free online image editor that works like Photoshop and Photopea: layers, masks,
        adjustment layers, selections, layer styles and filters, in a familiar menu bar, toolbar and
        panels. It runs entirely in your web browser on Windows, macOS, Linux and ChromeOS, with
        nothing to install and no sign-up.
      </p>

      <h2>What you can do with it</h2>
      <ul>
        <li>
          <strong>Layers:</strong> pixel, shape, text, fill and adjustment layers, groups, 16 blend
          modes, opacity, layer masks, vector masks and clipping masks.
        </li>
        <li>
          <strong>Adjustments:</strong> Levels, Curves, Brightness/Contrast, Hue/Saturation,
          Exposure, Vibrance, Color Balance, Photo Filter, Channel Mixer, Gradient Map, Black &amp;
          White and more, as adjustment layers you can change later.
        </li>
        <li>
          <strong>Layer styles:</strong> drop shadow, inner shadow, glows, bevel and emboss, satin,
          colour, gradient and pattern overlays and stroke, with Blend If and saved styles.
        </li>
        <li>
          <strong>Selections:</strong> marquee, lasso, polygonal lasso, magic wand and Color Range,
          with feather, expand, contract and transform.
        </li>
        <li>
          <strong>Painting and retouching:</strong> brush, pencil, erasers, gradient, paint bucket,
          clone stamp, healing and spot healing brush, dodge, burn, sponge, blur, sharpen and
          smudge.
        </li>
        <li>
          <strong>Filters:</strong> the full Filter menu with live preview, including blurs,
          distort, noise, sharpen, Camera Raw, Liquify and Vanishing Point, also as non-destructive
          smart filters on smart objects.
        </li>
        <li>
          <strong>Text and vectors:</strong> editable text, the pen tool and shapes.
        </li>
        <li>
          <strong>Automation:</strong> record actions and batch-process many images into a ZIP file.
        </li>
      </ul>

      <h2>Why your images stay on your device</h2>
      <p>
        Picstea is local-first. Your images are opened, edited, saved and exported in your browser;
        there is no upload step and no server that receives them. The editor page runs no
        third-party code, and its security policy blocks sending document data anywhere. Projects
        save automatically in your browser, and after the first visit Picstea can be installed as an
        app and used offline.
      </p>

      <h2>File formats</h2>
      <p>
        Picstea opens PNG, JPEG, WebP, GIF, SVG, HEIC (iPhone photos), Photoshop PSD (8-bit RGB and
        greyscale) and its own .picstea projects. It exports PNG, JPEG, WebP, SVG, PDF and layered
        PSD. It cannot open PSB, 16/32-bit or CMYK PSD files, TIFF, PDF or camera RAW files yet.
      </p>

      <h2>Frequently asked questions</h2>
      <dl>
        {FAQ.map(([q, a]) => (
          <div key={q}>
            <dt>{q}</dt>
            <dd>{a}</dd>
          </div>
        ))}
      </dl>

      <h2>Learn more</h2>
      <ul>
        {LANDING_LINKS.map(([href, label]) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener">
              {label}
            </a>
          </li>
        ))}
        {latestPosts(3).map((post) => (
          <li key={post.slug}>
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener">
              {post.title}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
