import type { Metadata } from "next";
import Link from "next/link";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { pageOpenGraph } from "@/lib/seo/root-metadata";

const PATH = "/faq";
const TITLE = "Frequently asked questions";
const DESCRIPTION =
  "Answers about Picstea: is it free, are images uploaded, which files it opens and saves, where projects are stored and which devices it works on.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

/** Every answer is shown on the page and in FAQPage structured data. */
const FAQS: Faq[] = [
  {
    q: "Is Picstea free?",
    a: "Yes. Picstea is free to use with no account, no watermark and no limit on exports. It is funded by advertising on the website and blog, never inside the editor.",
  },
  {
    q: "Are my images uploaded?",
    a: "No. Images are opened, edited, saved and exported in your browser. Picstea has no server that receives them, and the editor page blocks sending document data anywhere.",
  },
  {
    q: "Where is my work saved?",
    a: "Automatically in your browser's storage on this device. To keep a copy elsewhere, use File → Save Project As… to download a .picstea file, or export an image.",
  },
  {
    q: "Which files can I open?",
    a: "PNG, JPEG, WebP, GIF, SVG, PSD (8-bit RGB and greyscale) and .picstea project files.",
  },
  {
    q: "Which formats can I export?",
    a: "PNG, JPEG, WebP, SVG, PDF and layered PSD.",
  },
  {
    q: "Can I edit PSD files?",
    a: "Yes. Layers, groups, masks, blend modes, editable text, adjustment layers, shapes, smart objects and common layer styles are kept, and you can save a layered PSD back.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. Picstea runs in current versions of Chrome, Edge, Firefox and Safari.",
  },
  {
    q: "Does Picstea work offline? Can I install it?",
    a: "Yes. After you have opened it once, the editor also opens without an internet connection. In Chrome and Edge you can install it (Help → Install Picstea…) so it opens in its own window like a desktop app; in Safari on a Mac use File → Add to Dock.",
  },
  {
    q: "Does it work on a phone or tablet?",
    a: "The layout adapts to small screens, but Picstea is designed for a mouse or trackpad and a keyboard, so a computer gives the best experience.",
  },
  {
    q: "Does Picstea have AI tools?",
    a: "Not yet. There is no generative fill, object selection or content-aware fill; the healing and spot healing brushes cover blemish removal.",
  },
  {
    q: "Is it a Photoshop or Photopea alternative?",
    a: "It covers the core of that workflow — layers, masks, adjustments, retouching and PSD files — for free in the browser. See the Photoshop and Photopea comparison pages for what it does and doesn't do.",
  },
];

export default function FaqPage() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="Short answers about Picstea, the free online photo editor that keeps your images on your device."
      faqs={FAQS}
    >
      <p>
        Still curious? Read the <Link href="/docs">documentation</Link>, compare Picstea with{" "}
        <Link href="/photoshop-alternative">Photoshop</Link> and{" "}
        <Link href="/photopea-alternative">Photopea</Link>, or browse the{" "}
        <Link href="/blog">guides</Link>.
      </p>
    </LandingPage>
  );
}
