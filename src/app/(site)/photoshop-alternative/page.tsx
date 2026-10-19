import type { Metadata } from "next";
import Link from "next/link";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { pageOpenGraph } from "@/lib/seo/root-metadata";

const PATH = "/photoshop-alternative";
const TITLE = "Free Photoshop alternative in your browser";
const DESCRIPTION =
  "Picstea is a free Photoshop alternative that runs in your browser: layers, masks, adjustment layers and PSD files, with no install, no account and no uploads.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Is Picstea a replacement for Photoshop?",
    a: "For everyday photo editing, retouching and layered design work, often yes. For print production in CMYK, 16/32-bit images, AI generation or advanced 3D and video, Photoshop is still the right tool.",
  },
  {
    q: "Will my Photoshop habits work?",
    a: "Mostly. The tools, panels and shortcuts follow the same conventions: V move, M marquee, L lasso, B brush, J healing, Ctrl/Cmd+J duplicate, Ctrl/Cmd+E merge down, X and D for colours, Shift plus a tool key to switch tools in a group.",
  },
  {
    q: "Can I open my PSD files?",
    a: "Yes, 8-bit RGB and greyscale PSDs with their layers, groups, masks, editable text, adjustment layers, shapes, smart objects and common layer styles. You can save layered PSDs back.",
  },
  {
    q: "Does it cost anything?",
    a: "No. Picstea is free, needs no account and adds no watermark. It is funded by advertising on the website and blog and by labelled sponsorships beside the canvas — never over your work.",
  },
];

export default function PhotoshopAlternative() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="Picstea gives you the core of a Photoshop-style workflow — layers, masks, adjustment layers, selections, retouching and PSD files — in a browser tab. Nothing to install, nothing to sign up for, and your images stay on your device."
      faqs={FAQS}
    >
      <h2>What feels familiar</h2>
      <ul>
        <li>
          Menu bar, toolbar with grouped tools, options bar, and Properties, History and Layers
          panels.
        </li>
        <li>
          Pixel, shape, text, fill and adjustment layers; groups, 16 blend modes, layer masks,
          vector masks and clipping masks.
        </li>
        <li>
          The full Layer Style dialog: all ten effects with contours, several copies of an effect
          and saved styles.
        </li>
        <li>
          Selections with marquee, lasso, magic wand and Color Range; healing, clone stamp, dodge
          and burn.
        </li>
        <li>Pen tool and paths, smart objects with smart filters, actions and batch processing.</li>
      </ul>
      <h2>How they differ</h2>
      <table>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">Picstea</th>
            <th scope="col">Adobe Photoshop</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Where it runs</th>
            <td>Any current browser</td>
            <td>Desktop app (installed)</td>
          </tr>
          <tr>
            <th scope="row">Price</th>
            <td>Free, no account</td>
            <td>Paid subscription</td>
          </tr>
          <tr>
            <th scope="row">Your images</th>
            <td>Stay on your device</td>
            <td>On your computer; cloud documents optional</td>
          </tr>
          <tr>
            <th scope="row">Files</th>
            <td>PSD (8-bit), PNG, JPEG, WebP, GIF, SVG in; PSD, PNG, JPEG, WebP, SVG, PDF out</td>
            <td>Many more formats, including CMYK and 16/32-bit</td>
          </tr>
          <tr>
            <th scope="row">Depth</th>
            <td>Core editing and retouching</td>
            <td>Far more features, including AI tools</td>
          </tr>
        </tbody>
      </table>
      <h2>When to stay with Photoshop</h2>
      <p>
        If you prepare files for commercial print in CMYK, work with 16- or 32-bit images or RAW
        files every day, or rely on generative AI features, Photoshop remains the better tool.
        Picstea is honest about its limits: see what it{" "}
        <Link href="/docs/file-formats">opens and exports</Link> and the{" "}
        <Link href="/faq">frequently asked questions</Link>.
      </p>
    </LandingPage>
  );
}
