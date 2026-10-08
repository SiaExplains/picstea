import type { Metadata } from "next";
import Link from "next/link";
import { LandingPage, type Faq } from "@/components/site/LandingPage";

const PATH = "/online-photo-editor";
const TITLE = "Free online photo editor with layers";
const DESCRIPTION =
  "Edit photos in your browser with layers, masks, adjustment layers, selections and effects. Free, no sign-up, and your photos are never uploaded.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { url: PATH, title: TITLE, description: DESCRIPTION },
};

const FAQS: Faq[] = [
  {
    q: "Is MYLPER free?",
    a: "Yes. The editor is free to use in your browser, with no account and no watermark.",
  },
  {
    q: "Are my photos uploaded?",
    a: "No. Photos are opened, edited and exported on your device. MYLPER has no server that receives your images.",
  },
  {
    q: "Which formats can I export?",
    a: "PNG, JPEG, WebP, SVG, PDF and layered PSD.",
  },
  {
    q: "Does it work offline?",
    a: "Once the page has loaded, editing happens in the browser. A full offline mode is not available yet.",
  },
];

export default function OnlinePhotoEditor() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="MYLPER is a free photo editor that runs in your browser. It has layers, masks, adjustment layers and selections like a desktop editor — and your photos never leave your device."
      faqs={FAQS}
    >
      <h2>Edit a photo in four steps</h2>
      <ol>
        <li>Open the editor and click Open image (or drop a photo on the page).</li>
        <li>
          Adjust it non-destructively: Adjustments → Brightness/Contrast, Hue/Saturation or
          Exposure.
        </li>
        <li>Select an area with the marquee, lasso or magic wand to edit just that part.</li>
        <li>File → Export As… and choose JPEG, PNG or WebP.</li>
      </ol>
      <h2>What you can do</h2>
      <ul>
        <li>Layers with 16 blend modes, opacity, groups and layer masks.</li>
        <li>Adjustment layers that never change the original pixels.</li>
        <li>Marquee, lasso and magic-wand selections; feather, expand, contract, transform.</li>
        <li>Brush, pencil, eraser, paint bucket, gradient, shapes and text.</li>
        <li>Drop shadows, glows, outlines and colour overlays.</li>
        <li>Open and save layered PSD files; export PNG, JPEG, WebP, SVG and PDF.</li>
        <li>Projects save automatically in your browser; full undo history.</li>
      </ul>
      <h2>Limitations</h2>
      <p>
        Images can be up to 12,000 pixels per side (36 megapixels). There are no AI tools such as
        automatic background removal, and no curves, levels or clone stamp yet. See the{" "}
        <Link href="/docs">documentation</Link> for everything that is available.
      </p>
    </LandingPage>
  );
}
